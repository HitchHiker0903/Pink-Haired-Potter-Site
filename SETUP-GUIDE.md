# The Pink Haired Potter — Setup Guide

This guide takes the site from GitHub to live on your own domain. Plan on about 1–2 hours the first time.

**What it costs**
- Website, server code, database, photo storage, and admin login: **$0/month** on Cloudflare's free tiers.
- Domain name: about **$10–20/year**.
- Stripe: a fee on each sale only, with no monthly fee.

---

## What's in this folder

| Folder/file | What it is |
|---|---|
| `public/` | The website pages, styles, images, and the admin page (`public/admin/`) |
| `functions/` | Server code: cart pricing, checkout, Stripe webhook, and the admin API |
| `lib/` | Shared server code. `lib/defaults.js` holds the starting text (artist statement, policies, shipping) |
| `ADMIN-GUIDE.md` | How Allison uses the admin page day to day |

The database tables are **created automatically** the first time the site runs, so you don't need to run any SQL.

---

## Step 1 — Put the code on GitHub

1. Create a new **private** repository on GitHub, e.g. `pink-haired-potter-site`.
2. Upload the **contents** of this folder so that `public/`, `functions/`, and `lib/` sit at the top level of the repo, not inside another folder.
   - In the browser: **Add file → Upload files**, then drag in everything from inside the folder.
   - With Git: `git init`, `git add .`, `git commit -m "Initial site"`, then push.

## Step 2 — Create the database and photo storage in Cloudflare

In the Cloudflare dashboard:

1. **Storage & Databases → D1 → Create database**. Name it `pinkpotter-db`.
2. **R2 Object Storage → Create bucket**. Name it `pinkpotter-photos`.
   - Cloudflare may ask for a payment method to turn on R2. The free tier covers 10 GB of storage, which is thousands of photos, so a hobby shop won't be charged.

## Step 3 — Create the Pages project from GitHub

1. **Workers & Pages → Create → Pages → Connect to Git**, then pick your repo.
2. Build settings:
   - **Framework preset:** None
   - **Build command:** *(leave blank)*
   - **Build output directory:** `public`
3. Click **Save and Deploy**. You'll get an address like `pink-haired-potter-site.pages.dev`.
4. Open the project's **Settings → Bindings** and add:

   | Type | Variable name | Value |
   |---|---|---|
   | D1 database | `DB` | `pinkpotter-db` |
   | R2 bucket | `BUCKET` | `pinkpotter-photos` |

   The names `DB` and `BUCKET` must match exactly.
5. **Deployments → (latest) → ⋯ → Retry deployment**, so the bindings take effect.
6. Visit the `.pages.dev` address. The home page should show the starter gallery photos and artist statement.

## Step 4 — Connect your domain

1. Buy the domain. **Cloudflare Registrar** (Domain Registration → Register Domains) is the easiest because it sells at cost and DNS is set up automatically.
2. In the Pages project, go to **Custom domains → Set up a custom domain**. Add `yourdomain.com`, then add `www.yourdomain.com` too.
3. HTTPS turns on automatically within a few minutes.

## Step 5 — Stripe (payments)

1. Create an account at stripe.com and complete the business activation. For a hobby seller, choose **Individual / sole proprietor**.
2. **Start in Test mode** (the toggle in the Stripe dashboard).
3. **Developers → API keys**: copy the **Secret key** (`sk_test_…`).
4. **Developers → Webhooks → Add endpoint**:
   - Endpoint URL: `https://yourdomain.com/api/stripe-webhook`
   - Events: `checkout.session.completed` and `checkout.session.expired`
   - After saving, copy the **Signing secret** (`whsec_…`).
5. Recommended Stripe settings:
   - **Settings → Customer emails**: turn on receipts for **Successful payments**.
   - **Settings → Business → Public details**: add the business name, support email, and a statement descriptor like `PINK HAIRED POTTER`.
   - Install the **Stripe app** on your phone to get a notification for every sale.

## Step 6 — Admin login (Cloudflare Access)

This locks `/admin` so only Allison's email can get in. At login, she types her email and receives a one-time code.

1. In the Cloudflare dashboard, open **Zero Trust**. The first time, choose a **team name** (e.g. `pinkpotter`) and the **Free** plan. It may ask for a card, but the free plan is $0.
2. **Access → Applications → Add an application → Self-hosted**:
   - Name: `Pink Haired Potter Admin`
   - Session duration: `1 month`, so she isn't asked to log in constantly.
   - Add these public hostnames/paths:

     | Domain | Path |
     |---|---|
     | `yourdomain.com` | `admin` |
     | `yourdomain.com` | `api/admin` |
     | `www.yourdomain.com` | `admin` |
     | `www.yourdomain.com` | `api/admin` |
     | `your-project.pages.dev` | `admin` |
     | `your-project.pages.dev` | `api/admin` |

   - Policy: **Allow**, Include → **Emails** → `thepinkhairedpotter@gmail.com`. Add your own email if you'll help manage it.
   - Login method: **One-time PIN** (the default).
