# Descinder Jobs · Brand Spec
> Collected: 2026-05-10
> Asset source: live globals.css in descinder-jobs/app/globals.css (extracted verbatim)
> Asset completeness: Complete (all tokens from production CSS, wordmark text treatment)

---

## Core Assets (Primary Citizens)

### Logo
- Treatment: `descinder` lowercase wordmark, Geist Sans weight 600, navy primary colour
- No SVG file exists — use `<span class="brand-wordmark">descinder</span>` per production convention
- Usage: top-left header in navbar, always navy on light or white on dark
- Do NOT: add icon mark, change capitalisation, add tracking >0, colour it amber

### Product imagery
- This is a digital job board — the UI itself IS the product
- Photography: use `https://picsum.photos/seed/{seed}/{w}/{h}` for real-feeling people/company shots
- Seeds for people photos: seed values like `portrait1`, `team2`, `office4` give varied results
- Company logos: use geometric initials blocks (coloured squares + 2-letter monogram) as stand-ins
- No SVG-drawn human scenes

### UI Screenshots
- These prototypes ARE the UI exploration — no prior screenshots to reference
- Wellfound + Hired register: dense, confident, photography over illustration

---

## Colour Palette

All values taken verbatim from `app/globals.css`:

```css
:root {
  /* Navy primary — the brand backbone */
  --navy:        oklch(0.22 0.08 264);   /* #1B2A47 approx — deep blue-navy */
  --navy-mid:    oklch(0.35 0.07 264);   /* mid navy for interactive states */
  --navy-subtle: oklch(0.45 0.09 264);   /* lighter navy for hover states */

  /* Amber accent — used SPARINGLY: badges, "Featured", CTAs only */
  --amber:       oklch(0.72 0.18 75);    /* ~#D4880A approx — warm amber/gold */

  /* Surfaces */
  --bg:          oklch(1 0 0);           /* pure white */
  --bg-subtle:   oklch(0.96 0.01 264);   /* near-white with navy hue — sidebar, cards */
  --bg-sidebar:  oklch(0.97 0.01 264);   /* sidebar background */

  /* Borders */
  --border:      oklch(0.90 0.02 264);   /* light blue-grey border */
  --border-mid:  oklch(0.85 0.03 264);   /* slightly stronger border */

  /* Text */
  --ink:         oklch(0.22 0.08 264);   /* same as navy — primary text */
  --ink-muted:   oklch(0.50 0.03 264);   /* secondary text */
  --ink-faint:   oklch(0.65 0.02 264);   /* placeholder/meta text */
}
```

**Colour rules:**
- Amber is ONLY used for: Featured badge, accent CTA button variant, salary highlight, active filter pill
- Never gradient the amber or navy together
- All interactive states: use `color-mix(in oklch, var(--navy) 85%, black)` for darken

---

## Typography

### Fonts (from production `app/layout.tsx`)
```
Display / Headings:  Geist Sans (variable, wght 300–900) — Google Fonts CDN
Body:                Geist Sans (wght 400, 500)
Data / Numbers:      Geist Mono (tabular-nums) — salary ranges, dates, counts
```

Google Fonts CDN import:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Type scale (web prototype)
```
--type-xs:   11px  / 1.4  Geist Sans 400     (meta, timestamps, tags)
--type-sm:   13px  / 1.5  Geist Sans 400/500  (secondary body, labels)
--type-base: 15px  / 1.6  Geist Sans 400      (primary body)
--type-md:   17px  / 1.5  Geist Sans 500/600  (card titles, section headings)
--type-lg:   22px  / 1.3  Geist Sans 600/700  (page section titles)
--type-xl:   32px  / 1.2  Geist Sans 700      (page headers)
--type-2xl:  44px  / 1.1  Geist Sans 800      (hero headlines)

Mono for:  salary (£42,000 – £58,000), counts (247 jobs), dates (3d ago)
```

---

## Spacing System
8px base unit. Scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128

---

## Component Vocabulary (from production codebase)

```
Border-radius: 0.625rem (10px) default — matches --radius in globals.css
Shadows: minimal — 0 1px 2px oklch(0 0 0 / 5%) for cards, 0 4px 16px oklch(0 0 0 / 8%) for elevated
Buttons: navy-filled primary, navy-outline secondary, text tertiary
Tags/chips: bg-subtle + ink-muted text, 4px radius — no coloured left borders
Filter pills: bg-subtle inactive → navy bg + white text active
Featured badge: amber bg + navy text, monospace font, uppercase 11px
```

---

## Register / Atmosphere

**Reference products:** Wellfound (confident, dense), Hired (photography-led, serious)
**NOT:** Student platform, corporate enterprise, SaaS onboarding pages

**Atmosphere keywords:** Confident · Dense · Serious · Trustworthy · Professional
**Visual temperature:** Cool and precise (navy dominates) with moments of warm amber
**Viewer distance:** 60–80cm laptop screen — moderate information density is correct
**Photography style:** Real workplace, real people — via picsum.photos for prototypes

---

## Signature Details (120% moments)
- Monospace salary ranges: `£42,000 – £58,000` in Geist Mono, slightly smaller than title
- Company logo initials blocks: 40×40 square with navy/slate bg + 2-letter white monogram
- "Featured" badge: amber bg, navy text, caps, mono font — restrained amber use
- Filter state transitions: smooth 150ms colour switch, no layout shift
- Job card hover: `translateY(-1px)` + border goes from `--border` to `--navy-mid`

---

## Anti-slop Checklist (enforced)
- [x] Geist fonts (NOT Inter)
- [x] No purple/blue gradients
- [x] No SVG-drawn humans
- [x] No round-card + left-border-accent pattern
- [x] No "Acme Corp" placeholders — real-feeling company names
- [x] No "Elevate / Seamless / Unleash" copy
- [x] Amber used max 3 times per screen
- [x] Photos from picsum, not SVG illustrations
- [x] Phosphor icons or inline SVG, NOT emoji
