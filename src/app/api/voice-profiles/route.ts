import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

// 模拟声纹数据库（实际生产环境应该用数据库）
const voiceProfiles: Array<{
  id: string;
  name: string;
  alibabaVoiceId?: string;
  createdAt: string;
  updatedAt: string;
}> = [];

// 获取所有声纹档案
export async function GET() {
  return NextResponse.json({
    success: true,
    data: voiceProfiles
  });
}

// 注册声纹
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const name = formData.get("name") as string;
    const audioFile = formData.get("audio") as File;

    if (!name || !audioFile) {
      return NextResponse.json(
        { error: "缺少必要参数" },
        { status: 400 }
      );
    }

    // 这里应该调用阿里云声纹注册API
    // 临时模拟返回
    const voiceId = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newProfile = {
      id: randomUUID(),
      name,
      alibabaVoiceId: voiceId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    voiceProfiles.push(newProfile);

    return NextResponse.json({
      success: true,
      data: newProfile
    });
  } catch (error) {
    console.error("[声纹注册] 错误:", error);
    return NextResponse.json(
      { error: "注册失败" },
      { status: 500 }
    );
  }
}

// 删除声纹
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "缺少ID参数" },
        { status: 400 }
      );
    }

    const index = voiceProfiles.findIndex(p => p.id === id);
    if (index === -1) {
      return NextResponse.json(
        { error: "声纹档案不存在" },
        { status: 404 }
      );
    }

    voiceProfiles.splice(index, 1);

    return NextResponse.json({
      success: true,
      message: "删除成功"
    });
  } catch (error) {
    console.error("[声纹删除] 错误:", error);
    return NextResponse.json(
      { error: "删除失败" },
      { status: 500 }
    );
  }
}