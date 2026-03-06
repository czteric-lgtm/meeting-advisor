"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BrowserSpeechRecognizer } from "@/lib/speech-recognition";
import { AlibabaSpeechRecognizer, AudioRecorder } from "@/lib/alibaba-asr";
import { AudioPlayer } from "@/components/audio-player";

interface Transcript {
  id: string;
  speakerName: string;
  content: string;
  timestampMs: number;
  isUser: boolean;
}

interface AiSuggestionItem {
  id: string;
  type: "response" | "question" | "keypoint";
  content: string;
  timestampMs: number;
  matched_scenario?: string | null;
  matched?: boolean;
}

interface DiscussionPoint {
  id: string;
  content: string;
  status: "pending" | "mentioned";
  mentionedAt?: number;
}

interface MeetingDetail {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "completed";
  meeting_type: {
    name: string;
  } | null;
  minutes: string;
  customGoals: string[];
  customStrategies: Array<{
    id: string;
    title: string;
    scenario: string;
    response: string;
    category: string;
    source: string;
  }>;
  discussionPoints: DiscussionPoint[];
  aiSuggestions: AiSuggestionItem[];
}

const ASR_CHUNK_MS = 6000;
const DEFAULT_SPEAKER = "未知说话人";

export default function MeetingDetailPage() {
  const params = useParams<{ id: string }>();
  const meetingId = params.id;
  const [meeting, setMeeting] = React.useState<MeetingDetail | null>(null);
  const [transcripts, setTranscripts] = React.useState<Transcript[]>([]);
  const transcriptsRef = React.useRef<Transcript[]>([]);
  const [discussionInput, setDiscussionInput] = React.useState("");
  const [recording, setRecording] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"recordings" | "strategies" | "goals" | "minutes">("recordings");
  const minutesEditorRef = React.useRef<HTMLDivElement | null>(null);
  const minutesSaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const minutesInitializedRef = React.useRef(false);
  const [recordingError, setRecordingError] = React.useState<string | null>(null);
  const [interimText, setInterimText] = React.useState<string>("");
  const [useAlibabaASR, setUseAlibabaASR] = React.useState<boolean>(true); // 默认使用阿里云ASR

  const recognizerRef = React.useRef<BrowserSpeechRecognizer | null>(null);
  const alibabaRecognizerRef = React.useRef<AlibabaSpeechRecognizer | null>(null);
  const audioRecorderRef = React.useRef<AudioRecorder | null>(null);
  const meetingStartMsRef = React.useRef<number>(0);
  const lastFinalTextRef = React.useRef<string>("");

  React.useEffect(() => {
    const load = async () => {
      const [meetingRes, transcriptsRes, recordingsRes] = await Promise.all([
        fetch(`/api/meetings/${meetingId}`),
        fetch(`/api/transcripts?meeting_id=${meetingId}`),
        fetch(`/api/recordings?meeting_id=${meetingId}`)
      ]);
      if (meetingRes.ok) {
        const data = await meetingRes.json();
        setMeeting({
          id: data.data.id,
          title: data.data.title,
          status: data.data.status,
          meeting_type: data.data.meeting_type,
          minutes: data.data.minutes ?? "",
          customGoals: data.data.customGoals ?? [],
          customStrategies: data.data.customStrategies ?? [],
          discussionPoints: data.data.discussionPoints ?? [],
          aiSuggestions: data.data.aiSuggestions ?? []
        });
      }
      if (transcriptsRes.ok) {
        const data = await transcriptsRes.json();
        const list = (data.data ?? []).map((t: any) => ({
          id: t.id,
          speakerName: t.speakerName,
          content: t.content,
          timestampMs: t.timestampMs,
          isUser: t.isUser
        }));
        setTranscripts(list);
        transcriptsRef.current = list;
      }
      if (recordingsRes.ok) {
        const data = await recordingsRes.json();
        setRecordings(data.data || []);
      }
    };
    load();
  }, [meetingId]);

  // 当前说话人（通过声纹识别）
  const [currentSpeaker, setCurrentSpeaker] = React.useState<string>(DEFAULT_SPEAKER);
  const speakerHistoryRef = React.useRef<Map<string, number>>(new Map());

  // 声纹识别 - 确定说话人
  const identifySpeaker = React.useCallback(async (audioBlob?: Blob): Promise<string> => {
    try {
      // 如果没有音频数据，返回默认说话人
      if (!audioBlob) {
        return DEFAULT_SPEAKER;
      }

      // 调用声纹识别API
      const formData = new FormData();
      formData.append("audio", audioBlob);
      formData.append("meeting_id", meetingId);

      const res = await fetch("/api/voice-profiles/match", {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        console.warn("[声纹识别] API调用失败");
        return DEFAULT_SPEAKER;
      }

      const data = await res.json();
      
      if (data.success && data.data.isMatched) {
        const speakerName = data.data.speakerName;
        
        // 记录说话人出现时间
        const lastTime = speakerHistoryRef.current.get(speakerName) || 0;
        const now = Date.now();
        
        // 如果同一个说话人在30秒内再次说话，认为是连续发言
        if (now - lastTime < 30000) {
          console.log(`[声纹识别] 连续发言: ${speakerName}`);
        } else {
          console.log(`[声纹识别] 识别到说话人: ${speakerName} (置信度: ${data.data.confidence})`);
        }
        
        speakerHistoryRef.current.set(speakerName, now);
        return speakerName;
      }
      
      return DEFAULT_SPEAKER;
    } catch (err) {
      console.error("[声纹识别] 错误:", err);
      return DEFAULT_SPEAKER;
    }
  }, [meetingId]);

  // 保存转录到服务器并触发AI建议
  const saveTranscript = React.useCallback(async (text: string, speakerName?: string) => {
    if (!meetingId || !text.trim()) return;

    const timestampMs = Date.now() - meetingStartMsRef.current;
    const finalSpeakerName = speakerName || currentSpeaker;
    
    try {
      const res = await fetch("/api/transcripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meeting_id: meetingId,
          content: text,
          timestamp_ms: timestampMs,
          speaker_name: finalSpeakerName,
          voice_profile_id: null,
          is_user: false
        })
      });
      if (!res.ok) return;
      const data = await res.json();
      const newT: Transcript = {
        id: data.data.id,
        speakerName: data.data.speakerName ?? DEFAULT_SPEAKER,
        content: data.data.content,
        timestampMs: data.data.timestampMs,
        isUser: data.data.isUser ?? false
      };
      setTranscripts((prev) => {
        const next = [...prev, newT];
        transcriptsRef.current = next;
        return next;
      });

      // 触发AI建议
      if (meeting) {
        const all = [...transcriptsRef.current];
        const recent = all.slice(-5);
        const sameSpeaker = recent
          .filter((t) => t.speakerName === newT.speakerName)
          .map((t) => t.content)
          .join(" ");
        const sugRes = await fetch("/api/ai/suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            meeting_id: meeting.id,
            current_transcript: sameSpeaker,
            recent_transcripts: recent.map((t) => t.content),
            strategies: meeting.customStrategies.map((s) => s.scenario),
            discussion_points: meeting.discussionPoints.map((d) => d.content)
          })
        });
        if (sugRes.ok) {
          const sugData = await sugRes.json();
          const now = Date.now();
          const newSuggestions: AiSuggestionItem[] = (sugData.data.suggestions ?? []).map((s: { id: string; type: string; content: string }) => ({
            id: s.id,
            type: s.type as "response" | "question" | "keypoint",
            content: s.content,
            timestampMs: now
          }));
          const newPoints: DiscussionPoint[] = (sugData.data.new_discussion_points ?? []).map((p: { content: string }) => ({
            id: `${now}-${p.content}`,
            content: p.content,
            status: "pending" as const
          }));
          setMeeting((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              aiSuggestions: [...(prev.aiSuggestions ?? []), ...newSuggestions],
              discussionPoints: [...(prev.discussionPoints ?? []), ...newPoints]
            };
          });
        }
      }
    } catch (err) {
      console.error("保存转录失败:", err);
    }
  }, [meetingId, meeting]);

  // 使用阿里云ASR
  const startAlibabaASR = async () => {
    try {
      // 获取阿里云Token
      const tokenRes = await fetch("/api/alibaba/token");
      if (!tokenRes.ok) {
        throw new Error("获取阿里云Token失败");
      }
      const tokenData = await tokenRes.json();
      
      if (!tokenData.success) {
        throw new Error(tokenData.error || "Token获取失败");
      }

      // 创建音频录制器
      audioRecorderRef.current = new AudioRecorder(
        (data) => {
          // 收集音频用于声纹识别
          audioChunksForVoiceId.push(data);
          // 限制缓冲区大小（最多保存最近3秒的音频）
          if (audioChunksForVoiceId.length > 30) {
            audioChunksForVoiceId.shift();
          }
          
          // 实时发送音频数据到阿里云ASR
          if (alibabaRecognizerRef.current?.isActive()) {
            // 转换音频格式并发送
            data.arrayBuffer().then((buffer) => {
              alibabaRecognizerRef.current?.sendAudio(buffer);
            });
          }
        },
        (blob) => {
          // 录音停止后的处理
          console.log("[录音] 音频录制完成", blob.size);
        }
      );

      // 用于收集音频片段进行声纹识别
      const audioChunksForVoiceId: Blob[] = [];
      
      // 创建阿里云语音识别器
      alibabaRecognizerRef.current = new AlibabaSpeechRecognizer(
        async (text, isFinal) => {
          console.log(`[阿里云ASR] ${isFinal ? "最终结果" : "临时结果"}: ${text}`);
          
          if (isFinal) {
            if (text.trim() && text !== lastFinalTextRef.current) {
              // 使用收集的音频进行声纹识别
              let speakerName = DEFAULT_SPEAKER;
              if (audioChunksForVoiceId.length > 0) {
                const voiceBlob = new Blob(audioChunksForVoiceId, { type: "audio/webm" });
                speakerName = await identifySpeaker(voiceBlob);
                setCurrentSpeaker(speakerName);
                audioChunksForVoiceId.length = 0; // 清空缓冲区
              }
              
              lastFinalTextRef.current = text;
              await saveTranscript(text, speakerName);
              setInterimText("");
            }
          } else {
            setInterimText(text);
          }
        },
        (error) => {
          console.error("[阿里云ASR] 错误:", error);
          setRecordingError(`阿里云语音识别错误: ${error}`);
          // 错误时切换到浏览器ASR
          setUseAlibabaASR(false);
        }
      );

      // 启动录音和识别
      const recorderStarted = await audioRecorderRef.current.start();
      if (!recorderStarted) {
        throw new Error("麦克风启动失败");
      }

      const asrStarted = await alibabaRecognizerRef.current.start("zh-CN");
      if (!asrStarted) {
        audioRecorderRef.current.stop();
        throw new Error("阿里云ASR启动失败");
      }

      setRecording(true);
      setRecordingError(null);
    } catch (err) {
      console.error("[阿里云ASR] 启动失败:", err);
      setRecordingError(`阿里云ASR启动失败，切换到浏览器ASR: ${err}`);
      // 切换到浏览器ASR
      setUseAlibabaASR(false);
      startBrowserASR();
    }
  };

  // 使用浏览器原生ASR
  const startBrowserASR = async () => {
    if (!BrowserSpeechRecognizer.isSupported()) {
      setRecordingError("当前浏览器不支持语音识别，请使用 Chrome/Edge/Safari");
      return;
    }

    recognizerRef.current = new BrowserSpeechRecognizer(
      async (text, isFinal, confidence) => {
        console.log(`[浏览器ASR] ${isFinal ? "最终结果" : "临时结果"}: ${text}`);
        
        if (isFinal) {
          if (text.trim() && text !== lastFinalTextRef.current) {
            lastFinalTextRef.current = text;
            await saveTranscript(text);
            setInterimText("");
          }
        } else {
          setInterimText(text);
        }
      },
      (error) => {
        console.error("[浏览器ASR] 错误:", error);
        if (error !== "no-speech") {
          setRecordingError(`语音识别错误: ${error}`);
        }
      }
    );

    const started = recognizerRef.current.start("zh-CN");
    if (started) {
      setRecording(true);
      setRecordingError(null);
    } else {
      setRecordingError("启动语音识别失败");
    }
  };

  const toggleRecording = async () => {
    if (recording) {
      // 停止录音
      if (alibabaRecognizerRef.current) {
        alibabaRecognizerRef.current.stop();
        alibabaRecognizerRef.current = null;
      }
      if (audioRecorderRef.current) {
        audioRecorderRef.current.stop();
        audioRecorderRef.current = null;
      }
      if (recognizerRef.current) {
        recognizerRef.current.stop();
        recognizerRef.current = null;
      }
      // 保存最后的临时文本
      if (interimText.trim() && interimText !== lastFinalTextRef.current) {
        await saveTranscript(interimText);
      }
      setRecording(false);
      setInterimText("");
      setRecordingError(null);
      return;
    }

    setRecordingError(null);
    setInterimText("");
    lastFinalTextRef.current = "";
    meetingStartMsRef.current = Date.now();

    // 根据配置选择ASR引擎
    if (useAlibabaASR) {
      await startAlibabaASR();
    } else {
      await startBrowserASR();
    }
  };

  const handleStatusChange = async (status: "pending" | "in_progress" | "completed") => {
    await fetch(`/api/meetings/${meetingId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    setMeeting((prev) => (prev ? { ...prev, status } : prev));
  };

  const handleAddDiscussionPoint = async () => {
    const content = discussionInput.trim();
    if (!content || !meeting) return;
    setDiscussionInput("");
    const res = await fetch("/api/discussion-points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meeting_id: meeting.id, content })
    });
    if (!res.ok) return;
    const data = await res.json();
    setMeeting({
      ...meeting,
      discussionPoints: [...(meeting.discussionPoints ?? []), data.data]
    });
  };

  const refreshSuggestions = async () => {
    if (!meeting) return;
    const all = transcriptsRef.current;
    if (all.length === 0) return;
    const recent = all.slice(-5);
    const currentSpeaker = recent[recent.length - 1]?.speakerName ?? "";
    const sameSpeaker = recent
      .filter((t) => t.speakerName === currentSpeaker)
      .map((t) => t.content)
      .join(" ");

    const res = await fetch("/api/ai/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meeting_id: meeting.id,
        current_transcript: sameSpeaker,
        recent_transcripts: recent.map((t) => t.content),
        strategies: meeting.customStrategies.map((s) => s.scenario),
        discussion_points: meeting.discussionPoints.map((d) => d.content)
      })
    });
    if (!res.ok) return;
    const data = await res.json();

    const now = Date.now();
    const newSuggestions: AiSuggestionItem[] = (data.data.suggestions ?? []).map(
      (s: any) => ({
        id: s.id,
        type: s.type,
        content: s.content,
        timestampMs: now
      })
    );

    const newPoints: DiscussionPoint[] = (data.data.new_discussion_points ?? []).map(
      (p: any) => ({
        id: `${now}-${p.content}`,
        content: p.content,
        status: "pending"
      })
    );

    setMeeting({
      ...meeting,
      aiSuggestions: [...(meeting.aiSuggestions ?? []), ...newSuggestions],
      discussionPoints: [...(meeting.discussionPoints ?? []), ...newPoints]
    });
  };

  const saveMinutes = React.useCallback(
    (html: string) => {
      if (!meetingId) return;
      fetch(`/api/meetings/${meetingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes: html })
      }).then(() => {
        setMeeting((prev) => (prev ? { ...prev, minutes: html } : prev));
      });
    },
    [meetingId]
  );

  React.useEffect(() => {
    if (activeTab === "minutes" && meeting && minutesEditorRef.current && !minutesInitializedRef.current) {
      minutesEditorRef.current.innerHTML = meeting.minutes ?? "";
      minutesInitializedRef.current = true;
    }
    if (activeTab !== "minutes") minutesInitializedRef.current = false;
  }, [activeTab, meeting?.id, meeting?.minutes]);

  const handleMinutesInput = () => {
    if (minutesSaveTimerRef.current) clearTimeout(minutesSaveTimerRef.current);
    minutesSaveTimerRef.current = setTimeout(() => {
      const el = minutesEditorRef.current;
      if (el) saveMinutes(el.innerHTML);
      minutesSaveTimerRef.current = null;
    }, 500);
  };

  const copyMinutes = () => {
    const el = minutesEditorRef.current;
    if (!el) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
    document.execCommand("copy");
    if (sel) sel.removeAllRanges();
  };

  // 生成会议纪要
  const [generatingMinutes, setGeneratingMinutes] = React.useState(false);
  const [generatedMinutes, setGeneratedMinutes] = React.useState<string>("");
  const [recordings, setRecordings] = React.useState<Array<{
    id: string;
    url: string;
    duration: number;
    size: number;
    createdAt: string;
  }>>([]);

  const generateMinutes = async () => {
    if (transcripts.length === 0) {
      setRecordingError("没有会议记录，无法生成纪要");
      return;
    }

    setGeneratingMinutes(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/minutes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingId,
          transcripts,
          format: "markdown"
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setGeneratedMinutes(data.data.content);
          // 自动填充到编辑器
          if (minutesEditorRef.current) {
            minutesEditorRef.current.innerHTML = data.data.content.replace(/\n/g, "<br>");
            saveMinutes(minutesEditorRef.current.innerHTML);
          }
        }
      }
    } catch (err) {
      console.error("生成会议纪要失败:", err);
      setRecordingError("生成会议纪要失败");
    } finally {
      setGeneratingMinutes(false);
    }
  };

  // 导出会议纪要
  const exportMinutes = (format: "markdown" | "txt") => {
    const content = minutesEditorRef.current?.innerText || "";
    if (!content) {
      setRecordingError("没有内容可导出");
      return;
    }

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `会议纪要_${meeting?.title || "未命名"}_${new Date().toLocaleDateString()}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const markPointMentioned = async (point: DiscussionPoint) => {
    await fetch(`/api/discussion-points/${point.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "mentioned",
        mentionedAt: Date.now()
      })
    });
    if (!meeting) return;
    setMeeting({
      ...meeting,
      discussionPoints: meeting.discussionPoints.map((p) =>
        p.id === point.id ? { ...p, status: "mentioned", mentionedAt: Date.now() } : p
      )
    });
  };

  if (!meeting) {
    return (
      <div className="px-6 py-6 text-sm text-slate-400">
        加载会议详情中...
      </div>
    );
  }

  const statusBadge =
    meeting.status === "pending"
      ? <Badge variant="warning">待开始</Badge>
      : meeting.status === "in_progress"
        ? <Badge variant="success">进行中</Badge>
        : <Badge>已完成</Badge>;

  return (
    <div className="flex h-screen flex-col px-4 py-4">
      <header className="mb-3 flex items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-slate-50">
              {meeting.title}
            </h1>
            {statusBadge}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            类型：{meeting.meeting_type?.name ?? "未指定"} ·
            录音状态：{recording ? "录音中" : "未录音"} ·
            ASR引擎：{useAlibabaASR ? "阿里云" : "浏览器"}
            {recording && (
              <span className="ml-2 text-sky-400">
                · 当前说话人：{currentSpeaker}
              </span>
            )}
          </div>
          {recordingError ? (
            <div className="mt-1 text-xs text-amber-400">{recordingError}</div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleStatusChange("in_progress")}
          >
            开始会议
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleStatusChange("completed")}
          >
            结束会议
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUseAlibabaASR(!useAlibabaASR)}
            disabled={recording}
          >
            {useAlibabaASR ? "阿里云ASR" : "浏览器ASR"}
          </Button>
          <Button
            variant={recording ? "destructive" : "default"}
            size="sm"
            onClick={toggleRecording}
          >
            {recording ? "停止录音" : "开始录音"}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 gap-3 overflow-hidden">
        {/* 左列：对话记录 */}
        <section className="flex min-w-0 flex-1 flex-col rounded-xl border border-slate-800 bg-slate-950/60">
          <header className="flex items-center justify-between border-b border-slate-800 px-3 py-2 text-xs text-slate-400">
            <span>对话记录</span>
          </header>
          <div className="flex-1 space-y-2 overflow-y-auto px-3 py-2 text-sm">
            {/* 实时识别中的临时文本 */}
            {recording && interimText && (
              <div className="group rounded-lg bg-slate-800/50 px-3 py-2 border border-sky-900/30">
                <div className="mb-0.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-sky-400">
                    {currentSpeaker}
                  </span>
                  <span className="text-[10px] text-sky-600">
                    识别中...
                  </span>
                </div>
                <div className="text-sm text-slate-300 italic">
                  {interimText}
                </div>
              </div>
            )}
            {transcripts
              .slice()
              .reverse()
              .map((t) => {
                // 为不同说话人生成颜色
                const getSpeakerColor = (name: string) => {
                  if (name === "未知说话人") return "text-slate-300";
                  if (name === "张三") return "text-emerald-400";
                  if (name === "李四") return "text-amber-400";
                  if (name === "王五") return "text-purple-400";
                  // 根据名字hash生成颜色
                  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
                  const colors = ["text-rose-400", "text-cyan-400", "text-lime-400", "text-violet-400", "text-pink-400"];
                  return colors[hash % colors.length];
                };
                
                return (
                  <div
                    key={t.id}
                    className="group rounded-lg bg-slate-900/80 px-3 py-2"
                  >
                    <div className="mb-0.5 flex items-center justify-between text-xs">
                      <span
                        className={`font-semibold ${getSpeakerColor(t.speakerName)}`}
                      >
                        {t.speakerName}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {Math.round(t.timestampMs / 1000)}s
                      </span>
                    </div>
                    <div className="line-clamp-2 text-sm text-slate-100 group-hover:line-clamp-none">
                      {t.content}
                    </div>
                  </div>
                );
              })}
            {transcripts.length === 0 && !interimText ? (
              <div className="mt-4 text-xs text-slate-500">
                暂无转录记录，开始录音后会在此处实时显示识别结果。
              </div>
            ) : null}
          </div>
        </section>

        {/* 中列：AI 建议 */}
        <section className="flex w-80 min-w-[18rem] flex-col rounded-xl border border-slate-800 bg-slate-950/60">
          <header className="flex items-center justify-between border-b border-slate-800 px-3 py-2 text-xs text-slate-400">
            <span>AI 建议</span>
            <Button size="sm" variant="ghost" onClick={refreshSuggestions}>
              刷新
            </Button>
          </header>
          <div className="flex-1 space-y-2 overflow-y-auto px-3 py-2 text-xs">
            {meeting.aiSuggestions
              ?.slice()
              .reverse()
              .map((s) => (
                <div
                  key={s.id}
                  className={`rounded-lg border p-2 ${s.matched ? 'border-sky-600 bg-sky-950/30' : 'border-slate-800 bg-slate-900/80'}`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Badge className={`text-[10px] uppercase ${s.matched ? 'bg-sky-600' : ''}`}>
                        {s.type}
                      </Badge>
                      {s.matched ? (
                        <span className="text-[9px] text-sky-400">✓ 已匹配</span>
                      ) : (
                        <span className="text-[9px] text-slate-500">未匹配</span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {Math.round(s.timestampMs / 1000)}s
                    </span>
                  </div>
                  {s.matched_scenario ? (
                    <div className="mb-1 text-[10px] text-sky-300">
                      匹配场景：{s.matched_scenario}
                    </div>
                  ) : null}
                  <p className="text-[12px] leading-relaxed text-slate-100">
                    {s.content}
                  </p>
                </div>
              ))}
            {(!meeting.aiSuggestions || meeting.aiSuggestions.length === 0) ? (
              <div className="mt-4 text-xs text-slate-500">
                暂无建议，可点击右上角"刷新"基于最新对话获取建议。
              </div>
            ) : null}
          </div>
        </section>

        {/* 右列：待沟通点 */}
        <section className="flex w-72 min-w-[16rem] flex-col rounded-xl border border-slate-800 bg-slate-950/60">
          <header className="flex items-center justify-between border-b border-slate-800 px-3 py-2 text-xs text-slate-400">
            <span>待沟通点</span>
          </header>
          <div className="flex-1 space-y-2 overflow-y-auto px-3 py-2 text-xs">
            <div className="mb-2 flex gap-2">
              <input
                className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-sky-500"
                placeholder="快速添加待沟通点..."
                value={discussionInput}
                onChange={(e) => setDiscussionInput(e.target.value)}
              />
              <Button size="sm" onClick={handleAddDiscussionPoint}>
                添加
              </Button>
            </div>
            {meeting.discussionPoints?.map((p) => (
              <div
                key={p.id}
                className="flex items-start justify-between gap-2 rounded-lg bg-slate-900/80 px-2 py-2"
              >
                <div>
                  <div className="text-[11px] text-slate-200">
                    {p.content}
                  </div>
                  <div className="mt-1 text-[10px] text-slate-500">
                    状态：{p.status === "pending" ? "待沟通" : "已沟通"}
                  </div>
                </div>
                {p.status === "pending" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => markPointMentioned(p)}
                  >
                    已沟通
                  </Button>
                ) : null}
              </div>
            ))}
            {(!meeting.discussionPoints ||
              meeting.discussionPoints.length === 0) && (
              <div className="mt-4 text-xs text-slate-500">
                暂无待沟通点，可由 AI 自动识别或在上方手动添加。
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 底部：Tab 管理录音 / 策略 / 目标 */}
      <footer className="mt-3 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-200">
        <div className="mb-2 flex items-center gap-4">
          <button
            type="button"
            className={
              activeTab === "recordings"
                ? "rounded-md bg-slate-800 px-3 py-1 text-xs font-medium"
                : "rounded-md px-3 py-1 text-xs text-slate-400 hover:bg-slate-800"
            }
            onClick={() => setActiveTab("recordings")}
          >
            录音
          </button>
          <button
            type="button"
            className={
              activeTab === "strategies"
                ? "rounded-md bg-slate-800 px-3 py-1 text-xs font-medium"
                : "rounded-md px-3 py-1 text-xs text-slate-400 hover:bg-slate-800"
            }
            onClick={() => setActiveTab("strategies")}
          >
            策略
          </button>
          <button
            type="button"
            className={
              activeTab === "goals"
                ? "rounded-md bg-slate-800 px-3 py-1 text-xs font-medium"
                : "rounded-md px-3 py-1 text-xs text-slate-400 hover:bg-slate-800"
            }
            onClick={() => setActiveTab("goals")}
          >
            目标
          </button>
          <button
            type="button"
            className={
              activeTab === "minutes"
                ? "rounded-md bg-slate-800 px-3 py-1 text-xs font-medium"
                : "rounded-md px-3 py-1 text-xs text-slate-400 hover:bg-slate-800"
            }
            onClick={() => setActiveTab("minutes")}
          >
            会议纪要
          </button>
        </div>
        {activeTab === "recordings" && (
          <AudioPlayer 
            recordings={recordings}
            transcripts={transcripts.map(t => ({
              timestampMs: t.timestampMs,
              speakerName: t.speakerName,
              content: t.content
            }))}
          />
        )}
        {activeTab === "strategies" && (
          <div className="space-y-1 text-[11px] text-slate-300">
            {(meeting.customStrategies ?? []).map((s) => (
              <div key={s.id} className="rounded-md bg-slate-900/80 px-2 py-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-100">
                    {s.title}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    来源：{s.source}
                  </span>
                </div>
                <div className="mt-0.5 text-[10px] text-slate-400">
                  场景：{s.scenario}
                </div>
                <div className="mt-0.5 text-[10px] text-slate-300">
                  策略：{s.response}
                </div>
              </div>
            ))}
            {(meeting.customStrategies ?? []).length === 0 && (
              <div className="text-[11px] text-slate-500">
                暂无会议策略，可从策略库继承或手动添加。
              </div>
            )}
          </div>
        )}
        {activeTab === "goals" && (
          <div className="space-y-1 text-[11px] text-slate-300">
            {(meeting.customGoals ?? []).map((g) => (
              <div
                key={g}
                className="flex items-center gap-2 rounded-md bg-slate-900/80 px-2 py-1"
              >
                <input type="checkbox" className="h-3 w-3" />
                <span>{g}</span>
              </div>
            ))}
            {(meeting.customGoals ?? []).length === 0 && (
              <div className="text-[11px] text-slate-500">
                暂无会议目标，可在会议类型中配置后自动继承。
              </div>
            )}
          </div>
        )}
        {activeTab === "minutes" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                className="rounded bg-slate-700 px-2 py-1 text-[11px] hover:bg-slate-600"
                onClick={() => document.execCommand("bold")}
              >
                加粗
              </button>
              <button
                type="button"
                className="rounded bg-slate-700 px-2 py-1 text-[11px] hover:bg-slate-600"
                onClick={() => document.execCommand("italic")}
              >
                斜体
              </button>
              <button
                type="button"
                className="rounded bg-slate-700 px-2 py-1 text-[11px] hover:bg-slate-600"
                onClick={() => document.execCommand("insertUnorderedList")}
              >
                列表
              </button>
              <Button size="sm" variant="ghost" onClick={copyMinutes}>
                复制
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={generateMinutes}
                disabled={generatingMinutes || transcripts.length === 0}
              >
                {generatingMinutes ? "生成中..." : "AI生成纪要"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportMinutes("markdown")}
              >
                导出MD
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportMinutes("txt")}
              >
                导出TXT
              </Button>
            </div>
            <div
              ref={minutesEditorRef}
              className="min-h-[120px] rounded border border-slate-700 bg-slate-900 px-3 py-2 text-[12px] text-slate-200 outline-none [&>ul]:list-disc [&>ul]:pl-4"
              contentEditable
              suppressContentEditableWarning
              onInput={handleMinutesInput}
            />
          </div>
        )}
      </footer>
    </div>
  );
}

