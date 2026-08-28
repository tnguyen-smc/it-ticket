# IT Help Desk — Setup & Deployment Guide (100% Online, No Terminal Required)

A two-view IT ticketing app for a small school, built with React (Vite) + Tailwind CSS,
using Supabase for the database/realtime/auth and EmailJS for email notifications.

- `/help` — public ticket submission form (no login required)
- `/it` — admin dashboard (List + Kanban views), gated behind Google Sign-In restricted
  to your school's Google Workspace domain

**This version is built for people working entirely in github.dev (the web editor) with
no terminal.** Building and deploying is handled automatically by a GitHub Actions
workflow (`.github/workflows/deploy.yml`) every time you push a change — you never run
`npm install` or `npm run build` yourself, and you never create a `.env` file. Secrets
are stored in GitHub's encrypted Secrets settings instead.

---

## 1. Upload this project to a GitHub repo

1. Go to https://github.com/new and create a new repository (e.g. `it-ticket-app`).
   Don't add a README/gitignore — leave it empty.
2. On the new repo's page, click **"uploading an existing file"** and drag in every
   file/folder from this zip (make sure the `.github` folder comes through — GitHub's
   web upload sometimes hides dotfolders, so if it doesn't appear, use github.dev's
   file explorer to create `.github/workflows/deploy.yml` manually and paste in the
   contents).
3. Commit directly to the `main` branch.

Alternatively, open `https://github.dev/YOUR_USERNAME/it-ticket-app` right after
creating the empty repo, and use the file explorer's "New File"/"New Folder" buttons
to recreate the project structure by pasting in each file's contents.

- **Delete requests** — a small trash icon on each ticket card opens an inline
  confirm ("Delete this request?") before removing it — no accidental deletes. When
  multiple cards are selected, a "Delete selected" link appears next to "Deselect
  all" for bulk removal (with a single confirm dialog covering the whole batch).
  Deleting is permanent — there's no undo, so use with care especially on bulk
  selections.

## 2e. Applying the v5 refinements (edit requests, shared quick-status, note preview)

Run **`supabase/migration_v6.sql`** — it adds a `show_in_summary` flag on
`ticket_groups`, moving "Quick Status" configuration out of per-browser localStorage
and into the database so it's shared between the admin Sidebar and the public
`/help` page.

- **Edit requests** — a small pencil icon on each ticket card opens inline editing
  for the name and problem/request text, with Save/Cancel. Useful for cleaning up
  or clarifying what a requester typed.
- **Public quick status on `/help`** — now shows the actual request text ("title")
  under each visible status, not just a count. Which statuses appear is controlled
  entirely from the admin Sidebar's "Configure" panel — the public view has no
  configuration controls of its own. Internal notes are never fetched or shown here.
- **Note preview** — once a note is saved, it now displays as grey preview text
  right on the card (matching the "Add note" ghost-text style) instead of just a
  small dot, so you can see the note content at a glance without opening the editor.

## 2d. Applying the v4 update (Thought Board overhaul, Kanban rows, settings, more)

Run **`supabase/migration_v5.sql`** in the SQL Editor — it restructures board cards to
support multiple checklists per card and adds a `board_connections` table for the
connector lines.

What's new:

- **Fixed: drag ghost/cursor** — dragging a ticket card no longer shows the browser's
  default "photo" ghost image or a green "+" cursor; it now just dims the card while
  dragging, like a native app.
- **Fixed: Kanban status dropdown cutoff** — the dropdown now measures available space
  and flips upward automatically if it would run off the bottom of the screen.
- **Thought Board is now a true infinite canvas** — no more page scrolling. Drag the
  background to pan, or use your trackpad/mouse wheel to scroll in any direction
  (including diagonally). Pinch-to-zoom (or Ctrl/Cmd + scroll) zooms in and out,
  centered on your cursor.
- **Fixed: card "teleport" while dragging** — card dragging now tracks the actual
  mouse delta instead of mixing in the canvas pan, so cards follow your cursor exactly.
- **Board card improvements:**
  - Delete button (✕) in place of the old "Reset View" button
  - Checking off a list item now sinks it to the bottom of its list automatically
  - Click the small color dot on a card's header to recolor it
  - **Multiple checklists per card** — "+ Add list" adds another titled checklist
    inside the same card
  - Paste a URL as a list item and it renders as a clickable link
  - "+ Add image (URL)" lets you drop in an image by pasting its link. Note: this
    is URL-based, not a file upload — direct file/image uploads would need a
    Supabase Storage bucket wired up, which isn't included yet. Ask if you'd like
    that added.
  - **Connect Cards** — click the button, then click two cards to draw a line
    between them (useful for mapping out a process). Click a line to delete it.
  - A small **minimap** appears bottom-right while you're panning, showing all
    your cards and your current viewport.
  - Normal cursor while hovering the canvas; it only shows a "grabbing" hand while
    you're actively panning.
  - The category filter bar (All/School/Parish) is hidden on the Thought Board
    since it's meant to be a personal, unfiled space.
