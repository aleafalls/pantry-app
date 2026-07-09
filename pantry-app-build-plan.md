# Pantry App — Build Plan

**Version:** 1.1  
**Last Updated:** July 2026  
**Stack:** Next.js · shadcn/ui · Supabase · Tailwind CSS · UIcons · Figtree  

---

## How to Use This Document

This document is the step-by-step guide for building the pantry app from zero to deployed. Each phase has a clear goal, ordered steps, and notes on who does what.

**Legend:**

| Symbol | Meaning |
|---|---|
| 🧑‍💻 **You** | Something you do in a browser, dashboard, or by running a command in the terminal |
| 🤖 **Claude** | Something Claude writes or generates — you just copy/paste or run a provided command |
| ⚠️ **Important** | A decision point, common mistake to avoid, or something that affects later steps |
| ✅ **Verify** | How to confirm the step worked before moving on |

**How sessions work:** Each build session, start by opening this document and the requirements (`pantry-app-requirements.md`) so Claude has full context. Tell Claude which phase you're in and what step you're on. Claude will write the code; you run the commands and test on your phone.

---

## Table of Contents

1. [Phase 0 — Prerequisites & Accounts](#phase-0--prerequisites--accounts)
2. [Phase 1 — Supabase Backend](#phase-1--supabase-backend)
3. [Phase 2 — Next.js Project Scaffold](#phase-2--nextjs-project-scaffold)
4. [Phase 3 — Visual Foundation](#phase-3--visual-foundation)
5. [Phase 4 — Deploy Shell to Vercel](#phase-4--deploy-shell-to-vercel)
6. [Phase 5 — Auth & Household Flow](#phase-5--auth--household-flow)
7. [Phase 6 — Dashboard](#phase-6--dashboard)
8. [Phase 7 — Add Item Flow](#phase-7--add-item-flow)
9. [Phase 8 — Inventory Browser](#phase-8--inventory-browser)
10. [Phase 9 — Shopping List](#phase-9--shopping-list)
11. [Phase 10 — Settings Screen](#phase-10--settings-screen)
12. [Phase 11 — PWA Configuration](#phase-11--pwa-configuration)
13. [Phase 12 — Barcode Scanning *(Phase 2)*](#phase-12--barcode-scanning-phase-2)
14. [Phase 13 — AI Features *(Phase 2)*](#phase-13--ai-features-phase-2)
15. [Phase 14 — Chef: Recipes & AI Suggestions *(Phase 3)*](#phase-14--chef-recipes--ai-suggestions-phase-3)
16. [Phase 15 — Chef: Web Recipe Import *(Phase 3)*](#phase-15--chef-web-recipe-import-phase-3)
17. [Phase 16 — Chef: Photo Recipe Import *(Phase 3)*](#phase-16--chef-photo-recipe-import-phase-3)

---

## Phase 0 — Prerequisites & Accounts

**Goal:** Have all the tools and accounts in place before writing a single line of code.

---

### 0.1 — Install Node.js

Node.js is the JavaScript runtime that runs the app locally on your Mac during development.

1. 🧑‍💻 Go to [nodejs.org](https://nodejs.org) and download the **LTS** version (the one labeled "Recommended For Most Users").
2. 🧑‍💻 Run the installer — click through all defaults.
3. 🧑‍💻 Open **Terminal** (search "Terminal" in Spotlight) and paste:
   ```
   node --version
   ```
4. ✅ You should see a version number like `v22.x.x`. If so, Node is installed.

---

### 0.2 — Install VS Code

VS Code is the code editor. Claude will write code into files here.

1. 🧑‍💻 Go to [code.visualstudio.com](https://code.visualstudio.com) and download for Mac.
2. 🧑‍💻 Move it to your Applications folder and open it.
3. 🧑‍💻 Install the **Claude Code** extension if not already installed (search "Claude Code" in the Extensions sidebar).

> ⚠️ You likely already have this since you're using Claude Code in VS Code now. Skip if so.

---

### 0.3 — Create a GitHub Account & Repo

GitHub stores your code remotely so it's never lost and can be deployed.

1. 🧑‍💻 Go to [github.com](https://github.com) and create a free account if you don't have one.
2. 🧑‍💻 Click **New repository**. Name it `pantry-app`. Set it to **Private**. Click **Create repository**.
3. 🧑‍💻 Back in Terminal, navigate to your pantry-app folder:
   ```
   cd "/Users/eerwin/Antigravity Projects/Personal Projects/pantry-app"
   ```
4. 🧑‍💻 Run these commands one at a time:
   ```
   git init
   git add .
   git commit -m "Initial commit — requirements and icons"
   ```
5. 🧑‍💻 Follow the instructions GitHub shows you under "push an existing repository from the command line."

✅ **Verify:** Refresh the GitHub page — you should see your files there.

---

### 0.4 — Create a Supabase Account

Supabase is the backend database and auth system.

1. 🧑‍💻 Go to [supabase.com](https://supabase.com) and click **Start your project**.
2. 🧑‍💻 Sign up with GitHub (easiest) or email.
3. 🧑‍💻 Once logged in, you'll land on the Supabase dashboard. You don't need to create a project yet — that's Phase 1.

---

### 0.5 — Create a Vercel Account

Vercel hosts the live app.

1. 🧑‍💻 Go to [vercel.com](https://vercel.com) and click **Sign Up**.
2. 🧑‍💻 Sign up with GitHub. Vercel will ask to connect your GitHub account — allow it.
3. 🧑‍💻 You'll land on the Vercel dashboard. No project yet — that's Phase 4.

---

## Phase 1 — Supabase Backend

**Goal:** Create the Supabase project, set up all database tables with correct permissions, configure authentication, and seed the global item catalog (~1,000 items).

This is the entire backend of the app. Supabase gives you a hosted Postgres database, an authentication system, and a real-time layer — all managed through a visual dashboard.

---

### 1.1 — Create a Supabase Project

1. 🧑‍💻 In the Supabase dashboard, click **New project**.
2. 🧑‍💻 Fill in:
   - **Name:** `pantry-app`
   - **Database password:** Generate a strong password and save it somewhere safe (1Password, Notes, etc.). You'll need it if you ever connect to the database directly.
   - **Region:** Choose the one closest to you (e.g., `us-east-1` if you're on the East Coast).
3. 🧑‍💻 Click **Create new project**. It takes about 1–2 minutes to provision.

✅ **Verify:** You see the project dashboard with a green status indicator.

---

### 1.2 — Save Your API Keys

Supabase gives you two keys that your app uses to connect to the database. You'll need these in Phase 2.

1. 🧑‍💻 In the Supabase sidebar, click **Settings** → **API**.
2. 🧑‍💻 Copy and save both values somewhere safe:
   - **Project URL** — looks like `https://xxxxx.supabase.co`
   - **anon / public key** — a long string starting with `eyJ...`

> ⚠️ Never share these keys publicly or commit them to GitHub. They go into a `.env.local` file (a private config file that stays on your machine only).

---

### 1.3 — Run the Database Schema

This step creates all the tables the app needs. Claude will provide the complete SQL — you paste it into the Supabase SQL editor and run it.

1. 🧑‍💻 In the Supabase sidebar, click **SQL Editor**.
2. 🧑‍💻 Click **New query**.
3. 🤖 **Claude provides:** A single SQL script that creates all tables (`households`, `profiles`, `items`, `inventory`, `shopping_list`, `catalog`) with correct column types and constraints.
4. 🧑‍💻 Paste the SQL into the editor and click **Run**.

✅ **Verify:** Click **Table Editor** in the sidebar. You should see all 6 tables listed.

---

### 1.4 — Enable Row Level Security

Row Level Security (RLS) is what ensures each household can only see their own data. Without it, any user could read any other household's pantry.

1. 🤖 **Claude provides:** A second SQL script containing all the RLS policies.
2. 🧑‍💻 Paste it into a new SQL Editor query and run it.

✅ **Verify:** In Table Editor, click on the `items` table. You should see "RLS enabled" indicated near the top.

---

### 1.5 — Seed the Item Catalog

This populates the `catalog` table with ~1,000 common pantry items, each pre-filled with category, default unit, default location, and emoji.

1. 🤖 **Claude provides:** A SQL INSERT script with all catalog items.
2. 🧑‍💻 Paste it into a new SQL Editor query and run it.

> ⚠️ This script is large (~1,000 rows). If the SQL editor times out, Claude will split it into smaller batches to run one at a time.

✅ **Verify:** In Table Editor, click the `catalog` table. You should see rows of items like "Chicken Breast", "Black Beans", etc.

---

### 1.6 — Configure Authentication

Set up magic link email authentication so users can sign in without a password.

1. 🧑‍💻 In the Supabase sidebar, click **Authentication** → **Providers**.
2. 🧑‍💻 Confirm **Email** is enabled. It is by default.
3. 🧑‍💻 Click **Authentication** → **Email Templates**.
4. 🧑‍💻 Click on **Magic Link**. You can customize the email subject and body if you like. The default is fine for now.
5. 🧑‍💻 Click **Authentication** → **URL Configuration**.
6. 🧑‍💻 Set **Site URL** to `http://localhost:3000` for now. You'll update this to your Vercel URL in Phase 4.
7. 🧑‍💻 Under **Redirect URLs**, add `http://localhost:3000/**` and click **Save**.

✅ **Verify:** The Authentication section shows Email as enabled with no errors.

---

### 1.7 — Enable Realtime on Shopping List

The shopping list syncs live between household members. You need to enable Realtime on that table.

1. 🧑‍💻 In the Supabase sidebar, click **Database** → **Replication**.
2. 🧑‍💻 Find the `shopping_list` table and toggle it **on**.

✅ **Verify:** The toggle is green next to `shopping_list`.

---

## Phase 2 — Next.js Project Scaffold

**Goal:** Create the Next.js project, install all dependencies, and connect it to Supabase.

> ⚠️ This entire phase happens in the Terminal. Claude provides every command — you copy and paste them.

---

### 2.1 — Scaffold the Next.js App

1. 🧑‍💻 In Terminal, navigate to your parent folder (one level above pantry-app):
   ```
   cd "/Users/eerwin/Antigravity Projects/Personal Projects"
   ```
2. 🤖 **Claude provides and you run:** The `create-next-app` command with the correct flags for TypeScript, Tailwind, App Router, and src directory.

✅ **Verify:** A new `pantry-app-dev` folder appears with a Next.js project inside.

> ⚠️ The project is scaffolded into a new subfolder because your existing `pantry-app` folder contains the requirements doc and icons. After scaffolding, we'll move the icons and requirements into the new project.

---

### 2.2 — Install shadcn/ui

shadcn/ui provides the base component set (buttons, cards, inputs, modals, etc.) that we customize for the app's design.

1. 🤖 **Claude provides:** The `npx shadcn init` command and configuration choices.
2. 🧑‍💻 Run it in Terminal from inside the project folder.
3. 🤖 **Claude provides:** The list of specific shadcn components to install for Phase 1.
4. 🧑‍💻 Run the install commands.

✅ **Verify:** A `components/ui/` folder appears with shadcn component files inside.

---

### 2.3 — Install Supabase Client

This package lets the app talk to your Supabase database.

1. 🤖 **Claude provides:** The npm install command.
2. 🧑‍💻 Run it in Terminal.

---

### 2.4 — Create Environment Variables

Environment variables are private config values (like your Supabase keys) that never get committed to GitHub.

1. 🤖 **Claude provides:** The `.env.local` file template.
2. 🧑‍💻 Create the file in the project root and fill in your Supabase URL and anon key from Phase 1.2.
3. 🤖 **Claude provides:** A `.gitignore` update to ensure `.env.local` is never committed.

---

### 2.5 — Set Up Supabase Client

1. 🤖 **Claude writes:** A Supabase client utility file (`src/lib/supabase.ts`) that the rest of the app imports to make database queries.

✅ **Verify:** Run `npm run dev` in Terminal. The app opens at `http://localhost:3000` with no errors in the terminal output.

---

### 2.6 — Reorganize Project Files

Move the icons and requirements into the new project folder so everything is in one place.

1. 🤖 **Claude provides:** The exact Terminal commands to move the `icons/` folder and requirements doc into the new project.
2. 🧑‍💻 Run the commands.

---

## Phase 3 — Visual Foundation

**Goal:** Apply the design system — Figtree font, UIcons, color tokens, and global styles — so every screen starts from the right visual baseline.

---

### 3.1 — Configure Figtree Font

1. 🤖 **Claude writes:** Updates to `src/app/layout.tsx` to load Figtree from Google Fonts via Next.js's built-in font system.

---

### 3.2 — Set Up UIcons

1. 🤖 **Claude provides:** The commands to move `icons/` to `public/fonts/uicons/`.
2. 🤖 **Claude writes:** The `@import` statement added to `src/app/globals.css` to load the UIcons CSS.

✅ **Verify:** Open `http://localhost:3000` and open the browser's developer tools (right-click → Inspect → Network tab). Filter by "font" — you should see `uicons-regular-rounded.woff2` loaded.

---

### 3.3 — Configure Global Styles and Color Tokens

1. 🤖 **Claude writes:** Updates to `globals.css` defining CSS custom properties (variables) for the design token colors:
   - Background: `oklch(97% 0.006 85)`
   - Yellow: `#FFD333`, `#FFE680`
   - Teal: `#23967F`
   - Red: `#EE1B49`, `#C81440`
   - Orange: `#FFA070`, `#B85A2E`
2. 🤖 **Claude writes:** Updates to `tailwind.config.ts` extending the theme with pantry-app color names (e.g., `pantry-yellow`, `pantry-teal`, `pantry-red`).

✅ **Verify:** The background of the app at `localhost:3000` matches the warm cream color from the design.

---

### 3.4 — Build the App Shell Layout

The outer wrapper that every screen lives inside — sets the max width, phone-frame behavior on desktop, and the global font.

1. 🤖 **Claude writes:** The root `layout.tsx` with a mobile-centered container (max-width 390px on desktop, full-width on mobile).

---

## Phase 4 — Deploy Shell to Vercel

**Goal:** Get a live URL before any real features are built. This lets you test on your actual phone and share with collaborators early.

---

### 4.1 — Push to GitHub

1. 🧑‍💻 In Terminal, from the project folder:
   ```
   git add .
   git commit -m "Initial scaffold with visual foundation"
   git push
   ```

---

### 4.2 — Import Project to Vercel

1. 🧑‍💻 Go to [vercel.com](https://vercel.com) and click **Add New → Project**.
2. 🧑‍💻 Click **Import** next to your `pantry-app` GitHub repo.
3. 🧑‍💻 Under **Environment Variables**, add your two Supabase keys:
   - `NEXT_PUBLIC_SUPABASE_URL` → your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → your Supabase anon key
4. 🧑‍💻 Click **Deploy**.

> ⚠️ Every time you push to GitHub from now on, Vercel automatically redeploys the app. You don't have to do anything.

✅ **Verify:** Vercel gives you a URL like `pantry-app-abc.vercel.app`. Open it on your iPhone — you should see the (currently empty) shell of the app.

---

### 4.3 — Update Supabase Auth URLs

Now that you have a real URL, tell Supabase about it.

1. 🧑‍💻 In Supabase, go to **Authentication** → **URL Configuration**.
2. 🧑‍💻 Update **Site URL** to your Vercel URL (e.g., `https://pantry-app-abc.vercel.app`).
3. 🧑‍💻 Under **Redirect URLs**, add `https://pantry-app-abc.vercel.app/**` in addition to the localhost URL.
4. 🧑‍💻 Click **Save**.

---

## Phase 5 — Auth & Household Flow

**Goal:** Implement the full sign-in experience — magic link email, first-time household creation, display name prompt, and partner invite flow.

---

### 5.1 — Sign-In Screen

The first screen any new user sees.

1. 🤖 **Claude writes:** `src/app/auth/page.tsx` — email input screen with "Send magic link" button.
   - Style matches the design: Figtree, warm background, yellow CTA button.
   - On submit, calls `supabase.auth.signInWithOtp({ email })`.
   - Shows a confirmation message ("Check your email") after sending.

✅ **Verify:** Go to `/auth` on your phone. Enter your email. You receive a magic link email within 30 seconds.

---

### 5.2 — Auth Callback Handler

After clicking the magic link in email, the user is redirected back to the app. This page handles that handshake.

1. 🤖 **Claude writes:** `src/app/auth/callback/route.ts` — exchanges the auth token from the URL for a session.

---

### 5.3 — First-Time Setup — Household Creation

For new users who don't yet belong to a household.

1. 🤖 **Claude writes:** `src/app/onboarding/page.tsx` — two-screen onboarding flow:
   - **Screen 1:** "What's your name?" — saves display name to `profiles` table.
   - **Screen 2:** "Set up your household" — household name input → creates row in `households` table with auto-generated invite code → user is linked to the household.
2. 🤖 **Claude writes:** The middleware (`src/middleware.ts`) that checks on every page load:
   - Not signed in → redirect to `/auth`.
   - Signed in but no household → redirect to `/onboarding`.
   - Signed in with household → allow through to the app.

✅ **Verify:** Sign in fresh on your phone. You're prompted for your name, then household name. After completing, you land on the (empty) home screen.

---

### 5.4 — Join an Existing Household (Invite Flow)

For partners and testers joining an existing household.

1. 🤖 **Claude writes:** `src/app/join/page.tsx` — invite code entry screen.
   - Reads the `?code=PINE-42` param if arriving from an invite link.
   - Validates the code against the `households` table.
   - On match: links the user to that household, prompts for display name.
2. 🤖 **Claude writes:** Update to the onboarding screen — adds a "Join an existing household" option that routes to `/join`.

✅ **Verify:** Copy the invite code from Settings (Phase 10), sign in on a second device, and enter the code. You see the same household data.

---

## Phase 6 — Dashboard

**Goal:** Implement the home screen exactly as designed — glassmorphic header, stat cards, recipe teaser, running low list, and "use these up" horizontal scroll.

---

### 6.1 — Dashboard Layout & Header

1. 🤖 **Claude writes:** `src/app/(app)/page.tsx` — the main dashboard page.
2. 🤖 **Claude writes:** `src/components/dashboard/DashboardHeader.tsx` — glassmorphic header with:
   - Time-of-day greeting ("Good morning / afternoon / evening")
   - Household name
   - Avatar stack (initials, yellow + teal background, overlapping)

---

### 6.2 — Stat Cards

1. 🤖 **Claude writes:** `src/components/dashboard/StatCards.tsx` — 3-up liquid glass card row:
   - **Items:** queries `inventory` table for total active item count.
   - **Est. value:** hidden in Phase 1 (no price data yet). Slot reserved.
   - **Low:** queries `inventory` for items below threshold. Red tint when count > 0.

---

### 6.3 — Recipe Teaser (Placeholder)

1. 🤖 **Claude writes:** `src/components/dashboard/RecipeTeaser.tsx` — the yellow gradient "What can I make?" button.
   - In Phase 1, tapping opens a bottom sheet saying "Recipe suggestions coming soon."
   - The button is fully styled as designed. Wired up in Phase 14 to route to `/chef` (Suggestions tab) — not a standalone `/recipes` route, since Chef is now the dedicated recipe hub.

---

### 6.4 — Running Low Section

1. 🤖 **Claude writes:** `src/components/dashboard/RunningLow.tsx`:
   - Queries `inventory JOIN items` where `quantity ≤ low_threshold OR manual_low_flag = true`.
   - Sorted: Critical (qty = 0) first, then Low, then alphabetically.
   - Red dot for Critical, orange dot for Low.
   - Maximum 8 rows. "View all" link shows the full list.

---

### 6.5 — Use These Up Section

1. 🤖 **Claude writes:** `src/components/dashboard/UseTheseUp.tsx`:
   - Queries `inventory` for the 3 items with the oldest `purchase_date`.
   - Horizontal scroll chip layout.
   - Shows emoji, name, and relative time ("8 wks ago").

---

### 6.6 — Bottom Navigation

1. 🤖 **Claude writes:** `src/components/layout/BottomNav.tsx` — floating glass dock:
   - 5 tabs: Home (`fi-sr-home`), Inventory (`fi-sr-carrot`), Add (+), Shopping List (`fi-sr-shopping-cart-check`), Chef (`fi-sr-user-chef`).
   - The Add (+) button uses a yellow gradient circle that floats above the nav.
   - Active tab renders at full opacity; inactive at 0.4.
   - Shopping List tab badge shows pending item count.
2. 🤖 **Claude writes:** Update to the app layout to include BottomNav on all app screens.

> ⚠️ **Settings is not a bottom nav tab.** Chef took the 5th slot instead. Settings is reached via the avatar/profile icon in the header — see Phase 10.0.

✅ **Verify:** Open the app on your phone. The dashboard loads with real data from Supabase (will be empty until items are added). Navigation between tabs works.

---

## Phase 7 — Add Item Flow

**Goal:** Implement the full item addition experience — search screen, catalog integration, restock form, and new item form.

---

### 7.1 — Search Screen

1. 🤖 **Claude writes:** `src/app/(app)/add/page.tsx` — search-first entry screen:
   - Auto-focused text input with barcode icon (placeholder for Phase 12).
   - Live search queries both `items` (household) and `catalog` (global) as user types.
   - Household items shown first, then catalog matches.
   - "Create [name]" row always appears at the bottom once text is entered.

---

### 7.2 — Restock Form

Shown when an existing item (from household or catalog) is selected.

1. 🤖 **Claude writes:** `src/app/(app)/add/restock/[itemId]/page.tsx`:
   - Item name, emoji, and current stock summary at top.
   - Quantity stepper (− / +), defaulting to last restock quantity.
   - Location selector (defaults to item's last used location).
   - Running total preview ("After adding, you'll have X total").
   - "Add to pantry" CTA — writes to `inventory` table.
   - On success: confirmation screen with "Add another" / "Back to home."
2. 🤖 **Claude writes:** The Supabase function that writes the inventory row, triggers shopping list resolution if the item was on the list, and clears the low flag if quantity is now above threshold.

---

### 7.3 — New Item Form

Shown when creating an item not in the catalog.

1. 🤖 **Claude writes:** `src/app/(app)/add/new/page.tsx` — single-screen form:
   - Name (pre-filled from search query), category dropdown, location dropdown, quantity, unit dropdown, purchase date, low threshold.
   - Optional: tags (pill-style input).
   - "Save item" CTA — writes to both `items` and `inventory` tables.
   - On success: confirmation screen.

---

### 7.4 — Catalog Item Copy Logic

When a user selects a catalog item for the first time:

1. 🤖 **Claude writes:** A utility function that copies the catalog item into the household's `items` table (setting `catalog_id`) before proceeding to the restock form.

---

## Phase 8 — Inventory Browser

**Goal:** Implement the browsable, filterable view of all pantry items.

---

### 8.1 — Inventory List Screen

1. 🤖 **Claude writes:** `src/app/(app)/inventory/page.tsx`:
   - Search bar (live substring filter).
   - Location filter pills: All / Pantry / Fridge / Freezer / Spice Rack.
   - Items grouped by location when "All" is selected.
   - Multi-location items shown as a single combined row with summed quantity and location badge.
   - Low/Critical badge on affected rows.

---

### 8.2 — Item Detail View

1. 🤖 **Claude writes:** `src/app/(app)/inventory/[itemId]/page.tsx`:
   - All item fields (name, emoji, category, tags, threshold, last updated by).
   - Per-location stock breakdown.
   - Inline editable: quantity per location, manual low flag toggle, tags.
   - "Restock" shortcut button (routes to Restock Form).
   - "Remove item" button (soft delete — sets `active = false`).

✅ **Verify:** Add a test item via the Add flow. It appears in the Inventory list. Tapping it opens the detail view. Editing quantity updates in real time.

---

## Phase 9 — Shopping List + Preferred Stores

**Goal:** Implement the shared shopping list with auto-population, manual additions, check-off behavior, store-filtered views, and live sync between household members.

---

### 9.0 — Preferred Stores (Supabase + Data Model)

**New database objects (user runs in Supabase SQL Editor):**

```sql
-- Stores table — household-scoped list of regular stores
create table public.stores (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households(id),
  name text not null,
  created_at timestamptz default now()
);
alter table public.stores enable row level security;
create policy "Stores readable by household" on public.stores for select to authenticated using (household_id = public.get_my_household_id());
create policy "Stores insertable by household" on public.stores for insert to authenticated with check (household_id = public.get_my_household_id());
create policy "Stores deletable by household" on public.stores for delete to authenticated using (household_id = public.get_my_household_id());

-- Add preferred_stores column to items
alter table public.items add column if not exists preferred_stores text[] default '{}';
```

Also add the `stores` table to the Supabase Realtime replication.

---

### 9.1 — MultiSelect DrawerSelect Component

Extend `src/components/ui/DrawerSelect.tsx` to support multi-select mode and inline item creation.

**New props:**
- `multiple?: boolean` — enables multi-select (pills toggle on/off, drawer stays open)
- `values?: string[]` — controlled selected values array (replaces `value` in multi mode)
- `onChangeMultiple?: (values: string[]) => void`
- `onAddNew?: (name: string) => void` — shows inline text input for creating a new option

**Behaviour in multi-select mode:**
- Tapping a pill toggles it on/off; drawer does NOT close
- All selected pills show yellow-light fill + yellow border
- "Add a store" input field pinned at the bottom (above search if both present)
- Typing a name and pressing Enter/tapping Add saves the new option via `onAddNew` and immediately selects it

---

### 9.2 — Preferred Stores on Item Detail

Add a "Preferred stores" row to the Edit Item Details accordion in `src/app/(app)/inventory/[itemId]/ItemDetail.tsx`.

- Uses the multi-select `DrawerSelect` with stores from the household
- `onAddNew` saves a new store row to the `stores` table and adds it to `preferred_stores` on the item
- Saves `preferred_stores` array to `items` table on change

---

### 9.3 — Shopping List Screen

`src/app/(app)/shopping/page.tsx` — client component:

**Store filter pills** (All + household stores) at the top, same pill pattern as inventory location filter.

When a store is selected:
- Auto-added items: show only those where the item has that store in `preferred_stores`
- Manually added items: show only those tagged with that store (store saved on the `shopping_list` row)
- Items with no preferred stores only appear in "All"

When "All" is selected: show everything.

**Three sections:**

1. **Needs buying** (auto-added by DB trigger) — item emoji, name, "auto" badge, suggested qty
2. **Added manually** — free-text items added by user, "Added by [name]" attribution
3. **Completed** — checked-off items, strikethrough styling, "Clear completed" button

**Quick-add input** pinned at bottom — free-text entry. If a store filter is active, the new manual item is tagged to that store automatically.

---

### 9.4 — Check-Off Behavior

- Tapping an item's checkbox marks `status: purchased`, moves to Completed section
- Prompt: "Update stock now?" — Yes routes to `/inventory/[itemId]`; No dismisses
- "Clear completed" sets `status: cleared` on all purchased rows
- Completing an item that has `preferred_stores` removes it from all store views (same underlying entry)

---

### 9.5 — Auto-Population Trigger

Already built in Phase 1. Fires on every `inventory` INSERT/UPDATE. No additional work needed.

---

### 9.6 — Realtime Sync

Supabase Realtime subscription on `shopping_list` table already enabled in Phase 1. Wire up the subscription in the shopping list component so changes from either household member appear without refresh.

✅ **Verify:**
1. Item goes below threshold → appears on shopping list automatically
2. Select "Costco" filter → only Costco-preferred items shown
3. Add Greek yogurt with stores: Costco + Aldi → appears on both filtered views
4. Restock from either list → disappears from both store filters
5. Add manual item while on Costco filter → item tagged Costco
6. Check off item on one device → updates on other device in real time

---

## Phase 10 — Settings Screen

**Goal:** Implement household settings and the invite flow entry point, reached via an avatar icon in the header rather than the bottom nav (Chef took that slot — see Phase 6.6).

---

### 10.0 — Settings Entry Point (Header Avatar)

1. 🤖 **Claude writes:** Add a tappable avatar/profile icon to `PageHeader` (or the `(app)` layout, if it should appear on every screen including the dashboard) — initials in a yellow/teal circle, consistent with the existing avatar-stack style from Phase 6.1.
2. 🤖 **Claude writes:** Tapping the avatar routes to `/settings`.

✅ **Verify:** The avatar icon appears on every app screen and opens Settings from anywhere.

---

### 10.1 — Settings Screen

1. 🤖 **Claude writes:** `src/app/(app)/settings/page.tsx`:
   - **Household name** — editable inline.
   - **Household location** — e.g., "Chicago, IL." Used as regional context for AI price estimates (Phase 13.3).
   - **Default servings** — number, used to scale AI recipe suggestions (Phase 14) to the household's actual size.
   - **Members** — list of current household members (names and avatars).
   - **Invite someone** — shows the invite code and two buttons: "Copy invite link" and "Copy code."
   - **Your name** — editable display name.
   - **Sign out** button.

> ⚠️ Location and default servings live here because they're core household attributes already in the Phase 1 data model. Diet/cuisine/macro preferences are a separate concern — see Phase 14.1 — and live inside Chef instead, next to where they're actually used.

✅ **Verify:** Tap "Copy invite link." Paste it in a browser or Messages — it opens the app at the join screen with the code pre-filled.

---

## Phase 11 — PWA Configuration

**Goal:** Make the app installable as a home screen icon on iOS, with the correct icon, name, and fullscreen behavior.

---

### 11.1 — Web App Manifest

1. 🤖 **Claude writes:** `public/manifest.json` — defines the app name, colors, and display mode:
   - `name`: "Pantry"
   - `display`: `standalone` (fullscreen, no browser chrome)
   - `background_color`: the warm cream color
   - `theme_color`: `#FFD333` (yellow — used for the iOS status bar tint)

---

### 11.2 — App Icons

iOS requires specific icon sizes for the home screen.

1. 🧑‍💻 **You design:** A simple app icon (the pantry logo or a food-relevant graphic). Export at 512×512px as a PNG.
2. 🤖 **Claude provides:** Instructions or a script to generate all required sizes (180×180 for iOS, 192×192 and 512×512 for Android/PWA manifest).
3. 🤖 **Claude writes:** The icon references in `manifest.json` and the `<link>` tags in `layout.tsx` for iOS.

---

### 11.3 — Add to Home Screen Prompt

iOS doesn't auto-prompt users to install a PWA. We need a manual nudge.

1. 🤖 **Claude writes:** A one-time dismissible banner that appears after sign-in: "Add to your home screen for the best experience" with simple Safari instructions.

✅ **Verify:** On your iPhone, tap Share → "Add to Home Screen." The app appears on your home screen with the correct icon and name. Opening it launches fullscreen with no Safari chrome.

---

## Phase 12 — Barcode Scanning *(Phase 2)*

**Goal:** Add barcode scanning via camera to the Add Item flow, with Open Food Facts lookup to auto-fill item details.

---

### 12.1 — Install `html5-qrcode`

1. 🤖 **Claude provides:** The npm install command.

---

### 12.2 — Camera Scanner Component

1. 🤖 **Claude writes:** `src/components/add/BarcodeScanner.tsx` — camera viewfinder component using `html5-qrcode`.
   - Requests camera permission on first use.
   - On successful scan, passes the barcode value to the lookup function.
   - If permission denied: shows "Camera access needed for scanning. You can still add items by typing."

---

### 12.3 — Open Food Facts Lookup

1. 🤖 **Claude writes:** `src/app/api/barcode/[barcode]/route.ts` — Next.js API route that proxies the Open Food Facts API call.
   - Returns: product name, best-match category, emoji if available.
   - Returns a structured "not found" response if the barcode doesn't exist in the database.

---

### 12.4 — Wire Into Add Flow

1. 🤖 **Claude writes:** Updates to the Add screen — tapping the barcode icon opens the scanner.
   - If barcode matches an existing household item → Restock Form.
   - If barcode found in Open Food Facts but not in household → New Item Form with fields pre-filled.
   - If barcode not found → New Item Form with blank name.

✅ **Verify:** Scan a box of pasta. The item name auto-fills in the form.

---

## Phase 13 — AI Features *(Phase 2)*

**Goal:** Add AI item enrichment (category, unit, emoji, price) via the Claude API, triggered while the user is filling out the New Item form rather than after they've already saved it.

Full prompt spec (trigger points, input/output schema, exact prompt text): [`ai-prompts/item-enrichment.md`](../ai-prompts/item-enrichment.md).

---

### 13.1 — Anthropic API Key

1. 🧑‍💻 Go to [console.anthropic.com](https://console.anthropic.com) and create an account.
2. 🧑‍💻 Under **API Keys**, generate a new key. Copy it.
3. 🧑‍💻 Add it to your `.env.local` file as `ANTHROPIC_API_KEY`.
4. 🧑‍💻 Add it to your Vercel project's Environment Variables too.

> ⚠️ This key is a secret — never commit it to GitHub. It stays in `.env.local` and Vercel only.

---

### 13.2 — Shopping Tier & Item Enrichment Data Model

**New columns (user runs in Supabase SQL Editor):**

```sql
alter table public.households
  add column if not exists shopping_tier int not null default 3;

alter table public.items
  add column if not exists estimated_price numeric;
```

`shopping_tier` is 1–5 (Budget → Premium, see the prompt doc for the full mapping); default `3` (Standard) until the household sets it in Settings.

---

### 13.3 — Shopping Tier Slider (Settings)

1. 🤖 **Claude writes:** A slider control in Settings, next to household location — `<input type="range" min="1" max="5">` labeled at 1/3/5 (Budget / Standard / Premium), positions 2 and 4 selectable as unlabeled in-between stops. Saves to `households.shopping_tier`.

---

### 13.4 — Item Enrichment Endpoint

1. 🤖 **Claude writes:** `src/app/api/ai/enrich-item/route.ts` — takes name, category, unit, city/state, and shopping tier; returns `{ category, unit, emoji, estimated_price }` via a Zod-validated structured output (`claude-haiku-4-5`, no thinking/effort). Exact schema and prompt text in [`ai-prompts/item-enrichment.md`](../ai-prompts/item-enrichment.md).

---

### 13.5 — Wire Into the New Item Form

1. 🤖 **Claude writes:** A mount-effect that auto-fires enrichment when the form was reached via a resolved barcode name (background call, doesn't block the form from rendering).
2. 🤖 **Claude writes:** An "Autofill" button near the name field for the manual-entry path — disabled until a name is entered, calls the same enrichment function on tap.
3. 🤖 **Claude writes:** The fill logic — only overwrite `category`/`unit`/`emoji` if each is still at its default/empty value; always apply `estimated_price`.

✅ **Verify:** Scan a barcode for an item not in your household — by the time you're done adjusting quantity/location, emoji and price have already filled in. Manually add a new item, type a name, tap Autofill — category, unit, emoji, and price populate without overwriting anything you'd already set yourself.

---

### 13.6 — Est. Value Stat Card

1. 🤖 **Claude writes:** The **Est. value** stat card on the dashboard (reserved slot from Phase 6.2) — sums `quantity × estimated_price` across all inventory rows.

---

### 13.7 — Batch Enrichment

For items added before AI enrichment existed.

1. 🤖 **Claude writes:** An "Enrich all items" action in Settings that runs enrichment for any item missing `estimated_price`. Runs sequentially with a progress indicator.

---

## Phase 14 — Chef: Recipes & AI Suggestions *(Phase 3)*

**Goal:** Turn the Chef tab from its "coming soon" placeholder into a real recipe hub — recipes the household saves manually, plus AI-generated suggestions based on current inventory. This replaces the original standalone `/recipes` page concept; Chef is now the single home for all recipe features, including the imports built in Phases 15–16.

> ⚠️ This phase is scoped intentionally to skip web/photo import — those are separate phases (15, 16) since they carry their own external-fetch and AI-cost risk. Ship this phase first.

---

### 14.0 — Recipes Data Model (Supabase)

**New database objects (user runs in Supabase SQL Editor), household-scoped with RLS like `stores` in 9.0:**

```sql
create table public.recipes (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households(id),
  name text not null,
  source text not null default 'manual', -- 'manual' | 'web' | 'photo' | 'ai'
  source_url text,
  image_url text,
  servings int,
  instructions text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
alter table public.recipes enable row level security;
create policy "Recipes readable by household" on public.recipes for select to authenticated using (household_id = public.get_my_household_id());
create policy "Recipes insertable by household" on public.recipes for insert to authenticated with check (household_id = public.get_my_household_id());
create policy "Recipes updatable by household" on public.recipes for update to authenticated using (household_id = public.get_my_household_id());
create policy "Recipes deletable by household" on public.recipes for delete to authenticated using (household_id = public.get_my_household_id());

create table public.recipe_ingredients (
  id uuid primary key default uuid_generate_v4(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  name text not null,
  quantity text,
  unit text,
  matched_item_id uuid references public.items(id)
);
alter table public.recipe_ingredients enable row level security;
create policy "Recipe ingredients readable by household" on public.recipe_ingredients for select to authenticated using (
  recipe_id in (select id from public.recipes where household_id = public.get_my_household_id())
);
create policy "Recipe ingredients writable by household" on public.recipe_ingredients for all to authenticated using (
  recipe_id in (select id from public.recipes where household_id = public.get_my_household_id())
);
```

`matched_item_id` is nullable and populated later (14.5) to score a recipe against current inventory.

✅ **Verify:** Table Editor shows `recipes` and `recipe_ingredients` with RLS enabled.

---

### 14.1 — Chef Preferences (Data Model + Screen)

Household-level dietary, cuisine, and macro preferences that steer every AI suggestion built in 14.5. Shared across the household, not per-member — matches how inventory, shopping list, and recipes already work.

**New database object (user runs in Supabase SQL Editor):**

```sql
create table public.household_preferences (
  household_id uuid primary key references public.households(id) on delete cascade,
  dietary_restrictions text[] default '{}',
  favorite_cuisines text[] default '{}',
  macro_goals text[] default '{}',
  other_notes text,
  updated_at timestamptz default now()
);
alter table public.household_preferences enable row level security;
create policy "Household preferences readable by household" on public.household_preferences for select to authenticated using (household_id = public.get_my_household_id());
create policy "Household preferences insertable by household" on public.household_preferences for insert to authenticated with check (household_id = public.get_my_household_id());
create policy "Household preferences updatable by household" on public.household_preferences for update to authenticated using (household_id = public.get_my_household_id());
```

1. 🤖 **Claude writes:** A preferences icon on the Chef tab (`src/app/(app)/chef/page.tsx`) that opens `src/app/(app)/chef/preferences/page.tsx`. Lives in Chef, not the main Settings screen — it's edited right next to where it's used.
2. 🤖 **Claude writes:** The preferences screen:
   - **Dietary restrictions** — checkbox list (vegetarian, vegan, gluten-free, dairy-free, nut-free, shellfish-free, kosher, halal, pescatarian, keto, paleo) + free-text "other" field.
   - **Favorite cuisines** — multi-select pills, reusing the `DrawerSelect` multi-select mode from Phase 9.1 (Italian, Mexican, Japanese, Chinese, Indian, Mediterranean, Thai, French, American comfort, + "Add a cuisine" for custom entries).
   - **Macro/health goals** — multi-select pills, qualitative only (high protein, low carb, high fiber, low sodium). Not numeric calorie/macro tracking — that's a different app.
   - "Save preferences" CTA — upserts the single `household_preferences` row.

> ⚠️ Every checked dietary restriction is a hard exclude in the AI prompt (14.5) — no distinction between "allergy" and "lifestyle preference." Simpler to build and the safer default when suggestions involve food someone might actually eat. Favorite cuisines and macro goals are soft ranking boosts only.

✅ **Verify:** Set a dietary restriction (e.g., "vegetarian") and a favorite cuisine, save, and confirm the row appears in `household_preferences` in Table Editor.

---

### 14.2 — Anthropic API Key

Already done if Phase 13 is complete. If not, do step 13.1 first — this phase's AI suggestions need `ANTHROPIC_API_KEY` in `.env.local` and Vercel.

---

### 14.3 — Manual Recipe Save Flow

1. 🤖 **Claude writes:** `src/app/(app)/chef/new/page.tsx` — form to save a recipe by hand:
   - Name, servings, ingredients (reusing the `TagInput` pattern for add/remove rows: name + quantity + unit), instructions (multi-line text).
   - "Save recipe" CTA — writes to `recipes` and `recipe_ingredients`.
   - No photo field yet — added in Phase 16 once the storage bucket exists.

---

### 14.4 — Chef Tab: Tabs, My Recipes, Recipe Detail

1. 🤖 **Claude writes:** Replace the placeholder in `src/app/(app)/chef/page.tsx` with a two-tab layout: **Suggestions** / **My Recipes**.
2. 🤖 **Claude writes:** My Recipes tab — card list of saved recipes (name, image if present, ingredient count). Empty state prompts "Save your first recipe" → routes to `chef/new`.
3. 🤖 **Claude writes:** `src/app/(app)/chef/[recipeId]/page.tsx` — recipe detail: ingredients, instructions, edit and delete actions.

---

### 14.5 — AI Recipe Suggestions

1. 🤖 **Claude writes:** `src/app/api/ai/recipes/route.ts` — passes the full inventory list plus the household's `household_preferences` (14.1) and `default_servings` (Phase 10.1) to Claude. Dietary restrictions are hard excludes; favorite cuisines and macro goals are soft ranking boosts. Prioritizes oldest and low-stock inventory items, minimizes missing ingredients. Returns 3–5 suggestions.
2. 🤖 **Claude writes:** Suggestions tab UI — card list, each card: recipe name, 1-sentence description, pantry items used, additional ingredients needed, match score ("You have 8 of 10 ingredients"). Expandable on tap.
3. 🤖 **Claude writes:** "Add missing ingredients to list" button on each suggestion card — writes missing ingredients to `shopping_list` with `reason: recipe`.

---

### 14.6 — Wire Up the Dashboard Recipe Teaser

1. 🤖 **Claude writes:** Update `RecipeTeaser.tsx` — removes the "coming soon" state, now routes to `/chef` (Suggestions tab).

✅ **Verify:** Tap "What can I make?" on the dashboard — lands on the Chef Suggestions tab with 3–5 recipe cards from real inventory. Save a manual recipe via `chef/new` — it appears in My Recipes and its detail page opens.

---

## Phase 15 — Chef: Web Recipe Import *(Phase 3)*

**Goal:** Paste a recipe URL and auto-fill a new recipe. Try the site's own structured recipe data first (free, no AI cost); fall back to Claude extraction only when a site doesn't provide it.

---

### 15.1 — Import Entry Point

1. 🤖 **Claude writes:** `src/app/(app)/chef/import/page.tsx` — URL input field + "Import" button. (Phase 16 adds a photo option to this same screen.)

---

### 15.2 — Recipe Schema.org Parser (Server Route)

1. 🤖 **Claude writes:** `src/app/api/recipes/import/route.ts` (POST `{ url }`) — fetches the page server-side and looks for `schema.org/Recipe` structured data (JSON-LD), which most recipe blogs already embed for Google search.
2. 🤖 **Claude writes:** Extracts name, ingredients (with quantity/unit where parseable), instructions, servings, and image URL from the structured data.

> ⚠️ Structured data shows up in a few different shapes (a plain `Recipe` object, an array of types, or nested under `@graph`) — the parser needs to handle the common variants, not just one.

---

### 15.3 — Claude Fallback Extraction

1. 🤖 **Claude writes:** When no structured data is found, send the page's main text content to Claude with instructions to extract the same structured fields (name, ingredients with quantity/unit, instructions, servings).

---

### 15.4 — Pre-fill & Confirm Screen

1. 🤖 **Claude writes:** Extracted data pre-fills the same form built in 14.3, so the user reviews and edits before saving — never auto-save without confirmation, since extraction (especially the Claude fallback) can be wrong.

✅ **Verify:** Paste a URL from a well-known recipe blog — fields pre-fill correctly from structured data. Paste a URL from a site with no structured data — the Claude fallback still produces reasonable fields to review and edit.

---

## Phase 16 — Chef: Photo Recipe Import *(Phase 3)*

**Goal:** Import a recipe from a photo — a cookbook page, a handwritten recipe card, a photographed print-out — using Claude's vision capability.

---

### 16.1 — Supabase Storage Bucket for Recipe Photos

1. 🧑‍💻 In Supabase, create a `recipe-photos` storage bucket.
2. 🤖 **Claude provides:** Storage RLS policies scoped by household, matching the pattern used for the rest of the app's data.

✅ **Verify:** The bucket appears in Storage with policies applied.

---

### 16.2 — Photo Capture/Upload UI

1. 🤖 **Claude writes:** Add an "or import from a photo" option to `chef/import/page.tsx` — opens the camera or a photo picker, similar in spirit to `BarcodeScanner` from Phase 12 but capturing a single still image instead of continuously scanning.

---

### 16.3 — Claude Vision Extraction Route

1. 🤖 **Claude writes:** `src/app/api/recipes/import-photo/route.ts` — sends the photo to Claude with instructions to extract the same structured recipe fields as 15.3.

> ⚠️ Photo payloads are larger than a page-text extraction and cost more per call — this is the most expensive of the three capture paths. Worth confirming actual per-call cost once this is live.

---

### 16.4 — Pre-fill & Confirm Screen

1. 🤖 **Claude writes:** Reuses the confirm/edit screen from 15.4 — same review-before-save principle applies, especially for handwriting, which is the least reliable input for this flow.

✅ **Verify:** Take a photo of a printed recipe — fields pre-fill reasonably. Take a photo of a handwritten recipe card — check quality; if handwriting recognition is unreliable, that's worth flagging as a known limitation rather than something to keep tuning.

---

## Build Checklist

Use this to track overall progress across phases.

### Foundation
- [ ] Node.js installed
- [ ] GitHub repo created
- [ ] Supabase project created with all tables
- [ ] RLS policies applied
- [ ] Catalog seeded
- [ ] Magic link auth configured
- [ ] Next.js scaffolded and connected to Supabase
- [ ] Figtree + UIcons set up
- [ ] Deployed to Vercel with live URL
- [ ] PWA installable on iPhone home screen

### Phase 1 — Core App
- [ ] Sign-in screen (magic link)
- [ ] Household creation + display name
- [ ] Invite / join household flow
- [ ] Dashboard — header, stat cards, running low, use these up
- [ ] Recipe teaser placeholder
- [ ] Add item — search + catalog + restock + new item form
- [ ] Inventory browser + item detail view
- [ ] Shopping list — auto, manual, check-off, realtime
- [ ] Bottom nav — Home, Inventory, Add, Shopping, Chef
- [ ] Settings screen, reached via header avatar (not bottom nav) — includes household location + default servings

### Phase 2 — Smart Capture
- [ ] Barcode scanner (camera)
- [ ] Open Food Facts lookup
- [ ] AI emoji assignment
- [ ] AI pantry value estimate
- [ ] Batch emoji enrichment

### Phase 3 — AI Intelligence
- [ ] Recipes + recipe_ingredients tables with RLS
- [ ] Household preferences table + Chef preferences screen (dietary restrictions, cuisines, macro goals)
- [ ] Manual recipe save flow
- [ ] Chef tab — Suggestions / My Recipes / recipe detail
- [ ] Recipe suggestions API route (uses household preferences + default servings)
- [ ] Missing ingredients → shopping list
- [ ] Recipe teaser wired to Chef
- [ ] Web import — schema.org parser + Claude fallback
- [ ] Photo import — storage bucket + Claude vision extraction

---

## Security Checklist

Not a build phase — a set of checks worth running through before opening the app to more testers, and periodically after. Unlike the phases above, these don't have a natural "done" point; revisit this list whenever credentials, tables, or API routes change.

### Credentials

- [ ] Git remote uses a safe auth method — SSH key or `gh auth login` (stores credentials in the system keychain) — **not** a personal access token embedded in the remote URL.
  > ⚠️ **Found 2026-07:** the `origin` remote had a GitHub token embedded in plain text (`https://user:TOKEN@github.com/...`), visible in `.git/config`. Revoke the old token at [github.com/settings/tokens](https://github.com/settings/tokens) and reconfigure the remote before relying on this checklist item.
- [ ] `.env.local` has never been committed (already covered by `.gitignore` — if ever in doubt, `git log --all --full-history -- .env.local` should return nothing).
- [ ] Only `NEXT_PUBLIC_SUPABASE_URL` and the Supabase **anon** key are public. Any other secret — `ANTHROPIC_API_KEY` (Phase 13), a Supabase service role key, etc. — lives in `.env.local` and Vercel's Environment Variables only. Never prefix a secret with `NEXT_PUBLIC_`; never reference it from client-side (`'use client'`) code.
- [ ] Vercel's Environment Variables match `.env.local` after adding any new key locally — Vercel won't pick up local-only additions automatically.

### Data isolation

- [ ] RLS is enabled on every table, including ones added outside Phase 1 (`stores`, and later `recipes`, `recipe_ingredients`, `household_preferences`) — spot-check in Table Editor after creating any new table, not just at initial setup.
- [ ] Owner-only actions (removing a member) are enforced by a database policy (`is_household_owner()`, Phase 10), not just hidden in the UI — a determined user could otherwise call the API directly.
- [ ] Invite codes are low-entropy by design (8 words × 90 numbers = 720 combinations, e.g. `PINE-42`) — fine for a small circle of people you've personally invited, but don't treat them as real access control if the household roster grows beyond that. Worth revisiting (longer codes, or an approval step before someone joins) if the app is ever shared more broadly.

### API routes

- [ ] Routes under `/api/*` are covered by the auth middleware matcher (confirmed for `/api/barcode/[barcode]`) — check any newly added route isn't accidentally excluded the way `manifest.json` was.
- [ ] No API route trusts a client-supplied `household_id` for anything sensitive without verifying it against the requesting user's actual household.

---

*End of document*
