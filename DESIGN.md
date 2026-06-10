# FinOS Design System

## Mood

A focused personal planning workspace: precise, private, and calm — like a premium productivity tool built for a single user's financial clarity. Clean under daylight, with a single confident emerald signal.

## Register

Product UI. The interface should feel like a refined SaaS workspace before it reads as finance software.

## Visual Benchmark

**Primary reference:** Attio  
**Secondary references:** Linear, Stripe Dashboard, Arc Browser, Raycast, Dub.co

## Color Strategy

Restrained. Pure white and near-black surfaces carry the product. Emerald green is used only for primary actions, selected navigation, and positive financial state. All other UI chrome is neutral.

**Single accent rule:** Green is the only brand color. No teal/blue for data, no red for expenses. Red appears only for errors and critical negative states. Charts use ink-family neutrals for secondary series.

## Tokens

Light mode:

```css
--bg: 1 0 0;
--surface: 0.984 0.002 250;
--surface-2: 0.963 0.003 250;
--ink: 0.145 0.008 250;
--muted: 0.47 0.010 250;
--line: 0.912 0.004 250;
--primary: 0.606 0.138 133;  /* green-800 #5f9333 */
--accent: 0.65 0.12 185;
--success: 0.57 0.14 145;
--warning: 0.70 0.13 75;
--danger: 0.56 0.17 25;
```

Dark mode:

```css
--bg: 0.115 0 0;
--surface: 0.165 0.005 250;
--surface-2: 0.21 0.006 250;
--ink: 0.94 0.003 250;
--muted: 0.70 0.010 250;
--line: 0.30 0.008 250;
--primary: 0.747 0.149 133;  /* green-500 #88c058 */
--accent: 0.72 0.10 185;
--success: 0.74 0.13 145;
--warning: 0.75 0.13 75;
--danger: 0.67 0.15 25;
```

## Typography

Typography is the primary visual hierarchy. Size and weight carry the signal; color is secondary.

- **Page headings** (`h1`): `text-3xl font-semibold tracking-tight` — sets the scene immediately
- **Section headings** (`h2`): `text-lg font-semibold` — clear but not dominant
- **Card titles**: `text-base font-medium` — secondary information
- **Labels and metadata**: `text-sm text-muted` — third tier, recedes visually

Avoid tiny fonts, dense financial tables, and excessive labels. Every visible label should earn its place.

## Layout Principles

Use fewer panels. Prefer larger sections with breathing room over grids of equal-weight cards.

- Avoid KPI overload. Four summary metrics maximum above the fold.
- Dashboard should feel breathable — not a report, not a dashboard template.
- Every screen should have one visually dominant element the user notices first.
- Whitespace is structural, not decorative.

### Dashboard Structure

```
1. Summary Metrics  →  unified metric strip, not 4 isolated cards
2. Cash Flow Chart  →  the visual hero, large and prominent
3. Category Analysis + Position  →  two-column supporting detail
4. Recent Activity  →  full-width, clean list, significant section
5. Budgets & Insights  →  at the bottom, never above the fold
```

## Cards

Cards are for repeated objects (transactions, accounts, budget rows). Section containers use panels.

- **Border radius**: `0.75rem` (12px) — clearly rounded, never sharp
- **Border**: `1px solid oklch(var(--line))` — subtle, not heavy
- **Shadow**: `0 1px 3px oklch(var(--ink) / 0.05)` — barely perceptible lift
- **Padding**: `p-6` as default (24px) — generous
- **Background**: `oklch(var(--surface))`

No nested cards. No dark borders. No dense content.

## Navigation

**Sidebar characteristics:**
- Width: 224px (w-56) — compact enough to not dominate
- Logo: colored icon mark + product name
- Nav items: icon (16px) + label, `py-2.5` vertical padding
- Active state: `bg-primary/8 text-primary font-medium` — muted fill, not loud
- Hover: `bg-ink/5 text-ink`
- Settings separated by divider at bottom of nav
- Keyboard shortcut hint in sidebar footer

**The sidebar should not compete with the content for visual attention.**

## Interface Principles

- Use section panels for task grouping; avoid nested panels.
- Keep cards to repeated objects only: accounts, budgets, transactions.
- Keep buttons, inputs, and selects visually consistent across pages.
- Prefer calm text insights over warning-heavy financial copy.
- Empty states should make the next action obvious without showing broken charts.
- Never color-code income green and expenses red — that's banking UI. Use ink for both, green only for net positive.