- **Kanban split by category** — when "All" is selected, the board now shows two
  stacked rows: School on top, Parish below, each with the same status columns.
  Switch to "School" or "Parish" only to see a single row.
- **Display Settings (⚙️ tab)** — choose which fields show on ticket cards, set
  independently for School vs. Parish requests (e.g. hide name/email on School
  tickets and only show the problem + date). Saved per-browser.
- **Public queue summary on `/help`** — anyone submitting a ticket now sees a small
  panel showing how many requests are in each status, so they have a general sense
  of where things stand. It only shows counts, never individual ticket details.

## 2c. Applying the v3 update (internal notes on tickets)

Run **`supabase/migration_v3.sql`** in the SQL Editor — it adds a `notes` column to
`tickets`.

New in this version:
- **Internal notes** — every ticket card (List and Kanban) has an "Add note" /
  "Edit note" link. Click it to reveal a small textarea; it autosaves when you click
  away. A small amber dot shows on the link when a ticket already has a note, so you
  can spot at a glance which tickets have follow-up context. Notes are staff-only —
  they're never shown or emailed to the person who submitted the ticket.

## 2b. Applying the v2 feature update (colors, categories, Thought Board)

If you already set up Supabase from `schema.sql`, run **`supabase/migration_v2.sql`**
in the SQL Editor too — it adds:
- A `color` column on `ticket_groups` (for colored List/Kanban columns)
- A `category` column on `tickets` (School vs Parish)
- A new `board_items` table for the Thought Board (infinite canvas notes)

New features in this version:
- **Colored groups** — set a color per status group in "Manage Groups"; List and
  Kanban both reflect it, including the status dropdown on each card.
- **Kanban column reordering** — drag a column by its header to reorder it.
- **Multi-select** — click a card to select it (blue border), Shift+click to select
  a range, drag any selected card to move the whole selection at once. "Deselect
  all" appears once something is selected.
- **Manual ticket entry** — "+ Add" on any group/column lets IT staff create a
  ticket directly without going through `/help`.
- **Sidebar quick-status panel** — a left-hand panel (List/Kanban views) showing a
  couple of statuses at a glance; click "Configure" to choose which ones show.
- **School / Parish divider** — a filter bar under the header to view All, School-only,
  or Parish-only tickets. New tickets default to "School"; change this when adding a
  ticket manually, or extend `HelpForm.jsx` to let submitters pick it too.
- **Thought Board** — a third view: an infinite pannable canvas. Drag the background
  to pan, "+ Add Card" to drop a sticky note anywhere, give it a title, and add
  checklist-style line items inside it. Everything saves to Supabase in real time.

## 2. Create your Supabase project

1. Go to https://supabase.com and create a free project.
2. In the Supabase Dashboard, open **SQL Editor** → **New Query**.
3. Copy the entire contents of `supabase/schema.sql` (included in this project) and run it.
   This creates the `tickets` and `ticket_groups` tables, seeds default groups
   (New, In Progress, Waiting, Resolved), and enables realtime + basic RLS policies.
4. Go to **Project Settings → API** and copy:
   - Project URL
   - `anon` public key

## 3. Enable Google Sign-In for the /it dashboard

1. Go to https://console.cloud.google.com → create (or reuse) a project.
2. Go to **APIs & Services → Credentials → Create Credentials → OAuth Client ID**.
   - Application type: **Web application**
   - Authorized redirect URI: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
     (replace `YOUR_PROJECT` with your actual Supabase project ref)
3. Copy the generated **Client ID** and **Client Secret**.
4. In Supabase Dashboard → **Authentication → Providers → Google**:
   - Toggle it on
   - Paste in the Client ID and Client Secret
   - Save

Any Google account can technically sign in via OAuth, but the app itself checks the
signed-in user's email domain against `VITE_ALLOWED_DOMAIN` in your `.env` file and
blocks anyone outside your school's domain from seeing the dashboard.

## 4. Set up EmailJS (ticket notification emails)

1. Go to https://emailjs.com and create a free account (200 emails/month free).
2. **Email Services** → Add a new service → connect Gmail (or your school's Google
   Workspace Gmail account) via OAuth.
3. **Email Templates** → create a new template with these variables available to use
   in the subject/body: `{{problem}}`, `{{timestamp}}`, `{{to_email}}`.

   Note: the Help form only collects "How can I help?" — no name or email — so those
   variables are no longer sent. If you'd like to capture a reply-to contact again
   later, re-add the fields in `HelpForm.jsx` and pass them into the `emailjs.send()` call.

   Example template body:
   ```
   New IT Ticket Submitted

   Submitted: {{timestamp}}

   Problem:
   {{problem}}
   ```
4. Copy your **Service ID**, **Template ID**, and **Public Key** (found under Account →
   General).

## 5. Add your keys as GitHub Secrets (replaces the .env file)

