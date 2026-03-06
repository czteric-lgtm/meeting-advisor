// eslint-disable-next-line @typescript-eslint/no-explicit-any
import OSS from "ali-oss";

// 阿里云OSS客户端配置
const ossClient = new OSS({
  region: process.env.ALIBABA_OSS_REGION || "cn-shanghai",
  accessKeyId: process.env.ALIBABA_OSS_ACCESS_KEY_ID || "",
  accessKeySecret: process.env.ALIBABA_OSS_ACCESS_KEY_SECRET || "",
  bucket: process.env.ALIBABA_OSS_BUCKET || "meeting-advisor-recordings",
  endpoint: process.env.ALIBABA_OSS_ENDPOINT,
  secure: true, // 使用HTTPS
});

/**
 * 上传录音文件到OSS
 * @param buffer 音频文件Buffer
 * @param fileName 文件名
 * @param meetingId 会议ID（用于组织目录）
 * @returns 上传后的文件URL
 */
export async function uploadRecording(
  buffer: Buffer,
  fileName: string,
  meetingId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const key = `recordings/${meetingId}/${Date.now()}_${fileName}`;
    
    const result = await ossClient.put(key, buffer, {
      headers: {
        "Content-Type": "audio/webm",
        "x-oss-meta-meeting-id": meetingId,
      },
    });

    // 生成临时访问URL（有效期1小时）
    const url = ossClient.signatureUrl(key, {
      expires: 3600, // 1小时
    });

    return {
      success: true,
      url: result.url || url,
    };
  } catch (error) {
    console.error("[OSS上传] 失败:", error);
    return {
      success: false,
      error: `上传失败: ${error}`,
    };
  }
}

/**
 * 获取录音文件的临时访问URL
 * @param key 文件路径
 * @param expires 过期时间（秒），默认3600
 */
export async function getRecordingUrl(
  key: string,
  expires: number = 3600
): Promise<string> {
  return ossClient.signatureUrl(key, { expires });
}

/**
 * 删除录音文件
 * @param key 文件路径
 */
export async function deleteRecording(key: string): Promise<boolean> {
  try {
    await ossClient.delete(key);
    return true;
  } catch (error) {
    console.error("[OSS删除] 失败:", error);
    return false;
  }
}

/**
 * 列出会议的录音文件
 * @param meetingId 会议ID
 */
export async function listMeetingRecordings(
  meetingId: string
): Promise<Array<{
  key: string;
  url: string;
  size: number;
  lastModified: string;
}>> {
  try {
    const prefix = `recordings/${meetingId}/`;
    const result = await ossClient.list({ prefix, "max-keys": 100 });

    return (result.objects || []).map((obj) => ({
      key: obj.name,
      url: ossClient.signatureUrl(obj.name, { expires: 3600 }),
      size: obj.size,
      lastModified: obj.lastModified,
    }));
  } catch (error) {
    console.error("[OSS列表] 失败:", error);
    return [];
  }
}