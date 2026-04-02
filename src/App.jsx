import { useEffect, useMemo, useState } from "react";
import "./App.css";
import MapView from "./components/MapView";
import DetailPanel from "./components/DetailPanel";
import { supabase } from "./lib/supabase";
import {
  expandCountryCodes,
  includesCountryCode,
} from "./utils/countryGroups";

function App() {
  const [events, setEvents] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("すべて");
  const [sortBy, setSortBy] = useState("date");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [countryKeyword, setCountryKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

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

  if (loading) {
    return (
      <div className="app">
        <div className="map-wrapper" />
        <div className="detail-panel">
          <h2 className="panel-title">読み込み中...</h2>
          <p className="panel-message">
            Supabase からニュースデータを取得しています。
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="app">
        <div className="map-wrapper" />
        <div className="detail-panel">
          <h2 className="panel-title">データ取得エラー</h2>
          <p className="panel-message">{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>国際情勢ビューア</h1>
        <p>地図から世界のニュースを直感的に理解</p>
      </header>

      <div className="app">
        <div className="map-section">
          <MapView
            selectedCountry={selectedCountry}
            relatedCountries={relatedCountries}
            countriesWithArticles={countriesWithArticles}
            countryEventCounts={countryEventCounts}
            onCountryClick={handleCountryClick}
          />
        </div>

        <div className="detail-section">
          <DetailPanel
            selectedCountry={selectedCountry}
            events={sortedEvents}
            selectedEvent={selectedEvent}
            onEventClick={handleEventClick}
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
    </div>
  );
}

export default App;