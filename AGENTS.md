<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Pantry App — Project Instructions for Claude

## Who I'm working with
Erica is a UX designer, not an engineer. Explain terminal commands before running them. Keep responses concise. Never make design decisions without checking the design source first.

---

## Stack
- **Frontend:** Next.js 16 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 + shadcn/ui + custom CSS classes in `globals.css`
- **Backend:** Supabase (Postgres + Auth + Realtime)
- **Auth:** Supabase magic link (email only, no passwords)
- **Icons:** UIicons 3.0 web font — `fi-rr-*` (regular) and `fi-sr-*` (solid)
- **Font:** Figtree (Google Fonts, weights 400–800)
- **Max width:** 660px centered container in root layout

---

## Component Architecture — Always check before building

Before writing any UI, check if a shared component already exists. **Use shared components first. Build new ones only when nothing fits.**

### shadcn/ui components (`src/components/ui/`)
| Component | Use for |
|---|---|
| `Button` | All CTAs. `variant="brand"` for yellow-gradient primary actions. |
| `Input` | All text inputs. Always apply the glass input style (see Styling). |
| `Label` | All form field labels. |
| `Select` + friends | Dropdowns. Background fixed via inline style in `select.tsx` — don't change. |
| `Badge` | Status tags, counts, source labels. |
| `Sheet` | Bottom-sheet drawers. |

### Custom shared components
| Component | Path | Use for |
|---|---|---|
| `PageHeader` | `src/components/layout/PageHeader.tsx` | Every internal page header — back arrow + title. Never duplicate this. |
| `BottomNav` | `src/components/layout/BottomNav.tsx` | App nav. Lives in `(app)` layout only. |
| `QuantityStepper` | `src/components/add/QuantityStepper.tsx` | Any +/− quantity input. |
| `LocationSelector` | `src/components/add/LocationSelector.tsx` | Location pill picker. |
| `TagInput` | `src/components/add/TagInput.tsx` | Pill-style tag entry. |
| `SuccessScreen` | `src/components/add/SuccessScreen.tsx` | Post-save confirmation. |

---

## Known Bugs & Patterns — Hard-Won Lessons

### Never put `overflow: hidden` on containers with sticky or fixed children
`overflow: hidden` / `overflow-x: hidden` on a parent creates a new scroll container, which breaks `position: sticky` on children and clips `position: absolute` elements (like decorative blobs). This was a major debugging issue. Use `overflow-x: clip` if horizontal clipping is needed — it doesn't create a scroll container.

### shadcn semantic color classes don't generate in this project
`bg-popover`, `bg-accent`, `text-popover-foreground`, `focus:bg-accent`, `bg-primary` etc. are Tailwind semantic color classes that require a full shadcn CSS variable theme setup. They are silently absent from the generated CSS in this project. When editing any shadcn component file (`src/components/ui/*.tsx`), replace these with `style={{}}` using our own CSS vars or hex values. The Select dropdown was transparent for this reason.

### Never use Unicode symbols for navigation icons
Never use `←`, `→`, `×`, `+` as navigation or icon elements. Always use UIicons: `fi-rr-angle-left` for back, `fi-rr-plus` for add, `fi-rr-cross-small` for close. Check `public/fonts/uicons/uicons-regular-rounded.css` for available names.

### Never use responsive Tailwind prefixes (`sm:`, `md:`, `lg:`)
This app has no responsive breakpoints. The max-width container is always 660px. `sm:px-8` etc. break the mobile-first layout by applying different padding on larger screens. Every element should look the same at any viewport within the 660px column.

### `font-600` is not a valid Tailwind class
Valid font weight classes: `font-normal` (400), `font-medium` (500), `font-semibold` (600), `font-bold` (700), `font-extrabold` (800).

### CSS resets must be inside `@layer base`
Any `* { margin: 0; padding: 0; }` placed OUTSIDE a CSS layer beats all Tailwind utility classes (which live in `@layer utilities`). This silently removed all padding and margin from every element. Always put global resets inside `@layer base {}` in `globals.css`.

### RLS self-referencing policies cause infinite recursion
If a Supabase RLS policy on table X queries table X to check membership (e.g., the `profiles` policy queried `profiles` to find the household), it causes infinite recursion. Fix: create a `SECURITY DEFINER` function that reads the table without triggering RLS, then reference the function in policies.

### `.insert().select().single()` fails on first-time rows
After inserting a row, immediately SELECT-ing it back fails if the user isn't yet a "member" per the RLS policy (e.g., inserting a household before the profile references it). Always use `crypto.randomUUID()` to generate the ID before inserting, then use that known ID directly — never read back what you just wrote.

### Build plan phases must stay in order
Phases build on each other. Skipping a phase (e.g., skipping Deploy before building Auth) causes confusion and missing setup steps. Follow `pantry-app-build-plan.md` sequentially.

---

## Styling Rules

