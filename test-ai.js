// 直接调用AI建议API
async function getAiSuggestions() {
  const baseUrl = 'http://localhost:3000';
  
  const res = await fetch(`${baseUrl}/api/ai/suggestions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      meeting_id: '550e8400-e29b-41d4-a716-446655440000',
      current_transcript: '你们这个产品多少钱？能不能给个报价？',
      recent_transcripts: ['你们这个产品多少钱？能不能给个报价？'],
      strategies: [
        '客户询问价格 -> 先了解客户预算，再提供定制化方案',
        '客户对产品有疑虑 -> 用数据和案例支撑，增强说服力',
        '客户需要更多时间考虑 -> 表示理解，约定下次沟通时间'
      ],
      discussion_points: ['确认项目预算范围', '确定交付时间节点']
    })
  });
  
  const data = await res.json();
  console.log('AI建议返回:', JSON.stringify(data, null, 2));
}

getAiSuggestions().catch(console.error);
