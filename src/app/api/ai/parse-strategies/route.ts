import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, badRequest } from "@/lib/api";
import { chatCompletion, isLlmConfigured } from "@/lib/llm";

const requestSchema = z.object({
  text: z.string().min(1)
});

const PARSE_STRATEGIES_PROMPT = `将下面每一句话解析为「场景-应对策略」对。每行或每句格式如：「当……时，应该……」。仅返回一个 JSON 数组，不要其他说明文字。

输入文本：
---
{text}
---

输出格式（严格遵循）：
[
  { "scenario": "场景描述（在什么情况下）", "response": "应对策略（应该怎么做）", "title": "简短标题" },
  ...
]`;

export async function POST(request: NextRequest) {
  const json = await request.json();
  const parseResult = requestSchema.safeParse(json);
  if (!parseResult.success) {
    return badRequest("无效的请求参数");
  }

  const { text } = parseResult.data;

  if (isLlmConfigured()) {
    const prompt = PARSE_STRATEGIES_PROMPT.replace("{text}", text);
    const content = await chatCompletion([{ role: "user", content: prompt }]);

    if (content) {
      try {
        const parsed = JSON.parse(content) as Array<{
          scenario?: string;
          response?: string;
          title?: string;
        }>;
        if (Array.isArray(parsed) && parsed.length > 0) {
          const strategies = parsed.map((s) => ({
            scenario: String(s.scenario ?? "").trim() || "未填写场景",
            response: String(s.response ?? "").trim() || "未填写策略",
            title: String(s.title ?? "").trim() || "解析策略"
          }));
          return ok({ strategies });
        }
      } catch {
        // 解析失败则走占位
      }
    }
  }

  // 占位：按句号/换行拆分
  const sentences = text
    .split(/[\n。]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const strategies = sentences.map((sentence, index) => ({
    scenario: sentence.slice(0, 30),
    response: sentence,
    title: `自动解析策略 ${index + 1}`
  }));

  return ok({ strategies });
}
