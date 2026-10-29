# OpenResearch design system

The single source of truth for how the UI looks and moves. Tokens below map 1:1 to
the Tailwind theme in `tailwind.config.js` (the single place values live); `src/index.css` reads them via `@apply`/`theme()`.
Never use a raw hex, px size or duration in a component: add a token instead.

## Brief (agreed 2026-10-28, theme changed to light the same day)

- **For:** recruiters and peers looking at a portfolio project, and Devansh doing real research with it.
- **Mood:** bold, modern, playful.
- **References:** Linear (polish, surface ladder, hairlines), Arc (playful colour),
  Perplexity (answer-first: the query and the best result lead, everything else supports them).
- **Theme:** light only. Why: papers render as white pages with yellow highlights, and a light
  shell lets the PDF sit in the UI like a sheet on a desk instead of a bright hole in a dark one.
- **Density:** spacious.

What we take vs. leave:

| From | Take | Leave |
|---|---|---|
| Linear | 4-step surface ladder, 1px hairlines instead of shadows, tight display tracking | its lavender `#5e6ad2`, its single-accent restraint, its dark canvas |
| Raycast | polish, soft tinted chips for categories | Inter + ss03 identity, red stripe hero |
| Arc | a confident multi-hue category palette, one gradient "moment", light tinted surfaces | its exact pastels |
| Perplexity | the big centred omnibox, sources as small coloured chips, answer-first layout | its teal identity |

## Personality in one line

A bright, calm workspace where **colour means something**: one electric lime for "act here",
a set of saturated category hues for "what kind of thing is this", and one aurora gradient
reserved for the hero moment. Playful comes from colour, roundness and springy micro-motion,
never from clutter.

---

## Colour

All text tokens pass WCAG AA (≥ 4.5:1) on canvas, surface-1 and surface-2, and every category
hue passes on its own `-soft` chip background (measured). On `surface-3` some hues drop to 4.3-4.9,
so don't put category text on `surface-3`. `ink-faint` (2.3:1) is for disabled states and decoration only.

### Surfaces (violet-tinted off-white)

The canvas is tinted, and cards are pure white, so cards (and PDF pages) lift off the page without shadows.

| Token | Value | Use |
|---|---|---|
| `canvas` | `#F6F5FA` | page background |
| `surface-1` | `#FFFFFF` | cards, sidebar, panels |
| `surface-2` | `#EFEEF5` | hovered rows, inputs, popovers' inner areas |
| `surface-3` | `#E5E3EE` | pressed, selected rows, keycaps, the PDF backdrop |
| `hairline` | `rgba(21,20,31,0.08)` | default 1px border |
| `hairline-strong` | `rgba(21,20,31,0.16)` | hover border, dividers that must read |
| `hairline-hover` | `rgba(21,20,31,0.24)` | hover border on inputs (already `hairline-strong` at rest) |

### Text

| Token | Value | Contrast on canvas | Use |
|---|---|---|---|
| `ink` | `#15141F` | 16.8 | headings, primary text |
| `ink-muted` | `#45435A` | 8.8 | body copy, abstracts |
| `ink-subtle` | `#636178` | 5.5 | metadata, labels, placeholders |
| `ink-faint` | `#A4A2B6` | 2.3 | disabled, decorative only |

### Brand accent: Volt lime

Lime is too light to read as text on white (1.3:1), so it is split into a **fill** and an **ink**:

| Token | Value | Use |
|---|---|---|
| `accent` | `#C8F55A` | fills only: primary buttons, active nav pill, top-score meter |
| `accent-hover` | `#BDEE45` | hover fill |
| `accent-press` | `#ABDC30` | pressed fill |
| `on-accent` | `#15141F` | text/icons on lime (14.5:1) |
| `accent-ink` | `#3D6B00` | lime-family text: links, active tab text + underline, focus rings, top score number (5.9:1) |
| `accent-soft` | `rgba(200,245,90,0.30)` | selected backgrounds, selected filter chips (with `accent-ink` text) |

Solid lime fills get a 1px `hairline-strong` inset border, because lime on white has almost no edge.
Rule: **at most one solid-lime element per view region** (one primary button, or the active nav item).
Lime is a signal, not a decoration. **Never use lime inside the PDF pane**, so it can't be confused with a highlight.

### Category hues (the playful layer)

Each hue has a solid (text/icon/dot) and a `-soft` background (the solid at 12% on white). Use them as
`bg-{hue}-soft text-{hue}` chips. Never as large fills or body text.

| Hue | Solid | Assigned to |
|---|---|---|
| `violet` | `#6440E0` | arXiv · chunk type `background` |
| `sky` | `#08659C` | Semantic Scholar · info states |
| `mint` | `#08704C` | PubMed · success · chunk type `results` |
| `amber` | `#965400` | OpenAlex · warnings · chunk type `methodology` |
| `pink` | `#B92C78` | Crossref |
| `coral` | `#B83D0E` | Web |
| `red` | `#C42828` | errors, destructive actions |

