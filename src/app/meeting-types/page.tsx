"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";

interface MeetingType {
  id: string;
  name: string;
  description: string | null;
  goals: string[];
}

export default function MeetingTypesPage() {
  const [items, setItems] = React.useState<MeetingType[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<MeetingType | null>(null);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [goalsText, setGoalsText] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/meeting-types");
        if (!res.ok) return;
        const data = await res.json();
        setItems(data.data ?? []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const resetForm = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setGoalsText("");
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (item: MeetingType) => {
    setEditing(item);
    setName(item.name);
    setDescription(item.description ?? "");
    setGoalsText(item.goals.join("\n"));
    setOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    const goals = goalsText
      .split("\n")
      .map((g) => g.trim())
      .filter(Boolean);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        goals
      };

      if (editing) {
        const res = await fetch(`/api/meeting-types/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!res.ok) return;
        const data = await res.json();
        setItems((prev) =>
          prev.map((mt) => (mt.id === editing.id ? (data.data || data) : mt))
        );
      } else {
        const res = await fetch("/api/meeting-types", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!res.ok) return;
        const data = await res.json();
        setItems((prev) => [...prev, (data.data || data)]);
      }

      setOpen(false);
      resetForm();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("确定要删除该会议类型吗？")) return;
    const res = await fetch(`/api/meeting-types/${id}`, {
      method: "DELETE"
    });
    if (!res.ok) return;
    setItems((prev) => prev.filter((mt) => mt.id !== id));
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-50">
            会议类型模板
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            定义不同类型会议的目标和描述，为创建会议提供标准模板。
          </p>
        </div>
        <Button onClick={openCreate}>新建会议类型</Button>
      </div>

      {loading ? (
        <div className="text-sm text-slate-400">加载中...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div>
                  <CardTitle>{item.name}</CardTitle>
                  {item.description ? (
                    <CardDescription>{item.description}</CardDescription>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(item)}
                  >
                    编辑
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(item.id)}
                  >
                    删除
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-slate-400">
                  目标数量：{item.goals.length}
                </div>
                {item.goals.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs text-slate-300">
                    {item.goals.slice(0, 3).map((g) => (
                      <li key={g} className="truncate">
                        • {g}
                      </li>
                    ))}
                    {item.goals.length > 3 ? (
                      <li className="text-slate-500">... 还有更多</li>
                    ) : null}
                  </ul>
                ) : null}
              </CardContent>
            </Card>
          ))}
          {items.length === 0 ? (
            <div className="text-sm text-slate-500">
              暂无会议类型，请点击右上角“新建会议类型”进行配置。
            </div>
          ) : null}
        </div>
      )}

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-xl">
          <Dialog.Title className="text-base font-semibold text-slate-50">
            {editing ? "编辑会议类型" : "新建会议类型"}
          </Dialog.Title>
          <form
            onSubmit={handleSubmit}
            className="mt-4 space-y-3 text-sm text-slate-200"
          >
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">
                类型名称（必填）
              </label>
              <input
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">
                类型描述（选填）
              </label>
              <textarea
                className="h-20 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">
                会议目标（每行一个）
              </label>
              <textarea
                className="h-28 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500"
                value={goalsText}
                onChange={(e) => setGoalsText(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "保存中..." : "保存"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
}

