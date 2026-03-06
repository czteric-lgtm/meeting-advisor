import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";

export const metadata: Metadata = {
  title: "会议参谋 · 智能会议助手",
  description: "实时语音识别与 AI 策略建议的智能会议助手"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <div className="app-shell">
          <Sidebar />
          <main className="app-main">
            <div className="app-scroll">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}


