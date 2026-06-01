// router.js
function routeIntent(message) {
  const text = message.toLowerCase();

  if (text.includes("email") || text.includes("inbox") || text.includes("gmail")) {
    return "gmail";
  }

  if (text.includes("research") || text.includes("latest") || text.includes("trend")) {
    return "research";
  }

  return "assistant";
}

module.exports = { routeIntent };