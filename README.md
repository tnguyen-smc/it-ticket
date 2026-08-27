# IT Help Desk — Setup & Deployment Guide

A two-view IT ticketing app for a small school, built with React (Vite) + Tailwind CSS,
using Supabase for the database/realtime/auth and EmailJS for email notifications.

- `/help` — public ticket submission form (no login required)
- `/it` — admin dashboard (List + Kanban views), gated behind Google Sign-In restricted
  to your school's Google Workspace domain

---

## 1. Install dependencies

```bash
npm install
```

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
   in the subject/body: `{{name}}`, `{{email}}`, `{{problem}}`, `{{timestamp}}`,
   `{{to_email}}`.

   Example template body:
   ```
   New IT Ticket Submitted

   From: {{name}} ({{email}})
   Submitted: {{timestamp}}

   Problem:
   {{problem}}
   ```
4. Copy your **Service ID**, **Template ID**, and **Public Key** (found under Account →
   General).

## 5. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in all the values you collected above:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_ALLOWED_DOMAIN=yourschool.org
VITE_EMAILJS_SERVICE_ID=...
VITE_EMAILJS_TEMPLATE_ID=...
VITE_EMAILJS_PUBLIC_KEY=...
VITE_ADMIN_EMAIL=it@yourschool.org
```

`.env` is already in `.gitignore` — it will not be committed. Note that because this
is a static site, these values do get bundled into the built JS at deploy time. This
is expected and safe for the Supabase anon key and EmailJS public key (they're
designed to be exposed client-side); just never put a Supabase *service role* key or
any private API secret here.

## 6. Run locally

```bash
npm run dev
```

Visit `http://localhost:5173/help` and `http://localhost:5173/it`.

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

## 8. Deploy to GitHub Pages

```bash
npm run build
npm run deploy
```

This uses the `gh-pages` package to push the `dist/` folder to a `gh-pages` branch.

Then in your GitHub repo: **Settings → Pages → Source → Deploy from branch →
`gh-pages` / root**.

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
