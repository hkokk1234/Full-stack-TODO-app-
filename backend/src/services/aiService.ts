import config from "../config/env";

type AiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const extractContent = (raw: unknown): string => {
  const data = raw as {
    choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
  };

  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => (part?.type === "text" ? part.text ?? "" : ""))
      .join("")
      .trim();
  }
  return "";
};

export const askOpenAI = async (messages: AiMessage[]): Promise<string> => {
  if (!config.openaiApiKey) {
    return "OPENAI_API_KEY is missing on backend. Add it in backend/.env to enable AI replies.";
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.openaiApiKey}`
      },
      body: JSON.stringify({
        model: config.openaiModel,
        temperature: 0.3,
        max_tokens: 500,
        messages
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      return `AI request failed (${response.status}). Check OPENAI_API_KEY / OPENAI_MODEL.`;
    }

    const data = await response.json();
    const content = extractContent(data);
    return content || "I could not generate a response. Please try again.";
  } catch {
    return "AI request failed. Please retry.";
  } finally {
    clearTimeout(timeout);
  }
};
