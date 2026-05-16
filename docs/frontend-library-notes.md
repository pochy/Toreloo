# Frontend Library Notes

Toreloo は Express 5 + EJS + htmx 2 + Alpine.js + Tailwind CSS v4 + Basecoat で作られている。React/Vue のように大きなクライアント状態を持つより、サーバーから HTML fragment を返し、必要な DOM だけ htmx で差し替える構成になっている。

そのため、追加ライブラリは「DOM を全面的に管理するもの」より「HTML に少しだけ振る舞いを足す vanilla JS / Alpine plugin 系」が合う。参考候補に daisyUI が含まれていたが、このプロジェクトでは現状 `basecoat-css` を使っているため、daisyUI 前提の導入判断は Basecoat との重複を見て慎重に扱う。

## 現在の構成

- `src/server.js`: EJS partial を返す htmx エンドポイントが中心。
- `views/**/*.ejs`: `hx-get`, `hx-post`, `hx-patch`, `hx-target`, `hx-swap`, OOB swap を使って画面更新する。
- `src/client.js`: htmx / Alpine / SortableJS / Lucide を初期化する薄いクライアント層。
- `src/styles/input.css`: Tailwind v4 と Basecoat を import。`@source` で EJS と JS をスキャン対象にしている。
- `package.json`: 既に `alpinejs`, `htmx.org`, `sortablejs`, `basecoat-css`, `lucide`, `clsx`, `tailwind-merge` が入っている。

## 既に満たしているもの

- **SortableJS**: リストとカードのドラッグ移動で使用済み。追加不要。
- **HTMX**: CRUD 操作、フィルタ、カード詳細更新で使用済み。
- **Alpine.js**: 作成ダイアログ、フィルタパネルなどの局所状態で使用済み。
- **Lucide**: アイコン描画で使用済み。
- **Tailwind class 整理系**: 実行時には `clsx` と `tailwind-merge` が入っているが、Prettier の Tailwind class 並び替えは未導入。

## Basecoat と daisyUI の位置づけ

Toreloo は既に `basecoat-css` を採用している。`src/styles/input.css` では CSS を import し、`src/client.js` では `basecoat-css/all` を読み込んでいるため、Basecoat の CSS と必要な JavaScript が現在の UI の土台になっている。

参考候補には daisyUI もあるが、このプロジェクトでは基本的に Basecoat を継続するのが自然。どちらも Tailwind 上で `btn`, `card`, `input` のような component class を提供する方向なので、併用するとクラス名、CSS 変数、デザイン思想が混ざりやすい。

| 構成 | 向いている用途 | Toreloo での扱い |
| --- | --- | --- |
| HTMX + Alpine.js + Tailwind + Basecoat | shadcn/ui 風の落ち着いた SaaS / 管理画面 UI | 現在の採用構成 |
| HTMX + Tailwind + Basecoat | Alpine を最小限にして HTML 中心で作る | 将来的な簡素化候補 |
| HTMX + Alpine.js + Tailwind + daisyUI | テーマ豊富で速く CRUD / 社内ツールを作る | 新規プロジェクトなら候補 |
| HTMX + Tailwind + daisyUI | Bootstrap 的に class だけで量産する | Toreloo では Basecoat と競合しやすい |

ざっくり言うと、Basecoat は「React なしで shadcn/ui っぽい見た目を使う」方向、daisyUI は「テーマと部品が豊富な Tailwind component class 集」方向。Toreloo は Trello 風の操作感を持つローカル SaaS 風 UI なので、Basecoat の落ち着いた見た目と相性が良い。

### Basecoat の良いところ

- EJS partial に `btn`, `btn-outline`, `dialog`, `form` などの class をそのまま書ける。
- htmx で返す HTML fragment でも、React component 化せず同じ見た目を維持できる。
- Tailwind の長い utility class を減らしつつ、必要な箇所では utility class で細かく調整できる。
- shadcn/ui / Radix UI っぽい、落ち着いた管理画面向けの見た目に寄せやすい。

既に Toreloo では次のような Basecoat class を使っている。

```html
<button class="btn">作成</button>
<button class="btn-outline">キャンセル</button>
<button class="btn-ghost size-9 p-0">...</button>
<dialog class="dialog">...</dialog>
<form class="form grid gap-4">...</form>
```