Unknown sources or chunk types fall back to `surface-2` + `ink-muted`.

### Score bands

Score = 0-100 total from ranking. Shown as a mono number plus a thin meter.

| Band | Number | Meter |
|---|---|---|
| ≥ 80 | `accent-ink` | `accent` |
| 60-79 | `sky` | `sky` |
| < 60 | `ink-subtle` | `ink-faint` |

### Signature gradient: Aurora (one moment per screen)

`linear-gradient(120deg, #8B6CFF 0%, #FF6FC4 45%, #FFB938 100%)`

Allowed in exactly these places: the focus glow behind the hero search omnibox (25% opacity on light)
and the progress bar of a running search/analysis. Never on text blocks, cards or buttons. The brand mark is a lime tile with the black logo (Devansh's pick).

### PDF highlights (exception, intentionally off-brand)

PDF pages stay white (they are papers). Highlights stay highlighter yellow so they read as
"marked text", blended with `multiply` on `.react-pdf__Page__textContent`:
`highlight` `rgba(255,224,0,0.35)`, `highlight-active` `rgba(255,200,0,0.70)`.

---

## Typography

Three families, loaded from Google Fonts in `index.html` (`display=swap`). Self-hosting moves into P3-8 with the CSP work.

| Role | Family | Why |
|---|---|---|
| Display | **Bricolage Grotesque** (variable, 500-800) | a grotesque with quirky details: bold and playful without being childish |
| Text | **Geist** (400-600) | neutral, very legible at small sizes, modern; not a default font |
| Mono | **Geist Mono** (400-500) | scores, page numbers, ids, keyboard hints: tabular numbers |

Fallbacks: `ui-sans-serif, system-ui, sans-serif` / `ui-monospace, SFMono-Regular, monospace`.
Numbers in scores, counts and timers use `font-variant-numeric: tabular-nums`.

### Scale

| Token | Size / line | Weight | Tracking | Family | Use |
|---|---|---|---|---|---|
| `display` | 56 / 1.05 | 700 | -0.03em | Display | hero headline (search landing, login) |
| `h1` | 36 / 1.1 | 700 | -0.025em | Display | page titles |
| `h2` | 24 / 1.2 | 600 | -0.015em | Display | section titles |
| `h3` | 18 / 1.3 | 600 | -0.01em | Display | card titles, paper titles |
| `body-lg` | 17 / 1.6 | 400 | 0 | Text | lead text, answers in Ask |
| `body` | 15 / 1.6 | 400 | 0 | Text | default |
| `body-sm` | 13 / 1.5 | 400 | 0 | Text | metadata, card details |
| `label` | 12 / 1.3 | 500 | 0, sentence case | Text | field labels, small section headings |
| `mono` | 13 / 1.4 | 500 | 0 | Mono | scores, page numbers, kbd |

Mobile (< 640px): `display` → 40, `h1` → 28. Everything else stays.
Measure: running text max 68ch.

---

## Space, size, radius

**Spacing**: 4px base. Tokens = Tailwind's default scale; use only
`1 2 3 4 6 8 10 12 16 24` (4-96px). Spacious density means:

- page gutter: 40px desktop, 24px tablet, 16px mobile
- card padding: 24px (20px on mobile)
- gap between cards: 16px; between page sections: 48-64px
- content max width: 1120px; the paper workspace is full width

**Radius** (rounder than Linear, for the playful feel):

| Token | Value | Use |
|---|---|---|
| `sm` | 8px | chips' inner elements, kbd, small icon buttons |
| `md` | 12px | buttons, inputs |
| `lg` | 16px | cards, panels |
| `xl` | 24px | hero omnibox, modals, PDF frame |
| `full` | 9999px | chips, pills, avatars, nav pill |

**Elevation**: no drop shadows for hierarchy. Depth = white cards on the tinted canvas + hairline.
Two shadows only:
- `overlay`: `0 24px 48px -12px rgba(21,20,31,0.18)` for popovers, drawers, modals.
- `page`: `0 1px 2px rgba(21,20,31,0.06), 0 8px 24px -8px rgba(21,20,31,0.12)` for PDF pages, so paper reads as paper.

**Hit targets**: ≥ 40px tall for buttons and inputs, ≥ 44px on touch layouts.

---

## Motion

CSS only (no animation library). Two curves, three durations:

| Token | Value | Use |
|---|---|---|
| `ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | enter, expand, page content |
| `ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | small playful pops: chip select, button press release, score meter fill |
| `fast` | 120ms | hover colour/border |
| `base` | 200ms | press, toggle, tab switch |
| `slow` | 360ms | card expand, drawer, results stagger-in |

Rules:
- Button press: `scale(0.97)` on active, springs back.
- Results enter with a 40ms-per-item stagger (cap at 8 items), fade + 8px rise.
- Score meters fill from 0 with `ease-spring` on first appearance.
- Only animate `transform`, `opacity`, colour and border. Never width/height/top.
- `prefers-reduced-motion: reduce` → durations to 0, no stagger, no spring overshoot.

---

## Layout

- **App shell (≥ 1024px):** left rail 240px (`surface-1`, hairline right edge) with brand mark,
  nav (Search, Library/History, Workspace), and account at the bottom. Collapsible to 72px icons.
- **Tablet/mobile (< 1024px):** top bar 56px with menu button → slide-in drawer (`overlay` shadow, `slow`).
- **Search (Perplexity-style):** empty state = vertically centred `display` headline + hero omnibox.
  After a search, the omnibox docks to the top of the column and results stream below.
  Filters and sort live in a single row of chips above results.
- **Paper workspace:** full width, resizable split: PDF left (default 60%), side panel right with
  `Highlights` / `Ask` tabs. Below 1024px: PDF full width, panel becomes a bottom sheet.

---

## Components

Every interactive component has visible **hover, focus-visible, active, disabled and loading** states.
Focus ring everywhere: `2px solid accent-ink` with `2px` offset in `canvas` colour.

- **Button**
  - `primary`: `accent` bg, `on-accent` text, 1px `hairline-strong` inset border, radius `md`, 40px tall, `px-4`, weight 600.
  - `secondary`: `surface-1` bg, `ink` text, `hairline-strong` border → `surface-2` bg on hover.
  - `ghost`: transparent, `ink-muted` → `ink` + `surface-2` on hover.
  - `danger`: `red-soft` bg, `red` text.
  - Icon-only buttons are square (40px) and always have `aria-label`.
- **Hero omnibox**: 64px tall, radius `xl`, `surface-1`, `hairline-strong` border, `body-lg` text. On focus: aurora glow
  (blurred gradient layer behind, 25% opacity) + `accent-ink` focus ring. Right side: submit button
  (lime circle with arrow) and a `⌘K` keycap hint. Project description expands below it as an optional second field.
- **Input / textarea**: `surface-1`, `hairline-strong` border, radius `md`, 40px; placeholder `ink-subtle`; focus = `accent-ink` ring.
- **Chip**: radius `full`, 28px tall, `label`-sized but not uppercase (12/500). Category chips use hue `-soft` + hue text;
  filter chips toggle between `surface-2` + `ink-muted` and `accent-soft` + `accent-ink` text (spring pop).
- **Result card**: `surface-1`, radius `lg`, padding 24, `hairline`. Row 1: separate chips for source (hue), year (mono), PDF, and "Top pick" on the first card (no `·`-joined meta strings).
  Row 2: title (`h3`). Row 3: 2-line reason (`ink-muted`). Right: score number (mono, band colour) over a 48px meter.
  Expand (`slow`) reveals score breakdown bars, useful ideas list, PDF usefulness, actions (Open PDF / Open in workspace).
  The top-ranked card gets a 1px `accent-ink` border, nothing louder.
- **Score breakdown**: one row per sub-score: label · thin 4px bar (band meter colour) on `surface-2` track · mono value / max.
- **Tabs**: underline style, 2px `accent-ink` underline on the active tab, `ink` vs `ink-subtle` text.
- **Chat (Ask)**: user messages = right-aligned `surface-2` bubble, radius `lg`. Answers = no bubble,
  full width `body-lg` (answer-first, like Perplexity), with page citations as mono chips that jump the viewer.
  The answer region is `aria-live="polite"`.
- **Progress / loading**: skeletons use `surface-2` with a slow shimmer (disabled under reduced motion).
  Running search/analysis = aurora progress bar + per-step list with elapsed time (mono) and Cancel.
- **Empty states**: one `h2` line, one `ink-muted` sentence, one primary action. No illustrations needed.
- **Errors**: inline `red-soft` panel, radius `md`, message from `getErrorMessage()`, a Retry button. Never a blank region.
- **PDF frame**: white pages with the `page` shadow on a `surface-3` backdrop, 24px gap between pages, toolbar
  (zoom −/+, fit width, page n / N in mono) as a floating pill at the top of the PDF pane (`surface-1`, `overlay` shadow).
  No lime anywhere in the PDF pane; the active chunk's card in the side panel uses the highlight yellow as a 3px left bar.

---

## Do / Don't

- Do let the query and the best result dominate each screen; everything else is quieter.
- Do use category hues consistently (arXiv is always violet, everywhere).
- Do use mono for anything numeric that a user compares.
- Don't use lime as text (use `accent-ink`) or anywhere inside the PDF pane.
- Don't use more than one aurora moment or one solid-lime element per region.
- Don't add drop shadows to cards or gradients to buttons.
- Don't use colour as the only signal: chips have text, score bands have numbers.
- Don't write raw hex/px/ms values in components; extend the tokens here first.
