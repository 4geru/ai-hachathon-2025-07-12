はい、これまでの議論を要約し、ハッカソンプロジェクト「Sky Canvas - 傾けて描く、夏の夜空の魔法」の企画ドキュメントとしてまとめます。

---

# ハッカソン企画ドキュメント: Sky Canvas - 傾けて描く、夏の夜空の魔法

---

## 1. 企画概要

「Sky Canvas」は、夏の夜空に打ち上がる**花火**を、単なる鑑賞から**「リアルタイムで生成される自分だけの魔法のオーケストラ」**へと昇華させる、**多感覚融合**インタラクティブアートシステムです。ユーザーがスマートフォンを**傾ける**という直感的な操作をトリガーに、**大画面ディスプレイ**に鮮やかな花火が打ち上がり、**生成AI**による**ランダム性**と**遊び心**が加わることで、二度と同じ体験は訪れない、まさに**魔法**のような夏の夜空を創り出します。

---

## 2. 「そんなことできるの！？」体験ポイント

この企画の最大の魅力は、参加者が思わず「そんなことできるの！？」と驚くような以下の体験です。

* **スマホが魔法の杖に！ 直感的な操作で花火を「描く」**
    物理的な傾きという身体動作が、直接大画面のビジュアルとサウンドに繋がり、まるで魔法使いになったかのような没入感を提供します。
* **SupabaseリアルタイムDBで実現する瞬速連携！**
    スマホアプリとディスプレイアプリ間をSupabaseのリアルタイムDBで接続することで、ユーザーの操作から花火の発射までのタイムラグを極限まで削減。複数人が同時に操作しても、大画面に瞬時に反映される「同期の魔法」を体験できます。
* **生成AIとランダム性による「予測不能な美」**
    AIが傾きの情報とランダム性を組み合わせ、毎回異なる色、形、音の花火を創造します。「次は何が打ち上がるんだろう？」というワクワク感を常に提供し、一期一会の体験を生み出します。
* **多感覚融合で全身に響く「夏の魔法」**
    視覚（大画面の花火）、聴覚（AI生成の音楽）、触覚（スマホのバイブレーション ※Androidのみ）が連動し、花火の美しさと迫力を五感で感じられます。

---

## 3. システム構成

本企画は、主に「スマホ用Webアプリ」と「ディスプレイ用Webアプリ」の2つのコンポーネントで構成され、バックエンドには**SupabaseのリアルタイムDB**を活用します。

### 3.1. スマホ用アプリ (Webアプリ推奨)

* **機能:**
    * **センサー:** スマートフォンの加速度センサーやジャイロセンサー (`DeviceMotionEvent`, `DeviceOrientationEvent`) を使用し、スマホの傾きやフリックなどの特定のジェスチャーを検出。これが花火発射のトリガーとなります。
    * **Supabase連携:** 傾きが検出されると、SupabaseクライアントSDK（`@supabase/supabase-js`）を通じて、花火の発射イベントと、その花火の「Vibe」（傾きの強さや方向などから導出される色・音の傾向、AI生成のためのシード値など）に関するパラメータをSupabaseのデータベースにリアルタイムで書き込みます。
    * **触覚フィードバック:** 花火発射のタイミングで、`navigator.vibrate()` メソッドを使用し、スマートフォンを振動させます（Android端末のみ対応）。
* **開発技術:** HTML, CSS, JavaScript (React, Vue, Svelteなどのフレームワークを推奨)。

### 3.2. ディスプレイ用アプリ (Webアプリ推奨)

* **機能:**
    * **SupabaseリアルタイムDB購読:** SupabaseクライアントSDKを使用し、スマホアプリから書き込まれる`fireworks_events`テーブルの変更をリアルタイムで購読します。データがDBに挿入された瞬間にイベントを検知し、ペイロードを受け取ります。
    * **生成AI/ビジュアル生成:** 受信したパラメータ（傾きの強さ、方向、AIシードなど）と、内蔵する生成AIロジック（またはルールベースの生成アルゴリズム）に基づいて、WebGL（Three.js, p5.jsなど）を用いて大画面に花火のビジュアルを**リアルタイム**で描画します。花火の形状、色、動きのパターン、光の粒子などを動的に生成・変化させます。
    * **音楽生成:** Web Audio API を使用し、花火のビジュアルと完全に同期して、AIが生成した音色、メロディ、効果音を再生します。花火の「Vibe」に合わせた壮大で変化に富む音楽を奏でます。
* **開発技術:** HTML, CSS, JavaScript (React, Vue, Svelteなどのフレームワーク + WebGLライブラリを推奨)。

### 3.3. バックエンド (Supabase)

* **機能:**
    * **PostgreSQLデータベース:** `fireworks_events`テーブルを作成し、スマホアプリからの花火発射イベントデータを保存します。
    * **リアルタイム機能:** データベースの変更（`INSERT`イベント）を検知し、購読しているディスプレイ用アプリに瞬時に通知します。この機能が、スマホと大画面の間の「ラグのない」同期を実現する鍵となります。
    * **API:** クライアントSDKを通じてデータの読み書きを可能にするRESTful APIを提供します。

---

## 4. 開発環境とエディタの推奨

* **メインエディタ:** **Visual Studio Code (VS Code)** を強く推奨します。豊富な拡張機能、強力なデバッグ機能、Git連携が、Webフロントエンド開発の効率を最大化します。
* **AIアシスタントの併用:** CursorやClaudeのような生成AIツールを、コードの生成、アイデア出し、デバッグ支援のアシスタントとして活用することで、開発スピードとクオリティをさらに高めることができます。

---

## 5. ハッカソン「受け」を良くする工夫

ハッカソンでの高い評価を得るために、以下の点に注力します。

* **体験ファーストのデモ:** 3分間のデモでは、具体的な操作とそれによる「驚き」の体験を最優先に提示します。可能であれば、審査員に実際に操作してもらう時間を設けます。
* **圧倒的なビジュアルとサウンド:** 大画面のプロジェクターや良質なスピーカーを用意し、花火の美しさと音楽の迫力を最大限に引き出します。
* **技術的なインパクトの強調:** SupabaseリアルタイムDBによる同期の速さ、生成AIによる予測不能な花火生成など、技術的な挑戦とそれを解決した点を明確にアピールします。
* **情熱的なプレゼンテーション:** チームメンバー全員でプロジェクトへの熱意と楽しさを伝え、聴衆を巻き込むようなプレゼンを心がけます。

---

この「Sky Canvas」プロジェクトは、技術的な挑戦と、夏のシーズン感、そしてユーザーの感情に訴えかける「魔法」のような体験が融合した、ハッカソンに最適な企画です。ぜひ、このドキュメントを参考に、開発を進めてください。