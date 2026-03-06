import { NextRequest, NextResponse } from "next/server";

// 声纹样本注册
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioBlob = formData.get("audio") as Blob;
    const profileId = formData.get("profile_id") as string;

    if (!audioBlob || !profileId) {
      return NextResponse.json(
        { error: "缺少必要参数" },
        { status: 400 }
      );
    }

    // 这里应该调用阿里云声纹注册API
    // 将音频样本与profileId关联
    console.log("[声纹注册] 接收到样本:", profileId, "大小:", audioBlob.size);

    // 模拟成功
    return NextResponse.json({
      success: true,
      message: "声纹样本注册成功"
    });
  } catch (error) {
    console.error("[声纹注册] 错误:", error);
    return NextResponse.json(
      { error: "注册失败" },
      { status: 500 }
    );
  }
}