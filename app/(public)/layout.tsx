import { SiteHeader } from "@/components/shell/site-header";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-white">
      <SiteHeader />
      {children}
    </div>
  );
}
