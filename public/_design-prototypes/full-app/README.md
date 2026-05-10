# Descinder Jobs — Design Prototypes (Dispatch 1 of 2)

## What is here

High-fidelity HTML prototypes for the **public + auth** surfaces of Descinder Jobs — a UK job board for experienced professionals. Double-click any `.html` file to open it in your browser. No server or build step needed.

This is **Dispatch 1**. Dispatch 2 will add authenticated-app screens: dashboard, saved jobs, profile editor, company editor, post-a-job, settings, onboarding.

---

## Design philosophy

**Navy-led, data-precise, calm.**

The register is modelled on Wellfound and Hired — confident, dense, and photography-friendly. Navy dominates all large surfaces. Amber appears in exactly one or two places per screen (Featured badges, active filter chips, saved-role state) and nowhere else. This restraint makes amber meaningful when it appears.

Typography is Geist Sans + Geist Mono throughout — the production font. Geist Mono is used specifically for salary ranges, counts, and timestamps to give them a data-precise register that prose text should not have.

Animation is intentionally calm. Per huashu's principle of "one detail at 120%, others at 80%", each screen has one deliberate motion moment (job card hover lift, form entry fade-in) and nothing perpetual or kinetic. The design respects that users spend sustained time reading job listings — constant motion is fatiguing.

The homepage IS the job board. There is no marketing landing page — the job feed is front and centre at `/`.

---

## Screens in this dispatch

| File | Screen |
|------|--------|
| `home.html` | Jobs list — the homepage, search, collapsible filters, job feed |
| `job-detail.html` | Job detail — full description, sticky apply sidebar, similar roles |
| `company-profile.html` | Company profile — real fields only (name, size, location, website, description, open roles) |
| `sign-up.html` | Create account — role selector (job seeker / employer), full form |
| `log-in.html` | Sign in — email/password + magic link alternative |
| `forgot-password.html` | Forgot password — request form + sent-state confirmation |
| `reset-password.html` | Reset password — set new password + strength indicator + success state |
| `legal.html` | Legal template — Privacy Policy layout with sticky ToC (reusable for Terms + Cookies) |
| `index.html` | Gallery — stakeholder-shareable link overview of all screens |

---

## Key design decisions

### Home page filters
- **Collapsible** — Work mode, Employment type, Experience level are expanded by default. Salary range, Skills, and Sector are collapsed. Click any chevron to expand.
- **Salary filter uses an explicit Apply button** — no auto-apply on input change. User sets min/max then clicks "Apply range".
- Active filters shown as dismissible chips above the feed.

### Company profile
Only real collected fields are shown:
- Name, logo (monogram placeholder), tagline
- Location, team size, website link
- About paragraph
- Open roles list

No fundraising data, investor lists, daily transaction volumes, or other stats that the platform does not collect.

### Auth shell
Consistent navy brand panel on the left across all auth screens. Each panel has one deliberate statement that varies by context:
- Sign up: "Hire smarter. Find better." + role category list
- Sign in: data stats (live role counts)
- Forgot password: reassuring single-line message
- Reset password: progress message

---

## Brand tokens (from production globals.css)

```
--navy:        oklch(0.22 0.08 264)   // primary — all large surfaces
--amber:       oklch(0.72 0.18 75)    // accent — max 3 uses per screen
--bg:          oklch(1 0 0)           // white
--bg-subtle:   oklch(0.97 0.01 264)   // sidebar / card backgrounds
--ink:         oklch(0.22 0.08 264)   // primary text
--ink-muted:   oklch(0.50 0.03 264)   // secondary text
--ink-faint:   oklch(0.66 0.02 264)   // timestamps, placeholders
```

Shared tokens and base styles live in `assets/shared.css`.

---

## Viewing instructions

1. Clone or download this directory.
2. Double-click any `.html` file — it opens directly in your browser.
3. For the best experience, use Chrome or Safari at 1440px width. Firefox works fine too.
4. Navigation links between screens are wired — clicking "Sign in" goes to `log-in.html`, etc.
5. Interactive filters on `home.html` work in-browser (collapse/expand, clear).

---

## Placeholder content

Company names, people names, and job titles are intentionally real-feeling rather than generic:
- **Companies**: Folio Labs, Caelum, Pith, Marrow Studios, Veldt, Kindred Works, Orrery, Lumen Works
- **Job titles**: Senior Platform Engineer, Lead Data Scientist, Founding Designer, Staff Software Engineer — Infrastructure, etc.
- **Salary ranges**: Organic numbers in Geist Mono — `£80,000 – £110,000`
- **Photos/logos**: Placeholder monogram blocks (not SVG-drawn illustrations)

---

## Note for Dispatch 2

For the authenticated-app screens, the following patterns from this dispatch are reusable and should be inherited via `assets/shared.css`:
- `.job-card` component and all variants
- `.company-mono` + colour variants (`mono-slate`, `mono-teal`, etc.)
- `.badge-featured` amber badge
- `.filter-section` collapsible pattern (reuse for settings sections)
- `.tag` and `.tag-navy` chip patterns
- Auth panel pattern — use the same navy shell for onboarding multi-step flow

The deliberate-motion principle should continue: one motion per screen, no perpetual animations.

Dispatch 2 screens to build: dashboard, saved jobs, job-seeker profile editor, company profile editor, post-a-job wizard, account settings, onboarding flow (both job seeker and employer paths).
