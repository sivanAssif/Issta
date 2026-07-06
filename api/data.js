const REPO = "sivanAssif/Issta";
const API = `https://api.github.com/repos/${REPO}/contents/data.json`;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,PUT,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-User");
  if (req.method === "OPTIONS") return res.status(204).end();

  const tok = process.env.GH_TOKEN;
  if (!tok) return res.status(500).json({ error: "GH_TOKEN not configured" });
  const gh = (u, init = {}) => fetch(u, {
    ...init,
    headers: { Authorization: "Bearer " + tok, Accept: "application/vnd.github+json", ...(init.headers || {}) },
  });

  if (req.method === "GET") {
    const r = await gh(API + "?ref=main&_=" + Date.now(), { cache: "no-store" });
    if (!r.ok) return res.status(502).json({ error: "load failed " + r.status });
    const meta = await r.json();
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(200).send(Buffer.from(meta.content, "base64").toString("utf8"));
  }

  if (req.method === "PUT" || req.method === "POST") {
    const data = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    if (!data || data.length > 900000) return res.status(400).json({ error: "bad payload" });
    try { JSON.parse(data); } catch { return res.status(400).json({ error: "not json" }); }
    let sha;
    try { const m = await gh(API + "?ref=main"); if (m.ok) sha = (await m.json()).sha; } catch {}
    const user = req.headers["x-user"] ? decodeURIComponent(req.headers["x-user"]) : "לא ידוע";
    const body = {
      message: "עדכון דשבורד — " + user,
      content: Buffer.from(data, "utf8").toString("base64"),
      branch: "main",
    };
    if (sha) body.sha = sha;
    const r = await gh(API, { method: "PUT", body: JSON.stringify(body) });
    if (!r.ok) return res.status(502).json({ error: "save failed " + r.status });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
