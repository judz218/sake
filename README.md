# 酒跡（さけあと / sakeato） — 発表用の静的デモ

React・TypeScript・Vite・D3・Tailwind CSSで構成した日本酒記録アプリです。ExpressやSQLiteを起動せず、Netlifyなどの静的ホスティングで動作します。追加ライブラリを使わず、ブラウザ標準のIndexedDBに保存します。

初回アクセスで架空の30銘柄・40飲酒記録を投入します。銘柄・酒蔵・公式説明・公式座標・飲酒体験はすべて創作です。画面にも「デモ · すべて架空」と表示します。

## 起動とビルド

Node.js 22 LTS・npmを使用します。Windows PowerShellでは実行ポリシーに影響されない `npm.cmd` が使えます。他の環境では `npm` に読み替えてください。

```powershell
npm.cmd ci
npm.cmd run dev
```

http://localhost:5173 を開きます。Viteのみが起動し、APIプロキシはありません。

```powershell
npm.cmd run build
npm.cmd run preview
```

ビルド成果物は `dist/`、プレビューは http://localhost:4173 。`npm.cmd start` も同じ静的プレビューです。`dist/index.html` を直接ファイルとして開かず、HTTPサーバーから配信してください。

iPhoneで確認する場合はPCと同じWi-Fiに接続し、`ipconfig` でWi-FiのIPv4アドレスを確認して `http://<PCのIP>:5173` にアクセスします。WindowsファイアウォールはプライベートネットワークでTCP 5173のみ許可してください。プレビューを使う場合は4173です。PCとiPhoneの保存データは独立しています。

## Netlifyの設定

リポジトリをNetlifyに接続し、次を指定します。ルートの `netlify.toml` に同じ設定を含めています。

| 項目 | 設定 |
| --- | --- |
| Base directory | リポジトリのルート（空欄） |
| Build command | `npm run build` |
| Publish directory | `dist` |
| Node.js | `22` |
| 環境変数・APIキー | 不要 |
| Functions・DB・認証 | 使用しない |

