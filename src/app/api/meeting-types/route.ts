import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, created, badRequest } from "@/lib/api";
import { randomUUID } from "crypto";

// 内存存储用于快速演示
const mockMeetingTypes = [
  {
    id: "mt-001",
    name: "客户谈判",
    description: "与客户进行商务谈判的会议",
    goals: ["了解客户需求", "达成合作意向", "确定合作方案"],
    createdAt: new Date().toISOString()
  },
  {
    id: "mt-002",
    name: "团队周会",
    description: "每周团队同步会议",
    goals: ["同步进度", "解决问题", "安排下周工作"],
    createdAt: new Date().toISOString()
  }
];

const createMeetingTypeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(""),
  goals: z.array(z.string()).default([])
});

export async function GET() {
  return ok({ data: mockMeetingTypes });
}

export async function POST(request: NextRequest) {
  const json = await request.json();
  const parseResult = createMeetingTypeSchema.safeParse(json);

  if (!parseResult.success) {
    return badRequest("无效的请求参数");
  }

  const { name, description, goals } = parseResult.data;

  const newItem = {
    id: randomUUID(),
    name,
    description: description || "",
    goals: goals || [],
    createdAt: new Date().toISOString()
  };

  mockMeetingTypes.push(newItem);
  return created({ data: newItem });
}