### Critical: Tailwind v4 does NOT scan arbitrary values
Never use bracket syntax like `text-[13px]`, `rounded-[14px]`, `pt-[14px]`. These are silently missing from the generated CSS at build time. Use the custom classes defined in `globals.css` instead:
```
.text-105  .text-11  .text-115  .text-13  .text-135  .text-17
.rounded-11  .rounded-14  .rounded-28
.pt-14px  .py-7px  .px-14px
.w-26px  .min-w-18px  .h-18px  .min-w-108px
.tracking-003  .gap-9px  .no-scrollbar
```
If you need a size not listed here, add it to `globals.css` first.

### className vs style={{}}
- **`className`**: layout (`flex`, `gap-2`, `px-5`), font weight, standard Tailwind scale, custom globals
- **`style={{}}`**: colors (CSS vars), gradients, shadows, backdrop-filter, dynamic/conditional values

### Interactive elements (`<button>`, `<a>`)
Browser UA stylesheets beat Tailwind's layered utilities on interactive elements. Always put `display`, `padding`, and `gap` in `style={{}}` on buttons and links — not `className`.

### Reusable style objects
```typescript
// Glass input — apply to every Input
const glassInput = {
  background: 'oklch(100% 0 0 / 0.6)',
  borderColor: 'oklch(100% 0 0 / 0.5)',
  color: 'var(--foreground)',
}

// Brand button — apply to every Button variant="brand"
const brandButton = {
  background: 'linear-gradient(150deg, var(--yellow-light), var(--yellow))',
  color: '#4A3300',
  padding: '12px 16px',
}
```

### Design tokens (CSS vars)
`--background` `--foreground` `--muted` `--muted-light` `--divider` `--surface`
`--yellow` `--yellow-light` `--teal` `--red` `--red-dark` `--orange` `--amber`
`--glass-header` `--glass-card` `--glass-nav`

### Exact accent colors
- Yellow: `#FFD333` / `#FFE680` | Teal: `#23967F` | Red: `#EE1B49` / `#C81440`
- Orange: `#FFA070` / `#B85A2E` | Amber links: `#A86F00`

---

## Page Layout Pattern

Every internal page uses `PageHeader` and this body structure:
```tsx
<div style={{ minHeight: '100vh', background: 'var(--background)', paddingBottom: 112 }}>
  <PageHeader title="Page Title" backHref="/previous-route" />
  <div className="flex flex-col gap-4 px-5 pt-14px pb-4">
    {/* content */}
  </div>
</div>
```
`paddingBottom: 112` clears the floating bottom nav.

---

## Supabase Patterns

```typescript
// Server components
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()  // async

// Client components
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()  // synchronous

// Always generate UUID client-side on INSERT (avoids SELECT-after-INSERT RLS block)
const id = crypto.randomUUID()
await supabase.from('table').insert({ id, ...fields })
```

### Catalog copy rule
Catalog items are copied to household `items` only when the user **completes** the restock form — never on tap. Early copy creates orphaned items with no inventory.

---

## Icons
Always use UIicons. Never use Unicode characters (`←`, `+`, `×`) as icon substitutes — the user will notice and correct it.

```tsx
// Usage pattern
<i className="fi-rr-angle-left" style={{ fontSize: 18, display: 'block' }} />

// Common names
// fi-rr-angle-left    Back navigation
// fi-rr-home          Home tab
// fi-rr-box           Inventory tab
// fi-rr-shopping-cart Shopping tab
// fi-rr-settings      Settings tab
// fi-rr-search        Search field
// fi-rr-barcode-scan  Barcode scanner
// fi-rr-plus          Add action
// fi-rr-cross-small   Close / dismiss
// fi-rr-check         Confirm / success
// fi-rr-pencil        Edit
// fi-rr-trash         Delete
```

To find any icon: `grep "fi-rr-[keyword]" public/fonts/uicons/uicons-regular-rounded.css`

---

## Predefined Data (`src/lib/constants.ts`)
- `CATEGORIES` — 12 categories
- `UNITS_GROUPED` — grouped unit list (Count, Volume, Weight, Pantry-specific)
- `LOCATIONS` — 4 locations with emoji: 🥫 Pantry, 🧊 Fridge, ❄️ Freezer, 🧂 Spice Rack

---

## Route Structure
```
src/app/
  layout.tsx              Root (660px, Figtree, UIicons)
  auth/                   Sign-in (public)
  onboarding/             Household setup (public)
  join/                   Invite code (public)
  (app)/                  Protected — all get BottomNav
    page.tsx              Dashboard
    add/
      page.tsx            Search
      new/page.tsx        New item form
      restock/
        page.tsx          Catalog restock (?catalogId=)
        [itemId]/         Existing item restock
```

---

## Key Files
- Requirements: `pantry-app-requirements.md`
- Build plan: `pantry-app-build-plan.md`
- Catalog seed: `supabase/seed-catalog.sql`
- Design source: Claude Design `b172af86-6596-44ba-8836-6fd416cb0b98`
