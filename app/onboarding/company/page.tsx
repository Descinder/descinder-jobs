"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const spring = { type: "spring" as const, stiffness: 100, damping: 20 };

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { ...spring } },
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function CompanyOnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [size, setSize] = useState("1-10");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not logged in");
      setSubmitting(false);
      return;
    }

    const baseSlug = slugify(name) || `company-${Date.now()}`;
    let slug = baseSlug;
    for (let i = 1; i < 50; i++) {
      const { data: existing } = await supabase
        .from("companies")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!existing) break;
      slug = `${baseSlug}-${i}`;
    }

    const { data: company, error: companyErr } = await supabase
      .from("companies")
      .insert({
        name,
        slug,
        website: website || null,
        location: location || null,
        size,
        description: description || null,
      })
      .select()
      .single();

    if (companyErr || !company) {
      setError(companyErr?.message ?? "Failed to create company");
      setSubmitting(false);
      return;
    }

    const { error: memberErr } = await supabase
      .from("company_members")
      .insert({ company_id: company.id, user_id: user.id, role: "owner" });

    if (memberErr) {
      setError(memberErr.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto min-h-dvh max-w-xl px-6 py-14">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-8"
      >
        {/* Header */}
        <motion.div variants={fadeUp} className="flex flex-col gap-2">
          {/* Step indicator */}
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-8 rounded-full bg-[oklch(0.72_0.18_75)]" />
            <span className="h-1.5 w-8 rounded-full bg-slate-200" />
            <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-slate-400 ml-1">
              Step 1 of 2
            </span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-[oklch(0.22_0.08_264)] md:text-3xl">
            Set up your company
          </h1>
          <p className="text-sm leading-relaxed text-slate-500">
            This is what candidates see when they find your roles.
          </p>
        </motion.div>

        {/* Form */}
        <motion.form
          variants={fadeUp}
          onSubmit={onSubmit}
          className="flex flex-col gap-5"
        >
          {/* Company name */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="name"
              className="text-sm font-medium text-[oklch(0.22_0.08_264)]"
            >
              Company name
            </Label>
            <Input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl border-slate-200 bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus-visible:border-[oklch(0.72_0.18_75)] focus-visible:ring-[oklch(0.72_0.18_75)]/20"
            />
          </div>

          {/* Website */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="website"
              className="text-sm font-medium text-[oklch(0.22_0.08_264)]"
            >
              Website{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </Label>
            <Input
              id="website"
              type="url"
              placeholder="https://example.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="rounded-xl border-slate-200 bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus-visible:border-[oklch(0.72_0.18_75)] focus-visible:ring-[oklch(0.72_0.18_75)]/20"
            />
          </div>

          {/* Location */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="location"
              className="text-sm font-medium text-[oklch(0.22_0.08_264)]"
            >
              Location{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </Label>
            <Input
              id="location"
              placeholder="e.g. London, UK"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="rounded-xl border-slate-200 bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus-visible:border-[oklch(0.72_0.18_75)] focus-visible:ring-[oklch(0.72_0.18_75)]/20"
            />
          </div>

          {/* Company size */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="size"
              className="text-sm font-medium text-[oklch(0.22_0.08_264)]"
            >
              Company size
            </Label>
            <select
              id="size"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className={cn(
                "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm",
                "shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]",
                "focus:border-[oklch(0.72_0.18_75)] focus:ring-2 focus:ring-[oklch(0.72_0.18_75)]/20 focus:outline-none",
                "text-[oklch(0.22_0.08_264)]"
              )}
            >
              <option value="1-10">1 – 10</option>
              <option value="11-50">11 – 50</option>
              <option value="51-200">51 – 200</option>
              <option value="201-500">201 – 500</option>
              <option value="501+">501+</option>
            </select>
            <p className="text-[0.68rem] text-slate-400">
              Helps candidates understand the environment.
            </p>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="description"
              className="text-sm font-medium text-[oklch(0.22_0.08_264)]"
            >
              Short description{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </Label>
            <Textarea
              id="description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does your company build? What kind of interns thrive here?"
              className="rounded-xl border-slate-200 bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] focus-visible:border-[oklch(0.72_0.18_75)] focus-visible:ring-[oklch(0.72_0.18_75)]/20"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className={cn(
              "mt-1 w-full rounded-xl px-5 py-3 text-sm font-semibold tracking-tight",
              "bg-[oklch(0.22_0.08_264)] text-white",
              "shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.12)]",
              "transition-all duration-150 hover:bg-[oklch(0.28_0.08_264)]",
              "active:scale-[0.98] active:translate-y-px",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            )}
          >
            {submitting ? "Creating..." : "Continue"}
          </button>
        </motion.form>
      </motion.div>
    </div>
  );
}
