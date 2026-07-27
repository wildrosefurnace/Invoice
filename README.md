# Wildrose Invoice

An iPhone-first production web app for Wildrose Furnace & Duct Cleaning. It opens on a real dashboard and supports blank invoice creation, editable customer details, the Wildrose service catalog, custom services, Alberta GST, invoice review, electronic customer approval, secure cloud history, paid/unpaid status, business settings, and branded PDF sharing.

Generated PDFs use a professional Wildrose letterhead with the real company mark, navy and green theme, contact details, invoice metadata, customer and service tables, GST and totals, notes, customer approval, and a branded page footer.

No customer or invoice examples are preloaded. The app keeps a local offline cache and, after Supabase is configured, securely synchronizes invoices and settings across devices.

## Cloud database and permanent invoice numbers

Supabase provides passwordless email authentication, Postgres storage, row-level security, and a transactional invoice-number counter. Numbers use the permanent sequence `WR-1001`, `WR-1002`, and so on. Reserving a number also creates its draft in the same database transaction, so deleting invoices or changing devices never causes a number to be reused.

1. Create or connect a Supabase project.
2. Run `supabase/migrations/202607260001_cloud_invoices.sql` in the Supabase SQL Editor.
3. Copy `.env.example` to `.env.local` and enter the project URL and publishable anon key.
4. Add the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` variables to the Vercel project for Production, Preview, and Development.
5. In Supabase Authentication URL settings, add the production Vercel domain as the Site URL and an allowed redirect URL.
6. Redeploy and sign in using the business owner’s email magic link.

Until the environment variables are configured, the app remains usable in device-storage mode and maintains a separate non-resetting local counter. On the first cloud login, existing device invoices are imported. If old device data contains duplicate numbers, the earliest record keeps its number and later duplicates receive new permanent numbers.

## Run locally

```bash
npm ci
npm run dev
```

The development preview runs at `http://localhost:4173` by default.

## Production build

```bash
npm run build
```

The Sites-compatible output is written to `dist/`.

## Install on iPhone

Once the app is hosted over HTTPS:

1. Open the app in Safari on the iPhone.
2. Tap the Share button.
3. Choose **Add to Home Screen**.
4. Launch **Wildrose Invoice** from the new home-screen icon.

The included web-app manifest and iOS metadata make it open in a standalone app window.

## Host with GitHub Pages

This repository includes `.github/workflows/deploy-pages.yml`.

1. Upload the project files to the `main` branch of `wildrosefurnace/Invoice`.
2. Open the repository's **Settings → Pages**.
3. Under **Build and deployment**, choose **GitHub Actions**.
4. Open the **Actions** tab and run **Deploy Wildrose Invoice to GitHub Pages** if it did not start automatically.

The application uses portable relative asset paths, so it works from the repository's `/Invoice/` GitHub Pages location.
The Pages workflow uses `npm run build:pages`; no external hosting credentials or `.openai` files are required.

## Verification

- `npm run check:runtime` verifies the locked project runtime files.
- `npm run build` verifies TypeScript and the production bundle.
- `npm run test:pdf` verifies that the branded invoice generator produces a valid, non-empty PDF.
- `npm run test:sites` verifies the packaged worker and app-route fallback.
- `design-qa.md` records the visual comparison and interaction QA evidence.
