/**
 * 通用 LLM 调用封装，兼容 OpenAI 格式接口。
 * 可配置为豆包 / DeepSeek / Kimi 等提供 OpenAI 兼容 endpoint 的服务。
 * 环境变量：LLM_API_BASE（如 https://api.openai.com/v1）、LLM_API_KEY
 */

const LLM_BASE = process.env.LLM_API_BASE ?? process.env.OPENAI_API_BASE ?? "";
const LLM_KEY = process.env.LLM_API_KEY ?? process.env.OPENAI_API_KEY ?? "";
const LLM_MODEL = process.env.LLM_MODEL ?? "gpt-4o-mini";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chatCompletion(
  messages: ChatMessage[],
  options?: { model?: string; temperature?: number }
): Promise<string | null> {
  if (!LLM_BASE || !LLM_KEY) {
    return null;
  }

  const url = `${LLM_BASE.replace(/\/$/, "")}/chat/completions`;
  const body = {
    model: options?.model ?? LLM_MODEL,
    messages,
    temperature: options?.temperature ?? 0.3,
    max_tokens: 2048
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LLM_KEY}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[LLM] chat error:", res.status, err);
      return null;
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    return content ?? null;
  } catch (e) {
    console.error("[LLM] fetch error:", e);
    return null;
  }
}

export function isLlmConfigured(): boolean {
  return Boolean(LLM_BASE && LLM_KEY);
}
