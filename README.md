# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## 役割
とりまとめ：西浦　　UI：岡政　　機能：西川

## アプリ概要
「就活の企業情報とスケジュールを一元管理できるアプリ」
- useStateによるデータ管理→企業情報や予定を管理
- localStorageによるデータ保存→入力したデータをブラウザ内に保存
- 企業管理機能（企業名・進捗・メモ）
- カレンダー機能
- 締切・予定追加機能
- 編集・削除機能

## 改善内容
- 締切・予定の時間を指定できるようにし、カレンダーに表示されるようにした。
- 奇数年が表示できてなかったので、表示されるようにした。
## 担当箇所
- 
## GitHubをどのように利用したか
- プルリクエストを用いてマージした

## 生成AIをどのように利用したか
- 奇数年が表示されない理由を聞き、直してもらった。

## 工夫した点

## 難しかった点
- 書き直したい部分を見つけるのに時間がかかった。

## 今後の改善点
- 進捗を記入する段階で日付を入力できるようにする
