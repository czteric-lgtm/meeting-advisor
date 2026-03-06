import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// 声纹匹配接口
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioChunk = formData.get("audio") as Blob;
    const meetingId = formData.get("meeting_id") as string;

    if (!audioChunk || !meetingId) {
      return NextResponse.json(
        { error: "缺少必要参数" },
        { status: 400 }
      );
    }

    // 这里应该调用阿里云声纹识别API
    // 1. 提取音频特征
    // 2. 与已注册声纹比对
    // 3. 返回匹配结果

    // 临时模拟：随机返回一个已注册用户或"未知"
    const mockProfiles = [
      { id: "voice_001", name: "张三", confidence: 0.92 },
      { id: "voice_002", name: "李四", confidence: 0.88 },
      { id: "voice_003", name: "王五", confidence: 0.75 }
    ];

    // 模拟识别延迟
    await new Promise(resolve => setTimeout(resolve, 200));

    // 随机返回结果（实际应该调用阿里云API）
    const random = Math.random();
    let result;
    
    if (random > 0.3) {
      // 70%概率匹配成功
      const matchedProfile = mockProfiles[Math.floor(Math.random() * mockProfiles.length)];
      result = {
        success: true,
        data: {
          speakerId: matchedProfile.id,
          speakerName: matchedProfile.name,
          confidence: matchedProfile.confidence,
          isMatched: matchedProfile.confidence > 0.8
        }
      };
    } else {
      // 30%概率未知说话人
      result = {
        success: true,
        data: {
          speakerId: null,
          speakerName: "未知说话人",
          confidence: 0,
          isMatched: false
        }
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[声纹识别] 错误:", error);
    return NextResponse.json(
      { error: "识别失败" },
      { status: 500 }
    );
  }
}

// 获取声纹匹配阈值配置
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      threshold: 0.8, // 匹配阈值，高于此值认为是同一人
      suggestEnroll: true // 建议注册新声纹
    }
  });
}