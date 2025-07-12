# Supabase API 設計

このドキュメントでは、Sky CanvasプロジェクトにおけるSupabaseを利用したAPI設計について説明します。主な目的は、スマートフォンアプリとディスプレイアプリ間でのリアルタイムな花火イベントの送受信です。

## 1. 全体概要

SupabaseのRealtime機能とPostgreSQLデータベースを組み合わせることで、低遅延でのイベント伝達を実現します。スマートフォンアプリがセンサーデータを元にイベントをデータベースに書き込み、ディスプレイアプリがその変更をリアルタイムで購読します。

## 2. イベントデータフォーマット

花火イベントのデータは、`firework_events` テーブルに格納されます。このテーブルの各行は、スマートフォンからの特定の操作（傾きまたはジェスチャー）に対応するイベントを表します。データフォーマットは以下のTypeScriptインターフェースに準拠します。

```typescript
interface FireworkEvent {
  id: string; // UUID
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

interface TiltData {
  alpha: number;  // z軸周りの回転角（0-360度）
  beta: number;   // x軸周りの回転角（-180-180度）
  gamma: number;  // y軸周りの回転角（-90-90度）
  timestamp: number;
}

interface GestureData {
  type: 'flick' | 'swing';
  direction: 'up' | 'down' | 'left' | 'right';
  intensity: number;  // 0-1の範囲
  timestamp: number;
}
```

## 3. APIエンドポイントと操作

Supabaseは、データベーステーブルに対して自動的にRESTful APIエンドポイントとリアルタイム購読機能を提供します。

### 3.1. データ送信 (スマートフォンアプリ -> Supabase)

スマートフォンアプリは、ユーザーの操作に応じて `firework_events` テーブルに新しいレコードを挿入します。これはSupabaseクライアントSDKの `from('firework_events').insert()` メソッドを使用します。

**例:**

```typescript
import { supabase } from '../utils/supabase';

const sendFireworkEvent = async (event: FireworkEvent) => {
  const { data, error } = await supabase
    .from('firework_events')
    .insert([event])
    .select();

  if (error) {
    console.error('Error sending firework event:', error);
  } else {
    console.log('Firework event sent:', data);
  }
};
```

### 3.2. データ受信 (ディスプレイアプリ <- Supabase)

ディスプレイアプリは、`firework_events` テーブルへの新しい挿入イベントをリアルタイムで購読します。これにより、データがデータベースに書き込まれるとほぼ同時にイベントを受け取ることができます。これはSupabaseクライアントSDKの `from('firework_events').on('INSERT', ...).subscribe()` メソッドを使用します。

**例:**

```typescript
import { supabase } from '../utils/supabase';
import { Tables } from '../lib/database.types';

type FireworkEventRow = Tables<'firework_events'>;

supabase
  .from('firework_events')
  .on('INSERT', (payload) => {
    console.log('New firework event received!', payload.new as FireworkEventRow);
    // ここで花火の演出ロジックを呼び出す
  })
  .subscribe();
```

### 3.3. セキュリティ (Row Level Security - RLS)

`03-specification.md` に記載されている通り、Supabase RLSを適用して、データベースへのアクセスを適切に制御します。これにより、未承認のユーザーがイベントデータを挿入したり、不正なデータを読み取ったりすることを防ぎます。具体的には、`firework_events` テーブルに対して、認証されたユーザーのみが挿入できるようにするRLSポリシーを設定することが推奨されます。 