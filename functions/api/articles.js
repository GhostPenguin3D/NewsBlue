const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const categories = new Set(["study", "exam", "mindset"]);
const encoder = new TextEncoder();

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

async function authorized(request, env) {
  const expected = env.ARTICLE_ADMIN_TOKEN;
  const supplied = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || !supplied) return false;
  const [expectedHash, suppliedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
    crypto.subtle.digest("SHA-256", encoder.encode(supplied))
  ]);
  const left = new Uint8Array(expectedHash);
  const right = new Uint8Array(suppliedHash);
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

async function requireAdmin(request, env) {
  if (!env.ARTICLE_ADMIN_TOKEN) return reply({ error: "ยังไม่ได้ตั้งค่า ARTICLE_ADMIN_TOKEN บน Cloudflare" }, 503);
  if (!validOrigin(request)) return reply({ error: "Invalid request origin" }, 403);
  if (!(await authorized(request, env))) return reply({ error: "รหัสจัดการบทความไม่ถูกต้อง" }, 401);
  return null;
}

export async function onRequestGet({ env }) {
  if (!env.DB) return reply({ error: "Database is not configured" }, 503);
  const result = await env.DB.prepare(
    "SELECT id, title, excerpt, body, category, author, created_at FROM articles ORDER BY id DESC LIMIT 100"
  ).all();
  return reply({ articles: result.results });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return reply({ error: "Database is not configured" }, 503);
  const denied = await requireAdmin(request, env);
  if (denied) return denied;
  if (Number(request.headers.get("content-length") || 0) > 16000) return reply({ error: "บทความมีขนาดใหญ่เกินกำหนด" }, 413);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return reply({ error: "Invalid JSON body" }, 400);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return reply({ error: "Invalid request body" }, 400);

  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const excerpt = typeof payload.excerpt === "string" ? payload.excerpt.trim() : "";
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  const author = typeof payload.author === "string" ? payload.author.trim().slice(0, 40) : "";
  const category = typeof payload.category === "string" ? payload.category : "";
  if (title.length < 5 || title.length > 120) return reply({ error: "หัวข้อต้องยาว 5-120 ตัวอักษร" }, 400);
  if (excerpt.length > 280) return reply({ error: "คำโปรยต้องไม่เกิน 280 ตัวอักษร" }, 400);
  if (body.length < 20 || body.length > 12000) return reply({ error: "เนื้อหาต้องยาว 20-12,000 ตัวอักษร" }, 400);
  if (!categories.has(category)) return reply({ error: "เลือกหมวดบทความให้ถูกต้อง" }, 400);

  const result = await env.DB.prepare(
    "INSERT INTO articles (title, excerpt, body, category, author) VALUES (?, ?, ?, ?, ?)"
  ).bind(title, excerpt, body, category, author || "ทีมไปต่อ ม.ปลาย").run();
  return reply({ id: result.meta.last_row_id }, 201);
}

export async function onRequestDelete({ request, env }) {
  if (!env.DB) return reply({ error: "Database is not configured" }, 503);
  const denied = await requireAdmin(request, env);
  if (denied) return denied;
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isSafeInteger(id) || id < 1) return reply({ error: "ไม่พบบทความที่ต้องการลบ" }, 400);
  const result = await env.DB.prepare("DELETE FROM articles WHERE id = ?").bind(id).run();
  if (result.meta.changes === 0) return reply({ error: "ไม่พบบทความนี้" }, 404);
  return reply({ ok: true });
}
