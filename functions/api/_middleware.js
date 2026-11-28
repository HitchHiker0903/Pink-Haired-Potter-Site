// Runs before every /api/* request: makes sure the database tables exist and
// turns unexpected errors into a clean JSON message.
import { ensureSchema } from '../../lib/db.js';
import { json } from '../../lib/util.js';

export async function onRequest(context) {
  try {
    if (!context.env.DB) return json({ error: 'Database binding "DB" is missing. See SETUP-GUIDE.md step 3.' }, 500);
    await ensureSchema(context.env.DB);
    return await context.next();
  } catch (err) {
    console.error(err);
    return json({ error: 'Something went wrong. Please try again.', detail: String(err?.message || err) }, 500);
  }
}
