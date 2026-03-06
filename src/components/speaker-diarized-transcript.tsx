"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// 说话人颜色映射
const SPEAKER_COLORS = [
  { bg: "bg-emerald-950/40", text: "text-emerald-400", border: "border-emerald-800/50" },
  { bg: "bg-amber-950/40", text: "text-amber-400", border: "border-amber-800/50" },
  { bg: "bg-purple-950/40", text: "text-purple-400", border: "border-purple-800/50" },
  { bg: "bg-rose-950/40", text: "text-rose-400", border: "border-rose-800/50" },
  { bg: "bg-cyan-950/40", text: "text-cyan-400", border: "border-cyan-800/50" },
  { bg: "bg-lime-950/40", text: "text-lime-400", border: "border-lime-800/50" },
  { bg: "bg-violet-950/40", text: "text-violet-400", border: "border-violet-800/50" },
  { bg: "bg-pink-950/40", text: "text-pink-400", border: "border-pink-800/50" },
];

// 根据说话人ID获取颜色
function getSpeakerColor(speakerId: string | undefined, index: number): typeof SPEAKER_COLORS[0] {
  if (speakerId === undefined || speakerId === "unknown") {
    return { bg: "bg-slate-800/50", text: "text-slate-400", border: "border-slate-700/50" };
  }
  const colorIndex = Math.abs(hashString(speakerId)) % SPEAKER_COLORS.length;
  return SPEAKER_COLORS[colorIndex];
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

// 格式化时间
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// 句子数据接口
export interface TranscriptSentence {
  id: string;
  speakerId?: string;
  speakerName?: string;
  content: string;
  beginTime: number;
  endTime: number;
  confidence?: number;
}

// 组件属性
interface SpeakerDiarizedTranscriptProps {
  sentences: TranscriptSentence[];
  interimText?: string;
  currentSpeaker?: string;
  isRecording?: boolean;
  className?: string;
  onSentenceClick?: (sentence: TranscriptSentence) => void;
  showSpeakerLabel?: boolean;
  showTimeStamp?: boolean;
}

export function SpeakerDiarizedTranscript({
  sentences,
  interimText,
  currentSpeaker,
  isRecording,
  className,
  onSentenceClick,
  showSpeakerLabel = true,
  showTimeStamp = true,
}: SpeakerDiarizedTranscriptProps) {
  // 按说话人分组连续的句子
  const groupedSentences = React.useMemo(() => {
    const groups: { speakerId: string; sentences: TranscriptSentence[] }[] = [];
    
    for (const sentence of sentences) {
      const speakerId = sentence.speakerId || "unknown";
      const lastGroup = groups[groups.length - 1];
      
      if (lastGroup && lastGroup.speakerId === speakerId) {
        lastGroup.sentences.push(sentence);
      } else {
        groups.push({ speakerId, sentences: [sentence] });
      }
    }
    
    return groups;
  }, [sentences]);

  // 统计说话人
  const speakerStats = React.useMemo(() => {
    const stats = new Map<string, { count: number; duration: number }>();
    for (const sentence of sentences) {
      const speakerId = sentence.speakerId || "unknown";
      const existing = stats.get(speakerId) || { count: 0, duration: 0 };
      stats.set(speakerId, {
        count: existing.count + 1,
        duration: existing.duration + (sentence.endTime - sentence.beginTime),
      });
    }
    return stats;
  }, [sentences]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* 统计信息 */}
      {sentences.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2 px-1">
          <span className="text-xs text-slate-500">
            共 {sentences.length} 句话 · {speakerStats.size} 位说话人
          </span>
          {Array.from(speakerStats.entries()).map(([speakerId, stat], idx) => {
            const color = getSpeakerColor(speakerId, idx);
            const speakerName = sentences.find(s => s.speakerId === speakerId)?.speakerName || `说话人${speakerId}`;
            return (
              <span
                key={speakerId}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]",
                  color.bg,
                  color.text
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", color.text.replace("text-", "bg-") )} />
                {speakerName} · {stat.count}句 · {formatTime(stat.duration)}
              </span>
            );
          })}
        </div>
      )}

      {/* 对话列表 */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        {/* 实时识别中的文本 */}
        {isRecording && interimText && (
          <div className="rounded-lg border border-sky-800/50 bg-sky-950/30 px-3 py-2">
            <div className="mb-1 flex items-center gap-2 text-xs">
              <span className="text-sky-400 font-medium">
                {currentSpeaker || "识别中..."}
              </span>
              <span className="text-[10px] text-sky-600 animate-pulse">
                ● 实时转写
              </span>
            </div>
            <p className="text-sm text-slate-300 italic">{interimText}</p>
          </div>
        )}

        {/* 已完成的句子 */}
        {groupedSentences.map((group, groupIdx) => {
          const color = getSpeakerColor(group.speakerId, groupIdx);
          const firstSentence = group.sentences[0];
          const speakerName = firstSentence.speakerName || `说话人${group.speakerId}`;
          
          return (
            <div
              key={`${group.speakerId}-${groupIdx}`}
              className={cn(
                "rounded-lg border px-3 py-2 transition-colors hover:bg-opacity-60",
                color.bg,
                color.border
              )}
            >
              {/* 说话人标题 */}
              {showSpeakerLabel && (
                <div className="mb-2 flex items-center gap-2 border-b border-slate-700/30 pb-1">
                  <span className={cn("h-2 w-2 rounded-full", color.text.replace("text-", "bg-") )} />
                  <span className={cn("text-xs font-semibold", color.text)}>
                    {speakerName}
                  </span>
                  {showTimeStamp && (
                    <span className="text-[10px] text-slate-500 ml-auto">
                      {formatTime(firstSentence.beginTime)} - {formatTime(group.sentences[group.sentences.length - 1].endTime)}
                    </span>
                  )}
                </div>
              )}

              {/* 句子内容 */}
              <div className="space-y-1">
                {group.sentences.map((sentence, idx) => (
                  <div
                    key={sentence.id}
                    className={cn(
                      "text-sm text-slate-100 leading-relaxed cursor-pointer hover:bg-slate-800/30 rounded px-1 -mx-1 transition-colors",
                      onSentenceClick && "cursor-pointer"
                    )}
                    onClick={() => onSentenceClick?.(sentence)}
                    title={showTimeStamp ? `[${formatTime(sentence.beginTime)}] 置信度: ${Math.round((sentence.confidence || 0) * 100)}%` : undefined}
                  >
                    {sentence.content}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* 空状态 */}
        {sentences.length === 0 && !interimText && (
          <div className="flex h-32 items-center justify-center text-xs text-slate-500">
            暂无转录记录，开始录音后会在此处实时显示识别结果。
          </div>
        )}
      </div>
    </div>
  );
}

// 导出会议纪要生成函数
export function generateMinutesMarkdown(
  sentences: TranscriptSentence[],
  speakerNames?: Map<string, string>
): string {
  const lines: string[] = [];
  lines.push("# 会议纪要");
  lines.push("");
  lines.push(`生成时间：${new Date().toLocaleString("zh-CN")}`);
  lines.push("");
  lines.push("## 参会人员");
  
  const speakers = new Set(sentences.map(s => s.speakerId).filter((id): id is string => id !== undefined));
  for (const speakerId of speakers) {
    const name = speakerNames?.get(speakerId) || `说话人${speakerId}`;
    lines.push(`- ${name}`);
  }
  lines.push("");
  lines.push("## 会议记录");
  lines.push("");
  
  for (const sentence of sentences) {
    const speakerId = sentence.speakerId || "unknown";
    const speakerName = speakerNames?.get(speakerId) || `说话人${speakerId}`;
    const time = formatTime(sentence.beginTime);
    lines.push(`**${time} [${speakerName}]** ${sentence.content}`);
  }
  
  return lines.join("\n");
}

// 导出Word格式（简单HTML）
export function generateMinutesWord(
  sentences: TranscriptSentence[],
  speakerNames?: Map<string, string>
): string {
  const html = [
    "<html>",
    "<head><meta charset='UTF-8'><style>",
    "body { font-family: 'Microsoft YaHei', sans-serif; line-height: 1.6; }",
    ".header { font-size: 24px; font-weight: bold; margin-bottom: 20px; }",
    ".meta { color: #666; margin-bottom: 20px; }",
    ".speaker { color: #2b7de9; font-weight: bold; }",
    ".time { color: #999; font-size: 12px; margin-right: 10px; }",
    "</style></head>",
    "<body>",
    "<div class='header'>会议纪要</div>",
    `<div class='meta'>生成时间：${new Date().toLocaleString("zh-CN")}</div>`,
    "<hr/>",
  ];
  
  for (const sentence of sentences) {
    const speakerId = sentence.speakerId || "unknown";
    const speakerName = speakerNames?.get(speakerId) || `说话人${speakerId}`;
    const time = formatTime(sentence.beginTime);
    html.push(`<p><span class='time'>[${time}]</span><span class='speaker'>${speakerName}:</span> ${sentence.content}</p>`);
  }
  
  html.push("</body></html>");
  return html.join("\n");
}
