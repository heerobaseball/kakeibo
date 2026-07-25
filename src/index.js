export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname, searchParams } = url;
    const method = request.method;

    try {
      // API routing
      if (pathname === '/api/config') {
        if (method !== 'GET') {
          return new Response('Method Not Allowed', { status: 405 });
        }
        return new Response(JSON.stringify({ apiKey: env.GEMINI_API_KEY }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (pathname === '/api/summary') {
        if (method !== 'GET') {
          return new Response('Method Not Allowed', { status: 405 });
        }
        const { results } = await env.DB.prepare("SELECT rowid as id, * FROM expenses ORDER BY date DESC").all();
        return new Response(JSON.stringify(results), { 
          headers: { 'Content-Type': 'application/json' } 
        });
      }

      if (pathname === '/api/manage') {
        if (method !== 'POST') {
          return new Response('Method Not Allowed', { status: 405 });
        }
        const data = await request.json();
        
        if (data.action === 'delete') {
          await env.DB.prepare("DELETE FROM expenses WHERE id = ? OR rowid = ?").bind(data.id, data.id).run();
        } 
        else if (data.action === 'update') {
          await env.DB.prepare(
            "UPDATE expenses SET date = ?, description = ?, total_amount = ?, payer = ?, husband_burden = ?, wife_burden = ?, genre = ? WHERE id = ? OR rowid = ?"
          ).bind(data.date, data.description, data.total_amount, data.payer, data.husband_burden, data.wife_burden, data.genre, data.id, data.id).run();
        } 
        else if (data.action === 'settle') {
          const ids = data.ids;
          if (ids && ids.length > 0) {
            const placeholders = ids.map(() => '?').join(',');
            await env.DB.prepare(`UPDATE expenses SET is_settled = 1 WHERE id IN (${placeholders}) OR rowid IN (${placeholders})`).bind(...ids, ...ids).run();
          }
        }

        return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' }});
      }

      if (pathname === '/api/upload') {
        if (method !== 'POST') {
          return new Response('Method Not Allowed', { status: 405 });
        }
        const formData = await request.formData();
        const parsedData = JSON.parse(formData.get('data'));
        const imageFile = formData.get('image');

        let imageId = null;
        
        if (imageFile && imageFile.size > 0) {
          imageId = crypto.randomUUID() + '.jpg';
          await env.RECEIPT_BUCKET.put(imageId, imageFile.stream(), {
            httpMetadata: { contentType: imageFile.type }
          });
        }

        await env.DB.prepare(
          "INSERT INTO expenses (date, description, total_amount, payer, husband_burden, wife_burden, genre, image_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(
          parsedData.date, parsedData.description, parsedData.total_amount, parsedData.payer, parsedData.husband_burden, parsedData.wife_burden, parsedData.genre, imageId
        ).run();

        return new Response(JSON.stringify({ success: true, data: parsedData }), { headers: { 'Content-Type': 'application/json' } });
      }

      if (pathname === '/api/image') {
        if (method !== 'GET') {
          return new Response('Method Not Allowed', { status: 405 });
        }
        const id = searchParams.get('id');
        if (!id) return new Response('Not Found', { status: 404 });

        const object = await env.RECEIPT_BUCKET.get(id);
        if (!object) return new Response('Image Not Found', { status: 404 });

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);
        headers.set('Cache-Control', 'public, max-age=31536000');

        return new Response(object.body, { headers });
      }

      return new Response('Not Found', { status: 404 });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
