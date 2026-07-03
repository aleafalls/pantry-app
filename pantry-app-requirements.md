# Pantry Inventory App — Requirements Document

**Version:** 1.2  
**Status:** Draft  
**Last Updated:** June 2026  
**Authors:** Erica & Claude  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Core Pain Points](#2-core-pain-points)
3. [Workflows & Business Logic](#3-workflows--business-logic)
4. [Feature Specifications](#4-feature-specifications)
5. [Data Model](#5-data-model)
6. [Assumptions & Risks](#6-assumptions--risks)
7. [Open Decisions](#7-open-decisions)
8. [Phased Build Plan](#8-phased-build-plan)

---

## 1. Executive Summary

A mobile-first web app for two-person household pantry management, backed by Google Sheets in a Shared Google Drive and built on Google Apps Script. The app gives both users a shared, always-current view of home inventory across four storage locations — pantry, fridge, freezer, and spice rack — with intelligent add/restock flows, an auto-populated shopping list, and progressive AI enhancements layered on over time.

**Success metrics:**
- Both users are actively logging items within one week of launch
- All four storage locations populated with accurate inventory within two weeks
- Shopping list reliably reflects low-stock items without manual curation
- Average add/restock action completed in under 10 seconds

**Stack:**
- Backend: Supabase (Postgres database + Auth + Realtime)
- Frontend: Next.js (React) + shadcn/ui component library + Tailwind CSS, deployed to Vercel or Firebase Hosting
- Distribution: PWA (Progressive Web App) — users add to iOS home screen via Safari "Add to Home Screen." No App Store. Tester distribution is via URL only.
- Auth: Supabase Auth — magic link (email), no passwords
- Barcode lookup: Open Food Facts API (free, open source)
- AI features: Claude API (Anthropic)
- Typeface: Figtree (Google Fonts, weights 400–800)
- Icons: UIcons 3.0.0 (Flaticon) — web font, 4,682 icons. Files are in `icons/` at the project root. Use `woff2` only (iOS Safari 10+ target). Two styles: `uicons-regular-rounded.css` (prefix `fi-rr-`) and `uicons-solid-rounded.css` (prefix `fi-sr-`). Regular-rounded is the primary style. When scaffolding: copy `icons/` to `public/fonts/uicons/` and `@import` the CSS in `globals.css`.
- Visual language: Glassmorphism — frosted glass header and floating bottom nav dock; warm cream/yellow background (`oklch(97% 0.006 85)`); accent palette: yellow `#FFD333`, teal `#23967F`, red `#EE1B49`, orange `#FFA070`

---

## 2. Core Pain Points

1. **No shared visibility.** Without a system, one partner buys something already stocked, or neither buys something that's out, because there's no shared source of truth.

2. **Manual shopping lists fall apart.** Lists built from memory or scratch are incomplete and go stale between Costco runs, grocery runs, and delivery orders.

3. **Freezer and bulk items get forgotten.** Items stored in the freezer or bought in bulk at Costco get buried and go unused, wasting money and food.

4. **No signal on pantry value.** Without knowing what's already stocked, it's easy to default to eating out when a full pantry could produce a meal — spending money unnecessarily.

5. **Adding items has too much friction.** Existing pantry apps require too many taps or too much manual data entry, causing users to abandon the habit after a few days.

---

## 3. Workflows & Business Logic

### 3.1 First-Time Setup

**New user, creating a household:**

1. User opens the app URL for the first time on their phone.
2. Auth screen appears with a single email field: "Enter your email to get started."
3. User enters email and taps "Send magic link." A login email is sent via Supabase Auth.
4. User taps the link in the email → browser reopens the app, now authenticated.
5. First-time prompt: "Set up your household." User enters:
   - Display name (e.g., "Erica") — used for `AddedBy` attribution throughout the app.
   - Household name (e.g., "Erica & Jon's Pantry") — displayed in the app header.
6. Household is created in Supabase. User lands on the Home dashboard (empty state).
7. An invite code is automatically generated for the household (see 3.7).

**Existing user, signing in on a new device:**

1. User opens app URL.
2. Enters email → receives magic link → taps link → authenticated.
3. App recognizes the existing account and household. User lands on Home dashboard.

**Partner joining an existing household:**

1. Partner opens the invite link shared by User 1 (see 3.7) or navigates to the app and enters the invite code manually.
2. Auth screen appears pre-populated with the invite context.
3. Partner enters email → receives magic link → taps link → authenticated.
4. First-time prompt: "You're joining [Household Name]. What's your name?" Partner enters display name.
5. Partner is added to the household. Both users now share the same pantry data.

### 3.2 Add Item — Search-First Flow

This is the primary entry point for all item additions, used regardless of whether the item already exists in the pantry.

```
User taps "Add" tab
  └─ Search field appears with barcode icon in corner
       ├─ [User types] → type-ahead search against household Items + global Catalog
       │     ├─ Household item match → Restock Flow (3.3)
       │     ├─ Catalog match (not yet in household) → copy to household Items → Restock Flow (3.3)
       │     └─ No match → "Create [name]" row always appears at bottom → New Item Form (3.4)
       └─ [User taps barcode icon] → Barcode Scan Flow (3.5)
```

**Key logic:**
- Search queries both the household's `items` table and the global `catalog` table simultaneously.
- Household items appear first in results (personalized); catalog items appear below, deduplicated against any items already in the household.
- Results filter live as the user types — no submit button. Search is fuzzy/substring match on item name.
- When a user taps a **catalog item** for the first time, a copy is written to the household's `items` table (pre-filled with the catalog's category, unit, location, and emoji) before proceeding to Restock Flow. The `catalog_id` FK is set on the new row to track its origin.
- The "Create [name]" row appears as soon as any text is entered, even when matches exist, so the user never has to clear results to create a new item.
- Tapping an existing household item always routes to Restock, never to a full edit form.

### 3.3 Restock Flow

Triggered when a user taps an existing item from search results or a barcode scan resolves to a known item.

1. User sees a focused form: item name, emoji, current stock summary.
2. A quantity stepper (− / +) sets how much is being added.
3. A location selector (defaulting to the item's current primary location) allows restocking to a different location if needed.
4. A preview line shows: "After adding, you'll have X [unit] total."
5. User taps "Add to pantry."
6. Inventory sheet row is updated: quantity incremented, `PurchaseDate` updated, `AddedBy` and `LastUpdated` set.
7. Success confirmation screen with options: "Add another item" or "Back to home."

**Key logic:**
- Quantity defaults to the last quantity used when restocking this specific item (stored in `DefaultRestockQty` and updated on every successful restock). Falls back to 1 if no restock history exists.
- If the item was flagged as low or manual-flagged, the low flag is automatically cleared when restocked above threshold.
- The shopping list entry for this item is marked resolved if it was present.

### 3.4 New Item Form

Triggered when a user taps "Create [name]" from search results or when a barcode scan returns no result from Open Food Facts.

Fields (all visible on one screen, no pagination):

| Field | Input Type | Required | Default |
|---|---|---|---|
| Item name | Text (pre-filled from search) | Yes | Search query |
| Category | Dropdown (predefined list) | Yes | — |
| Location | Dropdown | Yes | — |
| Quantity | Number | Yes | 1 |
| Unit | Dropdown (predefined list) | Yes | — |
| Purchase date | Date picker | Yes | Today |
| Low threshold | Number | Yes | 2 |
| Tags | Pill-style tag input | No | — |

On save:
- A new row is written to the **Items** sheet (catalog entry).
- A new row is written to the **Inventory** sheet (stock entry).
- AI emoji assignment is triggered asynchronously (Phase 2).

### 3.5 Barcode Scan Flow

1. User taps the barcode icon on the Add screen.
2. Browser requests camera permission (first use only).
3. Camera viewfinder appears. Scanning is implemented using `html5-qrcode` (loaded from jsDelivr CDN), which supports iOS Safari, Android Chrome, and desktop browsers without requiring a native API.
4. On successful scan, barcode value is sent to Open Food Facts API.
5. **If product found:** Name, category, and emoji (if available) are pre-filled. User is dropped into either Restock Flow (if item exists in Items catalog by name or barcode) or New Item Form (if genuinely new).
6. **If product not found:** User is dropped into New Item Form with name blank and barcode silently saved to the `Barcode` field for future enrichment.

**Fallback:** If camera permission is denied, display an inline message: "Camera access needed for scanning. You can still add items by typing." The search field remains the primary fallback and no error state is shown unprompted.

### 3.6 Shopping List Auto-Population

The shopping list is maintained automatically by the system and can also be edited manually by either user.

**Auto-add trigger (either condition):**
- Item's `Quantity` in Inventory ≤ its `LowThreshold`
- Item's `ManualLowFlag` is set to `TRUE`

**Auto-add behavior:**
- A new row is written to the ShoppingList sheet with `Reason: auto`, `Status: pending`, `AddedDate`, and `AddedBy: system`.
- Duplicate check: if the item already has a pending row in ShoppingList, do not add again.

**Manual add:**
- User types into the "Add item to list" field on the Shopping List tab.
- Item does not need to exist in the Items catalog.
- Row is written with `Reason: manual`, `AddedBy: [user name]`.

**Check-off behavior:**
- Tapping the checkbox marks the row `Status: purchased` and moves it to a "Completed" section at the bottom of the Shopping List screen.
- A prompt appears: "Restock this item now?" — if accepted, launches the Restock Flow for that item.
- Completed items remain visible in the Completed section for the duration of the shopping trip, giving both users visibility into what has already been picked up.
- The Completed section can be manually cleared by the user once the trip is done.

**Visibility:** Both users see the same live list, sourced from the same Supabase table. Supabase Realtime pushes updates to all household members without a page refresh.

---

### 3.7 Household & Invite Flow

Each household has an **invite code** — a short, unique alphanumeric string (e.g., `PINE-42`). This code is the mechanism for any user to join a specific household's data.

**Invite flow:**

1. The household creator can find the invite code at any time in Settings → "Invite someone."
2. The Settings screen provides two sharing options:
   - **Copy invite link:** A URL with the invite code embedded (e.g., `app.example.com/join?code=PINE-42`). Shareable via any messaging app.
   - **Copy code:** Just the raw code, for someone who already has the app open.
3. When a new user opens an invite link, the auth screen is pre-filled with the join context ("You've been invited to join [Household Name]").
4. After authenticating via magic link, they enter their display name and are immediately added to the household.
5. A household can have more than two members (supports testers and additional family members).

**Data isolation:**

- Every table in Supabase has a `household_id` column.
- Supabase Row Level Security (RLS) policies enforce that authenticated users can only read and write rows belonging to their own household.
- No user can access another household's data, regardless of invite codes or URL manipulation.

---

## 4. Feature Specifications

### 4.1 Dashboard

**Function & Purpose:**  
The home screen provides an at-a-glance summary of pantry health and surfaces the most actionable items — what's running low, what's been sitting longest, and quick access to add.

**Core Requirements:**

*Header (glassmorphic)*
- Frosted glass treatment: `backdrop-filter: blur(20px) saturate(160%)`, translucent warm white background.
- Greeting based on time of day ("Good morning / afternoon / evening") in muted text above the household name.
- Household name displayed large and bold (22px / weight 800).
- Avatar stack: one circle per household member, showing their initial. First member uses yellow `#FFD333` background; second uses teal `#23967F`. Circles overlap with a small negative margin. Derived from `display_name` in `profiles`.

*Summary stat cards (3-up row)*
- Liquid glass cards: semi-transparent white with backdrop-filter blur and a subtle inset highlight border.
- **Items:** Total count of distinct active items in inventory across all locations. Large bold number, "Items" label below.
- **Est. value:** Calculated from `Quantity × EstimatedPrice` per item. Displays as `~$XXX`. Items without a price are excluded from the total (not treated as $0). "Est. value" label below. Hidden in Phase 1 (no price estimation yet) — card omitted until Phase 2.
- **Low:** Count of items currently flagged low (auto or manual). Card background uses red tint treatment (`color-mix(in oklch, #EE1B49 22%, white 78%)`) when count > 0. Number and label both render in `#C81440` when active.

*Recipe teaser (Phase 1: placeholder)*
- A tappable button in warm yellow gradient (`#FFD333` → `#FFE680`) with a light sheen overlay.
- Icon: 🍳 in a frosted glass pill. Label: "What can I make?" / sub-label: "Get recipes from what you have."
- In Phase 1, tapping this button shows a coming-soon state ("Recipe suggestions coming soon"). The button exists in the layout from the start so the dashboard feels complete.
- In Phase 3, tapping launches the Recipe Suggestions flow.

*Running low section*
- Section header: "RUNNING LOW" in small caps, uppercase, weight 800. Badge showing count (white text, red gradient pill).
- "View all" link right-aligned in amber (`#A86F00`).
- Each item row: dot indicator + emoji + name (flex 1) + location label + quantity number.
  - **Critical** (qty = 0): Red dot (`#EE1B49`), quantity in `#C81440`.
  - **Low** (qty > 0 but ≤ threshold): Orange dot (`#FFA070`), quantity in `#B85A2E`.
- Rows separated by a subtle divider (`oklch(94% 0.007 85)`).
- Sorted: Critical first, then Low; alphabetically within each tier.
- Maximum 8 items shown; "View all" reveals the full low-stock list.

*Use these up section*
- Section header: "USE THESE UP" in small caps, uppercase, weight 800.
- **Horizontal scroll** of chips — not a vertical list. Overflow-x scrollable.
- Each chip: emoji + name (weight 700) + relative age ("8 wks ago") in muted text.
- Chip background: `oklch(89% 0.014 85)` — slightly darker than the page background.
- Maximum 3 chips shown (horizontal scroll handles overflow naturally).

*Empty state*
- When no items have been added yet, the dashboard shows a blank state with a prompt: "Your pantry is empty. Add your first item to get started." and a prominent "Add item" button.
- Stat cards, recipe teaser, running low, and use these up sections are all hidden in empty state.
- Empty state is dismissed permanently once the first item is saved.

*Bottom navigation (floating glass dock)*
- Floating pill positioned 16px from the bottom of the viewport, 20px from each side.
- Glass treatment: `backdrop-filter: blur(22px) saturate(180%)`, semi-transparent white, rounded (28px radius).
- Five items, evenly spaced: **Home** 🏠, **Inventory** 📦, **Add** (center, elevated), **Shopping List** 🛒, **Settings** ⚙️.
- The **Add** button is a circular floating element that rises above the nav bar (negative top margin ~−30px), yellow gradient (`#FFE680` → `#FFD333`), shows a `+` character at 22px/weight 800.
- Inactive tabs render their emoji at reduced opacity (0.4). The active tab renders at full opacity.
- Shopping List tab shows a badge with pending item count when > 0.

**Open Decisions:**
- [ ] **Est. value display:** When AI price estimation is available (Phase 2), should the dashboard show a confidence indicator alongside the estimated total?

---

### 4.2 Inventory Browser

**Function & Purpose:**  
A browsable, filterable view of all items in the pantry. Used for reference, quick edits, and flagging items manually.

**Core Requirements:**

*Search & filter*
- Search bar (substring match on item name).
- Location filter pills: All / Pantry / Fridge / Freezer / Spice rack. Single-select.
- When "All" is selected, items are grouped by location with muted group header labels.
- Within each location group, items are sorted alphabetically by name by default.

*Item rows*
- Each row shows: emoji, name, total quantity + unit across all locations, category, and badge if low/critical.
- If an item exists in more than one location (e.g., chicken in both Fridge and Freezer), a single combined row is shown with the summed quantity (e.g., "3 lbs") and a location summary badge (e.g., "Fridge + Freezer").
- Rows are tappable to open the Item Detail view.

*Item detail view*
- Shows all fields for the item: name, emoji, category, tags, low threshold, last updated by.
- Shows a per-location breakdown of stock (e.g., "Fridge: 1 lb / Freezer: 2 lbs").
- Editable inline: quantity per location, manual low flag toggle, tags (pill-style input).
- "Restock" shortcut button that launches the Restock Flow for this item.
- "Remove item" option (soft delete — marks the item inactive, does not delete the row).

**Open Decisions:**
- None. All inventory browser decisions resolved.

---

### 4.3 Add Item & Restock

**Function & Purpose:**  
Single entry point for all inventory additions. Routes intelligently to a short restock form for existing items or a full form for new items, minimizing required taps for either case.

**Core Requirements:**

*Search field*
- Auto-focused when the Add tab is opened.
- Displays results live as user types (no submit).
- Shows matching existing items from the Items catalog.
- Always shows a "Create [name]" option at the bottom once text is entered.
- Barcode icon in top corner provides access to camera scan (see 4.4).

*Restock form*
- Pre-populated with item's name, emoji, and current stock summary.
- Quantity stepper (min 1, no upper bound).
- Location selector (defaults to item's existing location).
- Running total preview ("After adding, you'll have X [unit] total").
- Single "Add to pantry" CTA.

*New item form*
- Item name pre-filled from search query.
- All required fields visible on one screen (no multi-step flow).
- Required: name, category, location, quantity, unit, purchase date, low threshold.
- Optional: tags (pill-style input).
- Single "Save item" CTA.

*Tags input (pill-style)*
- Tags are entered via a pill-style input: user types a tag and presses space or comma to commit it as a removable pill.
- Existing tags on the item are pre-populated as pills when editing.
- No predefined tag list — fully freeform.

*Fixed unit list (dropdown)*  
Grouped for readability:
- Count: each, pair, pack, box, bag, bunch, loaf, roll
- Volume: fl oz, cup, pint, quart, gallon, ml, L
- Weight: oz, lb, g, kg
- Pantry-specific: can, jar, bottle, carton, pouch, tub, block, slice

*Predefined category list (dropdown)*  
Canned Goods, Dry Goods & Grains, Baking, Condiments & Sauces, Snacks, Beverages, Frozen, Dairy & Refrigerated, Produce, Meat & Seafood, Spices & Seasonings, Household & Other

*Success state*
- After saving, show a confirmation screen.
- Two options: "Add another item" (returns to search field, cleared) or "Back to home."

**Open Decisions:**
- [ ] **Default restock location:** When the same item exists in multiple locations, which location should the restock form default to — most recently restocked, or prompt the user to choose?

---

### 4.4 Barcode Scanning

**Function & Purpose:**  
Reduce manual typing for packaged goods (especially Costco and grocery items) by scanning product barcodes to auto-fill item details from the Open Food Facts database.

**Core Requirements:**

*Scan trigger*
- Barcode icon displayed in top-right corner of the Add screen.
- On tap, requests camera permission (browser-native prompt, first use only).
- Scanning is implemented using `html5-qrcode` (loaded from jsDelivr CDN), which supports iOS Safari, Android Chrome, and desktop browsers without requiring the native `BarcodeDetector` API. iOS Safari is the primary target device.

*Open Food Facts lookup*
- On successful barcode read, a `GET` request is made to `https://world.openfoodfacts.org/api/v2/product/{barcode}.json`.
- If product found: pre-fill item name, best-match category, and emoji (if available from product data).
- The barcode value is always saved to the `Barcode` field in Items, regardless of lookup result.

*Routing after scan*
- If scanned barcode matches an existing item in the Items catalog (by `Barcode` field): route to Restock Form.
- If product found in Open Food Facts but not in catalog: route to New Item Form with fields pre-filled.
- If product not found in Open Food Facts: route to New Item Form with name blank.

*Graceful degradation*
- If camera permission is denied: show inline message "Camera access needed for scanning. You can still add items by typing."
- If Open Food Facts API is unreachable: proceed to New Item Form with blank name field. Do not block entry.

**Open Decisions:**
- None. Barcode scanning decisions resolved.

---

### 4.5 Shopping List

**Function & Purpose:**  
A shared, always-current list of items to buy, auto-populated from low inventory and manually editable by either user.

**Core Requirements:**

*Auto-populated section*
- Items meeting low threshold or manual flag criteria are automatically added.
- Labeled with an "auto" badge to distinguish from manually added items.
- Shows item name, reason (e.g., "Running low · 1 bottle"), and suggested restock quantity (item's `DefaultRestockQty` if set, otherwise blank).
- Auto-added items appear in a separate grouped section above manually added items.

*Manually added section*
- Quick-add text input at bottom of screen.
- User types item name and taps "Add."
- Item does not need to exist in Items catalog (supports truly new purchases).
- Shows who added each manual item ("Added by Erica").

*Check-off behavior*
- Tapping a checkbox marks the item with strikethrough and reduced opacity, and moves it to a "Completed" section at the bottom of the screen.
- A prompt appears: "Restock this item now?" If yes: launches Restock Flow. If no: item moves to Completed without restocking.
- The Completed section remains visible throughout the shopping trip so both users can see what's already been picked up.
- A "Clear completed" button at the top of the Completed section removes all purchased rows from view (sets `Status: cleared`).
- Badge on the List tab in the bottom nav shows count of unchecked (pending) items only.

*Shared visibility*
- Both users read from and write to the same ShoppingList sheet in real time.
- `AddedBy` field reflects the user who added or checked off each item.

**Error handling:**
- If the sheet is temporarily unreachable, display a muted banner: "Unable to connect — check your connection." No offline editing; the app is read-only until connection is restored.

**Open Decisions:**
- None. Shopping list decisions resolved.

---

### 4.6 AI: Pantry Value Estimate *(Phase 2)*

**Function & Purpose:**  
Display an estimated dollar value of current pantry inventory on the dashboard to provide positive reinforcement against unnecessary food purchases and eating out. Prices are estimated automatically by AI based on the user's location — no manual price entry required.

**Core Requirements:**

- On new item save (or on-demand via a "Refresh estimates" action), a request is made to the Claude API with the item name, category, unit, and the household's approximate location (city/region, stored in Settings).
- Claude returns an estimated price per unit in USD based on typical local grocery prices for that item.
- Estimated prices are stored in the `EstimatedPrice` field of the Items sheet and used for all subsequent calculations until refreshed.
- Dashboard displays total as `~$XXX`, calculated as sum of `Quantity × EstimatedPrice` across all active inventory rows.
- Items pending price estimation show a placeholder until the async call completes.
- Users can manually override any AI-estimated price from the Item Detail view if the estimate is clearly wrong.
- If fewer than 50% of items have price estimates (e.g., during initial setup), display as "~$XXX (partial)" to indicate the total is incomplete.

**Open Decisions:**
- [ ] **Location granularity:** Should the app store city-level location (e.g., "Chicago, IL") for price estimation context, or is region-level (e.g., "Midwest US") sufficient?
- [ ] **Refresh cadence:** Should estimated prices auto-refresh periodically (e.g., monthly), or only when manually triggered?

---

### 4.7 AI: Emoji Assignment *(Phase 2)*

**Function & Purpose:**  
Automatically assign a relevant emoji to new items at creation time, reducing the need for manual emoji selection while making the inventory visually scannable.

**Core Requirements:**

- On save of a new item (via New Item Form), if no emoji is manually set, an async request is made to the Claude API with the item name and category.
- The prompt includes both name and category context for accuracy (e.g., "Item: Greek Yogurt, Category: Dairy & Refrigerated — return one emoji character only, no other text").
- Claude returns a single emoji character appropriate for the item.
- The emoji is written back to the `Emoji` field in the Items sheet.
- The UI updates to display the assigned emoji; if the async call is still in progress, a placeholder (neutral box or spinner) is shown.
- Emoji is stored permanently in the Items catalog and never re-requested unless the user manually clears it.
- Users can override the assigned emoji from the Item Detail view.
- A one-time "Enrich all items" action is available in Settings to batch-assign emojis to any existing items that were added before this feature was live. The action processes items sequentially and shows a progress indicator.

**Open Decisions:**
- None. Emoji assignment decisions resolved.

---

### 4.8 AI: Recipe Suggestions *(Phase 3)*

**Function & Purpose:**  
Suggest recipes based on current pantry inventory, prioritizing items that are oldest or approaching low-stock, to reduce food waste and eliminate the friction of "what should I make?"

**Core Requirements:**

*Entry point*
- "What can I make?" button on the Home dashboard.
- Can also be triggered from an individual item's detail view ("Recipes using this").

*Request construction*
- On trigger, the current full inventory list (name, quantity, unit, purchase date, location) is passed to the Claude API as context.
- The prompt instructs Claude to prioritize: (1) items with the oldest purchase dates, (2) items flagged low or critical, (3) minimizing the number of additional ingredients needed.
- No dietary restrictions filter (user indicated no strong restrictions).

*Response format*
- Claude returns 3–5 recipe suggestions.
- Each suggestion includes: recipe name, brief description (1 sentence), list of pantry items used, list of additional ingredients needed (if any), and an estimated match score ("You have 8 of 10 ingredients").
- Displayed as a card list, tappable to expand details.

*Shopping list integration*
- On any recipe card, user can tap "Add missing ingredients to list."
- Missing ingredients are written to the ShoppingList sheet with `Reason: recipe`, `AddedBy: [user]`.

**Open Decisions:**
- [ ] **Recipe history:** Should suggested recipes be saved so the same ones aren't repeatedly suggested?
- [ ] **Serving size context:** Should the app pass household size (2 adults) as context to Claude to influence recipe scale?
- [ ] **Cuisine or meal-type filtering:** Should users be able to filter suggestions by type (e.g., quick meals, specific cuisine)?

---

## 5. Data Model

### 5.1 Supabase (Postgres) Tables

All household-scoped tables include a `household_id` foreign key. Supabase Row Level Security (RLS) policies enforce that users can only access rows for their own household. The `catalog` table is global and readable by all authenticated users.

---

**Table: `catalog`** — Global pre-seeded item library. Read-only to users; populated via a seed migration.

~1,000 common pantry, fridge, freezer, and spice rack items. Generated by Claude and stored as a seed CSV committed to the project repo. Items are generic (not branded): "Chicken Breast", "Black Beans", "Olive Oil" — not "Trader Joe's Organic Chicken."

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| name | Text | Generic display name (e.g., "Chicken Breast") |
| category | Text | From predefined category list |
| default_unit | Text | Most common unit for this item (e.g., `lb`) |
| default_location | Text | Most likely storage location (`pantry` / `fridge` / `freezer` / `spice_rack`) |
| emoji | Text | Single emoji character |
| tags | Text[] | Descriptive tags (e.g., `["protein", "meat"]`) |
| created_at | Timestamptz | |

When a user selects a catalog item for the first time, its fields are copied into the household's `items` table with `catalog_id` set. The user can then override any field (location, unit, etc.) per their household's preferences.

---

**Table: `households`** — One row per household.

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| name | Text | Household display name (e.g., "Erica & Jon's Pantry") |
| invite_code | Text | Unique short code for joining (e.g., `PINE-42`) |
| location | Text | City/region for AI price estimation (e.g., "Chicago, IL") |
| default_low_threshold | Integer | Default low threshold for new items |
| created_at | Timestamptz | |

---

**Table: `profiles`** — One row per authenticated user. Extends Supabase `auth.users`.

| Column | Type | Description |
|---|---|---|
| id | UUID | PK, FK → `auth.users.id` |
| household_id | UUID | FK → `households.id` (nullable until household joined) |
| display_name | Text | User's chosen name, used for AddedBy attribution |
| created_at | Timestamptz | |

---

**Table: `items`** — Master product catalog. One row per unique item type per household.

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| household_id | UUID | FK → `households.id` |
| name | Text | Display name |
| category | Text | From predefined category list |
| tags | Text[] | Array of freeform tags |
| default_unit | Text | From unit list |
| default_restock_qty | Numeric | Suggested quantity for restock form default |
| emoji | Text | Single emoji character |
| low_threshold | Integer | Auto-flag when inventory ≤ this value |
| barcode | Text | UPC/EAN barcode (optional, used for scan lookup) |
| estimated_price | Numeric | Price per unit in USD (optional) |
| catalog_id | UUID | Nullable FK → `catalog.id`. Set when item was copied from the global catalog; null for fully custom items. |
| active | Boolean | `false` = soft-deleted, excluded from all views |
| created_at | Timestamptz | |
| updated_at | Timestamptz | |

---

**Table: `inventory`** — Live stock ledger. One row per item–location combination.

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| household_id | UUID | FK → `households.id` |
| item_id | UUID | FK → `items.id` |
| location | Text | `pantry` / `fridge` / `freezer` / `spice_rack` |
| quantity | Numeric | Current quantity on hand |
| unit | Text | From unit list |
| purchase_date | Date | Most recent restock date |
| manual_low_flag | Boolean | User-set override regardless of threshold |
| added_by | UUID | FK → `auth.users.id` (user who last modified) |
| updated_at | Timestamptz | |

---

**Table: `shopping_list`** — Items to purchase.

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| household_id | UUID | FK → `households.id` |
| item_id | UUID | Nullable FK → `items.id` (null for freeform entries) |
| item_name | Text | Denormalized display name (supports freeform entries) |
| quantity | Numeric | Suggested quantity to buy (optional) |
| unit | Text | Unit (optional) |
| reason | Text | `auto` / `manual` / `recipe` |
| added_at | Timestamptz | |
| added_by | UUID | Nullable FK → `auth.users.id` (null for system-generated rows) |
| status | Text | `pending` / `purchased` / `cleared` |
| completed_at | Timestamptz | Nullable |

---

### 5.2 Data Access Layer

**Supabase client (browser-direct with RLS)** — Used for all standard CRUD operations from the Next.js frontend. RLS policies handle authentication enforcement so no additional API proxy is needed for reads and writes.

| Operation | Pattern |
|---|---|
| Read items / inventory / shopping list | Supabase JS client, filtered automatically by RLS to the user's household |
| Write item, restock, check off shopping list | Supabase JS client `insert` / `update` |
| Realtime shopping list sync | Supabase Realtime subscription on `shopping_list` table for the current household |

**Next.js API routes** — Used only for operations that require server-side secrets or external API calls.

| Route | Method | Purpose |
|---|---|---|
| `/api/barcode/[barcode]` | GET | Proxy to Open Food Facts API (avoids CORS on mobile Safari) |
| `/api/ai/emoji` | POST | Call Claude API to assign emoji to a new item |
| `/api/ai/price` | POST | Call Claude API to estimate item price |
| `/api/ai/recipes` | POST | Call Claude API with inventory context to suggest recipes |

**Auth routes (handled by Supabase Auth)** — No custom code required.

| Flow | Mechanism |
|---|---|
| Sign in / sign up | Supabase Auth magic link via `supabase.auth.signInWithOtp({ email })` |
| Session persistence | Supabase handles JWT refresh automatically |
| Sign out | `supabase.auth.signOut()` |

---

## 6. Assumptions & Risks

### 6.1 Key Assumptions

**Technical**
- Both users' phones support modern mobile Safari (iOS) and Chrome, which is the primary target. Barcode scanning is implemented via `html5-qrcode` (jsDelivr CDN), which supports iOS Safari without requiring the native `BarcodeDetector` API.
- Supabase Free tier limits (500 MB database, 5 GB bandwidth/month, 50,000 monthly active users) are not a concern for a household-scale POC.
- Open Food Facts has sufficient coverage for the types of products purchased at Costco and grocery delivery services.
- Users have reliable access to their email inbox on the same device they use the app (required for magic link auth).

**Behavioral**
- Both users will consistently open the app to log items at the time of purchase or restocking (not retroactively).
- The initial inventory population (entering all current pantry items) is a one-time overhead both users are willing to do.
- Users will use the app regularly enough that Supabase Free tier projects do not pause (projects pause after 7 days of zero activity on the free tier).

**Data**
- Items that exist in multiple locations (e.g., chicken in both fridge and freezer) are stored as separate inventory rows per location but displayed as a single combined row in the UI with summed quantity and a location summary badge.
- Multiple households can exist independently in the same Supabase project. Testers each create their own household and see only their own data.

### 6.2 Known Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Habit abandonment — one or both users stops logging | Medium | High | Minimize friction (≤10s per action), make shopping list value obvious early |
| Open Food Facts API rate limiting or downtime | Low | Low | Graceful fallback to manual entry; Next.js proxy route is non-blocking |
| Supabase Free tier project pauses after 7 days idle | Low | Medium | App shows a clear error if the database is unreachable; user restores from Supabase dashboard (< 1 min). For sustained use, upgrade to Pro ($25/mo) |
| Magic link email lands in spam or never arrives | Low | Medium | Show "didn't receive it?" help text with instructions to check spam; allow re-sending |
| `html5-qrcode` library scan reliability on iOS Safari | Medium | Low | Graceful fallback to manual text entry; barcode is a convenience feature, not required |
| Initial inventory data entry is burdensome and never completed | Medium | High | Consider a "quick add mode" for bulk first-time entry (quantity + location only, fill details later) |
| AI price estimates are significantly inaccurate for specialty or regional items | Medium | Low | Users can override any estimate from Item Detail view; partial totals are labeled as such |
| Tester data bleeds into household owner's data | Low | High | RLS policies on every table enforce household isolation. Covered by Supabase security model. |

---

## 7. Open Decisions

The following decisions have been resolved and incorporated into the relevant feature specs above:

| Decision | Resolution |
|---|---|
| Frontend stack | Next.js + shadcn/ui + Tailwind CSS |
| Backend | Supabase (Postgres + Auth + Realtime) |
| Auth method | Magic link (email) via Supabase Auth — no passwords |
| Data isolation | Per-household via `household_id` + Supabase RLS policies |
| Multi-household / testers | Each household gets isolated data; invite code for joining |
| Est. value population | AI-estimated by location via Claude API — no manual entry |
| Empty dashboard state | Blank state illustration with "Add your first item" invite |
| Inventory sort order | Alphabetical within location groups |
| Multi-location items | Single combined row with summed quantity and location badge |
| Default restock quantity | Remember last quantity used per item; fallback to 1 |
| Tags input | Pill-style tag input |
| iOS barcode scanning | `html5-qrcode` (jsDelivr CDN) — iOS Safari supported |
| Completed shopping list items | Moved to Completed section; manually cleared by user |
| Offline support | Read-only when disconnected; no offline editing in v1 |
| Price population | AI-estimated; manual override available per item |
| Emoji prompt design | Includes category context in Claude API prompt |
| Batch emoji enrichment | One-time "Enrich all items" action in Settings |
| Real-time sync | Supabase Realtime subscription on `shopping_list` table |
| Distribution model | PWA — Add to Home Screen via Safari. No App Store. URL sharing for testers. |
| App Store / Capacitor | Deferred. Capacitor is viable later but requires: migrating Next.js API routes to Supabase Edge Functions, deep-link setup for magic link auth, Apple Developer account ($99/yr), and accepting App Store review delays. |
| Global item catalog | AI-generated seed of ~1,000 generic pantry items; copied to household on first use |
| Catalog item model | Copy-to-household on first use; `catalog_id` FK tracks origin |
| Catalog data source | Claude-generated CSV seed, committed to repo as a Supabase migration |
| Typeface | Figtree (Google Fonts, weights 400–800) |
| Icon library | UIcons 3.0.0 (Flaticon) web font, woff2 only. Source: `icons/` in project root. Primary: `fi-rr-*` (regular-rounded) |
| Visual language | Glassmorphism — frosted glass header + floating bottom nav dock |
| Color palette | Yellow #FFD333/#FFE680, Teal #23967F, Red #EE1B49/#C81440, Orange #FFA070/#B85A2E |
| Background color | oklch(97% 0.006 85) — warm cream |
| Bottom nav structure | 5 tabs: Home 🏠, Inventory 📦, Add + (center, elevated), Shopping 🛒, Settings ⚙️ |
| Running low indicators | Dot: red (#EE1B49) = Critical (qty 0); orange (#FFA070) = Low (qty > 0) |
| Use these up layout | Horizontal scroll chips (not a vertical list) |
| Recipe teaser on dashboard | Present in Phase 1 as a placeholder; shows "coming soon" state until Phase 3 |

**Remaining open decisions (Phase 3 — Recipe Suggestions):**
- [ ] **Recipe history:** Should suggested recipes be saved to avoid repeatedly surfacing the same ones?
- [ ] **Serving size context:** Should household size (2 adults) be passed to Claude to influence recipe scale?
- [ ] **Cuisine or meal-type filtering:** Should users be able to filter suggestions by type (e.g., quick meals, specific cuisine) before generating?

**Remaining open decisions (Phase 2 — AI Value Estimate):**
- [ ] **Location granularity:** City-level (e.g., "Chicago, IL") or region-level (e.g., "Midwest US") for price estimation context?
- [ ] **Refresh cadence:** Should estimated prices auto-refresh periodically (e.g., monthly) or only when manually triggered?

**Remaining open decisions (Phase 1 — Add Item):**
- [ ] **Default restock location:** When the same item exists in multiple locations, should the restock form default to most recently restocked location, or prompt the user to choose?

---

## 8. Phased Build Plan

### Phase 1 — Core MVP
*Goal: Both users can manage pantry inventory on their phones within 1–2 weeks of starting.*

**Included:**
- Supabase project setup: `catalog`, `households`, `profiles`, `items`, `inventory`, `shopping_list` tables with RLS policies
- Global item catalog: AI-generated seed CSV (~1,000 generic pantry items with category, unit, location, emoji) applied as a Supabase seed migration
- Next.js app with shadcn/ui: Home dashboard, Inventory browser, Add (search-first + restock + new item), Shopping list
- Supabase Auth: magic link email sign-in
- Household creation flow + invite code / invite link
- Add flow searches both household items and global catalog; catalog items copied to household on first use
- Running low logic (threshold + manual flag)
- Auto-population of shopping list from low-stock items (triggered on inventory write)
- Supabase Realtime subscription for shopping list live sync
- Basic item detail/edit view
- Success/confirmation flows

**Not included in Phase 1:**
- Barcode scanning
- AI emoji assignment
- Pantry value estimate
- Recipe suggestions
- Offline support

---

### Phase 2 — Smart Capture
*Goal: Reduce entry friction for packaged goods; make the inventory visually richer and financially informative.*

**Included:**
- Barcode scanning via `html5-qrcode` + Open Food Facts API via Next.js proxy route (iOS Safari supported)
- AI emoji assignment via Claude API (async on new item save + one-time batch enrichment)
- AI pantry value estimate via Claude API (location-based, no manual price entry)
- "Longest stored" / "Use these up" dashboard section (requires Phase 1 purchase date data)
- `HouseholdLocation` setting added to Settings screen for price estimation context

---

### Phase 3 — AI Intelligence
*Goal: Make the pantry data actively useful for meal planning and waste reduction.*

**Included:**
- Recipe suggestions via Claude API (from dashboard and item detail)
- Missing ingredient → shopping list integration
- Smart restock pattern detection (cadence-based low alerts)

---

*End of document*
