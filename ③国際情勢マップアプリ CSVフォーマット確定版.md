# 国際情勢マップアプリ CSVフォーマット確定版

## 1. この資料の目的
この資料は、**国際情勢マップアプリで使うニュースデータのCSV形式を確定するための実務用ルール**です。  
この形式にそろえておけば、今後ChatGPTにコード作成を依頼するときも話が早くなります。

このCSVは、まずは **MVP（最小完成版）** のための形式です。  
将来的に項目を増やすことはできますが、最初はこの形で固定して進めるのがおすすめです。

---

## 2. 基本ルール

### 2-1. 1行 = 1つの出来事
1つのニュース、または1つのトピックを1行で管理します。

### 2-2. 国の管理は国名ではなくISO3コード
国名は表示用です。  
内部で照合する主キーは **`country_iso3`** にします。

例
- 日本 → `JPN`
- アメリカ → `USA`
- 中国 → `CHN`
- ロシア → `RUS`

### 2-3. 文字コードはUTF-8推奨
日本語が入るので、CSV保存時は **UTF-8** を推奨します。

### 2-4. 日付形式は固定
日付は必ず **`YYYY-MM-DD`** 形式にします。

例
- 2026-03-15
- 2026-02-28

### 2-5. 列名は途中で変えない
列名を変えると、読み込みコードも全部修正が必要になります。  
最初に確定したら、基本的には固定してください。

---

## 3. 採用する列一覧（MVP確定版）

下記の13列を採用します。

```csv
id,country_iso3,country_name,title,summary,detail,related_countries,impact_summary,category,event_date,source_name,source_url,importance
```

---

## 4. 各列の意味

| 列名 | 必須 | 内容 | 例 | 備考 |
|---|---:|---|---|---|
| id | ○ | 一意のID | 1 | 重複しない番号 |
| country_iso3 | ○ | 対象国のISO3コード | JPN | 地図との照合に使う最重要列 |
| country_name | ○ | 表示用の国名 | 日本 | 画面表示用 |
| title | ○ | 出来事タイトル | 中国軍機の活動 | 一目で内容がわかる短い見出し |
| summary | ○ | 短い概略 | 日本周辺で中国軍機の活動が確認された | 最も重要な説明文 |
| detail |  | 詳細説明 | 東シナ海周辺で活動が活発化 | 長め説明。空でも可 |
| related_countries |  | 関係国 | CHN;USA | 複数ある場合はセミコロン区切り |
| impact_summary |  | 波及影響 | 日中関係や日米安保に影響 | 何にどう影響するか |
| category |  | カテゴリ | 安全保障 | 後で絞り込みに使える |
| event_date | ○ | 発生日 | 2026-03-10 | YYYY-MM-DD固定 |
| source_name |  | ソース名 | Reuters | 表示用 |
| source_url |  | ソースURL | https://example.com | 参照リンク |
| importance |  | 重要度 | 5 | 1〜5推奨 |

---

## 5. 必須列と任意列

### 必須列
最低限、次の列が入っていればアプリのMVPは動かしやすいです。

- `id`
- `country_iso3`
- `country_name`
- `title`
- `summary`
- `event_date`

### 任意列
以下は空でもかまいません。

- `detail`
- `related_countries`
- `impact_summary`
- `category`
- `source_name`
- `source_url`
- `importance`

ただし、アプリの見栄えや分かりやすさのためには、なるべく埋めるのがおすすめです。

---

## 6. セルの書き方ルール

### 6-1. `related_countries`
複数国がある場合は、**ISO3コードをセミコロン `;` 区切り** にします。

例
```text
CHN;USA
USA;ISR;SAU
```

### 6-2. `importance`
数字で管理します。

推奨
- 1 = 低い
- 2 = やや低い
- 3 = 中
- 4 = 高い
- 5 = 非常に高い

### 6-3. `category`
最初は自由記述でもよいですが、できれば表記をそろえます。

推奨カテゴリ例
- 安全保障
- 経済
- 外交
- エネルギー
- 海運
- 国内政治
- 人道

### 6-4. `summary`
まず最初に見せたい説明なので、**1〜2文程度** にするのがおすすめです。

### 6-5. `detail`
`summary` より詳しい内容を書きます。  
最初は空欄でも問題ありません。

---

## 7. まずはこのサンプルをそのまま使ってよい

以下は、そのままCSVファイルに貼り付けて使えるサンプルです。

