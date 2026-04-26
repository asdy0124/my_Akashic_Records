# 📘 国際情勢ビューア 改修引き継ぎ書
# 目的：AdSense対策をしつつ、地図連動UXを壊さない記事詳細導線を実装する

---

## 1. 今回の基本方針

このアプリの最大の価値は、

記事カードをクリック
→ 地図が対象国へ反応
→ 関連国・矢印・色分けで国際情勢を視覚的に理解できる

という点。

そのため、記事カードクリックで即モーダルを出す設計は不採用。

最終仕様は以下。

記事カード本体クリック：
- 今まで通り地図連動のみ
- selectedEvent / selectedCountry を更新
- 関連国や矢印を表示
- URLは変更しない
- モーダルは開かない

記事カード下部の「詳細を見る」クリック：
- URLを /news/:id に変更
- 記事詳細をポップアップ表示
- 地図の選択状態は維持
- 出典はモーダル内だけに表示

モーダルを閉じる：
- URLを / に戻す
- selectedEvent / selectedCountry は消さない
- 地図の選択状態は残す

---

## 2. CSV / Supabase の新しい列構成

今後は以下の列構成で運用する。

id,country_iso3,country_name,title,summary,background,impact,future,detail,related_countries,impact_summary,category,event_date,source_name,source_url,importance

追加された列：

background
impact
future

Supabase の events テーブルにも以下3列を追加済み前提。

background text
impact text
future text

SQLで追加する場合：

alter table events
add column if not exists background text,
add column if not exists impact text,
add column if not exists future text;

---

## 3. App.jsx：Supabase取得列の修正

App.jsx の useEffect 内で、Supabase の select に background / impact / future を追加した。

現在の select はこの形にする。

.select(`
  id,
  country_iso3,
  country_name,
  country_name_ja,
  title,
  summary,
  background,
  impact,
  future,
  detail,
  related_countries,
  impact_summary,
  category,
  event_date,
  source_name,
  source_url,
  importance,
  created_at
`)

normalizeEvent でも以下3項目を追加。

background: row.background || "",
impact: row.impact || "",
future: row.future || "",

該当部分の完成形：

const normalizeEvent = (row) => {
  const iso3 = String(row.country_iso3 || "")
    .toUpperCase()
    .trim();

  return {
    id: row.id ?? crypto.randomUUID(),
    country_iso3: iso3,
    country_name:
      row.country_name ||
      row.country_name_ja ||
      row.country ||
      iso3 ||
      "不明",
    country_name_ja:
      row.country_name_ja ||
      row.country_name ||
      row.country ||
      iso3 ||
      "不明",
    title: row.title || "タイトル未設定",
    summary: row.summary || "",
    background: row.background || "",
    impact: row.impact || "",
    future: row.future || "",
    detail: row.detail || "",
    related_countries: row.related_countries || "",
    impact_summary: row.impact_summary || "",
    category: row.category || "その他",
    event_date: row.event_date || "",
    source_name: row.source_name || "",
    source_url: row.source_url || "",
    importance: Number(row.importance || 0),
    created_at: row.created_at || null,
  };
};

---

## 4. App.jsx：React Router 対応

main.jsx は BrowserRouter で App を囲む。

main.jsx の完成形：

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

react-router-dom が未インストールなら実行：

npm install react-router-dom

---

## 5. App.jsx：import 追加

App.jsx 上部に以下を追加。

import { useLocation, useNavigate } from "react-router-dom";

App 関数内に以下を追加。

const location = useLocation();
const navigate = useNavigate();

---

## 6. App.jsx：URLから news id を取得

sortedEvents の useMemo の後あたりに追加。

