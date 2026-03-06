import { NextRequest } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { ok, badRequest } from "@/lib/api";
import { chatCompletion, isLlmConfigured } from "@/lib/llm";

const requestSchema = z.object({
  meeting_id: z.string().uuid(),
  current_transcript: z.string().min(1),
  recent_transcripts: z.array(z.string()).default([]),
  strategies: z.array(z.string()).default([]),
  discussion_points: z.array(z.string()).default([])
});

const SUGGESTIONS_PROMPT = `你是一个会议助手，帮助用户在会议中做出更好的回应。

## 当前对话
{recent_transcripts}

## 最新发言
{current_transcript}

## 可用策略（场景 -> 应对）
{strategies}

## 待沟通点
{discussion_points}

请分析最新发言，提供：
1. 若匹配某条策略，给出 response 类型建议（直接给出建议回复内容），并说明匹配的策略场景
2. 若有值得追问的点，给出 question 类型建议
3. 若发现新的待沟通点（如承诺、需跟进事项），在 new_discussion_points 中列出

仅返回一个 JSON 对象，不要其他文字：
{
  "suggestions": [
    { "type": "response", "content": "建议内容", "matched_scenario": "匹配的策略场景描述" }
  ],
  "new_discussion_points": [
    { "content": "待沟通点描述" }
  ],
  "matched": true
}`;

export async function POST(request: NextRequest) {
  const json = await request.json();
  const parseResult = requestSchema.safeParse(json);
  if (!parseResult.success) {
    return badRequest("无效的请求参数");
  }

  const {
    current_transcript: currentTranscript,
    recent_transcripts: recentTranscripts,
    strategies,
    discussion_points: discussionPoints
  } = parseResult.data;

  if (isLlmConfigured()) {
    const prompt = SUGGESTIONS_PROMPT.replace("{recent_transcripts}", recentTranscripts.join("\n"))
      .replace("{current_transcript}", currentTranscript)
      .replace("{strategies}", strategies.join("\n"))
      .replace("{discussion_points}", discussionPoints.join("\n"));

    const content = await chatCompletion([
      { role: "user", content: prompt }
    ]);

    if (content) {
      try {
        const parsed = JSON.parse(content) as {
          suggestions?: Array<{ type: string; content: string; matched_scenario?: string }>;
          new_discussion_points?: Array<{ content: string }>;
          matched?: boolean;
        };
        const suggestions = (parsed.suggestions ?? []).map((s) => ({
          id: randomUUID(),
          type: (s.type === "question" ? "question" : s.type === "keypoint" ? "keypoint" : "response") as "response" | "question" | "keypoint",
          content: s.content,
          matched_scenario: s.matched_scenario || null,
          matched: parsed.matched || false
        }));
        const newDiscussionPoints = (parsed.new_discussion_points ?? []).map((p) => ({ content: p.content }));
        return ok({
          suggestions,
          new_discussion_points: newDiscussionPoints
        });
      } catch {
        // JSON 解析失败时继续走占位逻辑
      }
    }
  }

  // 占位逻辑
  const suggestions = [
    {
      id: randomUUID(),
      type: "response" as const,
      content: `可以先复述对方关切点，再给出简要回应：${currentTranscript.slice(0, 50)}...`,
      matched_strategy_id: null
    }
  ];

  return ok({
    suggestions,
    new_discussion_points: [] as Array<{ content: string }>
  });
}
