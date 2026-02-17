require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const path = require("path");

const { createChatCompletion } = require("./openaiClient");
const {
  calculateEV,
  calculatePayback,
  summarizeCalculation
} = require("./calculator");
const {
  ensureDirs,
  safeTenantId,
  loadTenantConfig,
  saveTenantConfig,
  appendNdjson,
  getPublicConfig
} = require("./store");

const app = express();
const ROOT_DIR = path.resolve(__dirname, "..");

const PORT = Number(process.env.PORT || 3000);
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";

ensureDirs();

const allowedOriginsRaw = String(process.env.ALLOWED_ORIGINS || "*")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);

const allowAllOrigins = allowedOriginsRaw.includes("*");

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false
  })
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowAllOrigins || allowedOriginsRaw.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin non consentita dal server."));
    }
  })
);

app.use(express.json({ limit: "1mb" }));

function getHostnameFromHeader(value) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).hostname.toLowerCase();
  } catch (_) {
    return null;
  }
}

function requestHostname(req) {
  return (
    getHostnameFromHeader(req.headers.origin) ||
    getHostnameFromHeader(req.headers.referer)
  );
}

function enforceEmbedHost(req, tenantConfig) {
  const allowedHosts = tenantConfig?.security?.allowedEmbedHosts;

  if (!Array.isArray(allowedHosts) || allowedHosts.length === 0) {
    return;
  }

  const host = requestHostname(req);
  if (!host) {
    throw new Error("Host embedding non identificato.");
  }

  const normalized = allowedHosts.map((item) => String(item).toLowerCase());

  if (!normalized.includes(host)) {
    throw new Error(`Host non autorizzato: ${host}`);
  }
}

function fallbackReply(message, calculationSummary) {
  const text = String(message || "").toLowerCase();

  if (text.includes("prezzo") || text.includes("costo") || text.includes("preventivo")) {
    return "Posso aiutarti a stimare il rientro economico in base ai tuoi dati reali.";
  }

  if (calculationSummary) {
    return `Ho elaborato la simulazione.\n${calculationSummary}\nSe vuoi, posso anche preparare una sintesi pronta da inviare al consulente.`;
  }

  return "Posso aiutarti con simulazione risparmio EV+FV e anni di rientro.";
}

function adminGuard(req, res, next) {
  const token = req.headers["x-admin-token"] || req.query.token;

  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    res.status(401).json({ ok: false, error: "Token admin non valido." });
    return;
  }

  next();
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, at: new Date().toISOString() });
});

app.get("/api/public/config", (req, res) => {
  try {
    const tenantId = safeTenantId(req.query.tenant || "default");
    const config = loadTenantConfig(tenantId);

    res.json({ ok: true, config: getPublicConfig(config) });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

app.post("/api/calculate", (req, res) => {
  try {
    const tenantId = safeTenantId(req.body.tenant || "default");
    const config = loadTenantConfig(tenantId);
    enforceEmbedHost(req, config);

    const calculation = calculateEV(req.body, config.options);
    const payback = req.body.packageKey
      ? calculatePayback(calculation, req.body.packageKey, config.options)
      : null;

    const summary = summarizeCalculation(calculation, payback);

    appendNdjson("chat.ndjson", {
      type: "calculation",
      tenantId,
      sessionId: req.body.sessionId || null,
      inputs: {
        autoKey: calculation.inputs.autoKey,
        kmAnnui: calculation.inputs.kmAnnui,
        impianto: calculation.inputs.impianto,
        quotaEVdaFV: calculation.inputs.quotaEVdaFV
      }
    });

    res.json({ ok: true, calculation, payback, summary });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const tenantId = safeTenantId(req.body.tenant || "default");
    const config = loadTenantConfig(tenantId);
    enforceEmbedHost(req, config);

    const message = String(req.body.message || "").trim();
    if (!message) {
      res.status(400).json({ ok: false, error: "Messaggio vuoto." });
      return;
    }

    const history = Array.isArray(req.body.history)
      ? req.body.history
          .slice(-8)
          .map((item) => ({
            role: item.role === "assistant" ? "assistant" : "user",
            content: String(item.content || "").slice(0, 2000)
          }))
      : [];

    const calculationSummary = req.body.calculationSummary
      ? String(req.body.calculationSummary).slice(0, 4000)
      : "";

    const model = config?.assistant?.model || OPENAI_MODEL;
    const temperature = Number(config?.assistant?.temperature ?? 0.2);

    const systemPrompt = [
      String(config?.assistant?.systemPrompt || "Rispondi in italiano."),
      "Se citi numeri economici, usa solo dati noti dalla simulazione.",
      "Concludi spesso con un invito breve a completare la simulazione."
    ].join(" ");

    const userContext = calculationSummary
      ? `Contesto simulazione:\n${calculationSummary}\n\nDomanda utente: ${message}`
      : message;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history,
      { role: "user", content: userContext }
    ];

    let reply;
    let source = "fallback";

    if (process.env.OPENAI_API_KEY) {
      try {
        reply = await createChatCompletion({
          apiKey: process.env.OPENAI_API_KEY,
          model,
          temperature,
          messages
        });
        source = "openai";
      } catch (err) {
        reply = fallbackReply(message, calculationSummary);
        appendNdjson("chat.ndjson", {
          type: "chat_error",
          tenantId,
          sessionId: req.body.sessionId || null,
          error: err.message
        });
      }
    } else {
      reply = fallbackReply(message, calculationSummary);
    }

    appendNdjson("chat.ndjson", {
      type: "chat",
      tenantId,
      sessionId: req.body.sessionId || null,
      source,
      userMessage: message,
      assistantMessage: reply
    });

    res.json({ ok: true, reply, source, model });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

app.get("/api/admin/config", adminGuard, (req, res) => {
  try {
    const tenantId = safeTenantId(req.query.tenant || "default");
    const config = loadTenantConfig(tenantId);
    res.json({ ok: true, config });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

app.put("/api/admin/config", adminGuard, (req, res) => {
  try {
    const tenantId = safeTenantId(req.query.tenant || req.body.tenantId || "default");
    const saved = saveTenantConfig(tenantId, req.body);
    res.json({ ok: true, config: saved });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

app.get("/embed.js", (req, res) => {
  res.sendFile(path.join(ROOT_DIR, "public", "embed.js"));
});

app.use("/widget", express.static(path.join(ROOT_DIR, "public", "widget")));
app.use("/admin", express.static(path.join(ROOT_DIR, "public", "admin")));
app.use("/demo", express.static(path.join(ROOT_DIR, "public", "demo")));

app.get("/", (_req, res) => {
  res.type("html").send(`
    <h1>Solar Chat Widget</h1>
    <p>Server attivo. Endpoint embed: <code>/embed.js</code></p>
    <p>Widget: <code>/widget/index.html</code></p>
    <p>Demo Embed (corner): <code>/demo/</code></p>
    <p>Health: <code>/health</code></p>
  `);
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server avviato su http://localhost:${PORT}`);
});
