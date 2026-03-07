export async function onRequestPost(context) {
  const env = context.env;
  try {
    const data = await context.request.json();
    
    if (data.action === 'delete') {
      // id または rowid が一致するものを確実に削除する
      await env.DB.prepare("DELETE FROM expenses WHERE id = ? OR rowid = ?").bind(data.id, data.id).run();
    } 
    else if (data.action === 'update') {
      await env.DB.prepare(
        "UPDATE expenses SET date = ?, description = ?, total_amount = ?, payer = ?, husband_burden = ?, wife_burden = ?, genre = ? WHERE id = ? OR rowid = ?"
      ).bind(data.date, data.description, data.total_amount, data.payer, data.husband_burden, data.wife_burden, data.genre, data.id, data.id).run();
    } 
    else if (data.action === 'settle') {
      const ids = data.ids;
      if(ids && ids.length > 0) {
        const placeholders = ids.map(() => '?').join(',');
        // 精算処理も id または rowid で対応
        await env.DB.prepare(`UPDATE expenses SET is_settled = 1 WHERE id IN (${placeholders}) OR rowid IN (${placeholders})`).bind(...ids, ...ids).run();
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' }});
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}