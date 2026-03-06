/**
 * 阿里云百炼 Fun-ASR 录音文件识别 SDK 封装
 * 支持说话人分离 (Diarization)
 */

// 说话人分离配置接口
export interface DiarizationConfig {
  enabled: boolean;      // 是否开启说话人分离
  speakerCount: number;  // 0=不定人数，2=两人对话
}

// 识别结果中的单句
export interface TranscriptionSentence {
  beginTime: number;     // 开始时间（毫秒）
  endTime: number;       // 结束时间（毫秒）
  text: string;          // 识别文本
  speakerId?: string;    // 说话人ID（开启diarization时返回）
  confidence?: number;   // 置信度
}

// 完整识别结果
export interface TranscriptionResult {
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";
  taskId: string;
  sentences: TranscriptionSentence[];
  errorMessage?: string;
}

// Fun-ASR 录音文件识别服务
export class FunASRService {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.DASHSCOPE_API_KEY || "";
    if (!this.apiKey) {
      throw new Error("DASHSCOPE_API_KEY is required");
    }
    this.baseUrl = "https://dashscope.aliyuncs.com/api/v1";
  }

  /**
   * 提交录音文件识别任务（异步）
   * @param fileUrl 音频文件URL（需要公网可访问）
   * @param diarization 说话人分离配置
   * @returns 任务ID
   */
  async submitTask(
    fileUrl: string,
    diarization: DiarizationConfig = { enabled: true, speakerCount: 0 }
  ): Promise<string> {
    try {
      const requestBody = {
        model: "fun-asr",
        input: {
          file_urls: [fileUrl],
        },
        parameters: {
          diarization_enabled: diarization.enabled,
          speaker_count: diarization.speakerCount,
        },
      };

      const response = await fetch(`${this.baseUrl}/audio/asr/transcription`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Submit task failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const taskId = data.output?.task_id;
      
      if (!taskId) {
        throw new Error("No task_id returned");
      }

      return taskId;
    } catch (error) {
      console.error("[FunASR] Submit task error:", error);
      throw error;
    }
  }

  /**
   * 查询任务结果
   * @param taskId 任务ID
   * @returns 识别结果
   */
  async getResult(taskId: string): Promise<TranscriptionResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/tasks/${taskId}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Get result failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const status = data.output?.task_status || "PENDING";
      
      // 解析识别结果
      const sentences: TranscriptionSentence[] = [];
      
      if (status === "SUCCEEDED" && data.output?.results) {
        const results = data.output.results;
        
        // 处理结果数组
        for (const result of results) {
          if (result.transcription?.sentences) {
            for (const sentence of result.transcription.sentences) {
              sentences.push({
                beginTime: sentence.begin_time || 0,
                endTime: sentence.end_time || 0,
                text: sentence.text || "",
                speakerId: sentence.speaker_id,
                confidence: sentence.confidence,
              });
            }
          }
        }
      }

      return {
        status: status as TranscriptionResult["status"],
        taskId,
        sentences,
        errorMessage: data.output?.message,
      };
    } catch (error) {
      console.error("[FunASR] Get result error:", error);
      throw error;
    }
  }

  /**
   * 同步等待任务完成（轮询方式）
   * @param taskId 任务ID
   * @param maxWaitTime 最大等待时间（毫秒，默认5分钟）
   * @param pollInterval 轮询间隔（毫秒，默认3秒）
   * @returns 识别结果
   */
  async waitForCompletion(
    taskId: string,
    maxWaitTime: number = 5 * 60 * 1000,
    pollInterval: number = 3000
  ): Promise<TranscriptionResult> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const result = await this.getResult(taskId);
      
      if (result.status === "SUCCEEDED") {
        return result;
      }
      
      if (result.status === "FAILED") {
        throw new Error(`Task failed: ${result.errorMessage}`);
      }
      
      // 等待后重试
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
    
    throw new Error("Wait for completion timeout");
  }

  /**
   * 批量提交多个文件
   * @param fileUrls 音频文件URL数组
   * @param diarization 说话人分离配置
   * @returns 任务ID数组
   */
  async submitBatch(
    fileUrls: string[],
    diarization: DiarizationConfig = { enabled: true, speakerCount: 0 }
  ): Promise<string[]> {
    // Fun-ASR 单次最多支持100个文件
    const MAX_BATCH_SIZE = 100;
    
    if (fileUrls.length > MAX_BATCH_SIZE) {
      throw new Error(`Max batch size is ${MAX_BATCH_SIZE}`);
    }

    const requestBody = {
      model: "fun-asr",
      input: {
        file_urls: fileUrls,
      },
      parameters: {
        diarization_enabled: diarization.enabled,
        speaker_count: diarization.speakerCount,
      },
    };

    const response = await fetch(`${this.baseUrl}/audio/asr/transcription`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Submit batch failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const taskId = data.output?.task_id;
    
    if (!taskId) {
      throw new Error("No task_id returned");
    }

    return [taskId];
  }
}

// 按说话人组织识别结果
export function organizeBySpeaker(
  sentences: TranscriptionSentence[]
): Map<string, TranscriptionSentence[]> {
  const speakerMap = new Map<string, TranscriptionSentence[]>();
  
  for (const sentence of sentences) {
    const speakerId = sentence.speakerId || "unknown";
    if (!speakerMap.has(speakerId)) {
      speakerMap.set(speakerId, []);
    }
    speakerMap.get(speakerId)!.push(sentence);
  }
  
  return speakerMap;
}

// 生成会议纪要格式的文本
export function generateMinutes(
  sentences: TranscriptionSentence[],
  speakerNames?: Map<string, string>
): string {
  const lines: string[] = [];
  
  for (const sentence of sentences) {
    const speakerId = sentence.speakerId || "unknown";
    const speakerName = speakerNames?.get(speakerId) || `说话人${speakerId}`;
    const timeStr = formatTime(sentence.beginTime);
    
    lines.push(`[${timeStr}] ${speakerName}: ${sentence.text}`);
  }
  
  return lines.join("\n");
}

// 格式化时间（毫秒 -> mm:ss）
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export default FunASRService;
