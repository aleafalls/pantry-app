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
```tsx
// Back arrow
<i className="fi-rr-angle-left" style={{ fontSize: 18, display: 'block' }} />

// Common names: fi-rr-home, fi-rr-box, fi-rr-shopping-cart, fi-rr-settings,
//               fi-rr-search, fi-rr-plus, fi-rr-barcode-scan, fi-rr-angle-left
```

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
