async function callGemini(apiKey, body) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  // Convert Claude-style messages → Gemini format
  const contents = (body.messages || []).map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));

  const payload = {
    contents
  };

  // Optional system prompt (Claude → Gemini mapping)
  if (body.system) {
    payload.systemInstruction = {
      parts: [{ text: body.system }]
    };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error?.message || "Gemini error");
  }

  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map(p => p.text)
      .join("") || "";

  return {
    content: [
      {
        type: "text",
        text
      }
    ]
  };
}

module.exports = { callGemini };