const STORAGE_KEY = "descinder_consent_v1";
export const POLICY_VERSION = "1.0";

export type ConsentState = {
  essential: true;
  analytics: boolean;
  version: string;
};

export function getConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ConsentState;
  } catch {
    return null;
  }
}

export function setConsent(state: ConsentState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
