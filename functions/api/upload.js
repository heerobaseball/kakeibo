export async function onRequestPost(context) {
  const env = context.env;
  try {
    const parsedData = await context.request.json();
    
    // genre（ジャンル）を追加して保存する
    await env.DB.prepare(
      "INSERT INTO expenses (description, total_amount, payer, husband_burden, wife_burden, genre) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(
      parsedData.description, parsedData.total_amount, parsedData.payer, parsedData.husband_burden, parsedData.wife_burden, parsedData.genre
    ).run();

    return new Response(JSON.stringify({ success: true, data: parsedData }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}