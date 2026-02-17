async function createChatCompletion({ apiKey, model, temperature, messages }) {
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY non configurata.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature,
      messages
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Errore OpenAI: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  const text = payload?.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("Risposta AI vuota.");
  }

  return text;
}

module.exports = {
  createChatCompletion
};
