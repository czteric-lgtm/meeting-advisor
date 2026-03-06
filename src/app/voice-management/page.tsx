"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface VoiceProfile {
  id: string;
  name: string;
  alibabaVoiceId?: string;
  createdAt: string;
  sampleCount: number;
}

export default function VoiceProfilesPage() {
  const [profiles, setProfiles] = React.useState<VoiceProfile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [recordingProfile, setRecordingProfile] = React.useState<string | null>(null);
  const [newName, setNewName] = React.useState("");
  const [isRecording, setIsRecording] = React.useState(false);

  React.useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const res = await fetch("/api/voice-profiles");
      if (res.ok) {
        const data = await res.json();
        setProfiles(data.data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async (profileId: string) => {
    setRecordingProfile(profileId);
    setIsRecording(true);
    
    // 请求麦克风权限
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 录制3秒音频作为声纹样本
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        await uploadVoiceSample(profileId, blob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      
      // 3秒后自动停止
      setTimeout(() => {
        mediaRecorder.stop();
        setIsRecording(false);
        setRecordingProfile(null);
      }, 3000);
      
    } catch (err) {
      console.error("录音失败:", err);
      setIsRecording(false);
      setRecordingProfile(null);
    }
  };

  const uploadVoiceSample = async (profileId: string, audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob);
      formData.append("profile_id", profileId);
      
      const res = await fetch("/api/voice-profiles/enroll", {
        method: "POST",
        body: formData
      });
      
      if (res.ok) {
        await loadProfiles();
      }
    } catch (err) {
      console.error("上传声纹样本失败:", err);
    }
  };

  const createProfile = async () => {
    if (!newName.trim()) return;
    
    try {
      const res = await fetch("/api/voice-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() })
      });
      
      if (res.ok) {
        setNewName("");
        await loadProfiles();
      }
    } catch (err) {
      console.error("创建声纹档案失败:", err);
    }
  };

  const deleteProfile = async (id: string) => {
    if (!confirm("确定要删除这个声纹档案吗？")) return;
    
    try {
      const res = await fetch(`/api/voice-profiles?id=${id}`, {
        method: "DELETE"
      });
      
      if (res.ok) {
        await loadProfiles();
      }
    } catch (err) {
      console.error("删除声纹档案失败:", err);
    }
  };

  if (loading) {
    return <div className="p-6 text-slate-400">加载中...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-50">声纹管理</h1>
        <p className="mt-2 text-sm text-slate-400">
          注册和管理说话人的声纹，用于会议中自动识别不同说话人。
        </p>
      </div>

      {/* 创建新声纹 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">注册新声纹</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="输入姓名（如：张三）"
              className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Button onClick={createProfile} disabled={!newName.trim()}>
              创建档案
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 声纹列表 */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-slate-400">已注册声纹</h2>
        
        {profiles.length === 0 ? (
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 text-center text-sm text-slate-500">
            暂无注册声纹，请先创建声纹档案
          </div>
        ) : (
          profiles.map((profile) => (
            <Card key={profile.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <h3 className="font-medium text-slate-100">{profile.name}</h3>
                  <p className="text-xs text-slate-500">
                    样本数：{profile.sampleCount} · 
                    创建于：{new Date(profile.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startRecording(profile.id)}
                    disabled={isRecording}
                  >
                    {recordingProfile === profile.id ? "录制中..." : "添加样本"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteProfile(profile.id)}
                  >
                    删除
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 使用说明 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">使用说明</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-400 space-y-2">
          <p>1. 点击"创建档案"添加新的说话人</p>
          <p>2. 点击"添加样本"录制3秒语音样本（建议每人录制3-5个样本）</p>
          <p>3. 在会议中开启录音，系统会自动识别说话人</p>
          <p>4. 样本越多，识别准确率越高</p>
        </CardContent>
      </Card>
    </div>
  );
}