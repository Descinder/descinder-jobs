"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiGet, apiSend, ApiError } from "@/lib/client/api";
import { Loading, ErrorState, EmptyState } from "@/components/shell/screen-states";

// Verified GET /api/me/cvs (lib/server/services/cv.ts#listMyCvs):
//   { base: CvDto[], tailored: CvDto[] }
// CvDto = { id, filename, mimeType, sizeBytes, isPrimary, kind,
//           tailoredForJobId, uploadedAt }
type CvDto = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  isPrimary: boolean;
  kind: "uploaded_base" | "profile_built" | "ai_tailored";
  tailoredForJobId: string | null;
  uploadedAt: string;
};
type CvList = { base: CvDto[]; tailored: CvDto[] };

function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function CvManagementPage() {
  const [list, setList] = useState<CvList | null>(null);
  const [st, setSt] = useState<"loading" | "ok" | "error">("loading");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    const x = await apiGet<CvList>("/api/me/cvs");
    setList(x);
    setSt("ok");
  }, []);

  useEffect(() => {
    reload().catch(() => setSt("error"));
  }, [reload]);

  // Verified two-step upload. createUploadUrl (lib/server/services/cv.ts)
  // accepts { filename, mime_type, size_bytes } (snake_case) and returns
  // { cvId, uploadUrl }; then PUT the bytes to the presigned URL directly.
  // Browsers report file.type inconsistently ("" or application/octet-stream
  // for .docx on some OSes) → the backend mime_type enum would 422 a perfectly
  // valid CV. Derive from the extension, fall back to the browser MIME.
  function resolveMime(file: File): string {
    const ext = file.name.toLowerCase().split(".").pop() ?? "";
    const byExt: Record<string, string> = {
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      txt: "text/plain",
    };
    return byExt[ext] ?? file.type;
  }

  async function upload(file: File) {
    setActionError(null);
    setBusy(true);
    try {
      const mimeType = resolveMime(file);
      const { uploadUrl } = await apiSend<{ cvId: string; uploadUrl: string }>(
        "POST",
        "/api/me/cvs/upload-url",
        {
          filename: file.name,
          mime_type: mimeType,
          size_bytes: file.size,
        },
      );
      const put = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": mimeType },
      });
      if (!put.ok) throw new Error("upload failed");
      await reload();
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Could not upload that file.",
      );
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function buildFromProfile() {
    setActionError(null);
    setBusy(true);
    try {
      await apiSend<{ cvId: string }>("POST", "/api/me/cvs/build-from-profile");
      await reload();
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Could not build a CV.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function setPrimary(id: string) {
    setActionError(null);
    setBusy(true);
    try {
      await apiSend<{ ok: true }>("PATCH", `/api/me/cvs/${id}/primary`);
      await reload();
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Could not set primary.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this CV? This cannot be undone.")) return;
    setActionError(null);
    setBusy(true);
    try {
      await apiSend<{ ok: true }>("DELETE", `/api/me/cvs/${id}`);
      await reload();
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Could not delete that CV.",
      );
    } finally {
      setBusy(false);
    }
  }

  // download returns JSON { url, filename } (NOT a redirect) — open the signed
  // url in a new tab.
  async function download(id: string) {
    setActionError(null);
    try {
      const { url } = await apiGet<{ url: string; filename: string }>(
        `/api/me/cvs/${id}/download`,
      );
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Could not get a download link.",
      );
    }
  }

  if (st === "loading") return <Loading />;
  if (st === "error" || !list)
    return <ErrorState message="Couldn't load your CVs." onRetry={() => reload().catch(() => setSt("error"))} />;

  const baseCount = list.base.length;

  return (
    <div className="mx-auto max-w-[1000px]">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-[oklch(0.22_0.08_264)]">
          My CVs
        </h1>
        <Link
          href="/cv/generate"
          className="rounded-lg bg-[oklch(0.22_0.08_264)] px-3.5 py-2 text-sm font-semibold text-white"
        >
          Generate tailored CV
        </Link>
      </div>

      {actionError && (
        <p className="mt-4 rounded-lg border border-[oklch(0.80_0.06_20)] bg-[oklch(0.97_0.02_20)] px-3 py-2 text-sm text-[oklch(0.48_0.14_20)]">
          {actionError}
        </p>
      )}

      {/* ── Base CVs ── */}
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between border-b border-[oklch(0.90_0.02_264)] pb-3">
          <span className="text-lg font-semibold text-[oklch(0.22_0.08_264)]">
            Base CVs
          </span>
          <span className="text-xs text-[oklch(0.50_0.03_264)]">
            {baseCount} of 3 slots used
          </span>
        </div>

        <div className="mb-4 flex flex-wrap gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            className="hidden"
            aria-label="Upload CV file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
            }}
          />
          <button
            type="button"
            disabled={busy || baseCount >= 3}
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-[oklch(0.90_0.02_264)] px-3.5 py-2 text-sm font-medium disabled:opacity-50 hover:bg-[oklch(0.97_0.01_264)]"
          >
            Upload a CV
          </button>
          <button
            type="button"
            disabled={busy || baseCount >= 3}
            onClick={buildFromProfile}
            className="rounded-lg border border-[oklch(0.90_0.02_264)] px-3.5 py-2 text-sm font-medium disabled:opacity-50 hover:bg-[oklch(0.97_0.01_264)]"
          >
            Build from profile
          </button>
        </div>

        {list.base.length === 0 ? (
          <EmptyState
            title="No base CVs yet"
            hint="Upload a CV or build one from your profile."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.base.map((cv) => (
              <div
                key={cv.id}
                className="relative flex flex-col rounded-xl border border-[oklch(0.90_0.02_264)] bg-white p-4"
              >
                {cv.isPrimary && (
                  <span className="absolute right-3 top-3 rounded border border-[oklch(0.86_0.07_155)] bg-[oklch(0.95_0.05_155)] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[oklch(0.35_0.12_155)]">
                    Primary
                  </span>
                )}
                <div className="break-all text-sm font-bold text-[oklch(0.22_0.08_264)]">
                  {cv.filename}
                </div>
                <div className="mt-1 font-mono text-xs text-[oklch(0.50_0.03_264)]">
                  {cv.kind === "profile_built" ? "Profile-built" : cv.mimeType}{" "}
                  · {fmtSize(cv.sizeBytes)}
                  <br />
                  Uploaded {fmtDate(cv.uploadedAt)}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => download(cv.id)}
                    className="rounded-md border border-[oklch(0.90_0.02_264)] px-2.5 py-1.5 text-xs font-medium hover:bg-[oklch(0.97_0.01_264)]"
                  >
                    Download
                  </button>
                  {!cv.isPrimary && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setPrimary(cv.id)}
                      className="rounded-md border border-[oklch(0.90_0.02_264)] px-2.5 py-1.5 text-xs font-medium disabled:opacity-50 hover:bg-[oklch(0.97_0.01_264)]"
                    >
                      Set primary
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => remove(cv.id)}
                    className="rounded-md border border-[oklch(0.80_0.06_20)] px-2.5 py-1.5 text-xs font-medium text-[oklch(0.48_0.14_20)] disabled:opacity-50 hover:bg-[oklch(0.97_0.02_20)]"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── AI-tailored CVs ── */}
      <section className="mt-10">
        <div className="mb-4 flex items-center gap-3 border-b border-[oklch(0.90_0.02_264)] pb-3">
          <span className="text-lg font-semibold text-[oklch(0.22_0.08_264)]">
            AI-tailored CVs
          </span>
          <span className="rounded border border-[oklch(0.84_0.03_264)] bg-[oklch(0.96_0.01_264)] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-[oklch(0.32_0.07_264)]">
            Subscriber
          </span>
        </div>
        {list.tailored.length === 0 ? (
          <EmptyState
            title="No tailored CVs yet"
            hint="Generate one tuned to a specific job."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-[oklch(0.90_0.02_264)] bg-white">
            {list.tailored.map((cv) => (
              <div
                key={cv.id}
                className="flex items-center gap-4 border-b border-[oklch(0.93_0.01_264)] px-5 py-4 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-[oklch(0.22_0.08_264)]">
                    {cv.filename}
                  </div>
                  <div className="mt-0.5 text-xs text-[oklch(0.50_0.03_264)]">
                    {fmtSize(cv.sizeBytes)} · {fmtDate(cv.uploadedAt)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => download(cv.id)}
                  className="rounded-md border border-[oklch(0.90_0.02_264)] px-2.5 py-1.5 text-xs font-medium hover:bg-[oklch(0.97_0.01_264)]"
                >
                  Download
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => remove(cv.id)}
                  className="rounded-md border border-[oklch(0.80_0.06_20)] px-2.5 py-1.5 text-xs font-medium text-[oklch(0.48_0.14_20)] disabled:opacity-50 hover:bg-[oklch(0.97_0.02_20)]"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-[oklch(0.90_0.02_264)] bg-[oklch(0.98_0.01_264)] px-5 py-4">
          <p className="text-sm text-[oklch(0.50_0.03_264)]">
            <strong className="text-[oklch(0.22_0.08_264)]">
              Tailor a CV to a job
            </strong>{" "}
            — let the AI rewrite your base CV for a specific role.
          </p>
          <Link
            href="/cv/generate"
            className="shrink-0 rounded-lg bg-[oklch(0.22_0.08_264)] px-3.5 py-2 text-sm font-semibold text-white"
          >
            Generate
          </Link>
        </div>
      </section>
    </div>
  );
}
