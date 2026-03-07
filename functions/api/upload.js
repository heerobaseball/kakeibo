export async function onRequestPost(context) {
  const env = context.env;
  try {
    // 今回はJSONではなく、画像とデータが混ざった「FormData」を受け取ります
    const formData = await context.request.formData();
    const parsedData = JSON.parse(formData.get('data'));
    const imageFile = formData.get('image');

    let imageId = null;
    
    // 画像があれば、ランダムなIDをつけてR2バケットに保存
    if (imageFile && imageFile.size > 0) {
      imageId = crypto.randomUUID() + '.jpg';
      await env.RECEIPT_BUCKET.put(imageId, imageFile.stream(), {
        httpMetadata: { contentType: imageFile.type }
      });
    }

    // D1データベースに、画像ID（imageId）も含めて保存
    await env.DB.prepare(
      "INSERT INTO expenses (date, description, total_amount, payer, husband_burden, wife_burden, genre, image_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      parsedData.date, parsedData.description, parsedData.total_amount, parsedData.payer, parsedData.husband_burden, parsedData.wife_burden, parsedData.genre, imageId
    ).run();

    return new Response(JSON.stringify({ success: true, data: parsedData }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}