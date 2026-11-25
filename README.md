# Allison Walker Ceramics - Custom Pottery Website

Vibrant, playful site for functional ceramic dinnerware. Built for ~$1/month on Cloudflare free tiers + domain.

**Design inspiration**: Bright neon colors, Lisa Frank energy, 80s/90s boldness, glittery fun. Matches the artist's statement and price list aesthetic.

## Features

- Home with intro + featured pieces
- Gallery of past/sold work by collection
- Shop with one-of-a-kind items (photos, price, description, weight)
- Browser-remembered multi-item cart
- Shipping estimate by ZIP (flat tiers + free local pickup in Overland Park KS area)
- Stripe Checkout (server re-validates prices/availability)
- Webhook marks items sold
- Custom order form (email notes in code)
- About & Policies pages (editable)
- Private admin page (Cloudflare Access) for adding/editing items, gallery, texts — works on phone

## Tech Stack

- **Hosting + Functions**: Cloudflare Pages + Pages Functions
- **Database**: Cloudflare D1
- **Photos**: Cloudflare R2 (served via /media/)
- **Auth**: Cloudflare Access (limit to your email)
- **Payments**: Stripe Checkout Sessions + webhook
- **Domain**: Your custom domain (~$10-20/year)

**Estimated cost**: ~$1/month (domain amortized) + Stripe fees (2.9% + 30¢). Enable automatic tax in Stripe for Kansas.

## Setup Guide

### 1. Create Cloudflare Account & Resources

1. Sign up at cloudflare.com (free).
2. Create a **D1 database**:
   - Dashboard → Workers & Pages → D1 → Create database → name it `pottery-db`.
   - Run the SQL in `schema.sql` (copy-paste into the D1 console).
3. Create an **R2 bucket**:
   - R2 → Create bucket → name it `pottery-photos`.
   - (Optional) Make a public custom domain later for images, but the /media/ function works fine.

### 2. Deploy to Cloudflare Pages (important settings)

**Important**: This project uses a `public/` folder for static files and a `functions/` folder for the API. Use these exact build settings.

1. Push the updated files to your GitHub repo (see below if you need to update the repo).
2. In Cloudflare dashboard → **Workers & Pages** → **Create** → select the **Pages** tab (not Workers).
3. Choose **Connect to Git** → select your repository.
4. Configure the build:
   - **Framework preset**: None
   - **Build command**: `exit 0`
   - **Build output directory**: `public`
5. Click **Save and Deploy**.

If you previously created a project that failed, delete it first (Project → Settings → Delete project) and create a new one as a **Pages** project.

After the first successful deploy, go to the project’s **Settings → Bindings** and add:
- D1 binding: Variable name exactly `DB` → select your database
- R2 binding: Variable name exactly `BUCKET` → select your photo bucket

Then go to **Deployments** and click **Retry deployment** (or push a small change to GitHub) so the bindings take effect.

### 3. Bindings (in Pages project Settings → Bindings)

- **D1**: Variable name `DB` → select `pottery-db`
- **R2**: Variable name `BUCKET` → select `pottery-photos`
- Environment variables (Production):
  - `STRIPE_SECRET_KEY` = your Stripe secret key (sk_live_... or sk_test_...)
  - `STRIPE_WEBHOOK_SECRET` = from Stripe webhook endpoint

Redeploy after adding bindings.

### 4. Stripe Setup

1. Create Stripe account → get API keys (use test mode first).
2. In Stripe Dashboard → Developers → Webhooks → Add endpoint:
   - URL: `https://yourdomain.com/api/webhook`
   - Events: `checkout.session.completed`
   - Copy the signing secret into the env var above.
3. Enable Automatic tax (Settings → Tax) and set up Kansas if selling there.
4. Test a purchase in test mode.

**Note on webhook verification**: The provided webhook is simplified. For production, implement full signature verification using the Stripe SDK or Web Crypto (see Cloudflare + Stripe docs).

### 5. Custom Domain

1. In Pages project → Custom domains → Add your domain.
2. Update DNS at your registrar to Cloudflare nameservers (or CNAME if using Cloudflare for DNS).

### 6. Cloudflare Access for Admin

1. Go to Cloudflare Zero Trust (Cloudflare One) → Access → Applications → Add application → Self-hosted.
2. Name: Pottery Admin
3. Domain: `yourdomain.com` Path: `/admin.html` (and optionally `/api/*` for extra security)
4. Identity providers: One-time PIN (email) is simplest.
5. Policy: Allow → Emails → your email address.
6. Save. Now only you can access /admin.html.

### 7. Using the Admin Page

1. Visit `https://yourdomain.com/admin.html` → log in via Access.
2. **Add shop item**: Fill form, upload photos (they go to R2), save. Set status.
3. **Mark sold** (after craft fair): Click Mark Sold on the item.
4. **Gallery**: Upload photo + caption/collection.
5. **Edit texts**: Home intro, About, Policies, Custom info — save.
6. Changes appear immediately on the public site.

### Shipping Tiers

Edit the `shipping_tiers` setting in the database or via a future admin enhancement. Default is item-count based. Local pickup free for Overland Park area ZIPs (662xx etc.).

### Custom Orders

The form currently alerts to email. To fully automate:
- Add a function that uses Cloudflare Email Routing or a service like Resend/Mailgun to email you the form data + photo key.
- Then send a Stripe payment link for the deposit.

### Photos

Uploaded via admin go to R2 and are served at `/media/your-key.jpg`. No resizing built-in (add Cloudflare Image Resizing if needed later, or resize before upload).

### Local Development

```bash
npx wrangler pages dev . --d1=DB=pottery-db --r2=BUCKET=pottery-photos
```

Set env vars in `.dev.vars`.

## Files Overview

- `public/` — all HTML, CSS, JS (this is the build output directory)
- `functions/` — Pages Functions (API endpoints)
- `schema.sql` — database setup
- `README.md` — this file

## Upgrades Later

- Weight + zone shipping table or Shippo/EasyPost live rates
- Full Stripe webhook signature verification
- Email for custom orders
- Image resizing on upload
- Inventory quantities if you do multiples

Enjoy your new site! Questions? The code is straightforward vanilla JS + Cloudflare primitives.
