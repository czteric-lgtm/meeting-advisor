import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, created, badRequest } from "@/lib/api";
import { randomUUID } from "crypto";

// 内存存储用于快速演示
interface Strategy {
  id: string;
  title: string;
  scenario: string;
  response: string;
  category: string;
  meetingTypeId: string | null;
  tags: string[];
  source: string;
  createdAt: string;
}

const mockStrategies: Strategy[] = [
  {
    id: "st-001",
    title: "价格策略",
    scenario: "客户询问价格",
    response: "先了解客户预算，再提供定制化方案",
    category: "technique",
    meetingTypeId: null,
    tags: [],
    source: "manual",
    createdAt: new Date().toISOString()
  },
  {
    id: "st-002",
    title: "疑虑处理",
    scenario: "客户对产品有疑虑",
    response: "用数据和案例支撑，增强说服力",
    category: "principle",
    meetingTypeId: null,
    tags: [],
    source: "manual",
    createdAt: new Date().toISOString()
  },
  {
    id: "st-003",
    title: "跟进策略",
    scenario: "客户需要更多时间考虑",
    response: "表示理解，约定下次沟通时间",
    category: "method",
    meetingTypeId: null,
    tags: [],
    source: "manual",
    createdAt: new Date().toISOString()
  }
];

const createStrategySchema = z.object({
  title: z.string().min(1),
  scenario: z.string().min(1),
  response: z.string().min(1),
  category: z.enum(["technique", "principle", "method", "general"]),
  meeting_type_id: z.string().uuid().nullable().optional(),
  tags: z.array(z.string()).optional()
});

const batchCreateSchema = z.object({
  strategies: z.array(createStrategySchema).min(1)
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const meetingTypeId = searchParams.get("meeting_type_id");

  let data = mockStrategies;
  if (meetingTypeId) {
    data = data.filter(s => s.meetingTypeId === meetingTypeId);
  }

  return ok(data);
}

export async function POST(request: NextRequest) {
  const json = await request.json();
  const parseResult = createStrategySchema.safeParse(json);
  if (!parseResult.success) {
    return badRequest("无效的请求参数");
  }

  const payload = parseResult.data;
  const newItem = {
    id: randomUUID(),
    title: payload.title,
    scenario: payload.scenario,
    response: payload.response,
    category: payload.category,
    meetingTypeId: payload.meeting_type_id ?? null,
    tags: payload.tags ?? [],
    source: "manual",
    createdAt: new Date().toISOString()
  };

  mockStrategies.push(newItem);
  return created(newItem);
}

export async function PUT(request: NextRequest) {
  const json = await request.json();
  const parseResult = batchCreateSchema.safeParse(json);
  if (!parseResult.success) {
    return badRequest("无效的请求参数");
  }

  const payload = parseResult.data;
  const inserted = payload.strategies.map((s) => ({
    id: randomUUID(),
    title: s.title,
    scenario: s.scenario,
    response: s.response,
    category: s.category,
    meetingTypeId: s.meeting_type_id ?? null,
    tags: s.tags ?? [],
    source: "ai_parsed",
    createdAt: new Date().toISOString()
  }));

  mockStrategies.push(...inserted);
  return created(inserted);
}
