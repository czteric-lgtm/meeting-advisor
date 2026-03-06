// 模拟添加转录数据并获取AI建议
async function demo() {
  const baseUrl = 'http://localhost:3000';
  const meetingId = 'test-meeting-001';
  
  // 添加转录 - 客户询问价格（应该匹配策略）
  await fetch(`${baseUrl}/api/transcripts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      meeting_id: meetingId,
      content: '你们这个产品多少钱？能不能给个报价？',
      timestamp_ms: 10000,
      speaker_name: '客户',
      voice_profile_id: null,
      is_user: false
    })
  });
  console.log('添加转录1: 客户询问价格');
  
  // 添加转录 - 客户有疑虑
  await fetch(`${baseUrl}/api/transcripts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      meeting_id: meetingId,
      content: '我对这个产品的稳定性有点担心，之前用过类似的产品出过很多问题',
      timestamp_ms: 25000,
      speaker_name: '客户',
      voice_profile_id: null,
      is_user: false
    })
  });
  console.log('添加转录2: 客户有疑虑');
  
  console.log('转录添加完成！');
}

demo().catch(console.error);
