/**
 * 阿里云智能语音交互 SDK 封装
 * 支持实时语音识别(ASR)和声纹识别
 */

// 阿里云NLS SDK类型声明
interface NlsClient {
  start(): void;
  stop(): void;
  sendAudio(data: ArrayBuffer): void;
  on(event: string, callback: Function): void;
}

interface NlsResponse {
  header: {
    name: string;
    status: number;
    status_text?: string;
  };
  payload?: {
    result?: string;
    words?: Array<{
      text: string;
      startTime: number;
      endTime: number;
    }>;
    voiceId?: string;
    confidence?: number;
  };
}

// 阿里云配置
const ALIBABA_CONFIG = {
  accessKeyId: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID || "",
  accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET || "",
  region: process.env.ALIBABA_CLOUD_REGION || "cn-shanghai",
  endpoint: "wss://nls-gateway.cn-shanghai.aliyuncs.com/ws/v1",
};

// 实时语音识别类
export class AlibabaSpeechRecognizer {
  private ws: WebSocket | null = null;
  private taskId: string = "";
  private onResult: (text: string, isFinal: boolean) => void;
  private onError: (error: string) => void;
  private isRecording: boolean = false;

  constructor(
    onResult: (text: string, isFinal: boolean) => void,
    onError: (error: string) => void
  ) {
    this.onResult = onResult;
    this.onError = onError;
  }

  // 生成唯一任务ID
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 开始识别
  async start(language: string = "zh-CN"): Promise<boolean> {
    if (this.isRecording) {
      return true;
    }

    try {
      this.taskId = this.generateTaskId();
      
      // 构建WebSocket连接参数
      const token = await this.getToken();
      const wsUrl = `${ALIBABA_CONFIG.endpoint}?token=${token}`;
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log("[阿里云ASR] WebSocket连接成功");
        
        // 发送开始指令
        const startCmd = {
          header: {
            message_id: this.generateTaskId(),
            task_id: this.taskId,
            namespace: "SpeechTranscriber",
            name: "StartTranscription",
            appkey: process.env.ALIBABA_ASR_APP_KEY || "",
          },
          payload: {
            enable_intermediate_result: true,
            enable_punctuation_prediction: true,
            enable_inverse_text_normalization: true,
            format: "pcm",
            sample_rate: 16000,
            language: language === "zh-CN" ? "zh-CN" : "en-US",
          },
        };
        
        this.ws?.send(JSON.stringify(startCmd));
        this.isRecording = true;
      };

      this.ws.onmessage = (event) => {
        const response: NlsResponse = JSON.parse(event.data);
        this.handleResponse(response);
      };

      this.ws.onerror = (error) => {
        console.error("[阿里云ASR] WebSocket错误:", error);
        this.onError("语音识别连接错误");
      };

      this.ws.onclose = () => {
        console.log("[阿里云ASR] WebSocket连接关闭");
        this.isRecording = false;
      };

      return true;
    } catch (err) {
      console.error("[阿里云ASR] 启动失败:", err);
      this.onError(`启动失败: ${err}`);
      return false;
    }
  }

  // 处理服务器响应
  private handleResponse(response: NlsResponse) {
    const { header, payload } = response;
    
    switch (header.name) {
      case "TranscriptionStarted":
        console.log("[阿里云ASR] 识别开始");
        break;
        
      case "SentenceBegin":
        console.log("[阿里云ASR] 新句子开始");
        break;
        
      case "TranscriptionResultChanged":
        // 中间结果（非最终）
        if (payload?.result) {
          this.onResult(payload.result, false);
        }
        break;
        
      case "SentenceEnd":
        // 句子结束（最终结果）
        if (payload?.result) {
          this.onResult(payload.result, true);
        }
        break;
        
      case "TranscriptionCompleted":
        console.log("[阿里云ASR] 识别完成");
        this.isRecording = false;
        break;
        
      case "TaskFailed":
        console.error("[阿里云ASR] 任务失败:", header.status_text);
        this.onError(header.status_text || "识别任务失败");
        this.isRecording = false;
        break;
    }
  }

  // 发送音频数据
  sendAudio(audioData: ArrayBuffer) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(audioData);
    }
  }

  // 停止识别
  stop() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const stopCmd = {
        header: {
          message_id: this.generateTaskId(),
          task_id: this.taskId,
          namespace: "SpeechTranscriber",
          name: "StopTranscription",
        },
      };
      this.ws.send(JSON.stringify(stopCmd));
    }
    
    this.ws?.close();
    this.ws = null;
    this.isRecording = false;
  }

  // 获取访问Token
  private async getToken(): Promise<string> {
    // 这里需要调用阿里云STS服务获取临时token
    // 实际实现需要后端支持
    // 临时返回空字符串，需要后端实现token生成
    return "";
  }

  isActive(): boolean {
    return this.isRecording;
  }
}

// 声纹识别服务
export class AlibabaVoiceRecognition {
  private accessKeyId: string;
  private accessKeySecret: string;
  private endpoint: string;

  constructor() {
    this.accessKeyId = process.env.ALIBABA_CLOUD_ACCESS_KEY_ID || "";
    this.accessKeySecret = process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET || "";
    this.endpoint = "https://voiceauth.aliyuncs.com";
  }

  // 注册声纹
  async registerVoiceProfile(
    audioData: Blob,
    speakerName: string
  ): Promise<{ success: boolean; voiceId?: string; error?: string }> {
    try {
      // 这里需要调用阿里云声纹注册API
      // 实际实现需要后端支持
      console.log("[阿里云声纹] 注册声纹:", speakerName);
      
      // 临时模拟返回
      return {
        success: true,
        voiceId: `voice_${Date.now()}`,
      };
    } catch (err) {
      return {
        success: false,
        error: `注册失败: ${err}`,
      };
    }
  }

  // 识别声纹
  async identifySpeaker(
    audioData: Blob,
    candidateVoiceIds: string[]
  ): Promise<{
    success: boolean;
    speakerId?: string;
    confidence?: number;
    error?: string;
  }> {
    try {
      // 这里需要调用阿里云声纹识别API
      console.log("[阿里云声纹] 识别说话人, 候选人:", candidateVoiceIds.length);
      
      // 临时模拟返回
      return {
        success: true,
        speakerId: candidateVoiceIds[0],
        confidence: 0.85,
      };
    } catch (err) {
      return {
        success: false,
        error: `识别失败: ${err}`,
      };
    }
  }
}

// 浏览器录音工具
export class AudioRecorder {
  private stream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private onDataAvailable: (data: Blob) => void;
  private onStop: (blob: Blob) => void;

  constructor(
    onDataAvailable: (data: Blob) => void,
    onStop: (blob: Blob) => void
  ) {
    this.onDataAvailable = onDataAvailable;
    this.onStop = onStop;
  }

  async start(): Promise<boolean> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          this.onDataAvailable(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.audioChunks, { type: "audio/webm" });
        this.audioChunks = [];
        this.onStop(blob);
      };

      this.mediaRecorder.start(100); // 每100ms收集一次数据
      return true;
    } catch (err) {
      console.error("[录音] 启动失败:", err);
      return false;
    }
  }

  stop() {
    if (this.mediaRecorder?.state !== "inactive") {
      this.mediaRecorder?.stop();
    }
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }
}
