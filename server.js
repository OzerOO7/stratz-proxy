
import express from "express";

const app = express();
app.use(express.json({ limit: "1mb" }));

const STRATZ_URL = "https://api.stratz.com/graphql";
const STRATZ_TOKEN = process.env.STRATZ_TOKEN;
const PROXY_KEY = process.env.PROXY_KEY;

if (!STRATZ_TOKEN) throw new Error("Missing STRATZ_TOKEN");

app.get("/health", (_, res) => res.json({ ok: true }));

app.post("/graphql", async (req, res) => {
  try {
    if (PROXY_KEY && req.get("x-proxy-key") !== PROXY_KEY) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const { query, variables } = req.body || {};
    if (!query) return res.status(400).json({ error: "missing query" });

    const r = await fetch(STRATZ_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "accept": "application/json",
        "authorization": `Bearer ${STRATZ_TOKEN}`,
        "user-agent": "gsheets-stratz-proxy/1.0",
      },
      body: JSON.stringify({ query, variables }),
    });

    const text = await r.text();
    if (text.trim().startsWith("<")) {
      return res.status(502).json({ error: "stratz_html_block", status: r.status, head: text.slice(0, 200) });
    }

    res.status(r.status).type("application/json").send(text);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log("listening on", port));
