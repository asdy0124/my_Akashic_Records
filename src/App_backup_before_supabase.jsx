import { useEffect, useMemo, useState } from "react";
import "./App.css";
import MapView from "./components/MapView";
import DetailPanel from "./components/DetailPanel";
import { loadCsv } from "./utils/loadCsv";

function App() {
  const [events, setEvents] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("すべて");
  const [sortBy, setSortBy] = useState("date");
  const [searchKeyword, setSearchKeyword] = useState("");

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
    loadCsv("/data/events.csv").then((data) => {
      setEvents(data);
    });
  }, []);

  // ① まず最初に期間で絞る
  const dateFilteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (!event.event_date) return false;

      const eventDate = new Date(event.event_date);
      if (Number.isNaN(eventDate.getTime())) return false;

      return eventDate >= dateRange.from && eventDate <= dateRange.to;
    });
  }, [events, dateRange]);

  // ② 次に国で絞る
  const countryFilteredEvents = useMemo(() => {
    if (!selectedCountry) return dateFilteredEvents;

    return dateFilteredEvents.filter((event) => {
      return (
        String(event.country_iso3).toUpperCase().trim() ===
        String(selectedCountry.iso3).toUpperCase().trim()
      );
    });
  }, [dateFilteredEvents, selectedCountry]);

  // ③ カテゴリ
  const categoryFilteredEvents = useMemo(() => {
    if (selectedCategory === "すべて") return countryFilteredEvents;

    return countryFilteredEvents.filter(
      (event) => event.category === selectedCategory
    );
  }, [countryFilteredEvents, selectedCategory]);

  // ④ 検索
  const searchedEvents = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    if (!keyword) return categoryFilteredEvents;

    return categoryFilteredEvents.filter((event) => {
      const title = (event.title || "").toLowerCase();
      const summary = (event.summary || "").toLowerCase();
      return title.includes(keyword) || summary.includes(keyword);
    });
  }, [categoryFilteredEvents, searchKeyword]);

  // ⑤ ソート
  const sortedEvents = useMemo(() => {
    const copied = [...searchedEvents];

    if (sortBy === "importance") {
      return copied.sort((a, b) => Number(b.importance) - Number(a.importance));
    }

    return copied.sort(
      (a, b) => new Date(b.event_date) - new Date(a.event_date)
    );
  }, [searchedEvents, sortBy]);

  // 関連国も期間後のデータを使う
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

  // 地図上で「記事のある国」を判定
  const countriesWithArticles = useMemo(() => {
    return [
      ...new Set(
        dateFilteredEvents
          .map((event) => String(event.country_iso3 || "").toUpperCase().trim())
          .filter(Boolean)
      ),
    ];
  }, [dateFilteredEvents]);

  // 追加: 地図の色をイベント数で変えるための件数マップ
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