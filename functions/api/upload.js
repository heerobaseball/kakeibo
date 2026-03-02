export async function onRequestPost(context) {
  const request = context.request;
  const env = context.env;
  
  try {
    // 画面側で解析し終わったJSONデータを受け取る
    const parsedData = await request.json();
    
    // D1データベースへ保存
    await env.DB.prepare(
      "INSERT INTO expenses (description, total_amount, payer, husband_burden, wife_burden) VALUES (?, ?, ?, ?, ?)"
    ).bind(
      parsedData.description, parsedData.total_amount, parsedData.payer, parsedData.husband_burden, parsedData.wife_burden
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