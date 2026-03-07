export async function onRequestGet(context) {
  const env = context.env;
  try {
    // データベースから新しい順にすべてのデータを取り出す（隠れIDも強制取得）
    const { results } = await env.DB.prepare("SELECT rowid as id, * FROM expenses ORDER BY date DESC").all();
    
    return new Response(JSON.stringify(results), { 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}