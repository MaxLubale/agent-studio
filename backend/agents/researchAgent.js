// agents/researchAgent.js
const { callClaude } = require("../claude");

async function researchAgent(apiKey, history) {
  const res = await callClaude(apiKey, {
    model: "claude-3-5-sonnet",
    max_tokens: 800,
    system: "You are a research analyst. Provide structured insights.",
    messages: history
  });

  return res.content.map(c => c.text).join("\n");
}

module.exports = { researchAgent };