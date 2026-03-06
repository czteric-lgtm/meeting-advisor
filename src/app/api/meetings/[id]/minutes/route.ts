import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, isLlmConfigured } from "@/lib/llm";

interface Transcript {
  id: string;
  speakerName: string;
  content: string;
  timestampMs: number;
}

interface MeetingMinutes {
  title: string;
  date: string;
  participants: string[];
  summary: string;
  keyDecisions: string[];
  actionItems: Array<{
    task: string;
    assignee?: string;
    deadline?: string;
  }>;
  discussionPoints: string[];
  nextSteps: string[];
}

const MINUTES_GENERATION_PROMPT = `你是一个专业的会议纪要生成助手。请根据以下会议转录记录，生成结构化的会议纪要。

## 会议转录记录：
{transcripts}

## 请按以下格式生成会议纪要：

### 1. 会议概要
用2-3句话总结本次会议的核心内容和达成的共识。

### 2. 参会人员
列出所有发言的参会人员（从speakerName中提取）。

### 3. 关键决策
列出本次会议做出的所有重要决定（用bullet points）。

### 4. 待办事项
列出所有需要跟进的事项，格式：
- 任务内容 [负责人] [截止日期]

### 5. 讨论要点
记录重要的讨论内容（按主题分组）。

### 6. 下一步行动
列出会议后的具体行动计划。

注意：
- 如果信息不明确，标注"待确认"
- 保持客观，不要添加转录中没有的内容
- 使用中文输出`;

export async function POST(request: NextRequest) {
  try {
    const { meetingId, transcripts, format = "markdown" } = await request.json();

    if (!meetingId || !transcripts || !Array.isArray(transcripts)) {
      return NextResponse.json(
        { error: "缺少必要参数" },
        { status: 400 }
      );
    }

    // 格式化转录记录
    const formattedTranscripts = transcripts
      .map((t: Transcript) => `[${t.speakerName}] ${t.content}`)
      .join("\n");

    let minutes: MeetingMinutes;

    // 如果有LLM配置，使用AI生成
    if (isLlmConfigured()) {
      const prompt = MINUTES_GENERATION_PROMPT.replace(
        "{transcripts}",
        formattedTranscripts
      );

      const content = await chatCompletion([
        { role: "user", content: prompt }
      ]);

      if (content) {
        // 解析AI生成的内容
        minutes = parseAiGeneratedMinutes(content, transcripts);
      } else {
        // AI生成失败，使用模板生成
        minutes = generateTemplateMinutes(transcripts);
      }
    } else {
      // 没有LLM配置，使用模板生成
      minutes = generateTemplateMinutes(transcripts);
    }

    // 根据格式返回
    if (format === "markdown") {
      const markdown = generateMarkdown(minutes);
      return NextResponse.json({
        success: true,
        data: {
          format: "markdown",
          content: markdown,
          minutes
        }
      });
    } else if (format === "json") {
      return NextResponse.json({
        success: true,
        data: {
          format: "json",
          minutes
        }
      });
    } else {
      return NextResponse.json(
        { error: "不支持的格式" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("[会议纪要生成] 错误:", error);
    return NextResponse.json(
      { error: "生成会议纪要失败" },
      { status: 500 }
    );
  }
}

// 解析AI生成的会议纪要
function parseAiGeneratedMinutes(content: string, transcripts: Transcript[]): MeetingMinutes {
  const participants = [...new Set(transcripts.map(t => t.speakerName))];
  
  // 简单的解析逻辑（实际应该用更 robust 的方式）
  const lines = content.split("\n");
  const keyDecisions: string[] = [];
  const actionItems: Array<{ task: string; assignee?: string; deadline?: string }> = [];
  const discussionPoints: string[] = [];
  const nextSteps: string[] = [];

  let currentSection = "";
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.includes("关键决策") || trimmed.includes("重要决定")) {
      currentSection = "decisions";
      continue;
    }
    if (trimmed.includes("待办") || trimmed.includes("行动")) {
      currentSection = "actions";
      continue;
    }
    if (trimmed.includes("讨论") || trimmed.includes("要点")) {
      currentSection = "discussion";
      continue;
    }
    if (trimmed.includes("下一步") || trimmed.includes("计划")) {
      currentSection = "next";
      continue;
    }

    if (trimmed.startsWith("-") || trimmed.startsWith("•")) {
      const content = trimmed.replace(/^[-•]\s*/, "");
      
      switch (currentSection) {
        case "decisions":
          keyDecisions.push(content);
          break;
        case "actions":
          actionItems.push(parseActionItem(content));
          break;
        case "discussion":
          discussionPoints.push(content);
          break;
        case "next":
          nextSteps.push(content);
          break;
      }
    }
  }

  return {
    title: "会议纪要",
    date: new Date().toISOString(),
    participants,
    summary: content.slice(0, 200) + "...",
    keyDecisions,
    actionItems,
    discussionPoints,
    nextSteps
  };
}

// 解析待办事项
function parseActionItem(content: string): { task: string; assignee?: string; deadline?: string } {
  // 尝试提取负责人和截止日期
  // 格式：任务内容 [张三] [2024-03-01]
  const assigneeMatch = content.match(/\[(.+?)\]/g);
  
  let task = content;
  let assignee: string | undefined;
  let deadline: string | undefined;

  if (assigneeMatch) {
    assigneeMatch.forEach(match => {
      const value = match.slice(1, -1);
      // 判断是日期还是人名
      if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(value)) {
        deadline = value;
      } else {
        assignee = value;
      }
      task = task.replace(match, "").trim();
    });
  }

  return { task, assignee, deadline };
}

