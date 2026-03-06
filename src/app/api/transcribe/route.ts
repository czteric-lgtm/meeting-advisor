/**
 * 会议录音转写 API
 * 调用阿里云 Fun-ASR 进行说话人分离和语音识别
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { meetingTranscripts, meetings } from "@/db/schema";
import { eq } from "drizzle-orm";
import FunASRService, { generateMinutes, organizeBySpeaker } from "@/lib/fun-asr";

// 开始转写任务
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { meetingId, fileUrl, speakerCount = 0 } = body;

    if (!meetingId || !fileUrl) {
      return NextResponse.json(
        { error: "meetingId and fileUrl are required" },
        { status: 400 }
      );
    }

    // 初始化 Fun-ASR 服务
    const funASR = new FunASRService();

    // 提交转写任务
    const taskId = await funASR.submitTask(fileUrl, {
      enabled: true,
      speakerCount,
    });

    // 更新会议状态为转写中
    await db
      .update(meetings)
      .set({
        status: "transcribing",
        updatedAt: new Date(),
      })
      .where(eq(meetings.id, meetingId));

    return NextResponse.json({
      success: true,
      taskId,
      meetingId,
      message: "Transcription task started",
    });
  } catch (error) {
    console.error("[API /transcribe] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// 查询转写结果并保存
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { meetingId, taskId } = body;

    if (!meetingId || !taskId) {
      return NextResponse.json(
        { error: "meetingId and taskId are required" },
        { status: 400 }
      );
    }

    // 初始化 Fun-ASR 服务
    const funASR = new FunASRService();

    // 获取结果
    const result = await funASR.getResult(taskId);

    if (result.status === "PENDING" || result.status === "RUNNING") {
      return NextResponse.json({
        success: true,
        data: {
          status: result.status,
          message: "Transcription is still in progress",
        },
      });
    }

    if (result.status === "FAILED") {
      // 更新会议状态为失败
      await db
        .update(meetings)
        .set({
          status: "failed",
          updatedAt: new Date(),
        })
        .where(eq(meetings.id, meetingId));

      return NextResponse.json(
        { error: result.errorMessage || "Transcription failed" },
        { status: 500 }
      );
    }

    // 按说话人组织结果
    const speakerMap = organizeBySpeaker(result.sentences);

    // 保存转写结果到数据库
    const transcriptRecords = result.sentences.map((sentence) => ({
      meetingId,
      speakerName: sentence.speakerId ? `说话人${sentence.speakerId}` : "未知",
      content: sentence.text,
      timestampMs: sentence.beginTime,
      isUser: false, // 默认非用户，后续可通过声纹匹配更新
      voiceProfileId: null,
    }));

    // 批量插入转写记录
    if (transcriptRecords.length > 0) {
      await db.insert(meetingTranscripts).values(transcriptRecords);
    }

    // 生成会议纪要
    const minutes = generateMinutes(result.sentences);

    // 更新会议状态和纪要
    await db
      .update(meetings)
      .set({
        status: "completed",
        minutes: minutes,
        updatedAt: new Date(),
      })
      .where(eq(meetings.id, meetingId));

    return NextResponse.json({
      success: true,
      data: {
        status: "SUCCEEDED",
        sentences: result.sentences,
        speakerCount: speakerMap.size,
        minutes: minutes,
      },
    });
  } catch (error) {
    console.error("[API /transcribe] Update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// 获取转写结果
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get("meetingId");

    if (!meetingId) {
      return NextResponse.json(
        { error: "meetingId is required" },
        { status: 400 }
      );
    }

    // 查询转写记录
    const transcripts = await db
      .select()
      .from(meetingTranscripts)
      .where(eq(meetingTranscripts.meetingId, meetingId))
      .orderBy(meetingTranscripts.timestampMs);

    // 按说话人分组
    const speakerGroups: Record<string, typeof transcripts> = {};
    for (const transcript of transcripts) {
      const speaker = transcript.speakerName || "未知";
      if (!speakerGroups[speaker]) {
        speakerGroups[speaker] = [];
      }
      speakerGroups[speaker].push(transcript);
    }

    return NextResponse.json({
      success: true,
      data: {
        transcripts,
        speakerGroups,
      },
    });
  } catch (error) {
    console.error("[API /transcribe] Get error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
