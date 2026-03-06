import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-50">
            欢迎使用会议参谋
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            实时语音识别 · 场景策略匹配 · 待沟通点追踪，帮助你在会议中做出更专业的回应。
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/meetings">快速进入会议</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/docs">查看应用说明</Link>
          </Button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>会议类型模板</CardTitle>
          </CardHeader>
          <CardContent>
            预先定义不同业务场景下的会议目标，让每一场会议都有清晰的方向。
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>实时会议辅助</CardTitle>
          </CardHeader>
          <CardContent>
            录音、转录、AI 场景匹配与建议，在关键时刻给你更稳妥的回应参考。
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>会议后处理</CardTitle>
          </CardHeader>
          <CardContent>
            策略补齐、待沟通点闭环、会议纪要编辑与导出，帮你完整收尾。
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

