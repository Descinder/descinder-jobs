# Descinder Jobs · Hi-fi Design Prototypes (Phase B)

Generated with **huashu-design** workflow for visual quality comparison against Phase A (production Next.js output).

## How to view

Each `.html` file is **double-click openable** — no server needed, no build step.

Start at `index.html` for the gallery overview with links to all screens.

## Files

```
job-board/
├── brand-spec.md            Brand tokens, typography, colour, anti-slop rules
├── README.md                This file
│
├── index.html               Gallery linking all prototypes
│
├── jobs-list-v1.html        Dense / Wellfound-register — left filter rail, compact cards
├── jobs-list-v2.html        Editorial — navy search hero, top filter chips, larger cards
├── jobs-list-v3.html        Split preview — master/detail, scannable row list + right pane
│
├── job-detail.html          Full role page — two-column, sticky navy apply sidebar
├── post-a-job.html          Employer form — multi-step, live preview panel, pricing
├── company-profile.html     Public company page — navy hero with stats, open jobs list
│
└── assets/
    └── shared.css           Design tokens extracted from app/globals.css + shared components
```

## Design philosophy

**Register:** Wellfound + Hired. Confident, professional, information-dense. Not student-platform soft.

**Colour:** Navy primary (`oklch(0.22 0.08 264)`) dominates. Amber accent (`oklch(0.72 0.18 75)`) used at most 3× per screen — Featured badges, toggle states, key CTAs only.

**Typography:** Geist Sans (NOT Inter) + Geist Mono for all numeric data (salary ranges, counts, timestamps). Salary always rendered in monospace so it reads as a number.

**120% moments per screen:**
- `jobs-list-v1`: Featured amber ribbon + filter pill active states
- `jobs-list-v2`: Navy search hero with description-rich cards
- `jobs-list-v3`: Split preview pane — full detail visible without a page load
- `job-detail`: Navy apply card with salary in large mono
- `post-a-job`: Live preview panel + featured add-on with amber toggle
- `company-profile`: Asymmetric hero with geometric navy stats cards

## Anti-slop applied

- No Inter font
- No purple/blue gradients
- No SVG-drawn humans or scenes
- No rounded card + left-border-accent pattern
- No "Acme Corp" — real-feeling names: Folio Labs, Caelum Capital, Pith, Marrow Studios, Vexor Rail
- No emoji as icons — inline SVG only
- No "Elevate / Seamless / Unleash" copy
- Picsum.photos integration ready for real photography (seeds specified in brand-spec.md)
