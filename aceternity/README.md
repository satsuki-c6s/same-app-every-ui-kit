# Aceternity UI — 実測メモ (第11回・演出回・比較表外)

第11回で使った実装です。**このフォルダには Aceternity UI の部品ソースが入っていません。**
先にその理由から書きます。

## この回のいちばん大事な話: 無料でも、OSS ではない

Aceternity UI の部品は無料でコピーして使えますが、**OSS ライセンスではありません**。
公式の[ライセンス](https://ui.aceternity.com/licence)は独自の商用ライセンスで、

- 成果物 (アプリ・サイト) に使うのは個人でも商用でも可
- **ソースファイルとしての再配布は不可**
- テーマ・テンプレートとして公開配布するのも不可

と定めています。このシリーズのリポジトリは Public なので、
**取り込んだ部品ソースを置いた時点で再配布になってしまいます**。
そのため `src/components/ui/` を `.gitignore` で除外しました。
第8回の Magic UI (本体 MIT・全部品コミット済み) と、ちょうど正反対の扱いです。

GitHub には `manuarora700/ui.aceternity` というリポジトリがありますが、
**license 表記が無く、2024年1月から更新されていません** (2026-08-04 に API で確認)。
部品の正本はサイトの registry です。

### 手元で再現する方法

部品は registry から誰でも取得できます (取得して**自分のプロジェクトで使う**のは公式の配布方法そのもの):

```bash
# 例: meteors を取得して src/components/ui/ に展開する
curl -s https://ui.aceternity.com/registry/meteors.json
```

このデモが使った9部品: `meteors` `background-beams` `aurora-background`
`text-generate-effect` `typewriter-effect` `moving-border` `infinite-moving-cards`
`3d-card` `animated-tooltip`

- 測定日: 2026-08-04 / 事前登録: [PREREG.md](../PREREG.md) v2
- 生の測定値: [result.json](./result.json)

---

## 30秒まとめ

- **共通デモの比較表には入れない** — 第8回 Magic UI と同じ演出枠。表もタブも比較にならない
- **部品ページは147件** (sitemap 実測。無料と All-Access 込み)
- **自作 196 行 + 取り込み 1,005 行 (9部品)** — 配り方は shadcn / Magic UI と同じコピー方式
- **でもそのコピーを公開リポジトリに置けない** — ここが Magic UI との決定的な差
- 有料は Annual $169/年・Lifetime $199 買い切り (定価表示からの値引き表示・2026-08-04 時点)。中身は 200+ Blocks と 12+ テンプレート
- 保守性の物差し (スター・コミット・issue) は**公式 OSS リポジトリが無いので使えない**

---

## 実測 (2026-08-04)

| 項目 | 値 |
|---|---|
| 部品ページ数 | **147** (sitemap.xml の `/components/` 配下。無料/有料込み) |
| 自作行数 | 196 (演出デモの画面) |
| **取り込み行数** | **1,005** (9部品ぶん) |
| JS 転送量 (gzip) | 120.89 kB |
| CSS 転送量 (gzip) | 6.50 kB |
| 依存パッケージ (dep + dev) | 5 + 9 |
| スター数 / コミット / issue | **計測不能** (公式 OSS リポジトリが無い) |

無料部品だけの正確な内訳は、ページ表記から機械的に判別できませんでした。
数えられたのは「部品ページの総数」までです (数えられない、も記録します)。

## 有料版 (転記・2026-08-04)

| | 内容 |
|---|---|
| 無料 | 部品のコピーと利用は個人・商用とも可。**ただし OSS ライセンスではない** |
| Annual Access | **$169/年** (定価表示 $249 の値引き表示) |
| Lifetime Access | **$199 買い切り** (定価表示 $299 の値引き表示・最人気表示) |
| 中身 | 200+ の premium Blocks / 12+ テンプレート / 更新・サポート |

Magic UI が「本体 MIT + 別売テンプレ $199」だったのに対し、Aceternity は
**本体の無料部品も独自ライセンス**です。「無料か有料か」の線と別に、
**「自由に再配布できるか」の線**が引かれていることが、この2回を並べると見えます。

## 動きは録画で見せました

演出は静止画では止まって見えるため、1920×1080 で 5.9 秒の録画を撮って動画に差し込みました。
録画には、流れるカード・流れ星・オーロラ背景・光線・枠が走るボタン・
マウス追従の3Dカード・1文字ずつ出るタイプライターが写っています。

## つまずいた点 (全部実際に踏んだ)

- **Tailwind v4 の自動ソース検出は .gitignore を尊重する。** 部品ディレクトリを
  gitignore したらクラスが生成されず、演出が全部止まった。`@source "./components/ui"` で解決
- **dark: 変種は v4 既定 (media 戦略) では効かない。** `@custom-variant dark` で class 戦略へ
- **TypewriterEffectSmooth は headless 録画で whileInView が発火しない。** 通常版で代替
- **React 19 の型では `useRef()` が通らない。** moving-border の1箇所だけ `useRef(null)` に修正
  (それ以外の部品ソースは無改変)

## 動かし方

```bash
cd aceternity
# 部品ソースは含まれていないので、先に registry から9部品を取得して
# src/components/ui/ に展開する (上記「手元で再現する方法」)
npm install
npm run dev
```
