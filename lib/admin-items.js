// Validates item data coming from the admin form.
import { str, int, num, dollarsToCents } from './util.js';

export function cleanItem(b) {
  if (!b) return { error: 'Invalid request' };
  const title = str(b.title, 150);
  if (!title) return { error: 'Title is required.' };
  const price_cents = dollarsToCents(b.price);
  if (price_cents === null || price_cents < 50) return { error: 'Price must be at least $0.50.' };
  const weight_lbs = num(b.weight_lbs, NaN);
  if (!(weight_lbs > 0 && weight_lbs < 150)) return { error: 'Packed weight must be between 0 and 150 lbs.' };
  const stock = Math.max(0, Math.min(999, int(b.stock, 1)));
  const images = (Array.isArray(b.images) ? b.images : [])
    .filter((u) => typeof u === 'string' && (u.startsWith('/api/img/') || u.startsWith('/images/')))
    .slice(0, 10);
  return {
    title,
    description: str(b.description, 5000),
    price_cents,
    weight_lbs: Math.round(weight_lbs * 100) / 100,
    stock,
    category: str(b.category, 60),
    images,
    featured: b.featured ? 1 : 0,
    status: b.status === 'hidden' ? 'hidden' : 'active',
  };
}
