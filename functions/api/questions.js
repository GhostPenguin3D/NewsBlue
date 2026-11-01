const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

function reply(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers });
}

function validOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function onRequestGet({ env }) {
  if (!env.DB) return reply({ error: "Database is not configured" }, 503);
  const result = await env.DB.prepare(
    "SELECT id, name, body, created_at FROM questions ORDER BY id DESC LIMIT 50"
  ).all();
  return reply({ questions: result.results });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return reply({ error: "Database is not configured" }, 503);
  if (!validOrigin(request)) return reply({ error: "Invalid request origin" }, 403);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return reply({ error: "Invalid JSON body" }, 400);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return reply({ error: "Invalid request body" }, 400);
  }
  if (typeof payload.website === "string" && payload.website.trim()) return reply({ ok: true }, 201);

  const name = typeof payload.name === "string" ? payload.name.trim().slice(0, 40) : "";
  const body = typeof payload.question === "string" ? payload.question.trim() : "";
  if (body.length < 5 || body.length > 240) return reply({ error: "คำถามต้องมีความยาว 5-240 ตัวอักษร" }, 400);

  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`question:${ip}`));
    const ipHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    const now = Math.floor(Date.now() / 1000);
    const limit = await env.DB.prepare(
      "INSERT INTO post_limits (ip_hash, last_post) VALUES (?, ?) ON CONFLICT(ip_hash) DO UPDATE SET last_post = excluded.last_post WHERE post_limits.last_post <= excluded.last_post - 60"
    ).bind(ipHash, now).run();
    if (limit.meta.changes === 0) return reply({ error: "รอสักครู่ก่อนส่งคำถามถัดไปนะ" }, 429);
  }

  const result = await env.DB.prepare(
    "INSERT INTO questions (name, body) VALUES (?, ?)"
  ).bind(name || "ไม่ระบุชื่อ", body).run();
  return reply({ id: result.meta.last_row_id }, 201);
}