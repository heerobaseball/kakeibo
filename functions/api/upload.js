export async function onRequestPost(context) {
  const request = context.request;
  const env = context.env; // D1やAPIキーにアクセス
  
  try {
    const formData = await request.formData();
    const image = formData.get('image');
    const comment = formData.get('comment');

    if (!image) return new Response('画像が必要です', { status: 400 });

    // 画像をBase64に変換
    const arrayBuffer = await image.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Gemini APIの呼び出し（v1betaを使用）
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
    
    // Geminiへのプロンプト（ここで解析と負担額の計算を指示）
    const prompt = `
      画像はレシートです。ユーザーからのコメント: "${comment}"
      このレシートの内容とコメントから、以下のJSONフォーマットでデータを出力してください。JSON以外のテキストは含めないでください。
      {
        "description": "購入した主な品目や店舗名",
        "total_amount": 合計金額(数値),
        "payer": "支払った人(夫 or 妻)",
        "husband_burden": 夫の負担額(数値),
        "wife_burden": 妻の負担額(数値)
      }
    `;

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: image.type, data: base64Image } }
          ]
        }]
      })
    });

    const geminiData = await geminiResponse.json();
    
    // Geminiの返答からJSONを抽出（マークダウンブロックを削除）
    let resultText = geminiData.candidates[0].content.parts[0].text;
    resultText = resultText.replace(/```json\n|\n```/g, '');
    const parsedData = JSON.parse(resultText);

    // D1データベースへ保存
    await env.DB.prepare(
      "INSERT INTO expenses (description, total_amount, payer, husband_burden, wife_burden) VALUES (?, ?, ?, ?, ?)"
    ).bind(
      parsedData.description, 
      parsedData.total_amount, 
      parsedData.payer, 
      parsedData.husband_burden, 
      parsedData.wife_burden
    ).run();

    return new Response(JSON.stringify({ success: true, data: parsedData }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}