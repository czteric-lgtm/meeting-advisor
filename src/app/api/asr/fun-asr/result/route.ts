/**
 * 查询 Fun-ASR 任务结果 API
 */

import { NextRequest, NextResponse } from "next/server";
import FunASRService from "@/lib/fun-asr";

// 查询任务结果
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json(
        { error: "taskId is required" },
        { status: 400 }
      );
    }

    // 初始化 Fun-ASR 服务
    const funASR = new FunASRService();

    // 查询结果
    const result = await funASR.getResult(taskId);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[API /asr/fun-asr/result] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
