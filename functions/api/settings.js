// functions/api/settings.js

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare("SELECT key, value FROM settings").all();
  const settings = {};
  for (const row of results) {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch {
      settings[row.key] = row.value;
    }
  }
  return Response.json(settings);
}

export async function onRequestPost({ env, request }) {
  const data = await request.json();
  for (const [key, value] of Object.entries(data)) {
    const val = typeof value === 'object' ? JSON.stringify(value) : value;
    await env.DB.prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value"
    ).bind(key, val).run();
  }
  return Response.json({ success: true });
}
