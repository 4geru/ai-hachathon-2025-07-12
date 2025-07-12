# Marpプレゼンテーション使用方法

## 🎯 必要な準備

### 1. VS Code拡張機能のインストール
```bash
# Marp for VS Code拡張機能をインストール
code --install-extension marp-team.marp-vscode
```

### 2. VS Code設定
プロジェクトの`.vscode/settings.json`に以下の設定が必要です：

```json
{
  "markdown.marp.enableHtml": true,
  "markdown.marp.breaks": "on",
  "markdown.marp.pdf.noteAnnotations": true,
  "markdown.marp.themes": []
}
```

### 3. プレビューセキュリティ設定
1. VS Codeで `Ctrl+Shift+P` (macOS: `Cmd+Shift+P`)
2. "Markdown: Change Preview Security Settings" を選択
3. "Disable" を選択

## 🎨 Mermaidダイアグラムの使用方法

### 基本的な書き方
```html
<div class="mermaid">
graph TD
    A[ノード1] --> B[ノード2]
</div>
```

### 対応しているMermaidダイアグラム
- **フローチャート**: `flowchart`, `graph`
- **シーケンス図**: `sequenceDiagram`
- **ガントチャート**: `gantt`
- **クラス図**: `classDiagram`
- **状態遷移図**: `stateDiagram`

## 🚀 プレゼンテーションの実行

### 1. プレビュー表示
- VS Codeで `docs/11-marp-presentation.md` を開く
- 右上の "Open Preview" アイコンをクリック
- または `Ctrl+Shift+V` (macOS: `Cmd+Shift+V`)

### 2. PDF出力
- コマンドパレットで "Marp: Export Slide Deck..."
- 出力形式を選択 (PDF, HTML, PPTX)

### 3. プレゼンテーション実行
- HTMLエクスポート後、ブラウザで開く
- フルスクリーンモードで表示

## 🎆 特別な機能

### インタラクティブ花火
- **ライブデモスライド**: クリックで花火を発射
- **フィナーレ演出**: 自動的に連続花火を表示

### Mermaidダイアグラム
- **ダークテーマ**: 暗い背景に最適化
- **レスポンシブ**: 画面サイズに自動調整
- **カスタムスタイル**: プロジェクトに合わせた色調

## 🔧 トラブルシューティング

### Mermaidが表示されない場合
1. HTMLが有効になっているか確認
2. プレビューセキュリティが無効になっているか確認
3. インターネット接続を確認（CDNから読み込み）

### 花火が動作しない場合
1. ブラウザのJavaScriptが有効か確認
2. p5.jsライブラリの読み込みを確認
3. コンソールエラーを確認

## 📝 カスタマイズ方法

### テーマの変更
```yaml
---
marp: true
theme: gaia  # default, uncover, gaia
class: invert
---
```

### カスタムスタイル
```yaml
style: |
  .mermaid {
    background: #1a1a1a;
    color: white;
  }
```

Happy Presenting! 🎉 