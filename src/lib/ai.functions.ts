import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { chat, toBullets } from "./ai.server";

export const summarizeDocument = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ title: z.string(), text: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const raw = await chat([
      {
        role: "system",
        content:
          "You summarize documents. Reply with exactly 3 short bullet points, one per line, no numbering, no preamble, max 18 words each.",
      },
      { role: "user", content: `Title: ${data.title}\n\nContent:\n${data.text.slice(0, 12000)}` },
    ]);
    return { bullets: toBullets(raw) };
  });

export const askDocument = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        title: z.string(),
        context: z.string(),
        history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).max(20),
        question: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const answer = await chat([
      {
        role: "system",
        content: `You answer questions strictly about the document "${data.title}". Be concise. If the answer is not in the excerpt, say so.\n\nDocument excerpt:\n${data.context.slice(0, 14000)}`,
      },
      ...data.history,
      { role: "user", content: data.question },
    ]);
    return { answer };
  });

export const extractTextFromImage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ dataUrl: z.string().startsWith("data:image/") }).parse(d))
  .handler(async ({ data }) => {
    const text = await chat([
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extract all readable text from this page image. Return only the text, preserving line breaks and reading order.",
          },
          { type: "image_url", image_url: { url: data.dataUrl } },
        ],
      },
    ]);
    return { text };
  });