```csv
id,country_iso3,country_name,title,summary,detail,related_countries,impact_summary,category,event_date,source_name,source_url,importance
1,JPN,日本,中国軍機の活動,日本周辺で中国軍機の活動が確認された,東シナ海周辺で活動が続いている,CHN;USA,日中関係や日米安保に影響,安全保障,2026-03-10,Reuters,https://example.com/1,5
2,IRN,イラン,追加制裁の発表,欧米諸国が追加制裁を発表した,金融や海運への影響が懸念されている,USA;ISR,原油価格や海上輸送に波及する可能性,経済,2026-03-11,Reuters,https://example.com/2,4
3,UKR,ウクライナ,前線での戦闘継続,東部戦線で戦闘が続いている,各国の支援継続が焦点となっている,RUS;USA;DEU,欧州安全保障やエネルギー市場に影響,安全保障,2026-03-12,Reuters,https://example.com/3,5
4,CHN,中国,海運ルートへの懸念,周辺海域での緊張が海運に影響する懸念が出ている,物流や保険コストへの影響が注目されている,TWN;USA;JPN,海上輸送やサプライチェーンに波及,海運,2026-03-13,Reuters,https://example.com/4,4
```

---

## 8. Excelで管理する場合のルール

CSVが基本ですが、日常運用でExcelを使うのは問題ありません。  
その場合は次のルールで管理してください。

### ルール
- 1行目は必ずヘッダー行
- 列の並びはCSV仕様と同じにする
- 列名は変更しない
- 改行を多用しすぎない
- 保存時はCSVに書き出せる状態を保つ

### おすすめ運用
- 日常編集はExcel
- アプリ読込用は `events.csv`

この形が一番安定します。

---

## 9. MVP時点でのおすすめ運用ルール

### 9-1. 1国に対して複数件入れてよい
ただし、最初は **1〜3件程度** に抑えるのがおすすめです。

### 9-2. 表示順は日付か重要度で後から制御する
CSVには複数件入れてOKですが、アプリ側では後で
- 新しい順
- 重要度順

のどちらかで並べればよいです。

### 9-3. 最初はソース数を増やしすぎない
まずは表示が安定することを優先します。

---

## 10. 将来追加できる列（今は未採用）

将来必要になったら、次の列を追加できます。

- `region`（地域）
- `tags`（タグ）
- `status`（進行中／停戦／制裁中など）
- `latitude` / `longitude`（地点ベース拡張用）
- `image_url`（画像表示用）
- `video_url`（解説動画用）
- `related_routes`（関係航路）

ただし、今は増やしません。  
最初は列を増やしすぎないことが大切です。

---

## 11. このCSV仕様で実現できること

この形式で、MVPでは次のことが実現できます。

- 国クリックで出来事表示
- タイトルと概要表示
- 関係国表示
- 波及影響表示
- ソースリンク表示
- 重要度表示
- 将来のカテゴリ絞り込み準備

---

## 12. ChatGPTに今後依頼するときの前提文（CSV版）

今後、ChatGPTにCSV読込や表示コードを依頼するときは、以下を添えると早いです。

```text
このプロジェクトのCSVフォーマットは以下で固定です。

id,country_iso3,country_name,title,summary,detail,related_countries,impact_summary,category,event_date,source_name,source_url,importance

related_countries は ISO3コードをセミコロン区切りで管理します。
event_date は YYYY-MM-DD 形式です。
country_iso3 を地図側の国コードと照合して表示したいです。
初心者向けに、どのファイルのどこをどう書けばいいか具体的に教えてください。
```

---

## 13. 現時点での結論

このプロジェクトでは、CSV形式はまず **この13列で確定** して進めるのが最適です。

```csv
id,country_iso3,country_name,title,summary,detail,related_countries,impact_summary,category,event_date,source_name,source_url,importance
```

これでMVPに必要な情報は十分そろっています。

---

## 14. 次にやるべきこと

このCSV仕様が固まったので、次は以下の順で進めるのがベストです。

1. `events.csv` のひな形を作る
2. 世界地図用の `countries.geojson` を準備する
3. React + Vite の初期セットアップをする
4. 地図表示 → 国クリック → CSV読込 の順で実装する

---

## 15. コピペ用・最終確定版

```csv
id,country_iso3,country_name,title,summary,detail,related_countries,impact_summary,category,event_date,source_name,source_url,importance
```

