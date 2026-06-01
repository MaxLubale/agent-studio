// agents/gmailAgent.js
const { listEmails, searchEmails, sendEmail } = require("../tools/gmail");

async function gmailAgent(apiKey, history, userMsg) {
  const lower = userMsg.toLowerCase();

  // 🔧 TOOL ROUTING (deterministic)
  if (lower.includes("latest") || lower.includes("inbox")) {
    const emails = await listEmails();
    return `Here are your latest emails:\n` +
      emails.map(e => `- ${e.from}: ${e.subject}`).join("\n");
  }

  if (lower.includes("search")) {
    const result = await searchEmails("boss");
    return `Search results:\n` +
      result.map(e => `- ${e.subject}`).join("\n");
  }

  if (lower.includes("send")) {
    const result = await sendEmail({
      to: "test@example.com",
      subject: "Hello",
      body: "Test email"
    });
    return `Email sent to ${result.to}`;
  }

  // fallback to Claude reasoning
  const { callClaude } = require("../claude");

  const res = await callClaude(apiKey, {
    model: "claude-3-5-sonnet",
    max_tokens: 500,
    system: "You are a Gmail assistant.",
    messages: history
  });

  return res.content.map(c => c.text).join("\n");
}

module.exports = { gmailAgent };