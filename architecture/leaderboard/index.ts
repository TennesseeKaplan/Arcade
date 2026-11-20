// Deploy as a public Supabase Edge Function named desperados-leaderboard.
const origin = Deno.env.get('ARCADE_ORIGIN') ?? 'https://tennesseekaplan.github.io';
const base = Deno.env.get('SUPABASE_URL');
const token = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const headers = {
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}

Deno.serve(async request => {
  if (request.headers.has('origin') && request.headers.get('origin') !== origin) {
    return json({ error: 'Origin not allowed.' }, 403);
  }
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (!base || !token) return json({ error: 'Leaderboard unavailable.' }, 503);
  const url = base + '/rest/v1/desperados_times';
  const auth = { apikey: token, Authorization: 'Bearer ' + token };
  try {
    if (request.method === 'POST') {
      const raw = await request.text();
      if (raw.length > 512) return json({ error: 'Submission too large.' }, 413);
      let body;
      try { body = JSON.parse(raw); } catch { return json({ error: 'Invalid submission.' }, 400); }
      const name = typeof body?.nickname === 'string' ? body.nickname.trim() : '';
      if (!/^[\p{L}\p{N}][\p{L}\p{N}\p{M} ._'-]{0,23}$/u.test(name) ||
        !Number.isInteger(body?.timeMs) || body.timeMs < 54000 || body.timeMs > 3600000 ||
        typeof body?.runId !== 'string' ||
        !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(body.runId)) {
        return json({ error: 'Enter a valid nickname and finish time.' }, 400);
      }
      const result = await fetch(url + '?on_conflict=run_id', {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal' },
        body: JSON.stringify({ run_id: body.runId, nickname: name, time_ms: body.timeMs }),
      });
      if (!result.ok) throw new Error('Insert failed');
      return json({ saved: true }, 201);
    }
    if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405);
    const result = await fetch(url + '?select=nickname,time_ms&order=time_ms.asc,created_at.asc&limit=10', { headers: auth });
    if (!result.ok) throw new Error('Read failed');
    return json({ scores: await result.json() });
  } catch {
    return json({ error: 'Leaderboard unavailable. Try again.' }, 503);
  }
});
