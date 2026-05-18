// Pure mapper. Never spread raw rows.
type AlertRow = {
  id: string; name: string; filters: unknown; frequency: string;
  is_premium: boolean; last_run_at: string | null; created_at: string;
};
export function toAlertDTO(a: AlertRow) {
  return {
    id: a.id,
    name: a.name,
    filters: (a.filters ?? {}) as Record<string, unknown>,
    frequency: a.frequency,
    isPremium: a.is_premium,
    createdAt: a.created_at,
  };
}
