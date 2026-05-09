# Descinder Jobs

Job board MVP. Next.js 15 + Supabase + Cloudflare Pages.

See design spec: `../docs/superpowers/specs/2026-05-09-descinder-rebuild-design.md`

## Development

```bash
npm install
cp .env.example .env.local  # fill in values
npm run dev
```

App runs on http://localhost:3000.

## Tests

```bash
npm run test         # vitest unit tests
npm run test:e2e     # playwright end-to-end tests
```
