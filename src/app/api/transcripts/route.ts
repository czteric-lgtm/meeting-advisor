import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, created, badRequest } from "@/lib/api";
import { randomUUID } from "crypto";

// 内存存储
const mockTranscripts: any[] = [];

const createSchema = z.object({
  meeting_id: z.string(),
  content: z.string(),
  timestamp_ms: z.number(),
  speaker_name: z.string(),
  voice_profile_id: z.string().nullable(),
  is_user: z.boolean()
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const meetingId = searchParams.get("meeting_id");

  if (!meetingId) {
    return badRequest("缺少 meeting_id 参数");
  }

  const data = mockTranscripts.filter(t => t.meetingId === meetingId);
  return ok({ data });
}

export async function POST(request: NextRequest) {
  const json = await request.json();
  const parseResult = createSchema.safeParse(json);
  if (!parseResult.success) {
    return badRequest("无效的请求参数");
  }

  const payload = parseResult.data;
  const newItem = {
    id: randomUUID(),
    meetingId: payload.meeting_id,
    content: payload.content,
    timestampMs: payload.timestamp_ms,
    speakerName: payload.speaker_name,
    voiceProfileId: payload.voice_profile_id,
    isUser: payload.is_user,
    createdAt: new Date().toISOString()
  };

  mockTranscripts.push(newItem);
  return created({ data: newItem });
}
