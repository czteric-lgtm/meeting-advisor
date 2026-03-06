import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, badRequest, notFound } from "@/lib/api";

// 从父路由共享的内存存储
const mockMeetings: any[] = [];

const updateMeetingSchema = z.object({
  title: z.string().optional(),
  date: z.string().optional(),
  summary: z.string().optional(),
  minutes: z.string().optional(),
  custom_goals: z.array(z.string()).optional(),
  custom_strategies: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      scenario: z.string(),
      response: z.string(),
      category: z.string(),
      source: z.enum(["library", "manual", "ai_parsed"])
    })
  ).optional()
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const meeting = mockMeetings.find(m => m.id === id);

  if (!meeting) {
    // 如果没有找到，返回一个默认的模拟会议
    return ok({
      id: id,
      title: "测试会议 - 客户谈判演示",
      status: "in_progress",
      meeting_type: { name: "客户谈判" },
      minutes: "",
      customGoals: ["了解客户需求", "达成合作意向"],
      customStrategies: [
        { id: "st-001", title: "价格策略", scenario: "客户询问价格", response: "先了解客户预算，再提供定制化方案", category: "technique", source: "manual" },
        { id: "st-002", title: "疑虑处理", scenario: "客户对产品有疑虑", response: "用数据和案例支撑，增强说服力", category: "principle", source: "manual" },
        { id: "st-003", title: "跟进策略", scenario: "客户需要更多时间考虑", response: "表示理解，约定下次沟通时间", category: "method", source: "manual" }
      ],
      discussionPoints: [
        { id: "dp-001", content: "确认项目预算范围", status: "pending" },
        { id: "dp-002", content: "确定交付时间节点", status: "pending" }
      ],
      aiSuggestions: [],
      createdAt: new Date().toISOString()
    });
  }

  return ok(meeting);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const json = await request.json();
  const parseResult = updateMeetingSchema.safeParse(json);
  if (!parseResult.success) {
    return badRequest("无效的请求参数");
  }

  const payload = parseResult.data;
  const meetingIndex = mockMeetings.findIndex(m => m.id === id);

  if (meetingIndex === -1) {
    return notFound("会议不存在");
  }

  const updates: Record<string, unknown> = {};
  if (payload.title !== undefined) updates.title = payload.title;
  if (payload.date !== undefined) updates.date = payload.date;
  if (payload.summary !== undefined) updates.summary = payload.summary;
  if (payload.minutes !== undefined) updates.minutes = payload.minutes;
  if (payload.custom_goals !== undefined) updates.customGoals = payload.custom_goals;
  if (payload.custom_strategies !== undefined) updates.customStrategies = payload.custom_strategies;

  mockMeetings[meetingIndex] = { ...mockMeetings[meetingIndex], ...updates };
  return ok(mockMeetings[meetingIndex]);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const meetingIndex = mockMeetings.findIndex(m => m.id === id);

  if (meetingIndex === -1) {
    return notFound("会议不存在");
  }

  mockMeetings.splice(meetingIndex, 1);
  return ok({ id });
}
