# NovaLead — complete starter project

A responsive Dutch lead-generation website with a futuristic visual style. Includes:
- Landing page and feature overview
- Lead/contact form
- Login and registration using Supabase Auth
- Dashboard with lead list, search and status filter
- Admin-only lead management enforced by Supabase Row Level Security
- Responsive layouts, subtle animation and reduced-motion support

## 1. What you need

- A computer for the easiest setup (Windows, macOS or Linux). You can inspect the code on Android, but running/building it is easier on a computer.
- Node.js 20 or newer: https://nodejs.org/
- A free Supabase account for real login and saved leads: https://supabase.com/
- A free hosting account such as Vercel or Netlify to publish the site.

The site can run in demo mode without Supabase, but login and data persistence will not work until configured.

## 2. Run locally

1. Download and unzip the project.
2. Open a terminal in the `novalead` folder.
3. Run:

   ```bash
   npm install
   npm run dev
   ```

4. Open the local URL printed by Vite (usually `http://localhost:5173`).

To test the production build:

```bash
npm run build
npm run preview
```

## 3. Configure Supabase (real accounts and saved leads)

1. Create a project at https://supabase.com/.
2. Open **SQL Editor** in your project.
3. Copy all of `supabase/schema.sql` into a new query and run it.
4. In Supabase, open **Project Settings → API** (or **Connect**) and copy the Project URL and the publishable/anon key.
5. Copy `.env.example` to a new file named `.env` in the project root.
6. Replace the example values:

   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY
   ```

7. Stop and restart the Vite server after changing `.env`.
8. In **Authentication → URL Configuration**, set your local Site URL to `http://localhost:5173` and add your deployed site URL to Redirect URLs after deployment.
9. Register an account on the site. If email confirmation is enabled, confirm the email before logging in.

### Make your account an administrator

After you register, run this in Supabase SQL Editor. Replace the email with the email you used:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users where email = 'jouw@email.nl'
);
```

Log out and back in so the app reloads your profile. The Admin panel will appear and authorized admin users can see and update leads.

**Security note:** never put the Supabase `service_role` / secret key in a frontend `.env` file. Only the public anon/publishable key belongs in this client app. RLS is what protects the data.

## 4. Publish for free with Vercel

1. Create a GitHub account if needed and create a private repository.
2. Upload the contents of this folder to the repository (not the ZIP file itself).
3. Open https://vercel.com/ and import the repository.
4. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`.
5. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under the project's Environment Variables.
6. Deploy. Add the Vercel URL to Supabase Authentication URL Configuration.
7. Test registration, login, lead submission and admin-only access.

Netlify can also host the Vite app. Use build command `npm run build`, publish directory `dist`, and configure the same environment variables.

## 5. Important before public launch

This is a functional starter, not a fully audited production service. Before collecting real people's data:
- Add your legal business details and a real privacy statement.
- Make sure the privacy statement explains why data is collected, the legal basis, retention period, recipients and contact details.
- Ask only for data you need and delete it when no longer necessary.
- Add rate limiting / CAPTCHA or another anti-spam measure to the public form.
- Consider email notifications, backups, monitoring and a data deletion workflow.
- Test permissions with a normal account and an admin account.
- Do not use real customer data in the demo mode.
- The privacy link in the footer is only a placeholder; replace it before publishing.

## 6. Project structure

```text
novalead/
├── index.html
├── package.json
├── .env.example
├── README.md
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── styles.css
│   └── lib/
│       └── supabase.js
└── supabase/
    └── schema.sql
```

## 7. What is real vs. demo?

- Landing page, animations, navigation, forms and responsive layout: works locally.
- Without Supabase: sample leads are local demo data; login is intentionally unavailable.
- With Supabase configured: authentication and database persistence work, subject to your project configuration.
- Admin access is based on the `profiles.role` value and enforced by database RLS policies, not merely by hiding a button.
- Email delivery, CRM integrations, payments, analytics attribution and CAPTCHA are not included.
