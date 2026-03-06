## 会议参谋 · 智能会议助手

基于 Next.js 15 + React 19 + TypeScript + Tailwind CSS 4 + Drizzle ORM + Supabase 的智能会议助手示例，实现了会议类型管理、策略库、声纹录入、实时会议辅助和会议后处理的完整骨架。

### 本地运行

```bash
pnpm install # 或 npm install / yarn

# 需要先配置 DATABASE_URL 指向 PostgreSQL（用于 Drizzle）
cp .env.example .env.local

pnpm dev
```

### 环境变量

- `DATABASE_URL`：PostgreSQL 连接字符串，用于 Drizzle ORM。
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`：可选，用于访问 Supabase（对象存储等）。
- `LLM_API_BASE`、`LLM_API_KEY`、`LLM_MODEL`：可选，用于 AI 建议与策略解析。配置为 OpenAI 兼容接口（豆包/DeepSeek/Kimi 等）后即可启用真实 LLM。
- `VOICE_MATCH_THRESHOLD`：声纹匹配欧氏距离阈值，默认 2，越小匹配越严格。

### 功能模块

- 会议类型：`/meeting-types`，支持增删改与目标列表。
- 会议记录：`/meetings` 与 `/meetings/[id]`，包含三列布局的会议详情页。
- 策略库：`/strategies`，支持 AI 文本解析批量导入策略。
- 声纹管理：`/voice-profiles`，录入声纹音频并提取特征；匹配接口已实现基于欧氏距离的占位匹配。
- 应用说明：`/docs`，概述业务流程与对接点。

### AI / ASR / 声纹说明

- **LLM**：已接入 `src/lib/llm.ts`，通过 `LLM_API_BASE` + `LLM_API_KEY` 调用 OpenAI 兼容接口。配置后 AI 建议与策略解析会使用真实模型，未配置则使用占位回复。
- **ASR**：会议详情页已实现 MediaRecorder 每 6 秒切片、写入 `/api/transcripts` 并刷新 AI 建议；当前识别结果为占位文案，可在 `ondataavailable` 内替换为真实 ASR SDK 调用。
- **声纹**：`src/lib/voice-features.ts` 提供从 WAV/PCM 提取简单特征向量（均值、标准差、过零率、能量带等）及欧氏距离匹配；录入时自动计算特征入库，`/api/voice-profiles/match` 已实现按距离阈值返回匹配结果。

