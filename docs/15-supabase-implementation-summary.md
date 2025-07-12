# Supabase 実装サマリー

このドキュメントでは、Sky CanvasプロジェクトにおけるSupabaseの初期セットアップからAPI実装までの主要なステップをまとめます。

## 1. Supabase プロジェクトの作成と初期設定

- **プロジェクト作成**: `pretty-blue-pony` 組織内に `Sky Canvas` という名前でSupabaseプロジェクトを作成しました。
  - プロジェクトID: `twgpkuhorarfcdjsbtgw`
  - リージョン: `ap-northeast-1`
- **テーブル定義**: `03-specification.md` に基づき、`firework_events` テーブルを作成し、リアルタイム通知を有効にしました。
  ```sql
  CREATE TABLE firework_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_data JSONB NOT NULL,
    vibe JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_event_type CHECK (event_type IN ('tilt', 'gesture'))
  );
  ALTER PUBLICATION supabase_realtime ADD TABLE firework_events;
  ```
- **TypeScript 型定義生成**: プロジェクトのTypeScript型が生成され、`frontend/lib/database.types.ts` に配置されました。

## 2. 環境変数の管理

- **`.env.local` ファイル**: SupabaseのURLと匿名APIキーを `frontend/.env.local` に定義するよう指示しました。
  ```
  NEXT_PUBLIC_SUPABASE_URL="https://twgpkuhorarfcdjsbtgw.supabase.co"
  NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  ```
- **クライアント設定**: `frontend/utils/supabase.ts` を修正し、環境変数からSupabaseクライアントを初期化するように変更しました。

## 3. Supabase CLI のセットアップとマイグレーション

- **`supabase` フォルダ作成**: プロジェクトルートに `supabase` フォルダを作成しました。
- **CLI初期化とリンク**: `supabase init` および `supabase link --project-ref twgpkuhorarfcdjsbtgw` を実行し、ローカルのSupabase環境をリモートプロジェクトにリンクしました。
- **DBスキーマプル**: `supabase db pull` を実行し、既存のデータベーススキーマ（`firework_events` テーブル）をローカルのマイグレーションファイル (`supabase/migrations/xxxxxx_remote_schema.sql` など) として出力しました。

## 4. Edge Function によるバックエンド実装

- **Edge Function 作成**: `firework-event-handler` という名前で新しいEdge Function (`supabase/supabase/functions/firework-event-handler/index.ts`) を作成しました。
- **ロジック実装**: この関数はHTTP POSTリクエストを受け取り、`FireworkEvent` 型のJSONボディを処理（現時点ではログ出力）するように実装しました。
- **Deno 設定**: Denoランタイムの型を認識させるため、`supabase/supabase/functions/firework-event-handler/deno.json` を作成しました。
- **デプロイ**: `supabase functions deploy firework-event-handler --project-ref twgpkuhorarfcdjsbtgw` コマンドで、Edge FunctionをSupabaseにデプロイしました。

## 今後のステップ

- スマートフォンアプリ (`frontend/app/phone/page.tsx`) から、Edge Function にイベントを送信するロジックの実装。
- ディスプレイアプリ (`frontend/app/display/page.tsx`) で、Supabase Realtime を購読し、イベントを受信して花火をレンダリングするロジックの実装。
- Edge Function (`firework-event-handler`) に、より高度な花火生成ロジックやAI連携の機能を実装。 