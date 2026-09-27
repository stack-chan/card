# Stack-chan 名刺

React・TypeScript・Vite製の名刺エディターです。編集内容とアイコン画像はブラウザのlocalStorageに保存します。

## 開発

Node.js 22.12以上を使います。

```bash
npm ci
npm run dev
```

```bash
npm test
npm run typecheck
npm run build
npm run preview
npx playwright install chromium
npm run test:e2e
```

`src/App.tsx`が編集状態を管理し、`src/components/editor/`が入力・選択操作、`src/components/card/`が名刺のSVGを描画します。配置計算、画像の処理、書き出しは`src/lib/`にあります。表示用CSSは`src/index.css`です。

入力内容は`stackchan-card-studio:v1`、アイコンは`stackchan-card-studio:avatar:v1`に保存します。キーは公開済みの版から変更していません。画像はブラウザ内で縮小して保存します。

GitHub Actionsはmainへのpush時に型チェックとViteビルドを行い、`dist/`をGitHub Pagesへ公開します。`vite.config.ts`はPagesのサブディレクトリで使える相対アセットパスを指定しています。

コードのライセンスは`LICENSE`、依存コードとアイコンの表示は`THIRD-PARTY-NOTICES.txt`を参照してください。
