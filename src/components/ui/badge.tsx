import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning";
}

export function Badge(props: BadgeProps) {
  const { className, variant = "default", ...rest } = props;

  const variantClassName =
    variant === "success"
      ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40"
      : variant === "warning"
        ? "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40"
        : "bg-slate-700/60 text-slate-100 ring-1 ring-slate-600/60";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        variantClassName,
        className
      )}
      {...rest}
    />
  );
}

