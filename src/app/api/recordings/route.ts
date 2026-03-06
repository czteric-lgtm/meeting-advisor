import { NextRequest, NextResponse } from "next/server";
import { uploadRecording, listMeetingRecordings, deleteRecording } from "@/lib/oss";

// 获取会议的录音列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get("meeting_id");

    if (!meetingId) {
      return NextResponse.json(
        { error: "缺少meeting_id参数" },
        { status: 400 }
      );
    }

    // 从OSS获取录音列表
    const recordings = await listMeetingRecordings(meetingId);

    return NextResponse.json({
      success: true,
      data: recordings.map((r) => ({
        id: r.key,
        url: r.url,
        size: r.size,
        createdAt: r.lastModified,
        duration: 0, // 需要从元数据获取
      })),
    });
  } catch (error) {
    console.error("[录音列表] 错误:", error);
    return NextResponse.json(
      { error: "获取录音列表失败" },
      { status: 500 }
    );
  }
}

// 上传录音到OSS
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const meetingId = formData.get("meeting_id") as string;
    const audioFile = formData.get("audio") as File;
    const duration = parseInt(formData.get("duration_ms") as string) || 0;

    if (!meetingId || !audioFile) {
      return NextResponse.json(
        { error: "缺少必要参数" },
        { status: 400 }
      );
    }

    // 读取文件为Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 上传到OSS
    const fileName = `recording_${Date.now()}.webm`;
    const result = await uploadRecording(buffer, fileName, meetingId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "上传失败" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: `recording_${Date.now()}`,
        url: result.url,
        duration,
        size: audioFile.size,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[录音上传] 错误:", error);
    return NextResponse.json(
      { error: "上传录音失败" },
      { status: 500 }
    );
  }
}

// 删除录音
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { error: "缺少key参数" },
        { status: 400 }
      );
    }

    const success = await deleteRecording(key);

    if (!success) {
      return NextResponse.json(
        { error: "删除失败" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "删除成功",
    });
  } catch (error) {
    console.error("[录音删除] 错误:", error);
    return NextResponse.json(
      { error: "删除失败" },
      { status: 500 }
    );
  }
}