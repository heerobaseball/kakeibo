export async function onRequestPost(context) {
  const env = context.env;
  try {
    const data = await context.request.json();
    
    if (data.action === 'delete') {
      await env.DB.prepare("DELETE FROM expenses WHERE id = ?").bind(data.id).run();
    } 
    else if (data.action === 'update') {
      await env.DB.prepare(
        "UPDATE expenses SET description = ?, total_amount = ?, payer = ?, husband_burden = ?, wife_burden = ?, genre = ? WHERE id = ?"
      ).bind(data.description, data.total_amount, data.payer, data.husband_burden, data.wife_burden, data.genre, data.id).run();
    } 
    else if (data.action === 'settle') {
      const ids = data.ids;
      if(ids && ids.length > 0) {
        const placeholders = ids.map(() => '?').join(',');
        await env.DB.prepare(`UPDATE expenses SET is_settled = 1 WHERE id IN (${placeholders})`).bind(...ids).run();
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' }});
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}