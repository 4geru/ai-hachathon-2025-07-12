// APIルートでデータを一時的に保持するためのグローバル変数
// 実際のアプリケーションでは、データベースやRedisのような永続的なストレージを使用します。
let latestAcceleration: { x: number | null; y: number | null; z: number | null } | null = null;

export async function POST(request: Request) {
  const data = await request.json();
  latestAcceleration = data.acceleration;
  console.log("Received acceleration data:", latestAcceleration);
  return new Response(JSON.stringify({ status: 'success', received: latestAcceleration }), { status: 200 });
}

export async function GET() {
  return new Response(JSON.stringify({ acceleration: latestAcceleration }), { status: 200 });
} 