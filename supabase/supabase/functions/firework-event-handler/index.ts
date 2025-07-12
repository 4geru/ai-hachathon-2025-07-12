// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

interface TiltData {
  alpha: number;
  beta: number;
  gamma: number;
  timestamp: number;
}

interface GestureData {
  type: 'flick' | 'swing';
  direction: 'up' | 'down' | 'left' | 'right';
  intensity: number;
  timestamp: number;
}

interface FireworkEvent {
  id: string;
  type: 'tilt' | 'gesture';
  data: TiltData | GestureData;
  userId: string;
  deviceType: string;
  timestamp: number;
  vibe: {
    color: string;
    size: number;
    pattern: string;
    seed: number;
  };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const fireworkEvent: FireworkEvent = await req.json();
    console.log("Received Firework Event:", fireworkEvent);

    // ここにイベントを処理するロジックを追加できます。
    // 例: データの検証、別のテーブルへの保存、AIトリガーなど。

    return new Response(
      JSON.stringify({ status: 'Event received successfully', eventId: fireworkEvent.id }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Error processing Firework Event:", error);
    return new Response(
      JSON.stringify({ error: 'Invalid Firework Event format', details: error.message }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
});
