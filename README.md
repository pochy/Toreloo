# Toreloo

Toreloo は、ローカルで使う Trello 風の Kanban ボードアプリです。認証や外部同期は持たず、ボード、リスト、カードを `data/boards.json` に保存します。

## 主な機能

- ボード、リスト、カードの Kanban スタイル表示
- 横スクロールするリストレイアウト
- リストとカードのドラッグ移動
- カード詳細ダイアログ
- ラベル、メンバー、開始日、期限、完了状態
- チェックリスト、コメント、添付 URL
- キーワード、ラベル、メンバー、期限、状態によるフィルタ
- ボード背景色とカードカバー色の変更
- キーボードショートカット

## 技術構成

- Node.js
- Express 5
- EJS
- htmx 2
- Alpine.js
- Tailwind CSS v4
- Basecoat
- SortableJS
- Lucide icons

## セットアップ

依存関係をインストールします。

```bash
npm install
```

CSS とクライアント JavaScript をビルドします。

```bash
npm run build
```

ローカルサーバーを起動します。

```bash
npm start
```

標準では `http://localhost:3000` で起動します。

開発時は CSS、JavaScript、サーバーを watch できます。

```bash
npm run dev
```

## データ保存

アプリの状態は `data/boards.json` に保存されます。保存処理は一時ファイルを書き出してから rename することで、途中で書き込みが壊れにくい形にしています。

`public/assets/` はビルド生成物です。新しい環境で使う場合は `npm run build` を実行してください。

## テスト

ビルド確認:

```bash
npm run build
```

ユニットテスト:

```bash
npm test
```

## 注意事項

- ローカル利用前提のため、ログイン、認証、認可はありません。
- 添付はファイルアップロードではなく、URL と表示名のメタデータとして扱います。
- Trello の商標やロゴは使用していません。Trello-inspired な操作感を目指した別アプリです。
