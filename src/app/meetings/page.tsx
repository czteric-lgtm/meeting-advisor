"use client";

import * as React from "react";
import Link from "next/link";
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

interface MeetingTypeOption {
  id: string;
  name: string;
}

interface MeetingListItem {
  id: string;
  title: string;
  meeting_type_id: string;
  meeting_type_name: string | null;
  date: string;
  status: "pending" | "in_progress" | "completed";
  created_at: string;
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = React.useState<MeetingListItem[]>([]);
  const [types, setTypes] = React.useState<MeetingTypeOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [typeId, setTypeId] = React.useState("");
  const [date, setDate] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    const load = async () => {
      try {
        const [meetingsRes, typesRes] = await Promise.all([
          fetch("/api/meetings"),
          fetch("/api/meeting-types")
        ]);
        if (meetingsRes.ok) {
          const data = await meetingsRes.json();
          setMeetings(data.data ?? []);
        }
        if (typesRes.ok) {
          const data = await typesRes.json();
          setTypes(data.data ?? []);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !typeId || !date) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          meeting_type_id: typeId,
          date
        })
      });
      if (!res.ok) return;
      const data = await res.json();
      setMeetings((prev) => [
        {
          id: data.data.id,
          title: data.data.title,
          meeting_type_id: typeId,
          meeting_type_name:
            types.find((t) => t.id === typeId)?.name ?? "未知类型",
          date,
          status: data.data.status,
          created_at: new Date().toISOString()
        },
        ...prev
      ]);
      setOpen(false);
      setTitle("");
      setTypeId("");
      setDate("");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatus = (status: MeetingListItem["status"]) => {
    if (status === "pending") {
      return <Badge variant="warning">待开始</Badge>;
    }
    if (status === "in_progress") {
      return <Badge variant="success">进行中</Badge>;
    }
    return <Badge>已完成</Badge>;
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("确定要删除该会议吗？")) return;
    await fetch(`/api/meetings/${id}`, { method: "DELETE" });
    setMeetings((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-50">
            会议记录
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            管理所有会议，进入详情页使用实时辅助与会后处理能力。
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>新建会议</Button>
      </div>

      {open ? (
        <form
          onSubmit={handleSubmit}
          className="mb-5 grid gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-200 md:grid-cols-4"
        >
          <div className="space-y-1 md:col-span-2">
            <label className="block text-xs text-slate-400">
              会议标题
            </label>
            <input
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs text-slate-400">
              会议类型
            </label>
            <select
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
              required
            >
              <option value="">请选择</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs text-slate-400">
              会议时间
            </label>
            <input
              type="datetime-local"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="flex items-end justify-end gap-2 md:col-span-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "创建中..." : "创建会议"}
            </Button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <div className="text-sm text-slate-400">加载中...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {meetings.map((m) => (
            <Card key={m.id}>
              <CardHeader>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Link
                      href={`/meetings/${m.id}`}
                      className="hover:text-sky-400"
                    >
                      {m.title}
                    </Link>
                    {renderStatus(m.status)}
                  </CardTitle>
                  <CardDescription>
                    {m.meeting_type_name ?? "未指定类型"}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(m.id)}
                >
                  删除
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>
                    会议时间：
                    {m.date
                      ? format(new Date(m.date), "yyyy-MM-dd HH:mm", {
                          locale: zhCN
                        })
                      : "未设置"}
                  </span>
                  <span>
                    创建于：
                    {format(new Date(m.created_at), "MM-dd HH:mm", {
                      locale: zhCN
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
          {meetings.length === 0 ? (
            <div className="text-sm text-slate-500">
              暂无会议记录，请先创建一场会议。
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

