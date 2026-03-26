# 国際情勢ビューア 引き継ぎ書

## ■ 概要

本アプリは、世界地図上で各国のニュースを可視化し、国際情勢を直感的に把握できるWebアプリである。

---

## ■ 公開URL

https://my-akashic-records.vercel.app
（※Vercelにてホスティング）

---

## ■ 使用技術

### フロントエンド

* React（Vite）
* Leaflet（地図表示）

### バックエンド

* Supabase（PostgreSQL + API）

### インフラ

* Vercel（デプロイ）

---

## ■ リポジトリ

https://github.com/asdy0124/my_Akashic_Records

---

## ■ データベース構成（Supabase）

### テーブル名

`events`

### 主なカラム

* id（uuid）
* country_iso3（国コード）
* country_name（英語）
* country_name_ja（日本語）
* title（ニュースタイトル）

---

## ■ 環境変数（Vercel）

以下を設定済み：

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

※Supabaseの「API Keys」から取得

---

## ■ RLS（Row Level Security）

### 設定内容

* public（anon）に対してSELECTを許可

### ポリシー

```
public can read events
```

---

## ■ デプロイ手順

1. GitHubにpush
2. Vercelが自動デプロイ
3. 環境変数変更時は手動でRedeployが必要

---

## ■ よくあるエラーと対処

### ① データ取得エラー

原因：

* Supabase URLミス
* ANON KEY不一致

対処：

* VercelのEnvironment Variablesを確認

---

### ② 表示されない（読み込み中のまま）

原因：

* RLS未設定

対処：

* SELECT許可ポリシー追加

---

### ③ ERR_NAME_NOT_RESOLVED

原因：

* Supabase URLの誤り

---

## ■ 今後の改善案

### ① Googleアドセンス導入

* 広告枠追加
* プライバシーポリシー必須

### ② UI改善

* 国クリックで詳細表示
* ニュースカードに画像追加

### ③ データ自動取得

* News API連携
* 定期バッチ処理

### ④ SEO対策

* タイトル最適化
* メタタグ追加

---

## ■ 備考

* フロントのみで完結する構成
* Supabaseのanonキーを使用しているため、書き込みは不可（安全）
* 小規模アプリとしては十分運用可能

---

## ■ 最終状態

本アプリは以下を満たしている：

* 正常にデータ取得できる
* 地図とニュースが連動する
* 本番環境で公開済み

---

以上
