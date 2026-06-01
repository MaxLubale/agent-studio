// agents/assistantAgent.js
const { callClaude } = require("../claude");

async function assistantAgent(apiKey, history) {
  const res = await callClaude(apiKey, {
    model: "claude-3-5-sonnet",
    max_tokens: 700,
    system: "You are a helpful AI assistant.",
    messages: history
  });

  return res.content.map(c => c.text).join("\n");
}

module.exports = { assistantAgent };