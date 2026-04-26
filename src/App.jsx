import { useEffect, useMemo, useState } from "react";
import "./App.css";
import MapView from "./components/MapView";
import DetailPanel from "./components/DetailPanel";
import { supabase } from "./lib/supabase";
import { useLocation, useNavigate } from "react-router-dom";
import { amazonBooks } from "./data/amazonBooks";
import {
  expandCountryCodes,
  includesCountryCode,
} from "./utils/countryGroups";

function App() {
  const [events, setEvents] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [clearedEventId, setClearedEventId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("すべて");
  const [sortBy, setSortBy] = useState("date");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [countryKeyword, setCountryKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showIntroToast, setShowIntroToast] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  // 初期値: 今日を含めた直近7日
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();

    const to = new Date(today);
    to.setHours(23, 59, 59, 999);

    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);

    return { from, to };
  });

  useEffect(() => {
    let ignore = false;

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
        impact_summary: row.impact_summary || "",        category: row.category || "その他",
        event_date: row.event_date || "",
        source_name: row.source_name || "",
        source_url: row.source_url || "",
        importance: Number(row.importance || 0),
        created_at: row.created_at || null,
      };
    };

    const fetchEvents = async () => {
      setLoading(true);
      setLoadError("");

      const { data, error } = await supabase
        .from("events")
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
        .order("event_date", { ascending: false });

      console.log("Supabase data:", data);
      console.log("Supabase error:", error);

      if (ignore) return;

      if (error) {
        console.error("Supabase取得エラー:", error);
        setLoadError(
          "Supabase からデータを取得できませんでした。環境変数・テーブル名・RLS を確認してください。"
        );
        setEvents([]);
        setLoading(false);
        return;
      }

      const normalized = (data || []).map(normalizeEvent);
      setEvents(normalized);
      setLoading(false);
    };

    fetchEvents();

    return () => {
      ignore = true;
    };
  }, []);

  const dateFilteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (!event.event_date) return false;

      const eventDate = new Date(event.event_date);
      if (Number.isNaN(eventDate.getTime())) return false;

      return eventDate >= dateRange.from && eventDate <= dateRange.to;
    });
  }, [events, dateRange]);

  const countryFilteredEvents = useMemo(() => {
    if (!selectedCountry) return dateFilteredEvents;

    const selectedIso3 = String(selectedCountry.iso3 || "").toUpperCase().trim();

    return dateFilteredEvents.filter((event) => {
      return includesCountryCode(selectedIso3, event.country_iso3);
    });
  }, [dateFilteredEvents, selectedCountry]);

  const categoryFilteredEvents = useMemo(() => {
    if (selectedCategory === "すべて") return countryFilteredEvents;

    return countryFilteredEvents.filter(
      (event) => event.category === selectedCategory
    );
  }, [countryFilteredEvents, selectedCategory]);

  const searchedEvents = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    if (!keyword) return categoryFilteredEvents;

    return categoryFilteredEvents.filter((event) => {
      const title = (event.title || "").toLowerCase();
      const summary = (event.summary || "").toLowerCase();
      return title.includes(keyword) || summary.includes(keyword);
    });
  }, [categoryFilteredEvents, searchKeyword]);

  const countryNameFilteredEvents = useMemo(() => {
    const keyword = countryKeyword.trim().toLowerCase();

    if (!keyword) return searchedEvents;

    return searchedEvents.filter((event) => {
      const countryNameJa = String(event.country_name_ja || "").toLowerCase();
      const countryName = String(event.country_name || "").toLowerCase();
      const iso3 = String(event.country_iso3 || "").toLowerCase();

      return (
        countryNameJa.includes(keyword) ||
        countryName.includes(keyword) ||
        iso3.includes(keyword)
      );
    });
  }, [searchedEvents, countryKeyword]);

  const sortedEvents = useMemo(() => {
    const copied = [...countryNameFilteredEvents];

    if (sortBy === "importance") {
      return copied.sort((a, b) => Number(b.importance) - Number(a.importance));
    }

    return copied.sort(
      (a, b) => new Date(b.event_date) - new Date(a.event_date)
    );
  }, [countryNameFilteredEvents, sortBy]);

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

  useEffect(() => {
    if (selectedEvent && routeNewsId) {
      document.title = `${selectedEvent.title} | 国際情勢ビューア`;
      return;
    }

    document.title = "国際情勢を地図で理解 | 国際情勢ビューア";
  }, [selectedEvent, routeNewsId]);

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

  // 👇ここに追加（この行の真下）
  useEffect(() => {
    const keyword = countryKeyword.trim();

    if (!keyword) return;
    if (sortedEvents.length === 0) return;

    const firstEvent = sortedEvents[0];
    const iso3 = String(firstEvent.country_iso3 || "").toUpperCase().trim();

    if (!iso3) return;

    setSelectedCountry({
      iso3,
      name: firstEvent.country_name || firstEvent.country_name_ja || iso3,
      nameJa: firstEvent.country_name_ja || firstEvent.country_name || iso3,
    });
  }, [countryKeyword, sortedEvents]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowIntroToast(false);
    }, 1800);

    return () => clearTimeout(timer);
  }, []);
  
  const relatedCountries = useMemo(() => {
    return expandCountryCodes(selectedEvent?.related_countries || "");
  }, [selectedEvent]);

    const countriesWithArticles = useMemo(() => {
    return [
      ...new Set(
        dateFilteredEvents.flatMap((event) =>
          expandCountryCodes(event.country_iso3)
        )
      ),
    ];
  }, [dateFilteredEvents]);

  const countryEventCounts = useMemo(() => {
    const counts = {};

    dateFilteredEvents.forEach((event) => {
      const expandedCodes = expandCountryCodes(event.country_iso3);

      expandedCodes.forEach((iso3) => {
        counts[iso3] = (counts[iso3] || 0) + 1;
      });
    });

    return counts;
  }, [dateFilteredEvents]);

  const handleCountryClick = (country) => {
    setShowIntroToast(false);

    const clickedIso3 = String(country?.iso3 || "").toUpperCase().trim();
    if (!clickedIso3) return;

    setSelectedCountry((prev) => {
      const prevIso3 = String(prev?.iso3 || "").toUpperCase().trim();

      console.log("clickedIso3:", clickedIso3);
      console.log("prevIso3:", prevIso3);

      if (prevIso3 === clickedIso3) {
        setSelectedEvent(null);
        return null;
      }

      setSelectedEvent(null);
      return {
        ...country,
        iso3: clickedIso3,
      };
    });

    requestAnimationFrame(() => {
      const panel = document.querySelector(".detail-panel");
      if (panel) {
        panel.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  };

  const handleClearSelection = () => {
    setClearedEventId(selectedEvent?.id ?? null);
    setSelectedCountry(null);
    setSelectedEvent(null);
    navigate("/");
  };

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

  if (loading) {
    return (
      <div className="app-status">
        <div className="app-status-card">
          <h2>読み込み中です</h2>
          <p>ニュースデータを取得しています。数秒お待ちください。</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="app-status">
        <div className="app-status-card error">
          <h2>データを読み込めませんでした</h2>
          <p>{loadError}</p>
        </div>
      </div>
    );
  }

  const getIso3List = (value) => {
    if (!value) return [];

    if (Array.isArray(value)) {
      return value
        .map((item) => String(item).toUpperCase().trim())
        .filter(Boolean);
    }

    return String(value)
      .split(/[;,]/)
      .map((item) => item.toUpperCase().trim())
      .filter(Boolean);
  };

  const selectedEventIso3List = selectedEvent
    ? getIso3List(selectedEvent.country_iso3)
    : [];

  const relatedAmazonBooks = selectedEvent
    ? amazonBooks
        .filter((book) => {
          const bookIso3List = getIso3List(book.countryIso3);

          const sameCountry = bookIso3List.some((bookIso3) =>
            selectedEventIso3List.includes(bookIso3)
          );

          const sameCategory =
            book.category &&
            book.category !== "default" &&
            book.category === selectedEvent.category;

          return sameCountry || sameCategory;
        })
        .sort((a, b) => {
          const aCountryMatch = getIso3List(a.countryIso3).some((bookIso3) =>
            selectedEventIso3List.includes(bookIso3)
          );

          const bCountryMatch = getIso3List(b.countryIso3).some((bookIso3) =>
            selectedEventIso3List.includes(bookIso3)
          );

          if (aCountryMatch && !bCountryMatch) return -1;
          if (!aCountryMatch && bCountryMatch) return 1;
          return 0;
        })
        .slice(0, 3)
    : [];

  const fallbackAmazonBook = amazonBooks.find(
    (book) => book.category === "default"
  );

  const displayAmazonBooks =
    relatedAmazonBooks.length > 0
      ? relatedAmazonBooks
      : fallbackAmazonBook
        ? [fallbackAmazonBook]
        : [];
        
  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header-top">
          <div className="page-header-brand">
            <h1>国際情勢ビューア</h1>
            <p>地図から世界のニュースを直感的に理解</p>
          </div>

          <div className="page-header-actions">
          </div>
        </div>
      </header>

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

      {showIntroToast && (
        <div className="intro-toast">
          <div className="intro-toast-card">
            地図の国をクリックすると、その国のニュースを表示できます
          </div>
        </div>
      )}

      <div className="app">
        <div className="map-section">
          <MapView
            selectedCountry={selectedCountry}
            selectedEvent={selectedEvent}
            relatedCountries={relatedCountries}
            countriesWithArticles={countriesWithArticles}
            countryEventCounts={countryEventCounts}
            onCountryClick={handleCountryClick}
            onClearSelection={handleClearSelection}
            hasSelection={Boolean(selectedCountry || selectedEvent)}
          />
        </div>

        <div className="detail-section">
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
        </div>
      </div>
              <footer className="site-footer">
          <a href="/privacy.html">プライバシーポリシー</a>
          <a href="/terms.html">利用規約</a>
          <a href="/contact.html">お問い合わせ</a>
        </footer>

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

      {displayAmazonBooks.length > 0 && (
        <div className="amazon-associate-box">
          <h2>関連書籍</h2>

          <div className="amazon-book-list">
            {displayAmazonBooks.map((book) => (
              <a
                key={book.id}
                href={book.url}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="amazon-book-link"
              >
                <span className="amazon-book-title">{book.title}</span>
                <span className="amazon-book-description">{book.description}</span>
              </a>
            ))}
          </div>

          <p className="amazon-associate-note">
            Amazonのアソシエイトとして、国際情勢ビューアは適格販売により収入を得ています。
          </p>
        </div>
      )}
          </article>
        </div>
      )}

    </div>
  );
}

export default App;