### daisyUI との違い

| 比較 | daisyUI | Basecoat |
| --- | --- | --- |
| 雰囲気 | ポップ、テーマ豊富、Bootstrap 的 | shadcn/ui 風、落ち着いた SaaS 風 |
| JS | 基本不要 | 一部コンポーネントで必要 |
| HTMX との相性 | 良い | 良い |
| Alpine.js との相性 | 良い | 良いが、一部は Basecoat 側 JS と役割が重なる |
| 管理画面量産 | 強い | 強い |
| 独自デザイン化 | daisyUI テーマに寄りやすい | CSS 変数と Tailwind で寄せやすい |
| 成熟度 | 高い | 比較的新しい |

Toreloo では「Basecoat を daisyUI の代替として使う」方針にする。daisyUI を追加する場合は、Basecoat を外すか、少なくとも component class の責務を明確に分ける必要がある。

### Alpine.js との役割分担

Basecoat 側に Dropdown、Select、Tabs、Toast などの JavaScript 付きコンポーネントがある場合、同じ部品を Alpine でも管理すると二重管理になりやすい。

Toreloo では Alpine を次の用途に絞るのが良い。

```txt
- 作成ダイアログの mode 切り替え
- フィルタパネルの開閉
- 小さな x-show / x-bind
- localStorage / persist 連携
- HTMX イベントとの橋渡し
- Basecoat が持たない独自 UI 状態
```

Basecoat が提供する Dropdown、Tabs、Toast などを使う場合は、Basecoat 側に任せ、Alpine は周辺状態だけを扱う。

### Toast は Basecoat 優先で検討

前段では `toastify-js` を候補にしているが、Basecoat を継続するなら、まず Basecoat の Toast を確認する方が一貫性が高い。HTMX のレスポンスで toast HTML を `#toaster` に追加する設計は、このアプリと相性が良い。

例:

```html
<div id="toaster" class="toaster"></div>

<form hx-post="/cards" hx-target="#toaster" hx-swap="beforeend">
  <input name="title" class="input" />
  <button class="btn">作成</button>
</form>
```

ただし、既存画面に通知領域はまだないため、実装時は layout に `#toaster` を追加し、サーバー側で toast partial を返す設計にする。

### Toreloo での判断

```txt
Basecoat:
採用継続。Toreloo の UI トーンに合っている。

daisyUI:
今のプロジェクトには追加しない。新規プロジェクトやテーマ重視の別アプリなら候補。

Alpine.js:
残す。ただし Basecoat の JS コンポーネントと責務を重ねない。
```

## まず検討したい追加候補

### @alpinejs/focus

カード詳細、作成ダイアログ、ショートカットダイアログがあるため相性が良い。現在は native `<dialog>` と手動 focus で動いているが、focus trap や戻り先管理を安定させるなら優先度は高い。

候補:

```bash
npm install @alpinejs/focus
```

### @alpinejs/persist

`filterOpen`、最後に選んだ作成モード、将来的な表示設定の保持に使える。ただし、検索条件そのものは URL query とサーバー側 model で扱う方が htmx らしい。永続化対象は「UI 状態」に限定するのが良さそう。

候補:

```bash
npm install @alpinejs/persist
```

### @alpinejs/collapse

フィルタパネル、チェックリスト、詳細セクションを折りたたむ UI を増やすなら有効。現状は大きな accordion がないため、すぐには必須ではない。

候補:

```bash
npm install @alpinejs/collapse
```

### @tailwindcss/forms

このプロジェクトは Basecoat の form スタイルを使っているため、Tailwind Forms は無条件には入れない方が良い。Basecoat の見た目と競合しないか確認してから採用する。

候補:

```bash
npm install -D @tailwindcss/forms
```

### prettier-plugin-tailwindcss

EJS 内の class が多いため、導入効果は高い。実行時の挙動に影響しにくいので、まず入れる dev dependency としては安全。

候補:

```bash
npm install -D prettier-plugin-tailwindcss
```

## HTMX 拡張の候補

### response-targets

今はエラー時も通常の Express error handler に流れる設計。将来的にフォームバリデーションを強化して、422 のときだけフォーム領域にエラー partial を差し戻すなら有用。

使いどころ:

