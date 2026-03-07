export async function onRequestGet(context) {
  const env = context.env;
  const url = new URL(context.request.url);
  const id = url.searchParams.get('id');

  if (!id) return new Response('Not Found', { status: 404 });

  try {
    // R2バケットから画像データを取得
    const object = await env.RECEIPT_BUCKET.get(id);
    if (!object) return new Response('Image Not Found', { status: 404 });

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000'); // ブラウザにキャッシュさせる

    return new Response(object.body, { headers });
  } catch (error) {
    return new Response(error.message, { status: 500 });
  }
}