const routeNewsId = useMemo(() => {
  const match = location.pathname.match(/^\/news\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}, [location.pathname]);

useEffect(() => {
  if (!routeNewsId) return;
  if (events.length === 0) return;

  const targetEvent = events.find(
    (event) => String(event.id) === String(routeNewsId)
  );

  if (!targetEvent) return;

  setSelectedEvent(targetEvent);

  const eventIso3 = String(targetEvent.country_iso3 || "")
    .toUpperCase()
    .trim();

  if (eventIso3) {
    setSelectedCountry({
      iso3: eventIso3,
      name: targetEvent.country_name || targetEvent.country_name_ja || eventIso3,
      nameJa: targetEvent.country_name_ja || targetEvent.country_name || eventIso3,
    });
  }
}, [routeNewsId, events]);

これにより、/news/:id へ直接アクセスした場合も該当記事が選択され、地図も反応する。

---

## 7. App.jsx：記事カードクリックは地図連動専用

handleEventClick は navigate を入れない。

完成形：

const handleEventClick = (event) => {
  if (!event) return;

  const eventIso3 = String(event.country_iso3 || "").toUpperCase().trim();

  if (selectedEvent?.id === event.id) {
    setSelectedEvent(null);
    setSelectedCountry(null);
    return;
  }

  setSelectedEvent(event);

  if (eventIso3) {
    setSelectedCountry({
      iso3: eventIso3,
      name: event.country_name || event.country_name_ja || eventIso3,
      nameJa: event.country_name_ja || event.country_name || eventIso3,
    });
  }
};

---

## 8. App.jsx：詳細モーダル用関数

handleEventClick の下に追加。

同じ関数を2回書かないこと。
重複すると以下のエラーになる。

Identifier 'handleOpenEventDetail' has already been declared
Identifier 'handleCloseEventDetail' has already been declared

正しい状態では、以下は1セットだけ。

const handleOpenEventDetail = (event) => {
  if (!event) return;

  setSelectedEvent(event);

  const eventIso3 = String(event.country_iso3 || "").toUpperCase().trim();

  if (eventIso3) {
    setSelectedCountry({
      iso3: eventIso3,
      name: event.country_name || event.country_name_ja || eventIso3,
      nameJa: event.country_name_ja || event.country_name || eventIso3,
    });
  }

  navigate(`/news/${encodeURIComponent(event.id)}`);
};

const handleCloseEventDetail = () => {
  navigate("/");
};

閉じるときに setSelectedEvent(null) や setSelectedCountry(null) はしない。
地図の選択状態を残すため。

---

## 9. App.jsx：DetailPanel に onEventDetailClick を渡す

DetailPanel 呼び出しに以下を追加。

onEventDetailClick={handleOpenEventDetail}

完成形の一部：

<DetailPanel
  selectedCountry={selectedCountry}
  events={sortedEvents}
  selectedEvent={selectedEvent}
  clearedEventId={clearedEventId}
  onEventClick={handleEventClick}
  onEventDetailClick={handleOpenEventDetail}
  selectedCategory={selectedCategory}
  onCategoryChange={setSelectedCategory}
  sortBy={sortBy}
  onSortChange={setSortBy}
  searchKeyword={searchKeyword}
  onSearchKeywordChange={setSearchKeyword}
  countryKeyword={countryKeyword}
  onCountryKeywordChange={setCountryKeyword}
  dateRange={dateRange}
  onDateRangeChange={setDateRange}
/>

---

## 10. DetailPanel.jsx：props に onEventDetailClick を追加

関数定義で onEventClick の下に追加。

function DetailPanel({
  selectedCountry,
  events,
  selectedEvent,
  clearedEventId,
  onEventClick,
  onEventDetailClick,
  selectedCategory,
  onCategoryChange,
  sortBy,
  onSortChange,
  searchKeyword,
  onSearchKeywordChange,
  countryKeyword,
  onCountryKeywordChange,
  dateRange,
  onDateRangeChange,
}) {

EventCard 呼び出しに onDetailClick を追加。

<EventCard
  key={item.id}
  event={event}
  eventId={event.id}
  isSelected={selectedEvent?.id === event.id}
  onClick={() => onEventClick(event)}
  onDetailClick={() => onEventDetailClick(event)}
/>

---

## 11. EventCard.jsx：props に onDetailClick を追加

現在の関数定義を以下にする。

function EventCard({
  event,
  eventId,
  isSelected = false,
  onClick,
  onDetailClick,
}) {

---

## 12. EventCard.jsx：カード内の詳細本文は削除

過去に追加した以下のカード内表示は削除。

{isSelected && (
  <div className="article-detail-sections">
    ...
  </div>
)}

カード内に background / impact / future は表示しない。

理由：
記事カード本体クリックは地図連動を見せるため。
詳細本文は「詳細を見る」から開くポップアップ内に限定する。

---

## 13. EventCard.jsx：出典表示を一覧から削除

記事一覧では「出典」「Reuters」などは出さない。
出典はモーダル内のみ。

EventCard.jsx の下部は以下の形にする。

<div className="event-meta">
  <div className="meta-row">
    <span className="meta-label">関係国</span>
    <span className="meta-value">
      {formatRelatedCountries(event.related_countries)}
    </span>
  </div>

  {event.impact_summary?.trim() && (
    <div className="meta-row">
      <span className="meta-label">ニュースのポイントと影響</span>
      <span className="meta-value">{event.impact_summary}</span>
    </div>
  )}

  <div className="event-detail-button-row">
    <button
      type="button"
      className="event-detail-button"
      onClick={(e) => {
        e.stopPropagation();
        onDetailClick?.();
      }}
    >
      詳細を見る
    </button>
  </div>
</div>

重要：
e.stopPropagation(); を必ず入れる。
これがないと「詳細を見る」クリック時にカード本体クリックも発火する。

---

## 14. App.jsx：モーダル JSX

モーダルは .app の外に置く。
.app の中に置くと、グリッド要素扱いになり、画面下や右側に通常本文として表示される。

正しい構造：

<div className="app">
  <div className="map-section">
    ...
  </div>

  <div className="detail-section">
    ...
  </div>
</div>

<footer className="site-footer">
  ...
</footer>

{selectedEvent && routeNewsId && (
  <div className="modal-overlay" onClick={handleCloseEventDetail}>
    ...
  </div>
)}

モーダル JSX：

{selectedEvent && routeNewsId && (
  <div
    className="modal-overlay"
    onClick={handleCloseEventDetail}
  >
    <article
      className="news-modal"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="modal-close-button"
        onClick={handleCloseEventDetail}
      >
        ×
      </button>

      <div className="news-modal-meta">
        <span>{selectedEvent.country_name_ja || selectedEvent.country_name}</span>
        <span>{selectedEvent.event_date}</span>
        <span>{selectedEvent.category}</span>
      </div>

      <h1>{selectedEvent.title}</h1>

      <section className="news-modal-section">
        <h2>概要</h2>
        <p>{selectedEvent.summary}</p>
      </section>

      {(selectedEvent.background?.trim() || selectedEvent.detail?.trim()) && (
        <section className="news-modal-section">
          <h2>背景</h2>
          <p>{selectedEvent.background || selectedEvent.detail}</p>
        </section>
      )}

      {(selectedEvent.impact?.trim() || selectedEvent.impact_summary?.trim()) && (
        <section className="news-modal-section">
          <h2>影響</h2>
          <p>{selectedEvent.impact || selectedEvent.impact_summary}</p>
        </section>
      )}

      {selectedEvent.future?.trim() && (
        <section className="news-modal-section">
          <h2>今後の注目点</h2>
          <p>{selectedEvent.future}</p>
        </section>
      )}

      {(selectedEvent.source_name || selectedEvent.source_url) && (
        <div className="news-modal-source">
          <span>出典：</span>

          {selectedEvent.source_url ? (
            <a
              href={selectedEvent.source_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {selectedEvent.source_name || "元記事を見る"}
            </a>
          ) : (
            <span>{selectedEvent.source_name}</span>
          )}
        </div>
      )}
    </article>
  </div>
)}

---

## 15. CSS：モーダルは src/index.css に追加

main.jsx が import './index.css' しているため、モーダルCSSは src/index.css に入れるのが確実。

src/index.css の一番下に追加済み。

重要クラス：

.modal-overlay
.news-modal
.modal-close-button
.news-modal-meta
.news-modal-section
.news-modal-source

現在のCSS方針：
- overlay は fixed
- z-index は 9999
- 背景を暗くする
- 中央に白いポップアップ表示
- スマホでは幅を狭める
- !important を使って既存CSSより優先

主なCSS：

.modal-overlay {
  position: fixed !important;
  inset: 0 !important;
  z-index: 9999 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 24px !important;
  background: rgba(15, 23, 42, 0.55) !important;
}

.news-modal {
  position: relative !important;
  width: min(640px, calc(100vw - 32px)) !important;
  max-height: min(86vh, 760px) !important;
  overflow-y: auto !important;
  background: #ffffff !important;
  border-radius: 16px !important;
  padding: 24px !important;
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.35) !important;
  color: #0f172a !important;
}

スマホ側：

@media (max-width: 768px) {
  .modal-overlay {
    padding: 16px !important;
    align-items: center !important;
  }

  .news-modal {
    width: min(100%, 340px) !important;
    max-height: 82vh !important;
    padding: 18px !important;
    border-radius: 16px !important;
  }
}

---

## 16. CSS：記事一覧の「詳細を見る」ボタン

App.css か index.css の一番下に追加。

.event-detail-button-row {
  display: flex;
  justify-content: flex-start;
  padding-top: 2px;
}

.event-detail-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #93c5fd;
  background: #ffffff;
  color: #2563eb;
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 0.85rem;
  font-weight: 800;
  line-height: 1;
  cursor: pointer;
}

.event-detail-button:hover {
  background: #dbeafe;
  text-decoration: none;
}

@media (max-width: 768px) {
  .event-detail-button {
    padding: 7px 11px;
    font-size: 0.8rem;
  }
}

---

## 17. フッター位置

footer は .app の外に出す。

理由：
.app は地図と詳細欄のグリッドレイアウト。
footer を .app 内に置くと、地図・記事欄の間に入り込む。

正しい順番：

<div className="app">
  <div className="map-section">...</div>
  <div className="detail-section">...</div>
</div>

<footer className="site-footer">
  <a href="/privacy.html">プライバシーポリシー</a>
  <a href="/terms.html">利用規約</a>
  <a href="/contact.html">お問い合わせ</a>
</footer>

{selectedEvent && routeNewsId && (...modal...)}

---

## 18. トップ説明文

トップページに「このサイトについて」を追加済み。

ただし常時表示は見出しだけ。
本文は details の中。

App.jsx：

<section className="top-description top-description-title-only">
  <details>
    <summary>このサイトについて</summary>

    <p>
      国際情勢ビューアは、世界各地のニュースを地図上で確認できる情報整理サイトです。
      国ごとの出来事や関連する地域を、視覚的にわかりやすく把握できます。
    </p>

    <p>
      本サイトでは、国際ニュースを単に一覧で表示するだけでなく、
      出来事の場所、関連国、重要度、カテゴリを整理し、
      世界で起きている動きを俯瞰しやすい形で表示しています。
    </p>

    <p>
      各ニュースには出典情報を表示し、必要に応じて元記事を確認できるようにしています。
      国際情勢を短時間で把握したい方や、複数地域の動きを比較したい方に向けたサービスです。
    </p>
  </details>
</section>

---

## 19. title / meta description 更新

App.jsx に document.title 更新処理を追加済み。

useEffect(() => {
  if (selectedEvent && routeNewsId) {
    document.title = `${selectedEvent.title} | 国際情勢ビューア`;
    return;
  }

  document.title = "国際情勢を地図で理解 | 国際情勢ビューア";
}, [selectedEvent, routeNewsId]);

meta description 更新処理も追加。

useEffect(() => {
  let descriptionTag = document.querySelector('meta[name="description"]');

  if (!descriptionTag) {
    descriptionTag = document.createElement("meta");
    descriptionTag.setAttribute("name", "description");
    document.head.appendChild(descriptionTag);
  }

  if (selectedEvent && routeNewsId) {
    const descriptionText =
      selectedEvent.summary ||
      selectedEvent.impact_summary ||
      "世界のニュースを地図から直感的に理解できる国際情勢ビューア。";

    descriptionTag.setAttribute("content", descriptionText);
    return;
  }

  descriptionTag.setAttribute(
    "content",
    "世界のニュースを地図から直感的に理解できる国際情勢ビューア。国別の出来事、関連国、注目ニュースをわかりやすく確認できます。"
  );
}, [selectedEvent, routeNewsId]);

---

## 20. 現在の完成挙動

PC：
- 地図と記事一覧が横並び
- 記事カード本体クリックで地図が反応
- 関連国・矢印が表示
- 詳細を見るで中央ポップアップ
- 背景は暗くなる
- モーダル内に概要・背景・影響・今後・出典を表示
- 空欄の項目は出さない
- 出典は一覧には出さず、モーダル内だけ表示

スマホ：
- 地図と下部パネル構成
- 詳細を見るで中央ポップアップ
- モーダル幅は約340px
- 縦スクロール可能

---

## 21. 注意点

1.
modal-overlay は .app の外に置く。
.app 内に置くと通常コンテンツとして表示される。

2.
モーダルCSSは src/index.css に入れる。
App.css に入れて効かなかった経緯あり。

3.
handleOpenEventDetail / handleCloseEventDetail は1回だけ定義。
重複定義すると Vite エラーになる。

4.
カードクリックに navigate を入れない。
カードクリックは地図連動専用。

5.
詳細を見るボタンには e.stopPropagation() 必須。

6.
モーダルを閉じるとき selectedEvent / selectedCountry は消さない。
地図状態を残すため。

---

## 22. 次にやるなら

次の候補：

A. 本番データ側で background / future を充実させる
B. /news/:id の直接アクセス時に記事が存在しない場合のエラー表示
C. AdSense再申請前チェック
D. サイトマップ / robots.txt の整備
E. OGP画像やSNS共有対応

現状は、AdSense対策として
「トップ説明」
「記事詳細URL」
「記事本文ポップアップ」
「出典表示」
「プライバシー・規約・問い合わせ」
まで実装済み。