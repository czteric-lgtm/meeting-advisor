"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "首页" },
  { href: "/meeting-types", label: "会议类型" },
  { href: "/meetings", label: "会议记录" },
  { href: "/strategies", label: "策略库" },
  { href: "/voice-profiles", label: "声纹管理" },
  { href: "/docs", label: "应用说明" }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="app-sidebar">
      <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-sm font-bold text-slate-950">
          会
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-50">
            会议参谋
          </div>
          <div className="text-[11px] text-slate-400">
            智能会议助手
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-2 py-3 text-sm">
        {navItems.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-slate-50",
                active && "bg-slate-800 text-slate-50"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-800 px-4 py-3 text-[11px] text-slate-500">
        豆包 / DeepSeek / Kimi 等 AI 可在设置中接入。
      </div>
    </aside>
  );
}

