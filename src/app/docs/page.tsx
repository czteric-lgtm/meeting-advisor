export default function DocsPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-6 text-sm leading-relaxed text-slate-200">
      <h1 className="mb-3 text-lg font-semibold text-slate-50">
        应用说明
      </h1>
      <p className="mb-4 text-slate-400">
        会议参谋是一款智能会议助手，围绕“会前准备、会中辅助、会后沉淀”三个阶段设计。
      </p>

      <h2 className="mt-4 text-base font-semibold text-slate-50">
        会前：配置会议类型与策略库
      </h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">
        <li>
          在 <span className="font-mono text-sky-300">会议类型</span>{" "}
          页面配置常见的会议类型和目标列表。
        </li>
        <li>
          在 <span className="font-mono text-sky-300">策略库</span>{" "}
          页面维护“场景 - 应对策略”对，可通过 AI 批量解析导入。
        </li>
        <li>
          在 <span className="font-mono text-sky-300">声纹管理</span>{" "}
          录入自己和关键参会人的声纹，方便会中标记说话人。
        </li>
      </ul>

      <h2 className="mt-4 text-base font-semibold text-slate-50">
        会中：使用会议详情页进行实时辅助
      </h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">
        <li>
          在 <span className="font-mono text-sky-300">会议记录</span>{" "}
          创建会议并点击进入详情页。
        </li>
        <li>
          左侧实时展示转录记录（当前版本提供前端结构，ASR 与声纹识别可按需接入你的 SDK）。
        </li>
        <li>
          中间展示基于当前对话与策略库生成的 AI 建议，可手动刷新。
        </li>
        <li>
          右侧管理待沟通点，支持手动添加与“已沟通”标记。
        </li>
      </ul>

      <h2 className="mt-4 text-base font-semibold text-slate-50">
        会后：补充策略与纪要
      </h2>
      <p className="mt-2 text-slate-300">
        当前版本已经在数据模型与 API 中预留了会议纪要、补充策略与录音回放能力，前端可根据实际需要进一步扩展富文本编辑器和录音播放器。
      </p>

      <h2 className="mt-4 text-base font-semibold text-slate-50">
        接入真实 AI / ASR 服务
      </h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">
        <li>
          AI 建议：在 <span className="font-mono text-sky-300">
            /api/ai/suggestions
          </span>{" "}
          路由中替换占位逻辑为豆包 / DeepSeek / Kimi 的调用。
        </li>
        <li>
          策略解析：在{" "}
          <span className="font-mono text-sky-300">
            /api/ai/parse-strategies
          </span>{" "}
          中接入 LLM，基于你期望的 JSON 结构返回。
        </li>
        <li>
          ASR 与声纹：在前端会议详情页中集成你选用的 ASR SDK，将 6 秒片段结果通过{" "}
          <span className="font-mono text-sky-300">/api/transcripts</span>{" "}
          持久化，并在{" "}
          <span className="font-mono text-sky-300">
            /api/voice-profiles
          </span>{" "}
          与 <span className="font-mono text-sky-300">
            /api/voice-profiles/match
          </span>{" "}
          中接入真实声纹特征提取与匹配逻辑。
        </li>
      </ul>
    </div>
  );
}

