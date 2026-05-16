import "server-only";
import type Stripe from "stripe";
import { AppError } from "@/lib/shared/errors";
import { getStripe, stripeConfigured, PLAN_PRICE_ENV } from "@/lib/server/integrations/payments/stripe";
import {
  getSubscription, getUserStripeCustomerId, setUserStripeCustomerId,
  getCompanyStripeCustomerId, setCompanyStripeCustomerId,
} from "@/lib/server/repos/billing";
import { db } from "@/lib/server/repos/db";
import type { SessionContext } from "@/lib/server/auth/session";
import { toBillingOverview, toPaymentMethodDTO, toInvoiceDTO } from "@/lib/shared/billing-dto";

type User = SessionContext["user"];

function ensureConfigured() {
  if (!stripeConfigured()) throw new AppError("CONFLICT", "Billing is not configured on this environment");
}

async function ensureUserCustomer(user: User): Promise<string> {
  const existing = await getUserStripeCustomerId(user.id);
  if (existing) return existing;
  const c = await getStripe().customers.create({
    email: user.email, metadata: { owner_type: "user", owner_id: user.id },
  });
  await setUserStripeCustomerId(user.id, c.id);
  return c.id;
}

async function ensureCompanyCustomer(companyId: string, billingEmail: string): Promise<string> {
  const existing = await getCompanyStripeCustomerId(companyId);
  if (existing) return existing;
  const c = await getStripe().customers.create({
    email: billingEmail, metadata: { owner_type: "company", owner_id: companyId },
  });
  await setCompanyStripeCustomerId(companyId, c.id);
  return c.id;
}

// Subscribe (default_incomplete) → return the PaymentIntent client_secret for
// Elements. Webhook finalizes. Never redirects.
export async function startSubscription(
  user: User,
  plan: "seeker_monthly" | "company_monthly",
): Promise<{ clientSecret: string }> {
  ensureConfigured();
  const priceId = PLAN_PRICE_ENV[plan]();
  if (!priceId) throw new AppError("CONFLICT", `No Stripe price configured for ${plan}`);

  let customerId: string;
  let ownerType: "user" | "company";
  let ownerId: string;
  if (plan === "seeker_monthly") {
    customerId = await ensureUserCustomer(user);
    ownerType = "user"; ownerId = user.id;
  } else {
    // company_monthly: the acting user must be a member of exactly one company
    // they administer; for MVP use their first company membership.
    const { data: mem } = await db().from("company_members")
      .select("company_id").eq("user_id", user.id).limit(1).maybeSingle();
    if (!mem) throw new AppError("FORBIDDEN", "Not a company member");
    ownerId = (mem as { company_id: string }).company_id;
    customerId = await ensureCompanyCustomer(ownerId, user.email);
    ownerType = "company";
  }

  const sub = await getStripe().subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: "default_incomplete",
    payment_settings: { save_default_payment_method: "on_subscription" },
    automatic_tax: { enabled: true }, // backend-spec §7.1 Stripe Tax (VAT/sales tax)
    expand: ["latest_invoice.payment_intent"],
    metadata: { owner_type: ownerType, owner_id: ownerId, plan_key: plan },
  });
  const invoice = sub.latest_invoice as Stripe.Invoice | null;
  const pi = (invoice as unknown as { payment_intent?: Stripe.PaymentIntent | null } | null)
    ?.payment_intent as Stripe.PaymentIntent | null;
  if (!pi?.client_secret) throw new AppError("INTERNAL", "Stripe did not return a client secret");
  return { clientSecret: pi.client_secret };
}

export async function createSetupIntent(user: User): Promise<{ clientSecret: string }> {
  ensureConfigured();
  const customerId = await ensureUserCustomer(user);
  const si = await getStripe().setupIntents.create({
    customer: customerId, payment_method_types: ["card"],
    metadata: { owner_type: "user", owner_id: user.id },
  });
  if (!si.client_secret) throw new AppError("INTERNAL", "Stripe did not return a client secret");
  return { clientSecret: si.client_secret };
}

