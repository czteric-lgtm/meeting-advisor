import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, created, badRequest, serverError } from "@/lib/api";
import { db } from "@/lib/db";
import { meetingTranscripts } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

const createSchema = z.object({
  meeting_id: z.string().uuid(),
  content: z.string(),
  timestamp_ms: z.number(),
  speaker_name: z.string(),
  voice_profile_id: z.string().nullable(),
  is_user: z.boolean()
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get("meeting_id");

    if (!meetingId) {
      return badRequest("缺少 meeting_id 参数");
    }

    const data = await db
      .select()
      .from(meetingTranscripts)
      .where(eq(meetingTranscripts.meetingId, meetingId))
      .orderBy(asc(meetingTranscripts.timestampMs));

    return ok({ data });
  } catch (error) {
    console.error("[API /transcripts] GET error:", error);
    return serverError("查询转写记录失败");
  }
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parseResult = createSchema.safeParse(json);
    if (!parseResult.success) {
      return badRequest("无效的请求参数: " + parseResult.error.message);
    }

    const payload = parseResult.data;
    const [newItem] = await db
      .insert(meetingTranscripts)
      .values({
        meetingId: payload.meeting_id,
        content: payload.content,
        timestampMs: payload.timestamp_ms,
        speakerName: payload.speaker_name,
        voiceProfileId: payload.voice_profile_id,
        isUser: payload.is_user
      })
      .returning();

    return created({ data: newItem });
  } catch (error) {
    console.error("[API /transcripts] POST error:", error);
    return serverError("保存转写记录失败");
  }
}
