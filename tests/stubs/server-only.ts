// Stub for `server-only` in the vitest/jsdom environment.
// The real package throws if imported outside React Server Components.
// In tests we don't run inside RSC, so we replace it with a no-op to allow
// the modules that import it (e.g. lib/server/repos/db.ts) to be exercised.
export {};