// 使用模板生成会议纪要（当没有LLM时使用）
function generateTemplateMinutes(transcripts: Transcript[]): MeetingMinutes {
  const participants = [...new Set(transcripts.map(t => t.speakerName))];
  
  // 提取可能的关键决策（包含"决定"、"确定"、"同意"等关键词）
  const decisionKeywords = ["决定", "确定", "同意", "通过", "批准"];
  const keyDecisions = transcripts
    .filter(t => decisionKeywords.some(kw => t.content.includes(kw)))
    .map(t => t.content)
    .slice(0, 5);

  // 提取可能的待办事项（包含"需要"、"安排"、"准备"等关键词）
  const actionKeywords = ["需要", "安排", "准备", "跟进", "完成"];
  const actionItems = transcripts
    .filter(t => actionKeywords.some(kw => t.content.includes(kw)))
    .map(t => ({
      task: t.content,
      assignee: undefined,
      deadline: undefined
    }))
    .slice(0, 5);

  return {
    title: "会议纪要",
    date: new Date().toISOString(),
    participants,
    summary: `本次会议共有${participants.length}位参会者，讨论了${transcripts.length}个话题。`,
    keyDecisions: keyDecisions.length > 0 ? keyDecisions : ["（未检测到明确决策）"],
    actionItems: actionItems.length > 0 ? actionItems : [],
    discussionPoints: transcripts.slice(-5).map(t => t.content),
    nextSteps: ["根据会议内容安排后续跟进"]
  };
}

// 生成Markdown格式
function generateMarkdown(minutes: MeetingMinutes): string {
  const date = new Date(minutes.date).toLocaleString("zh-CN");
  
  return `# ${minutes.title}

**会议时间：** ${date}  
**参会人员：** ${minutes.participants.join(", ")}

---

## 会议概要

${minutes.summary}

---

## 关键决策

${minutes.keyDecisions.map(d => `- ${d}`).join("\n")}

---

## 待办事项

| 任务 | 负责人 | 截止日期 |
|------|--------|----------|
${minutes.actionItems.map(item => 
  `| ${item.task} | ${item.assignee || "待分配"} | ${item.deadline || "待定"} |`
).join("\n")}

---

## 讨论要点

${minutes.discussionPoints.map(p => `- ${p}`).join("\n")}

---

## 下一步行动

${minutes.nextSteps.map(s => `- ${s}`).join("\n")}

---

*本纪要由AI自动生成，如有遗漏请补充*
`;
}