async function currentUserSubId(user: User): Promise<string> {
  const sub = await getSubscription("user", user.id);
  if (!sub?.stripe_subscription_id) throw new AppError("NOT_FOUND", "No subscription");
  return sub.stripe_subscription_id;
}

export async function cancelSubscription(user: User): Promise<{ cancelAtPeriodEnd: true }> {
  ensureConfigured();
  await getStripe().subscriptions.update(await currentUserSubId(user), { cancel_at_period_end: true });
  return { cancelAtPeriodEnd: true };
}
export async function resumeSubscription(user: User): Promise<{ cancelAtPeriodEnd: false }> {
  ensureConfigured();
  await getStripe().subscriptions.update(await currentUserSubId(user), { cancel_at_period_end: false });
  return { cancelAtPeriodEnd: false };
}

export async function billingOverview(user: User) {
  const sub = await getSubscription("user", user.id);
  let paymentMethod = null;
  if (stripeConfigured() && sub?.stripe_customer_id) {
    const cust = await getStripe().customers.retrieve(sub.stripe_customer_id, {
      expand: ["invoice_settings.default_payment_method"],
    });
    const pm = !("deleted" in cust)
      ? (cust.invoice_settings?.default_payment_method as Stripe.PaymentMethod | null)
      : null;
    paymentMethod = toPaymentMethodDTO(pm as never);
  }
  return { ...toBillingOverview(sub), paymentMethod };
}

export async function listInvoices(user: User) {
  ensureConfigured();
  const sub = await getSubscription("user", user.id);
  if (!sub?.stripe_customer_id) return { invoices: [] };
  const list = await getStripe().invoices.list({ customer: sub.stripe_customer_id, limit: 24 });
  return { invoices: list.data.map((i) => toInvoiceDTO(i as never)) };
}

// Streams the Stripe-hosted PDF through our origin (browser never hits Stripe).
export async function invoicePdf(user: User, invoiceId: string): Promise<{ body: ArrayBuffer; }> {
  ensureConfigured();
  const sub = await getSubscription("user", user.id);
  if (!sub?.stripe_customer_id) throw new AppError("NOT_FOUND", "No billing account");
  const inv = await getStripe().invoices.retrieve(invoiceId);
  // Ownership: the invoice must belong to THIS user's customer.
  if (inv.customer !== sub.stripe_customer_id) throw new AppError("NOT_FOUND", "Invoice not found");
  if (!inv.invoice_pdf) throw new AppError("NOT_FOUND", "Invoice PDF unavailable");
  const res = await fetch(inv.invoice_pdf);
  if (!res.ok) throw new AppError("INTERNAL", "Failed to fetch invoice PDF");
  return { body: await res.arrayBuffer() };
}

// Per-post payment for a SPECIFIC job (employer_publish per-post branch). The
// caller (Task 7 endpoint) has already verified the user is a member of the
// company and the job belongs to it.
export async function createJobPostPayment(
  companyId: string,
  jobId: string,
  billingEmail: string,
): Promise<{ clientSecret: string }> {
  ensureConfigured();
  const { data: setting } = await db().from("app_settings")
    .select("value").eq("key", "job_post_price_gbp").maybeSingle();
  const priceGbp = Number((setting as { value: unknown } | null)?.value ?? 99);
  const customerId = await ensureCompanyCustomer(companyId, billingEmail);
  const pi = await getStripe().paymentIntents.create({
    amount: Math.round(priceGbp * 100),
    currency: "gbp",
    customer: customerId,
    automatic_payment_methods: { enabled: true },
    metadata: { purpose: "job_post", owner_type: "company", owner_id: companyId, job_id: jobId },
  });
  if (!pi.client_secret) throw new AppError("INTERNAL", "Stripe did not return a client secret");
  return { clientSecret: pi.client_secret };
}
