// memory.js
const conversations = new Map(); // sessionId -> messages[]

function getHistory(sessionId) {
  if (!conversations.has(sessionId)) {
    conversations.set(sessionId, []);
  }
  return conversations.get(sessionId);
}

function appendMessage(sessionId, msg) {
  const history = getHistory(sessionId);
  history.push(msg);

  // simple windowing (last 20 messages)
  if (history.length > 20) {
    conversations.set(sessionId, history.slice(-20));
  }
}

module.exports = { getHistory, appendMessage };