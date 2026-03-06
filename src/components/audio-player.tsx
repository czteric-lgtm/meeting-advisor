"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

interface Recording {
  id: string;
  url: string;
  duration: number;
  size: number;
  createdAt: string;
  segments?: Array<{
    startTime: number;
    endTime: number;
    speakerName?: string;
  }>;
}

interface AudioPlayerProps {
  recordings: Recording[];
  transcripts: Array<{
    timestampMs: number;
    speakerName: string;
    content: string;
  }>;
}

export function AudioPlayer({ recordings, transcripts }: AudioPlayerProps) {
  const [currentRecording, setCurrentRecording] = React.useState<Recording | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [playbackRate, setPlaybackRate] = React.useState(1);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const progressRef = React.useRef<HTMLDivElement | null>(null);

  // 格式化时间
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // 播放/暂停
  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // 跳转到指定时间
  const seekTo = (timeMs: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = timeMs / 1000;
    setCurrentTime(timeMs);
  };

  // 处理进度条点击
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !currentRecording) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const seekTime = percent * currentRecording.duration;
    seekTo(seekTime);
  };

  // 获取当前时间对应的转录文本
  const getCurrentTranscript = () => {
    const windowStart = currentTime - 5000; // 前5秒
    const windowEnd = currentTime + 5000;   // 后5秒
    
    return transcripts.filter(
      t => t.timestampMs >= windowStart && t.timestampMs <= windowEnd
    );
  };

  // 跳转到某条转录
  const jumpToTranscript = (timestampMs: number) => {
    seekTo(timestampMs);
    if (audioRef.current && !isPlaying) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  React.useEffect(() => {
    if (recordings.length > 0 && !currentRecording) {
      setCurrentRecording(recordings[0]);
    }
  }, [recordings, currentRecording]);

  if (recordings.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <p>暂无录音</p>
        <p className="text-xs mt-1">开始录音后会自动保存</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 录音列表 */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-slate-400">录音列表</h3>
        {recordings.map((recording, index) => (
          <div
            key={recording.id}
            className={`flex items-center justify-between p-2 rounded cursor-pointer ${
              currentRecording?.id === recording.id
                ? "bg-sky-900/30 border border-sky-700"
                : "bg-slate-900/50 hover:bg-slate-800"
            }`}
            onClick={() => {
              setCurrentRecording(recording);
              setCurrentTime(0);
              setIsPlaying(false);
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">#{index + 1}</span>
              <span className="text-sm text-slate-200">
                录音 {new Date(recording.createdAt).toLocaleTimeString()}
              </span>
            </div>
            <span className="text-xs text-slate-500">
              {formatTime(recording.duration)}
            </span>
          </div>
        ))}
      </div>

      {/* 播放器 */}
      {currentRecording && (
        <div className="space-y-3">
          {/* 音频元素 */}
          <audio
            ref={audioRef}
            src={currentRecording.url}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime * 1000)}
            onEnded={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            className="hidden"
          />

          {/* 控制按钮 */}
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="default"
              onClick={togglePlay}
              className="w-20"
            >
              {isPlaying ? "暂停" : "播放"}
            </Button>
            
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-500">倍速:</span>
              {[0.5, 1, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  className={`px-2 py-1 text-xs rounded ${
                    playbackRate === rate
                      ? "bg-sky-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                  onClick={() => {
                    setPlaybackRate(rate);
                    if (audioRef.current) {
                      audioRef.current.playbackRate = rate;
                    }
                  }}
                >
                  {rate}x
                </button>
              ))}
            </div>

            <span className="text-xs text-slate-400 ml-auto">
              {formatTime(currentTime)} / {formatTime(currentRecording.duration)}
            </span>
          </div>

          {/* 进度条 */}
          <div
            ref={progressRef}
            className="h-2 bg-slate-800 rounded cursor-pointer relative"
            onClick={handleProgressClick}
          >
            <div
              className="absolute h-full bg-sky-600 rounded transition-all"
              style={{
                width: `${(currentTime / currentRecording.duration) * 100}%`
              }}
            />
            {/* 转录标记点 */}
            {transcripts.map((t, i) => (
              <div
                key={i}
                className="absolute top-0 w-0.5 h-full bg-amber-500/50 hover:bg-amber-500"
                style={{
                  left: `${(t.timestampMs / currentRecording.duration) * 100}%`
                }}
                title={`${t.speakerName}: ${t.content.slice(0, 20)}...`}
                onClick={(e) => {
                  e.stopPropagation();
                  jumpToTranscript(t.timestampMs);
                }}
              />
            ))}
          </div>

          {/* 当前转录文本 */}
          <div className="max-h-40 overflow-y-auto space-y-2">
            <h3 className="text-xs font-medium text-slate-400">当前位置对话</h3>
            {getCurrentTranscript().map((t, i) => (
              <div
                key={i}
                className={`p-2 rounded text-xs cursor-pointer hover:bg-slate-800 ${
                  Math.abs(t.timestampMs - currentTime) < 2000
                    ? "bg-sky-900/20 border border-sky-800"
                    : "bg-slate-900/50"
                }`}
                onClick={() => jumpToTranscript(t.timestampMs)}
              >
                <span className="text-sky-400 font-medium">{t.speakerName}</span>
                <span className="text-slate-500 ml-2">{formatTime(t.timestampMs)}</span>
                <p className="text-slate-300 mt-1">{t.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}