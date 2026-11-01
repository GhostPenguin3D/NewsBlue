const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

function reply(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers });
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return reply({ error: "Database is not configured" }, 503);
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isSafeInteger(id) || id < 1) return reply({ error: "ไม่พบกระทู้ที่ต้องการ" }, 400);

  const question = await env.DB.prepare(
    "SELECT id, name, body, created_at FROM questions WHERE id = ?"
  ).bind(id).first();
  if (!question) return reply({ error: "ไม่พบกระทู้นี้" }, 404);

  const result = await env.DB.prepare(
    "SELECT id, name, body, created_at FROM answers WHERE question_id = ? ORDER BY id ASC LIMIT 100"
  ).bind(id).all();
  return reply({ question, answers: result.results });
}