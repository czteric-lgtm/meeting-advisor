/**
 * 阿里云 Fun-ASR 录音文件识别 API
 * 支持说话人分离
 */

import { NextRequest, NextResponse } from "next/server";
import FunASRService from "@/lib/fun-asr";

// 提交录音文件识别任务
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileUrl, speakerCount = 0 } = body;

    if (!fileUrl) {
      return NextResponse.json(
        { error: "fileUrl is required" },
        { status: 400 }
      );
    }

    // 初始化 Fun-ASR 服务
    const funASR = new FunASRService();

    // 提交任务（开启说话人分离）
    const taskId = await funASR.submitTask(fileUrl, {
      enabled: true,
      speakerCount, // 0=不定人数，2=两人对话
    });

    return NextResponse.json({
      success: true,
      taskId,
      message: "Task submitted successfully",
    });
  } catch (error) {
    console.error("[API /asr/fun-asr] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
