export async function onRequestPost(context) {
  const request = context.request;
  const env = context.env; 
  
  try {
    const formData = await request.formData();
    const image = formData.get('image');
    const comment = formData.get('comment') || '';

    if (!image) return new Response(JSON.stringify({ error: '画像が必要です' }), { status: 400 });

    // --- 追加: APIキーがCloudflareに正しく反映されているかチェック ---
    if (!env.GEMINI_API_KEY) {
        throw new Error("APIキーが見つかりません。Cloudflareの環境変数が正しく設定・反映（再デプロイ）されているか確認してください。");
    }

    // 画像のBase64変換
    const arrayBuffer = await image.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binaryString = '';
    for (let i = 0; i < uint8Array.byteLength; i++) {
        binaryString += String.fromCharCode(uint8Array[i]);
    }
    const base64Image = btoa(binaryString);

    // Gemini APIの呼び出し
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${env.GEMINI_API_KEY}`;
    
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
    
    // --- 修正: Googleからの「本当のエラーメッセージ」を画面に出す ---
    if (!geminiResponse.ok) {
        throw new Error(`Googleからのエラー: ${geminiData.error?.message || '詳細不明'}`);
    }
    
    if (!geminiData.candidates || geminiData.candidates.length === 0) {
        throw new Error("Geminiからの回答が空でした。");
    }
    
    let resultText = geminiData.candidates[0].content.parts[0].text;
    resultText = resultText.replace(/```json\n|\n```/g, '');
    
    let parsedData;
    try {
        parsedData = JSON.parse(resultText);
    } catch (e) {
         throw new Error("Geminiが指定通りのデータ(JSON)を返しませんでした。結果: " + resultText);
    }

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
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}