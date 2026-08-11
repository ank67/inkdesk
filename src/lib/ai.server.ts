const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

type Content = string | Array<Record<string, unknown>>;

export async function chat(messages: Array<{ role: string; content: Content }>) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured for this app.");

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({ model: MODEL, messages }),
  });

  if (res.status === 429) throw new Error("Too many requests right now — try again in a moment.");
  if (res.status === 402) throw new Error("AI credits are exhausted. Add credits to keep using AI features.");
  if (!res.ok) throw new Error(`AI request failed (${res.status}): ${await res.text()}`);

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}

export function toBullets(raw: string) {
  return raw
    .split("\n")
    .map((l) => l.replace(/^\s*[-*•\d.)]+\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3);
}
