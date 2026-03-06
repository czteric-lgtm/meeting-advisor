import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// 阿里云STS临时凭证生成
export async function GET(request: NextRequest) {
  const accessKeyId = process.env.ALIBABA_CLOUD_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET;

  if (!accessKeyId || !accessKeySecret) {
    return NextResponse.json(
      { error: "阿里云凭证未配置" },
      { status: 500 }
    );
  }

  try {
    // 生成临时访问凭证
    // 实际生产环境应该调用阿里云STS服务
    // 这里简化处理，返回配置信息让前端直连
    
    const token = generateAliyunToken(accessKeyId, accessKeySecret);
    
    return NextResponse.json({
      success: true,
      data: {
        accessKeyId,
        token,
        region: process.env.ALIBABA_CLOUD_REGION || "cn-shanghai",
        endpoint: "wss://nls-gateway.cn-shanghai.aliyuncs.com/ws/v1",
      },
    });
  } catch (error) {
    console.error("[阿里云Token] 生成失败:", error);
    return NextResponse.json(
      { error: "Token生成失败" },
      { status: 500 }
    );
  }
}

// 生成阿里云访问Token
function generateAliyunToken(accessKeyId: string, accessKeySecret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const expiration = timestamp + 3600; // 1小时有效期
  
  // 简化版本：实际应该使用阿里云STS API
  // 这里使用签名算法生成临时凭证
  const signString = `${accessKeyId}\n${expiration}`;
  const signature = crypto
    .createHmac("sha1", accessKeySecret)
    .update(signString)
    .digest("base64");
  
  return `${accessKeyId}:${signature}:${expiration}`;
}