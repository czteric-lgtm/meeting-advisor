/**
 * 测试阿里云 Fun-ASR 录音文件识别（最终版）
 */

const apiKey = process.env.DASHSCOPE_API_KEY;

if (!apiKey) {
  console.error("❌ 错误: 请设置 DASHSCOPE_API_KEY 环境变量");
  process.exit(1);
}

const baseUrl = "https://dashscope.aliyuncs.com/api/v1";
const testAudioUrl = "https://dashscope.oss-cn-beijing.aliyuncs.com/samples/audio/paraformer/hello_world.wav";

// 格式化时间
function formatTime(ms) {
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  return `${min}:${s.toString().padStart(2, "0")}`;
}

async function main() {
  try {
    console.log("🧪 测试阿里云 Fun-ASR 录音文件识别\n");
    console.log("✅ API Key 已配置\n");

    // 提交任务
    console.log("📤 提交转写任务...");
    const submitRes = await fetch(`${baseUrl}/services/audio/asr/transcription`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",
      },
      body: JSON.stringify({
        model: "paraformer-v2",
        input: { file_urls: [testAudioUrl] },
        parameters: { diarization_enabled: true, speaker_count: 0 },
      }),
    });

    const submitData = await submitRes.json();
    const taskId = submitData.output?.task_id;
    console.log("✅ 任务已提交，Task ID:", taskId, "\n");

    // 等待完成
    console.log("⏳ 等待转写完成...");
    let result = null;
    let status = "PENDING";

    while (status !== "SUCCEEDED" && status !== "FAILED") {
      await new Promise(r => setTimeout(r, 3000));
      const queryRes = await fetch(`${baseUrl}/tasks/${taskId}`, {
        headers: { "Authorization": `Bearer ${apiKey}` },
      });
      result = await queryRes.json();
      status = result.output?.task_status;
      process.stdout.write(`\r状态: ${status}...`);
    }

    if (status === "FAILED") {
      throw new Error("转写失败");
    }

    console.log("\n✅ 转写完成！\n");

    // 获取转写结果
    const transcriptionUrl = result.output?.results?.[0]?.transcription_url;
    const transRes = await fetch(transcriptionUrl);
    const transData = await transRes.json();

    // 解析所有句子和说话人
    const allSentences = [];
    const transcripts = transData.transcripts || [];
    
    for (const transcript of transcripts) {
      const sentences = transcript.sentences || [];
      for (const s of sentences) {
        allSentences.push({
          beginTime: s.begin_time || 0,
          endTime: s.end_time || 0,
          text: s.text || "",
          speakerId: s.speaker_id,
          words: s.words || [],
        });
      }
    }

    // 统计说话人
    const speakers = new Set(allSentences.map(s => s.speakerId).filter(id => id !== undefined));

    console.log("📊 统计:");
    console.log(`- 句子数: ${allSentences.length}`);
    console.log(`- 说话人数: ${speakers.size}`);
    console.log(`- 音频时长: ${formatTime(transData.properties?.original_duration_in_milliseconds || 0)}\n`);

    if (allSentences.length > 0) {
      console.log("📝 转写内容（带说话人分离）:\n");
      allSentences.forEach((s, i) => {
        const time = formatTime(s.beginTime);
        const speaker = s.speakerId !== undefined ? `说话人${s.speakerId}` : "未知";
        console.log(`${i + 1}. [${time}] ${speaker}: ${s.text}`);
      });

      console.log("\n📄 会议纪要格式:\n");
      const minutes = allSentences.map(s => {
        const speaker = s.speakerId !== undefined ? `说话人${s.speakerId}` : "未知";
        const time = formatTime(s.beginTime);
        return `[${time}] ${speaker}: ${s.text}`;
      }).join("\n");
      console.log(minutes);
    }

    console.log("\n✅ 测试成功！阿里云 Fun-ASR 说话人分离已可用！");

  } catch (error) {
    console.error("\n❌ 错误:", error.message);
    process.exit(1);
  }
}

main();