Git経由のビルド、またはローカルでビルドした `dist/` の手動アップロードで配信できます。`server/` や `data/*.sqlite` は公開しません。SPA用の200リライトと `index.html` の再検証用キャッシュ設定も含めています。[Netlify公式：ファイルによる設定](https://docs.netlify.com/build/configure-builds/file-based-configuration/)

Netlifyのアカウントへの接続・実際のデプロイは行っていません。配信後は公開URLをSafariなどで開き、40件の初期表示を確認してください。別の公開ドメイン、Deploy Preview、ローカルプレビューはそれぞれ別の保存領域になります。

## 保存とリセット

- 各ブラウザ・端末・オリジンごとに独立して保存します。サーバーへ飲酒記録を送信しません。
- 初回のデータと投入済みフラグを1つのIndexedDBトランザクションで保存します。複数タブから初期化しても重複しません。再読み込みで編集や削除を上書きしません。
- データの追加・編集・削除と味覚マップのドラッグ編集は、その都度IndexedDBへ保存します。参照されている銘柄は削除できません。新しい銘柄と飲酒記録は一括で保存し、途中で失敗したら両方とも戻します。
- 主要画面下部の「デモデータ → デモを初期状態に戻す」で、確認後に30銘柄・40記録へ戻せます。そのブラウザでの追加・編集・削除も破棄します。リセットもトランザクション単位で行います。
- サイトデータの削除、プライベートブラウズの終了、ブラウザの容量管理などで消失する場合があります。発表用であり長期保存には向きません。複数タブで同時編集する場合は、操作前に再読み込みしてください。
- IndexedDBが利用できない・容量不足・書き込み失敗の場合はエラーを表示します。フォーム内容を保持し、マップ保存失敗時は元の座標に戻します。

## 機能

日本酒・飲酒記録の登録／編集／削除、2ステップ入力、履歴・詳細・同銘柄の過去記録、基本分析に対応します。甘辛・濃淡・星の未評価はnullのまま保存します。

- マップ：タブを置かずD3散布図を直接表示します。カード左上に件数、右上に「編集」。通常はノードタップで詳細へ進み、編集中のみドラッグでき、終了時に自動保存します。
- 飲酒記録詳細：味わい・タグ・省略しないメモの下に、同じ記録と公式情報の2点散布図を表示します。深緑の円が自分、金茶の四角が公式。甘辛は左が甘口、濃淡は上が濃醇で、どちらも0〜100。重なる位置でも四角の輪郭が残り、数値表と比較コメントも表示します。片軸や未評価は推測せず登録済みの数値だけを示し、公式座標がない場合はチャートを出しません。出典・根拠・架空情報の表示は維持。マップと履歴から同じ詳細を開き、戻るボタンは遷移元に戻ります。
- 分析：冒頭に4領域の平均星評価・件数と好みの説明を表示します。集計処理は従来のまま、未評価を除外し、少ない記録や件数の偏りでは断定しません。合計、星の分布、味わいの平均、高評価の記録、特定名称・産地の集計も維持します。

## 構成と将来の移行

```text
src/
  data/
    repository.ts           IndexedDB接続・初期化・CRUD・リセット
    seed.ts                 架空JSONから既存データ形式へのマッピング
    validation.ts           ブラウザでの入力検証
    seed.test.ts            マッピング・検証テスト
  main.tsx                  共通画面・履歴・詳細・リセットUI
  Form.tsx                  記録入力・日本酒編集
  Map.tsx                   マップ画面（散布図を直接表示）
  PersonalTasteMap.tsx      散布図・編集操作
  OfficialComparisonChart.tsx 詳細内の2点比較散布図
  RecordDetail.tsx          味わい・メモ・公式比較を統合した詳細
  PreferenceChart.tsx       分析画面の領域別平均
  tasteAnalysis.ts          集計・差分判定
  api.ts                    旧HTTPヘルパー（現在は未使用）
demo/sake_demo_40.json       初期データ（すべて架空）
tests/map-edit.browser.mjs   静的配信と実IndexedDBのブラウザテスト
netlify.toml                静的ホスティング設定
server/                     旧Express・SQLiteコード（通常起動では未使用）
data/                       既存SQLiteと元JSON（変更せず保持・公開対象外）
docs/legacy-sqlite.md        移行前のREADMEを保管
```

画面は `repository` の `listData`、`createEntry`、`createSake/updateSake/deleteSake`、`createRecord/updateRecord/deleteRecord`、`resetDemo` を使います。ReactからIndexedDBやSQLを直接扱いません。将来Supabaseへ移る際は、このデータアクセス層で認証・所有者・クラウドのCRUDを実装します。今回、それらの機能や過剰な抽象化は追加していません。

IndexedDB名は `sake-notebook-presentation`、バージョンは1。`sakes`、`records`、`meta` の3ストアで、`records.sakeId` で商品と飲酒体験を関連付けます。SQLiteは接続も移行もせず保持します。既存のサーバー依存パッケージは旧コードを残すため維持していますが、フロントエンドのバンドル・通常の起動経路には入りません。

## 検証

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run test:map
```

`test` はマッピング・入力検証・可視化集計と表示を検証します。`test:map` はWindows Edgeを非表示・独立プロファイルで起動し、静的ファイルだけを配信して実IndexedDBを使います。Edgeが標準位置と違う場合は `EDGE_PATH` を指定してください。通常用・デモ用SQLiteを開きません。初回投入、重複防止、リセット確認、CRUD・参照整合性・途中失敗の復元・再読み込み保持、マップ編集、チャート、空状態、375/390/430pxを検証します。Safari実機とNetlify公開URLでの最終確認は別途必要です。

移行時の確認結果：7件のテスト、TypeScript型チェック、本番ビルドが成功。上記ブラウザテストも成功し、APIへのリクエストは0件でした。初回30銘柄・40記録、再読み込み後の保持、リセットの取消／実行、新規銘柄と記録の保存失敗時に両方が戻ることも確認しています。

画面統合後も7件のテスト・型チェック・ビルド・ブラウザテストが成功。マップからの詳細と履歴からの詳細の内容一致、遷移元への戻り、2点比較と欠損座標の扱い、公式出典、分析冒頭の領域別平均、375/390/430pxを検証しています。銘柄／飲酒記録の選択UI、マップ内3タブ、2本の横棒比較UIは削除しました。保存層・デモJSON・Netlify設定は変更していません。実際の利用データの初期化・削除は行っていません。

旧SQLite版のAPI確認は `npm.cmd run legacy:api`、旧テストは `npm.cmd run test:legacy` です。現在の画面は旧APIを使いません。旧デモ初期化コマンドは `legacy:demo:init`、再生成は `legacy:demo:reset` に変更しています。これらを静的版の運用で実行する必要はありません。

認証、クラウドDB、通常／デモ切り替え、同期、JSON入出力、Netlify Functionsは実装していません。
