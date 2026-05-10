export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <article className="prose prose-zinc mx-auto max-w-2xl px-6 py-12">
      <h1>Privacy policy</h1>
      <p>
        <strong>Placeholder — drafted internally, awaiting legal review.</strong>
      </p>
      <p>
        Descinder Jobs is operated by Descinder Ltd (UK). We process your personal data under
        UK GDPR. We are registered with the ICO. This document will be replaced with the full
        privacy policy before public launch.
      </p>
      <h2>Data we collect</h2>
      <ul>
        <li>Account information (email, name, role)</li>
        <li>Profile information you provide</li>
        <li>CV files you upload</li>
        <li>Application records</li>
        <li>With your consent, anonymised analytics events</li>
      </ul>
      <h2>Your rights</h2>
      <p>
        You can access, export, correct, or delete your data at any time from Settings.
        Contact privacy@descinder.com for anything else.
      </p>
    </article>
  );
}
