const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* =========================
   🧠 Session Memory
========================= */
const sessions = new Map();

function getHistory(sessionId) {
  if (!sessions.has(sessionId)) sessions.set(sessionId, []);
  return sessions.get(sessionId);
}

function appendMessage(sessionId, msg) {
  const history = getHistory(sessionId);
  history.push(msg);

  if (history.length > 20) {
    sessions.set(sessionId, history.slice(-20));
  }
}

/* =========================
   🧰 Gmail tools (mock)
========================= */
const fakeInbox = [
  { id: 1, from: "boss@company.com", subject: "Meeting at 3PM" },
  { id: 2, from: "hr@company.com", subject: "Updated policy" }
];

const listEmails = async () => fakeInbox;

const searchEmails = async (query) =>
  fakeInbox.filter(e =>
    e.from.includes(query) ||
    e.subject.toLowerCase().includes(query.toLowerCase())
  );

const sendEmail = async ({ to, subject }) =>
  ({ status: "sent", to, subject });

/* =========================
   🧭 Intent Router
========================= */
function routeIntent(message) {
  const text = message.toLowerCase();

  if (text.includes("email") || text.includes("gmail") || text.includes("inbox")) return "gmail";
  if (text.includes("research") || text.includes("trend") || text.includes("latest")) return "research";
  return "assistant";
}

/* =========================
   🤖 CLAUDE CALL
========================= */
async function callClaude(apiKey, body) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Claude error");

  const text =
    data.content?.map(c => c.text).join("") || "";

  return text;
}

/* =========================
   🤖 GEMINI CALL (NEW)
========================= */
async function callGemini(apiKey, body) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const contents = (body.messages || []).map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content[0]?.text || "" }]
  }));

  const payload = {
    contents
  };

  if (body.system) {
    payload.systemInstruction = {
      parts: [{ text: body.system }]
    };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Gemini error");

  return data?.candidates?.[0]?.content?.parts
    ?.map(p => p.text)
    .join("") || "";
}

/* =========================
   🧠 MODEL ROUTER (NEW)
========================= */
function pickModel(agent) {
  // You can tune this later
  if (agent === "research") return "gemini"; // faster + cheaper web-style reasoning
  if (agent === "assistant") return "claude"; // best reasoning quality
  if (agent === "gmail") return "claude";
  return "claude";
}

/* =========================
   🧑‍💼 Gmail Agent
========================= */
async function gmailAgent(providerKey, model, history, userMsg) {
  const lower = userMsg.toLowerCase();

  if (lower.includes("latest") || lower.includes("inbox")) {
    const emails = await listEmails();
    return "Latest emails:\n" +
      emails.map(e => `• ${e.from}: ${e.subject}`).join("\n");
  }

  if (lower.includes("search")) {
    const results = await searchEmails("boss");
    return "Search results:\n" +
      results.map(e => `• ${e.subject}`).join("\n");
  }

  if (lower.includes("send")) {
    const result = await sendEmail({
      to: "test@example.com",
      subject: "Hello from agent"
    });
    return `Email sent to ${result.to}`;
  }

  // fallback LLM
  if (model === "gemini") {
    return await callGemini(process.env.GEMINI_API_KEY, {
      system: "You are a Gmail assistant.",
      messages: history
    });
  }

  return await callClaude(providerKey, {
    model: "claude-3-5-sonnet",
    max_tokens: 500,
    system: "You are a Gmail assistant.",
    messages: history
  });
}

/* =========================
   🤖 Assistant Agent
========================= */
async function assistantAgent(providerKey, model, history) {
  if (model === "gemini") {
    return await callGemini(process.env.GEMINI_API_KEY, {
      system: "You are a helpful AI assistant.",
      messages: history
    });
  }

  return await callClaude(providerKey, {
    model: "claude-3-5-sonnet",
    max_tokens: 700,
    system: "You are a helpful AI assistant.",
    messages: history
  });
}

/* =========================
   🔎 Research Agent
========================= */
async function researchAgent(providerKey, model, history) {
  if (model === "gemini") {
    return await callGemini(process.env.GEMINI_API_KEY, {
      system: "You are a research analyst. Provide structured insights.",
      messages: history
    });
  }

  return await callClaude(providerKey, {
    model: "claude-3-5-sonnet",
    max_tokens: 800,
    system: "You are a research analyst. Provide structured insights.",
    messages: history
  });
}

/* =========================
   🚀 MAIN API
========================= */
app.post("/api/chat", async (req, res) => {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const { message, sessionId = "default" } = req.body;

  if (!message) return res.status(400).json({ error: "Message required" });

  try {
    const history = getHistory(sessionId);

    appendMessage(sessionId, {
      role: "user",
      content: [{ type: "text", text: message }]
    });

    const agent = routeIntent(message);
    const model = pickModel(agent);

    let reply;

    if (agent === "gmail") {
      reply = await gmailAgent(anthropicKey, model, history, message);
    } else if (agent === "research") {
      reply = await researchAgent(anthropicKey, model, history);
    } else {
      reply = await assistantAgent(anthropicKey, model, history);
    }

    appendMessage(sessionId, {
      role: "assistant",
      content: [{ type: "text", text: reply }]
    });

    res.json({
      reply,
      agent,
      modelUsed: model
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   SERVER START
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Hybrid Claude + Gemini agent running on port ${PORT}`);
});