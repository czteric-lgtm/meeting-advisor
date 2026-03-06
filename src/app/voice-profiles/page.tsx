"use client";

import * as React from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface VoiceProfile {
  id: string;
  name: string;
  isUser: boolean;
  createdAt: string;
}

export default function VoiceProfilesPage() {
  const [items, setItems] = React.useState<VoiceProfile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [isUser, setIsUser] = React.useState(false);
  const [audioFile, setAudioFile] = React.useState<File | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/voice-profiles");
        if (!res.ok) return;
        const data = await res.json();
        setItems(
          (data.data ?? []).map((v: any) => ({
            id: v.id,
            name: v.name,
            isUser: v.isUser,
            createdAt: v.createdAt
          }))
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !audioFile) return;
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("name", name.trim());
      form.append("is_user", String(isUser));
      form.append("audio", audioFile);
      const res = await fetch("/api/voice-profiles", {
        method: "POST",
        body: form
      });
      if (!res.ok) return;
      const data = await res.json();
      setItems((prev) => [
        ...prev,
        {
          id: data.data.id,
          name: data.data.name,
          isUser: data.data.isUser,
          createdAt: data.data.createdAt
        }
      ]);
      setOpen(false);
      setName("");
      setIsUser(false);
      setAudioFile(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-50">
            声纹管理
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            录入参会人员声纹，用于会议中的说话人识别与标记。
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>录入声纹</Button>
      </div>

      {open ? (
        <form
          onSubmit={handleSubmit}
          className="mb-5 grid gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-200 md:grid-cols-3"
        >
          <div className="space-y-1">
            <label className="block text-xs text-slate-400">
              姓名
            </label>
            <input
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-xs text-slate-200">
              <input
                type="checkbox"
                checked={isUser}
                onChange={(e) => setIsUser(e.target.checked)}
              />
              是否是当前用户
            </label>
          </div>
          <div className="space-y-1">
            <label className="block text-xs text-slate-400">
              录音文件（至少 5 秒）
            </label>
            <input
              type="file"
              accept="audio/*"
              onChange={(e) =>
                setAudioFile(e.target.files ? e.target.files[0] : null)
              }
              className="w-full text-xs text-slate-300"
              required
            />
          </div>
          <div className="flex items-end justify-end gap-2 md:col-span-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "保存中..." : "保存声纹"}
            </Button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <div className="text-sm text-slate-400">加载中...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((v) => (
            <Card key={v.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {v.name}
                  {v.isUser ? (
                    <Badge variant="success">当前用户</Badge>
                  ) : null}
                </CardTitle>
                <CardDescription>
                  创建时间：
                  {format(new Date(v.createdAt), "yyyy-MM-dd HH:mm", {
                    locale: zhCN
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          ))}
          {items.length === 0 ? (
            <div className="text-sm text-slate-500">
              暂无声纹档案，请先在上方录入。
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

