/**
 * 浏览器原生 Web Speech API 封装
 * 用于 MVP 阶段免费实时语音识别
 */

// Web Speech API 类型声明
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

export type SpeechRecognitionCallback = (text: string, isFinal: boolean, confidence: number) => void;
export type SpeechErrorCallback = (error: string) => void;

export class BrowserSpeechRecognizer {
  private recognition: SpeechRecognition | null = null;
  private onResult: SpeechRecognitionCallback;
  private onError: SpeechErrorCallback;
  private isListening = false;

  constructor(onResult: SpeechRecognitionCallback, onError: SpeechErrorCallback) {
    this.onResult = onResult;
    this.onError = onError;
  }

  static isSupported(): boolean {
    return typeof window !== "undefined" && (
      "SpeechRecognition" in window || "webkitSpeechRecognition" in window
    );
  }

  start(language = "zh-CN"): boolean {
    if (!BrowserSpeechRecognizer.isSupported()) {
      this.onError("当前浏览器不支持语音识别");
      return false;
    }

    if (this.isListening) {
      return true;
    }

    try {
      const SpeechRecognition = (window as unknown as { SpeechRecognition: SpeechRecognitionConstructor; webkitSpeechRecognition: SpeechRecognitionConstructor }).SpeechRecognition || (window as unknown as { SpeechRecognition: SpeechRecognitionConstructor; webkitSpeechRecognition: SpeechRecognitionConstructor }).webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      this.recognition.lang = language;
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListening = true;
        console.log("[ASR] 语音识别已启动");
      };

      this.recognition.onend = () => {
        this.isListening = false;
        console.log("[ASR] 语音识别已结束");
        // 自动重启（除非手动停止）
        if (this.recognition && !this.isListening) {
          try {
            this.recognition.start();
          } catch {
            // 忽略重启错误
          }
        }
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          const confidence = result[0].confidence;
          this.onResult(transcript, result.isFinal, confidence);
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("[ASR] 错误:", event.error);
        
        // 某些错误可以忽略或自动恢复
        if (event.error === "no-speech") {
          // 没检测到语音，正常情况
          return;
        }
        
        if (event.error === "aborted") {
          // 被中断，可能是手动停止
          return;
        }

        this.onError(event.error);
      };

      this.recognition.start();
      return true;
    } catch (err) {
      this.onError(`启动失败: ${err}`);
      return false;
    }
  }

  stop(): void {
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // 忽略停止错误
      }
      this.recognition = null;
    }
  }

  isActive(): boolean {
    return this.isListening;
  }
}
