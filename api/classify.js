// Esta función corre en el servidor de Vercel, nunca en el navegador del usuario.
// Por eso la clave ANTHROPIC_API_KEY nunca queda expuesta al público.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "missing_api_key" });
    return;
  }

  try {
    const { image } = req.body; // string base64, sin el prefijo data:image/...;base64,
    const mediaTypeMatch = /^data:(image\/[a-zA-Z]+);base64,/.exec(image || "");
    const mediaType = mediaTypeMatch ? mediaTypeMatch[1] : "image/jpeg";
    const base64Data = image.replace(/^data:image\/[a-zA-Z]+;base64,/, "");

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 100,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } },
              {
                type: "text",
                text:
                  "Clasifica esta foto de un reporte ambiental en una sola de estas categorías exactas: plastico, vertimiento, organico, otro. " +
                  "plastico = botellas, bolsas, empaques de un solo uso. vertimiento = químicos o aguas residuales visibles en una fuente de agua. " +
                  "organico = restos de comida u otro material biodegradable. otro = cualquier otra afectación ambiental. " +
                  'Responde ÚNICAMENTE un JSON válido así, sin texto adicional: {"category":"plastico","confidence":0.9}',
              },
            ],
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      res.status(502).json({ error: "anthropic_error", detail: errText });
      return;
    }

    const data = await anthropicRes.json();
    const textBlock = data.content.find((b) => b.type === "text");
    const parsed = JSON.parse(textBlock.text.trim());
    const valid = ["plastico", "vertimiento", "organico", "otro"];
    const category = valid.includes(parsed.category) ? parsed.category : "otro";

    res.status(200).json({ category, confidence: parsed.confidence ?? 0.7 });
  } catch (err) {
    res.status(500).json({ error: "classify_failed", detail: String(err) });
  }
}