Since you're not running a build locally, there's no `.env` file to create. Instead:

1. In your GitHub repo, go to **Settings → Secrets and variables → Actions**.
2. Click **New repository secret** and add each of these one at a time (name must
   match exactly):

   | Secret name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | Your Supabase project URL |
   | `VITE_SUPABASE_ANON_KEY` | Your Supabase anon public key |
   | `VITE_ALLOWED_DOMAIN` | e.g. `yourschool.org` |
   | `VITE_EMAILJS_SERVICE_ID` | From EmailJS |
   | `VITE_EMAILJS_TEMPLATE_ID` | From EmailJS |
   | `VITE_EMAILJS_PUBLIC_KEY` | From EmailJS |
   | `VITE_ADMIN_EMAIL` | e.g. `it@yourschool.org` |

3. The included workflow (`.github/workflows/deploy.yml`) automatically injects these
   as environment variables during the build step — no manual file needed.

Note: because this is a static site, these values still end up inside the built
JavaScript that ships to the browser (there's no server to hide them behind). That's
expected and safe for the Supabase anon key and EmailJS public key — they're designed
to be exposed client-side. Just never put a Supabase *service role* key or any other
private API secret into this project.

## 6. Enable GitHub Pages with "GitHub Actions" as the source

1. In your repo, go to **Settings → Pages**.
2. Under **"Build and deployment" → Source**, choose **GitHub Actions** (not
   "Deploy from a branch" — that's the old manual method).
3. That's it — no branch to create manually.

## 7. Configure the base path for GitHub Pages

Open `vite.config.js`:

- Deploying to `https://USERNAME.github.io/REPO-NAME/` → set:
  ```js
  base: '/REPO-NAME/'
  ```
- Deploying to a custom domain (root) → set:
  ```js
  base: '/'
  ```

If using a custom domain, also create a file `public/CNAME` containing just your
domain, e.g.:
```
help.yourschool.org
```

If NOT using a custom domain, update `public/404.html`: set `pathSegmentsToKeep = 1`
(keeps `/REPO-NAME` in the URL). If using a custom domain, set it to `0`.

## 8. Deploy — just push/commit, GitHub Actions does the rest

Any time you edit a file in github.dev and commit it (github.dev commits go straight
to GitHub, there's no separate "push" step needed), the workflow in
`.github/workflows/deploy.yml` automatically:

1. Installs dependencies
2. Builds the app with your secrets injected
3. Publishes the result to GitHub Pages

You can watch it happen under your repo's **Actions** tab — look for the "Deploy to
GitHub Pages" run. Green checkmark = live. This usually takes 1–2 minutes.

Your app will be live at:
- `https://USERNAME.github.io/REPO-NAME/help`
- `https://USERNAME.github.io/REPO-NAME/it`

(or your custom domain equivalents)

## 9. Give IT staff access

No extra setup needed — any IT staff member just visits `/it` and clicks "Sign in
with Google," using their normal school Google account. As long as their email ends
in your `VITE_ALLOWED_DOMAIN`, they're in.

---

## Project structure

```
it-ticket-app/
├── .github/
│   └── workflows/
│       └── deploy.yml           # Auto build + deploy on every push (no terminal needed)
├── public/
│   └── 404.html                 # GitHub Pages SPA redirect trick
├── src/
│   ├── main.jsx                 # Entry point, wraps app in BrowserRouter
│   ├── App.jsx                  # Routes: /help and /it
│   ├── supabaseClient.js        # Supabase client init
│   ├── index.css                # Tailwind imports
│   └── components/
│       ├── HelpForm.jsx         # /help — ticket submission form
│       ├── ITDashboard.jsx      # /it — main dashboard shell
│       ├── ListView.jsx         # Tickets grouped by status
│       ├── KanbanView.jsx       # Full-width drag-and-drop board
│       ├── TicketCard.jsx       # Shared ticket card UI
│       ├── GroupManager.jsx     # Create/rename/reorder/delete groups
│       ├── Login.jsx            # Google sign-in screen
│       └── withAuth.jsx         # Auth gate + domain restriction
├── supabase/
│   └── schema.sql               # Run this in Supabase SQL editor
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
├── .env.example
└── .gitignore
```

## Notes

- **Security**: `/it` is protected by Google OAuth + a client-side domain check. The
  underlying Supabase Row Level Security policies in `schema.sql` are intentionally
  permissive (to keep setup simple since `/help` needs unauthenticated inserts). For
  stricter protection, tighten the RLS policies on `tickets` (update) and
  `ticket_groups` (all) to also check `auth.jwt() ->> 'email'` server-side.
- **Email volume**: EmailJS free tier is 200 emails/month. If your school outgrows
  that, consider a Supabase Edge Function that calls the Gmail API or Resend directly.
- **Drag and drop**: implemented with native HTML5 drag events (no extra library). If
  you want touch-device support or smoother animations, swap in `@dnd-kit/core`.
