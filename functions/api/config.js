export async function onRequestGet(context) {
  // Cloudflareに保存した鍵を、ログイン済みの画面にだけこっそり渡す処理
  return new Response(JSON.stringify({ apiKey: context.env.GEMINI_API_KEY }), {
    headers: { 'Content-Type': 'application/json' }
  });
}