- カード作成のバリデーションエラーを作成ダイアログ内に返す。
- カード詳細の保存エラーをモーダル内に返す。
- 500 系だけ共通通知領域へ出す。

### loading-states

フォーム送信中にボタン disable、spinner 表示、リスト更新中の opacity 変更を属性中心で書ける。Toreloo は操作頻度が高い UI なので、体感品質を上げるなら優先度は高い。

### idiomorph

カード詳細モーダルやリスト全体の `outerHTML` 差し替えで、既存 DOM、focus、局所状態をなるべく残したい場合に候補になる。現状は差し替え後に `htmx:afterSwap` で icon / Sortable / dialog を再初期化しているため、必要性が出てからで良い。

## UI 補助系

### flatpickr

カード詳細の `startAt` / `dueAt` は現在 native `input[type="date"]`。ローカルアプリならまず native のままで十分。日時、範囲選択、表示形式の統一が必要になったら導入する。

### Tom Select

ラベル、メンバー、追加先リストの選択肢が増えるなら有用。現状データ量では native select / checkbox で十分だが、Trello 風の検索可能な multi select に寄せるなら検討する。

### Toastify JS

保存成功、削除完了、通信失敗の通知を出すなら導入価値がある。ただし Toreloo は Basecoat 採用済みなので、まず Basecoat の Toast を優先して検討する。Toastify JS は Basecoat Toast では足りない場合の代替候補に留める。

### tinykeys

現在は `document.addEventListener("keydown", ...)` でショートカットを手書きしている。ショートカット数が増えたら `tinykeys` に寄せると管理しやすい。今の4キー程度なら手書きでも問題ない。

## 検索・テーブル・チャート

### Fuse.js

現状のフィルタは htmx でサーバーに問い合わせる設計。データソースが `data/boards.json` で小さいためクライアント検索もできるが、URL query とサーバー model に寄せた今の設計の方が画面再読み込みにも強い。導入するなら「ショートカット用のクイックジャンプ検索」など局所用途が良い。

### simple-datatables / Grid.js

Kanban UI が中心で、表 UI はまだないため不要。

### Chart.js / uPlot

ボード統計をグラフ表示する要件が出るまで不要。

## ブラウザ保存・オフライン補助

### idb-keyval

コメントや説明の下書き保存、未送信フォームの復元に使える。ただし、現在の永続化はサーバー側 JSON が単一の正であるため、IndexedDB は「下書き」「一時キャッシュ」に限定する。

### Dexie.js

複数テーブルの offline-first アプリに寄せるなら候補。ただし Toreloo の現在スコープには大きすぎる。

## Node / スクリプト側

### p-limit

現在はローカル JSON に対する読み書きが中心で、並列制御を追加する場面は少ない。将来的に import/export、外部同期、添付ファイル処理を入れるなら候補。

### ofetch / ufo / defu / consola

外部 API 連携や設定ファイルを増やすまでは不要。ログ整形で `consola` は使いやすいが、今の Express アプリでは標準 `console` でも足りる。

### tsx / globby

TypeScript 化やデータメンテナンス用スクリプトを増やすなら便利。現在は ESM JavaScript なので、すぐには不要。

## Toreloo 向けの実用セット案

最初に入れるなら、実行時依存は絞る。

```bash
npm install @alpinejs/focus @alpinejs/persist
npm install -D prettier-plugin-tailwindcss
```

次点:

```bash
npm install @alpinejs/collapse @alpinejs/mask tinykeys
```

要件が出てから:

```bash
npm install flatpickr tom-select fuse.js idb-keyval @floating-ui/dom
```

今すぐ不要:

```txt
simple-datatables
Grid.js
Chart.js
uPlot
Dexie.js
Comlink
FilePond
browser-image-compression
```

## 方針メモ

- htmx のサーバー返却 HTML を中心に保つ。
- Alpine はページ全体の状態管理ではなく、dialog、panel、toggle、focus など局所 UI に使う。
- Basecoat と重複する CSS plugin は慎重に入れる。
- SortableJS は既に採用済みなので、そのまま活かす。
- 検索、ページング、ソートはデータ量が増えるほど htmx + サーバー処理を優先する。
- 通信中状態、成功/失敗通知、focus 管理はこのアプリの体感品質に直結するため、優先的に整える価値がある。
