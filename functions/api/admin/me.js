import { json } from '../../../lib/util.js';
export async function onRequestGet({ data, env }) {
  return json({ email: data.admin, stripe: !!env.STRIPE_SECRET_KEY, webhook: !!env.STRIPE_WEBHOOK_SECRET, storage: !!env.BUCKET, email_notices: !!(env.RESEND_API_KEY && env.NOTIFY_EMAIL) });
}
