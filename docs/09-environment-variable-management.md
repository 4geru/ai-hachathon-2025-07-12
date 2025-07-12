# 環境変数の管理方法

このドキュメントでは、Supabaseプロジェクトにおける環境変数の管理方法について説明します。

## 1. 環境変数の定義

Next.jsアプリケーションでは、`NEXT_PUBLIC_` プレフィックスを付けた環境変数を `.env.local` ファイルに定義することで、クライアントサイドから参照できるようになります。

**`frontend/.env.local` ファイルの例:**

```
NEXT_PUBLIC_SUPABASE_URL="https://your-supabase-url.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
```

- `NEXT_PUBLIC_SUPABASE_URL`: SupabaseプロジェクトのURLを指定します。
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabaseプロジェクトの匿名APIキーを指定します。

`.env.local` ファイルはGitの管理下に置かないように、`.gitignore` に追加することをお勧めします。

## 2. アプリケーションでの参照

アプリケーションコードでは、`process.env` オブジェクトを通じて環境変数を参照します。

**`frontend/utils/supabase.ts` での参照例:**

```typescript
import { createClient } from '@supabase/supabase-js'
import { Database } from '../lib/database.types'

export const supabase = createClient<
  Database,
  'public',
  Database['public']
>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

このようにすることで、開発環境と本番環境で異なるSupabaseのエンドポイントを使用する際に、コードを変更することなく対応できます。

## 3. デプロイ環境での設定

Vercelなどのデプロイサービスを使用する場合、環境変数はそれぞれのサービスのダッシュボードで設定します。

**Vercelの場合:**

1. Vercelのプロジェクトダッシュボードに移動します。
2. 「Settings」タブをクリックし、「Environment Variables」を選択します。
3. ここで `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` を追加し、それぞれの値を設定します。

これにより、デプロイされたアプリケーションは、Vercelに設定された環境変数を使用してSupabaseに接続します。 