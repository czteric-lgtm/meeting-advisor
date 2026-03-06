async function testDoubao() {
  const apiKey = 'c00aaee5-17f0-4d01-b7e8-70d14dd5933d';
  const baseUrl = 'https://ark.cn-beijing.volces.com/api/v3';
  
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'doubao-pro-32k',
        messages: [{ role: 'user', content: '你好，测试一下' }],
        temperature: 0.3,
        max_tokens: 100
      })
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('❌ API调用失败:', res.status, err);
      return;
    }

    const data = await res.json();
    console.log('✅ 豆包API连接成功！');
    console.log('回复内容:', data.choices?.[0]?.message?.content);
    console.log('模型:', data.model);
  } catch (e) {
    console.error('❌ 测试失败:', e.message);
  }
}

testDoubao();
