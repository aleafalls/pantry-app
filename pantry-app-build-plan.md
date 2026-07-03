# Pantry App — Build Plan

**Version:** 1.0  
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
15. [Phase 14 — Recipe Suggestions *(Phase 3)*](#phase-14--recipe-suggestions-phase-3)

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
   - The button is fully styled as designed and wired up in Phase 14.

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
   - 5 tabs: Home (`fi-rr-home`), Inventory (`fi-rr-box`), Add (+), Shopping List (`fi-rr-shopping-cart`), Settings (`fi-rr-settings`).
   - The Add (+) button uses a yellow gradient circle that floats above the nav.
   - Active tab renders at full opacity; inactive at 0.4.
   - Shopping List tab badge shows pending item count.
2. 🤖 **Claude writes:** Update to the app layout to include BottomNav on all app screens.

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

## Phase 9 — Shopping List

**Goal:** Implement the shared shopping list with auto-population, manual additions, check-off behavior, and live sync between household members.

---

### 9.1 — Shopping List Screen

1. 🤖 **Claude writes:** `src/app/(app)/shopping/page.tsx`:
   - **Auto section:** Items where `quantity ≤ low_threshold` or `manual_low_flag = true`. Shows item, reason, and suggested quantity. "auto" badge.
   - **Manual section:** Manually added items. Shows who added each ("Added by Erica").
   - **Completed section:** Checked-off items with strikethrough. "Clear completed" button.
   - Quick-add text input at the bottom for manual items.

---

### 9.2 — Check-Off Behavior

1. 🤖 **Claude writes:** The check-off interaction:
   - Tapping a checkbox: marks `status: purchased`, moves item to Completed section.
   - Prompt appears: "Restock this item now?" — Yes routes to Restock Form; No dismisses.
   - "Clear completed" sets `status: cleared` on all completed rows.

---

### 9.3 — Auto-Population Trigger

Shopping list auto-population happens server-side when inventory changes.

1. 🤖 **Claude writes:** A Supabase database trigger (SQL) on the `inventory` table that fires after every INSERT or UPDATE. If the new quantity is ≤ the item's `low_threshold` and no pending row already exists in `shopping_list`, it inserts a new auto row.

---

### 9.4 — Realtime Sync

1. 🤖 **Claude writes:** A Supabase Realtime subscription in the shopping list component so both household members see changes instantly without refreshing.

✅ **Verify:** Open the shopping list on two devices (phone + laptop). Check off an item on one — it updates immediately on the other.

---

## Phase 10 — Settings Screen

**Goal:** Implement household settings and the invite flow entry point.

---

### 10.1 — Settings Screen

1. 🤖 **Claude writes:** `src/app/(app)/settings/page.tsx`:
   - **Household name** — editable inline.
   - **Members** — list of current household members (names and avatars).
   - **Invite someone** — shows the invite code and two buttons: "Copy invite link" and "Copy code."
   - **Your name** — editable display name.
   - **Sign out** button.

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

**Goal:** Add AI emoji assignment and pantry value estimation via the Claude API.

---

### 13.1 — Anthropic API Key

1. 🧑‍💻 Go to [console.anthropic.com](https://console.anthropic.com) and create an account.
2. 🧑‍💻 Under **API Keys**, generate a new key. Copy it.
3. 🧑‍💻 Add it to your `.env.local` file as `ANTHROPIC_API_KEY`.
4. 🧑‍💻 Add it to your Vercel project's Environment Variables too.

> ⚠️ This key is a secret — never commit it to GitHub. It stays in `.env.local` and Vercel only.

---

### 13.2 — AI Emoji Assignment

1. 🤖 **Claude writes:** `src/app/api/ai/emoji/route.ts` — takes item name and category, returns a single emoji from the Claude API.
2. 🤖 **Claude writes:** The async call that fires after a new item is saved — writes the returned emoji back to the `items` table.
3. 🤖 **Claude writes:** Placeholder state in the UI (neutral icon) while the emoji is being assigned.

---

### 13.3 — AI Pantry Value Estimate

1. 🧑‍💻 In the Supabase Settings screen, add a **Household location** field (e.g., "Chicago, IL"). This gives Claude location context for price estimates.
2. 🤖 **Claude writes:** `src/app/api/ai/price/route.ts` — takes item name, category, unit, and location, returns an estimated price per unit.
3. 🤖 **Claude writes:** The trigger that calls this API after a new item is saved, storing the result in `items.estimated_price`.
4. 🤖 **Claude writes:** The **Est. value** stat card on the dashboard, now showing the summed estimate.
5. 🤖 **Claude writes:** A "Refresh estimates" button in Settings that re-runs price estimation for all items.

---

### 13.4 — Batch Emoji Enrichment

For items added before AI emoji was available.

1. 🤖 **Claude writes:** A "Enrich all items" action in Settings that batch-assigns emojis to any items with no emoji set. Runs sequentially with a progress indicator.

---

## Phase 14 — Recipe Suggestions *(Phase 3)*

**Goal:** Wire up the "What can I make?" recipe flow using Claude AI.

---

### 14.1 — Recipe Suggestions API Route

1. 🤖 **Claude writes:** `src/app/api/ai/recipes/route.ts` — passes the full inventory list to Claude with instructions to prioritize oldest items and minimize missing ingredients. Returns 3–5 recipe suggestions.

---

### 14.2 — Recipe Results Screen

1. 🤖 **Claude writes:** `src/app/(app)/recipes/page.tsx`:
   - Card list of 3–5 recipe suggestions.
   - Each card: recipe name, 1-sentence description, pantry items used, additional ingredients needed, match score ("You have 8 of 10 ingredients").
   - Expandable on tap.

---

### 14.3 — Shopping List Integration

1. 🤖 **Claude writes:** "Add missing ingredients to list" button on each recipe card — writes missing ingredients to `shopping_list` with `reason: recipe`.

---

### 14.4 — Wire Up the Recipe Teaser

1. 🤖 **Claude writes:** Update `RecipeTeaser.tsx` — removes the "coming soon" state, now routes to `/recipes`.

✅ **Verify:** Tap "What can I make?" on the dashboard. 3–5 recipe cards load based on your actual pantry inventory.

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
- [ ] Settings screen with invite sharing

### Phase 2 — Smart Capture
- [ ] Barcode scanner (camera)
- [ ] Open Food Facts lookup
- [ ] AI emoji assignment
- [ ] AI pantry value estimate
- [ ] Household location in Settings
- [ ] Batch emoji enrichment

### Phase 3 — AI Intelligence
- [ ] Recipe suggestions API route
- [ ] Recipe results screen
- [ ] Missing ingredients → shopping list
- [ ] Recipe teaser wired to live flow

---

*End of document*
