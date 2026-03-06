"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Strategy {
  id: string;
  title: string;
  scenario: string;
  response: string;
  category: string;
  meetingTypeId: string | null;
  tags: string[];
}

export default function StrategiesPage() {
  const [items, setItems] = React.useState<Strategy[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [categoryFilter, setCategoryFilter] = React.useState<string>("");
  const [text, setText] = React.useState("");
  const [batchText, setBatchText] = React.useState("");

  React.useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/strategies");
        if (!res.ok) return;
        const data = await res.json();
        setItems(data.data ?? []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const content = text.trim();
    if (!content) return;
    const resParse = await fetch("/api/ai/parse-strategies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: content })
    });
    if (!resParse.ok) return;
    const parsed = await resParse.json();
    const strategies = (parsed.data.strategies ?? []).map((s: any) => ({
      ...s,
      category: "general",
      meeting_type_id: null,
      tags: []
    }));
    const res = await fetch("/api/strategies", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ strategies })
    });
    if (!res.ok) return;
    const data = await res.json();
    setItems((prev) => [...prev, ...(data.data ?? [])]);
    setText("");
  };

  const filtered = items.filter((s) =>
    categoryFilter ? s.category === categoryFilter : true
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-50">
            策略库
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            管理场景 - 应对策略，支持 AI 智能解析批量导入。
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <Button
            variant={categoryFilter === "" ? "default" : "ghost"}
            size="sm"
            onClick={() => setCategoryFilter("")}
          >
            全部
          </Button>
          <Button
            variant={categoryFilter === "technique" ? "default" : "ghost"}
            size="sm"
            onClick={() => setCategoryFilter("technique")}
          >
            技术
          </Button>
          <Button
            variant={categoryFilter === "principle" ? "default" : "ghost"}
            size="sm"
            onClick={() => setCategoryFilter("principle")}
          >
            原则
          </Button>
          <Button
            variant={categoryFilter === "method" ? "default" : "ghost"}
            size="sm"
            onClick={() => setCategoryFilter("method")}
          >
            方法
          </Button>
          <Button
            variant={categoryFilter === "general" ? "default" : "ghost"}
            size="sm"
            onClick={() => setCategoryFilter("general")}
          >
            通用
          </Button>
        </div>
      </div>

      <form
        onSubmit={handleCreate}
        className="mb-5 space-y-2 rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-200"
      >
        <div className="text-xs text-slate-400">
          批量导入示例：
        </div>
        <textarea
          className="h-24 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs outline-none focus:border-sky-500"
          placeholder="当客户询问价格时，应该先了解对方的预算范围，然后再根据预算提供合适的方案。&#10;当客户对产品有疑虑时，应该用数据和案例来支撑回答，增强说服力。"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex justify-end">
          <Button size="sm" type="submit">
            AI 解析并导入
          </Button>
        </div>
      </form>

      {loading ? (
        <div className="text-sm text-slate-400">加载中...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((s) => (
            <Card key={s.id}>
              <CardHeader>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {s.title}
                    <Badge className="text-[10px]">
                      {s.category}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    场景：{s.scenario}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-slate-200">
                  应对策略：{s.response}
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 ? (
            <div className="text-sm text-slate-500">
              暂无符合条件的策略。
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

