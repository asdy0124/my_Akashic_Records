import { useEffect, useMemo, useState } from "react";
import "./App.css";
import MapView from "./components/MapView";
import DetailPanel from "./components/DetailPanel";
import { supabase } from "./lib/supabase";

function App() {
  const [events, setEvents] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("すべて");
  const [sortBy, setSortBy] = useState("date");
  const [searchKeyword, setSearchKeyword] = useState("");
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
        .select("*")
        .order("event_date", { ascending: false });

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

    return dateFilteredEvents.filter((event) => {
      return (
        String(event.country_iso3).toUpperCase().trim() ===
        String(selectedCountry.iso3).toUpperCase().trim()
      );
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

  const sortedEvents = useMemo(() => {
    const copied = [...searchedEvents];

    if (sortBy === "importance") {
      return copied.sort((a, b) => Number(b.importance) - Number(a.importance));
    }

    return copied.sort(
      (a, b) => new Date(b.event_date) - new Date(a.event_date)
    );
  }, [searchedEvents, sortBy]);

  const relatedCountries = useMemo(() => {
    if (selectedEvent) {
      return (selectedEvent.related_countries || "")
        .split(";")
        .map((code) => code.trim().toUpperCase())
        .filter(Boolean);
    }

    if (!selectedCountry) {
      const allRelated = dateFilteredEvents.flatMap((event) =>
        (event.related_countries || "")
          .split(";")
          .map((code) => code.trim().toUpperCase())
          .filter(Boolean)
      );
      return [...new Set(allRelated)];
    }

    return [];
  }, [selectedEvent, selectedCountry, dateFilteredEvents]);

  const countriesWithArticles = useMemo(() => {
    return [
      ...new Set(
        dateFilteredEvents
          .map((event) => String(event.country_iso3 || "").toUpperCase().trim())
          .filter(Boolean)
      ),
    ];
  }, [dateFilteredEvents]);

  const countryEventCounts = useMemo(() => {
    const counts = {};

    dateFilteredEvents.forEach((event) => {
      const iso3 = String(event.country_iso3 || "").toUpperCase().trim();
      if (!iso3) return;

      counts[iso3] = (counts[iso3] || 0) + 1;
    });

    return counts;
  }, [dateFilteredEvents]);

  const handleCountryClick = (country) => {
    if (!country?.iso3) return;

    if (selectedCountry?.iso3 === country.iso3) {
      setSelectedCountry(null);
      setSelectedEvent(null);
    } else {
      setSelectedCountry(country);
      setSelectedEvent(null);
    }

    requestAnimationFrame(() => {
      const panel = document.querySelector(".detail-panel");
      if (panel) {
        panel.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  };

  const handleEventClick = (event) => {
    if (selectedEvent === event) {
      setSelectedEvent(null);
    } else {
      setSelectedEvent(event);
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
    <div className="app">
      <MapView
        selectedCountry={selectedCountry}
        relatedCountries={relatedCountries}
        countriesWithArticles={countriesWithArticles}
        countryEventCounts={countryEventCounts}
        onCountryClick={handleCountryClick}
      />

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
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />
    </div>
  );
}

export default App;