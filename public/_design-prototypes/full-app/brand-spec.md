# Descinder Jobs · Brand Spec (Dispatch 2 — Full App Redesign)
> Collected: 2026-05-10
> Asset source: `descinder-jobs/app/globals.css` (verbatim production tokens) + v1 brand-spec.md
> Asset completeness: Complete — all tokens from production CSS, wordmark text treatment, verified

---

## Core Assets (Primary Citizens)

### Logo / Wordmark
- Treatment: `descinder` lowercase wordmark, Geist Sans weight 700, navy primary colour
- No SVG logo file exists yet — wordmark IS the identity
- HTML: `<span class="wordmark">descinder</span>` styled with `font-family: 'Geist', sans-serif; font-weight: 700; color: var(--navy); letter-spacing: -0.02em`
- Usage: top-left header always; white version (`color: white`) on dark navy backgrounds
- Do NOT: change capitalisation, add tracking >0, colour it amber, add an icon mark

### Product Imagery
- This is a digital job board — the UI is the product
- Photography: `https://picsum.photos/seed/{seed}/{w}/{h}` for real-feeling company / profile photos
- Company logo placeholders: 40×40 monogram blocks (2-letter initials, navy-family bg, white text)
- No SVG-drawn human illustrations

---

## Colour Palette (from production globals.css — verbatim)

```css
:root {
  /* Navy primary — brand backbone */
  --navy:        oklch(0.22 0.08 264);   /* #15203D approx — deep blue-navy */
  --navy-mid:    oklch(0.32 0.07 264);   /* mid navy for interactive / elevated states */
  --navy-subtle: oklch(0.42 0.09 264);   /* lighter navy for secondary hover states */

  /* Amber accent — SPARINGLY ONLY */
  --amber:       oklch(0.72 0.18 75);    /* ~#E0A52E warm amber/gold */
  --amber-light: oklch(0.92 0.06 75);    /* amber tint for badge backgrounds */

  /* Surfaces */
  --bg:          oklch(1 0 0);           /* pure white */
  --bg-subtle:   oklch(0.97 0.01 264);   /* near-white sidebar/card bg */
  --bg-sidebar:  oklch(0.965 0.01 264);  /* sidebar bg */

  /* Borders */
  --border:      oklch(0.90 0.02 264);   /* default light border */
  --border-mid:  oklch(0.84 0.03 264);   /* stronger border / divider */

  /* Text */
  --ink:         oklch(0.22 0.08 264);   /* primary text (= navy) */
  --ink-muted:   oklch(0.50 0.03 264);   /* secondary meta text */
  --ink-faint:   oklch(0.66 0.02 264);   /* placeholder / timestamps */
}
```

### Colour Rules
- **Amber**: Used maximum 2–3 places per screen. ONLY for: Featured badge, active/saved state, explicit CTA variant
- **Never**: gradient amber with navy. Never use amber as a primary surface colour
- **Interactive darken**: `color-mix(in oklch, var(--navy) 85%, black)` — never invent new colours for hover

---

## Typography

### Fonts (production — `app/layout.tsx` + Google Fonts CDN)
```
Display / Headings: Geist Sans — variable 300–800
Body:               Geist Sans — 400, 500
Data / Numbers:     Geist Mono — tabular-nums (salary, dates, counts)
```

Google Fonts CDN:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Type Scale (web prototype)
```
--type-xs:   11px / 1.4  400      tags, timestamps, meta
--type-sm:   13px / 1.5  400/500  labels, secondary body
--type-base: 15px / 1.6  400      primary body
--type-md:   17px / 1.5  600      card titles
--type-lg:   22px / 1.3  600/700  section headings
--type-xl:   30px / 1.2  700      page headers
--type-2xl:  42px / 1.1  800      hero headline
--type-3xl:  56px / 1.0  800      marketing headline (auth panels)
```

Mono used for: salary ranges `£42,000 – £58,000`, job counts `247 roles`, posted times `3d ago`

---

## Spacing System
Base: 8px. Scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128

---

## Component Vocabulary

```
Border-radius:  6px small, 8px default, 12px cards, 16px modals
Shadows:        0 1px 3px oklch(0 0 0 / 6%)  — cards
                0 4px 16px oklch(0 0 0 / 10%) — dropdowns, modals
Buttons:        navy-filled (primary), navy-outline (secondary), text/ghost (tertiary)
Tags/chips:     bg-subtle + ink-muted; 6px radius; NO coloured left borders
Filter pills:   bg-subtle text=ink-muted (off) → bg=navy text=white (on)
Featured badge: amber-light bg + navy text + Geist Mono, uppercase, 11px
Salary badge:   Geist Mono, ink-muted, --type-sm
Job card hover: translateY(-1px) + border-color transitions to --navy-mid (150ms ease)
```

---

## Atmosphere & Register

**Reference products:** Wellfound (confident, dense), Hired (photography-led, serious)
**NOT:** internship platform, student portal, SaaS onboarding, corporate enterprise

**Atmosphere keywords:** Confident · Professional · Trustworthy · Precise · Direct
**Visual temperature:** Cool (navy-led) with controlled amber warmth
**Information density:** Moderate — 60–80cm laptop, ~4–6 jobs visible without scroll

---

## Deliberate Motion (per user feedback: calm > kinetic)

One or two motion moments per screen — not perpetual:
- Job list: card hover `translateY(-1px)` + border transition (150ms)
- Auth pages: single fade-in on form appearance (0.3s, once)
- Filters: collapse/expand with `max-height` transition (200ms ease)
- NO continuous scroll animations, NO perpetual marquees, NO auto-playing carousels

---

## Signature Details (120% moments)
- Monospace salary ranges in Geist Mono — sets professional register instantly
- Company monogram blocks: 40×40, navy-family bg, white 2-letter initials
- "Featured" amber badge: restrained, appears on ≤20% of job cards
- Collapsible filter chevrons: smooth open/close, no layout jank
- Auth panel: navy sidebar with single deliberate brand statement — not a gallery

---

## Anti-slop Checklist (enforced)
- [x] Geist fonts — NOT Inter, NOT Roboto
- [x] NO purple/blue gradients
- [x] NO SVG-drawn human scenes
- [x] NO round-card + left-border-accent pattern
- [x] NO "Acme Corp" / "John Doe" / "Company X" placeholders
- [x] NO "Elevate / Seamless / Unleash / Next-gen" copy
- [x] NO internship / match rate / intern language
- [x] Amber used max 3 places per screen
- [x] Photos from picsum.photos, not SVG illustrations
- [x] Phosphor icons or explicit inline SVGs — NO emojis
- [x] Salary filter: explicit apply button (not auto-apply on drag)
- [x] Filter sections: collapsible chevrons, 2–3 expanded by default
- [x] Company profile: ONLY real fields (no Series B, daily tx, investor lists)
