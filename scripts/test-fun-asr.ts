/**
 * 测试阿里云 Fun-ASR 录音文件识别
 * 
 * 使用方法：
 * 1. 设置环境变量 DASHSCOPE_API_KEY
 * 2. npx ts-node scripts/test-fun-asr.ts
 */

import FunASRService, { organizeBySpeaker, generateMinutes } from "../src/lib/fun-asr.js";

async function testFunASR() {
  console.log("🧪 测试阿里云 Fun-ASR 录音文件识别\n");

  try {
    // 检查 API Key
    const apiKey = process.env.DASHSCOPE_API_KEY;
    if (!apiKey) {
      console.error("❌ 错误: 请设置 DASHSCOPE_API_KEY 环境变量");
      console.log("获取地址：https://bailian.console.aliyun.com/");
      return;
    }

    console.log("✅ API Key 已配置");

    // 初始化服务
    const funASR = new FunASRService(apiKey);
    console.log("✅ FunASR 服务初始化成功\n");

    // 使用测试音频文件（阿里云提供的示例音频）
    const testAudioUrl = "https://dashscope.oss-cn-beijing.aliyuncs.com/samples/audio/paraformer/hello_world.wav";
    console.log("📁 测试音频:", testAudioUrl);

    // 提交任务（开启说话人分离）
    console.log("\n🚀 提交转写任务...");
    const taskId = await funASR.submitTask(testAudioUrl, {
      enabled: true,
      speakerCount: 0, // 不定人数
    });
    console.log("✅ 任务提交成功，Task ID:", taskId);

    // 等待任务完成
    console.log("\n⏳ 等待转写完成（可能需要几分钟）...");
    const result = await funASR.waitForCompletion(taskId, 5 * 60 * 1000, 3000);

    console.log("\n📊 转写结果:");
    console.log("状态:", result.status);
    console.log("句子数:", result.sentences.length);

    // 显示识别到的句子
    if (result.sentences.length > 0) {
      console.log("\n📝 识别内容:");
      for (const sentence of result.sentences) {
        const speaker = sentence.speakerId || "未知";
        const time = `${Math.floor(sentence.beginTime / 1000)}s`;
        console.log(`  [${time}] 说话人${speaker}: ${sentence.text}`);
      }

      // 按说话人组织
      const speakerMap = organizeBySpeaker(result.sentences);
      console.log("\n👥 检测到的说话人:", speakerMap.size, "个");
      for (const [speakerId, sentences] of speakerMap.entries()) {
        console.log(`  说话人${speakerId}: ${sentences.length} 句话`);
      }

      // 生成会议纪要
      const minutes = generateMinutes(result.sentences);
      console.log("\n📄 会议纪要格式:");
      console.log(minutes);
    }

    console.log("\n✅ 测试完成！");
  } catch (error) {
    console.error("\n❌ 测试失败:", error);
    process.exit(1);
  }
}

// 运行测试
testFunASR();
