export const metadata = { title: "Cookie Policy" };

export default function CookiesPage() {
  return (
    <article className="prose prose-zinc mx-auto max-w-2xl px-6 py-12">
      <h1>Cookie policy</h1>
      <p><strong>Placeholder — drafted internally, awaiting legal review.</strong></p>
      <h2>Categories</h2>
      <ul>
        <li>
          <strong>Essential</strong> — needed to keep you signed in. Cannot be disabled.
        </li>
        <li>
          <strong>Analytics</strong> (PostHog, EU-hosted) — opt-in. Helps us understand product usage.
        </li>
      </ul>
    </article>
  );
}