3. After saving, open the application's **Overview** and copy the **Application Audience (AUD) Tag**.

The server code also verifies the Access login token on every admin request. Even if a path were left out above, the admin API won't work without a valid login.

## Step 7 — Add the settings (environment variables)

In the Pages project, go to **Settings → Variables and Secrets** and add these for **Production**. Use the **Secret** type for anything marked secret.

| Name | Type | Value |
|---|---|---|
| `SITE_URL` | Text | `https://yourdomain.com` |
| `ADMIN_EMAILS` | Text | `thepinkhairedpotter@gmail.com` (comma-separate to add more) |
| `ACCESS_TEAM_DOMAIN` | Text | `pinkpotter.cloudflareaccess.com` (your team name) |
| `ACCESS_AUD` | Secret | The AUD tag from Step 6 |
| `STRIPE_SECRET_KEY` | Secret | `sk_test_…` for now; switch to `sk_live_…` at launch |
| `STRIPE_WEBHOOK_SECRET` | Secret | `whsec_…` from Step 5 |
| `RESEND_API_KEY` | Secret | *Optional.* Emails Allison when a custom request comes in (see below) |
| `NOTIFY_EMAIL` | Text | *Optional.* `thepinkhairedpotter@gmail.com` |
| `STRIPE_AUTOMATIC_TAX` | Text | *Optional.* `true` to have Stripe Tax calculate sales tax (see Sales tax) |

Then **Retry deployment** so the new values load.

**Custom request emails (optional, free).** Create a free account at resend.com **using `thepinkhairedpotter@gmail.com`**, create an API key, and set `RESEND_API_KEY` and `NOTIFY_EMAIL`. Without a verified domain, Resend only delivers to the account owner's email, which is exactly what this needs. Requests always appear in **Admin → Custom requests** either way.

## Step 8 — Test everything (still in Stripe Test mode)

1. Go to `https://yourdomain.com/admin`, log in with the email code, and confirm no red setup warnings appear.
2. Add a test item for $1.00 with a photo.
3. On the site, add it to the cart, enter a ZIP code, and check out with test card **4242 4242 4242 4242**, any future date, and any CVC.
4. Confirm the following:
   - The thank-you page appears.
   - The item disappears from the shop.
   - The order shows up in **Admin → Orders**.
   - Stripe → Webhooks shows a successful (200) delivery.
5. Test **Local pickup**. The thank-you page should show the pickup address.
6. Submit the **Custom orders** form, then create a **payment link** for it in Admin.
7. Delete the test item.

## Step 9 — Go live

1. In Stripe, switch to **Live mode**.
2. Create a **new live webhook**, the same as Step 5, and copy its new signing secret.
3. Replace `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in Cloudflare with the **live** values, then **Retry deployment**.
4. Replace the starter photos and add real items.

---

## Before launch: review these

- **Photos.** The starter photos are small (about 200 px) and look soft on large screens. Upload full-size originals through **Admin → Gallery** and delete the starters. To replace the photos on the home, about, and custom pages, swap the files in `public/images/work/` (keep the same file names) and push to GitHub.
- **Logos.** If there are higher-resolution logo files, replace `public/images/logo-wordmark.png` and `logo-badge.png` (transparent PNGs work best).
- **Policies and care text.** These are drafts. Edit them in **Admin → Page text** so they match how the pieces should actually be used and washed, along with the return policy.
- **Shipping prices.** These are placeholders. Price out a real packed mug and set the tiers in **Admin → Shipping**.
- **Sales tax.** Kansas taxes retail sales, so check with the Kansas Department of Revenue about registering. To collect tax at checkout, turn on **Stripe Tax** in Stripe, add your Kansas registration, and set `STRIPE_AUTOMATIC_TAX=true`. Stripe Tax charges a per-transaction fee, so check Stripe's pricing. The other option is to handle tax outside the site with your accountant's guidance.
- **Privacy.** The pickup street address is never shown publicly. It appears only on the confirmation page after a paid pickup order.

## How it works (reference)

- **Cart → checkout.** The browser sends only item IDs and quantities. The server looks up the real prices and computes shipping from packed weight, then creates a Stripe Checkout session. Card details are entered on Stripe's page and never touch this site.
- **No double-selling.** Starting checkout puts a 30-minute hold on the pieces, and the shop shows them as "On hold." When payment completes, the webhook lowers the stock and records the order. If checkout is abandoned, Stripe expires the session and the hold is released.
- **ZIP check.** If the shipping address ZIP at Stripe differs from the ZIP used for the estimate, the order is flagged in Admin so you can check postage. This only matters if the far-ZIP surcharge is turned on.

## Local testing (optional, for developers)

```
npx wrangler pages dev public --d1 DB --r2 BUCKET
```
For local testing only, create a `.dev.vars` file containing `DEV_MODE=true`. It skips the admin login on your computer. **Never** set `DEV_MODE` in Cloudflare.
