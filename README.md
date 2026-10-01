# umikke

## 概要
海況データ（水温・クロロフィル・流向流速）および環境DNA（eDNA）を用いた魚種分布予測をGoogle Maps上に可視化するフロントエンドアプリケーションです。

## 主な機能
提供されたソースコードより、以下の機能が実装されています。

* **海況データの可視化**: 取得した水温（SST）およびクロロフィル濃度のデータをGoogle Mapsのヒートマップとして描画します。
* **流向・流速ベクトル表示**: 海流の向きと速さを計算し、マップ上に矢印マーカーで可視化します。
* **魚種（eDNA）予測ヒートマップ**: 選択したターゲット魚種（イワシ・カタクチ、伊勢エビ・エビ、ブリ・ワラサ・ハマチなど）の分布予測スコアをヒートマップで表示します。
* **タイムライン・カレンダー操作**: 画面下部のタイムラインバーから日付を選択し、指定した日の予測・観測データを表示します。
* **漁場サジェストマーカー**: 環境データに基づいて算出されたおすすめのポイント（Hotpoint）をマップ上に表示し、クリックで詳細なスコアや提案を確認できます。
* **ユーザー機能**: アカウントの登録、ログイン機能、プロフィール（ユーザー名、ターゲット魚種）の保存、およびマップテーマ（rainbow、colorblind等）のカスタマイズが可能です。

## 技術スタック
* **フレームワーク**: Next.js, React[cite: 1]
* **言語**: TypeScript[cite: 1]
* **地図API**: Google Maps JavaScript API

## ディレクトリ構成
本リポジトリの構成は以下の通りです。

* **`.github/workflows/`**: GitHub Actions等のCI/CDワークフロー設定ファイルが含まれます[cite: 1]。
* **`public/`**: サイトロゴなどの静的アセットファイルが配置されています[cite: 1]。
* **`src/app/`**: Next.jsのアプリケーションのメインソースコードが格納されています[cite: 1]。
  * **`components/`**: 画面を構成するUIコンポーネント群です[cite: 2]。
    * `LoginModal.tsx`: ログインおよび新規登録用モーダル[cite: 3]
    * `MapControls.tsx`: 現在地へのジャンプやズーム等のマップ操作コントロール[cite: 3]
    * `RightSidebar.tsx`: 海況データや魚種データのレイヤー切り替えサイドバー[cite: 3]
    * `TimelineBar.tsx`: 日付選択・タイムライン操作UI[cite: 3]
    * `TopRightMenu.tsx`: 画面右上のアカウントメニューボタン等[cite: 3]
    * `WindyMenu.tsx`: テーマ設定やアカウント削除等を行うマイページメニュー[cite: 3]
  * **`hooks/`**: コンポーネントからロジックを分離したカスタムフックです[cite: 2]。
    * `useMapLayers.ts`: マップレイヤーの制御・更新ロジック[cite: 4]
    * `useOceanData.ts`: バックエンドAPIからの海況データフェッチロジック[cite: 4]
  * **`types/`**: アプリケーション全体で使用する型定義ファイルです[cite: 2]。
    * `google-maps.ts`: Google Mapsのインスタンスやレイヤーに関するインターフェース定義[cite: 5]
  * `globals.css`: アプリケーションのグローバルスタイル定義[cite: 2]
  * `layout.tsx`: Next.jsの全体レイアウトファイル[cite: 2]
  * `page.tsx`: ヒートマップやメインUIを統合するトップページ[cite: 2]
* **`eslint.config.mjs`**: ESLintのルール設定ファイルです[cite: 1]。
* **`next.config.ts`**: Next.jsの動作設定ファイルです[cite: 1]。
* **`package.json` / `package-lock.json`**: プロジェクトの依存関係パッケージを管理します[cite: 1]。
* **`postcss.config.mjs`**: CSS変換ツールの設定ファイルです[cite: 1]。
* **`tsconfig.json`**: TypeScriptのコンパイル設定ファイルです[cite: 1]。

## 実行要件
ローカル環境で動作させる場合、以下の環境変数が必要です。
* `NEXT_PUBLIC_API_BASE_URL`: バックエンドAPIサーバーのURL
* `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: Maps JavaScript APIが有効化されたGoogle CloudのAPIキー
