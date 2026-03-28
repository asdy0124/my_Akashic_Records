import { useMemo, useState } from "react";
import EventCard from "./EventCard";

function DetailPanel({
  selectedCountry,
  events,
  selectedEvent,
  onEventClick,
  selectedCategory,
  onCategoryChange,
  sortBy,
  onSortChange,
  searchKeyword,
  onSearchKeywordChange,
  dateRange,
  onDateRangeChange,
}) {
  const categories = ["すべて", "外交", "軍事", "経済"];
  const [activeTab, setActiveTab] = useState("news");

  const formatDate = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}/${String(d.getDate()).padStart(2, "0")}`;
  };

  const formatInputDate = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const handlePresetRange = (days) => {
    const today = new Date();

    const to = new Date(today);
    to.setHours(23, 59, 59, 999);

    const from = new Date(today);
    from.setDate(from.getDate() - (days - 1));
    from.setHours(0, 0, 0, 0);

    onDateRangeChange({ from, to });
  };

  const handleFromChange = (value) => {
    if (!value) return;

    const newFrom = new Date(value);
    newFrom.setHours(0, 0, 0, 0);

    const currentTo = new Date(dateRange.to);

    if (newFrom > currentTo) {
      const adjustedTo = new Date(newFrom);
      adjustedTo.setHours(23, 59, 59, 999);
      onDateRangeChange({ from: newFrom, to: adjustedTo });
      return;
    }

    onDateRangeChange({
      from: newFrom,
      to: currentTo,
    });
  };

  const handleToChange = (value) => {
    if (!value) return;

    const newTo = new Date(value);
    newTo.setHours(23, 59, 59, 999);

    const currentFrom = new Date(dateRange.from);

    if (newTo < currentFrom) {
      const adjustedFrom = new Date(newTo);
      adjustedFrom.setHours(0, 0, 0, 0);
      onDateRangeChange({ from: adjustedFrom, to: newTo });
      return;
    }

    onDateRangeChange({
      from: currentFrom,
      to: newTo,
    });
  };

  const summaryData = useMemo(() => {
    const categoryCounts = {
      外交: 0,
      軍事: 0,
      経済: 0,
      その他: 0,
    };

    const dateMap = {};
    const countryMap = {};

    events.forEach((event) => {
      const category = event.category || "その他";
      if (categoryCounts[category] !== undefined) {
        categoryCounts[category] += 1;
      } else {
        categoryCounts["その他"] += 1;
      }

      const dateKey = event.event_date
        ? formatInputDate(event.event_date)
        : "日付不明";
      dateMap[dateKey] = (dateMap[dateKey] || 0) + 1;

      const countryName =
        event.country_name_ja ||
        event.country_name ||
        event.country ||
        event.country_iso3 ||
        "不明";
      countryMap[countryName] = (countryMap[countryName] || 0) + 1;
    });

    const topEvents = [...events]
      .sort((a, b) => Number(b.importance || 0) - Number(a.importance || 0))
      .slice(0, 5);

    const topCountries = Object.entries(countryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const dailyCounts = Object.entries(dateMap)
      .sort((a, b) => a[0].localeCompare(b[0]));

    return {
      total: events.length,
      categoryCounts,
      topEvents,
      topCountries,
      dailyCounts,
    };
  }, [events]);

  const panelTitle = selectedCountry
    ? `${selectedCountry.nameJa || selectedCountry.name} のニュース`
    : "国際情勢ニュース一覧";

  const summaryTitle = selectedCountry
    ? `${selectedCountry.nameJa || selectedCountry.name} の今週まとめ`
    : "世界の今週まとめ";

return (
  <div className="detail-panel">
    <div className="detail-mobile-layout">
      <div className="date-panel">
        <div className="date-title">表示期間</div>

        <div className="date-range">
          {formatDate(dateRange.from)} 〜 {formatDate(dateRange.to)}
        </div>

        <div className="date-buttons">
          <button onClick={() => handlePresetRange(7)} className="tab-button">
            直近7日
          </button>

          <button onClick={() => handlePresetRange(30)} className="tab-button">
            直近30日
          </button>
        </div>

        <div className="date-input-group">
          <div className="date-input-col">
            <div className="input-label">開始日</div>
            <input
              type="date"
              value={formatInputDate(dateRange.from)}
              onChange={(e) => handleFromChange(e.target.value)}
              className="input"
            />
          </div>

          <div className="date-input-col">
            <div className="input-label">終了日</div>
            <input
              type="date"
              value={formatInputDate(dateRange.to)}
              onChange={(e) => handleToChange(e.target.value)}
              className="input"
            />
          </div>
        </div>

        <div className="date-count">
          この期間の表示件数: {events.length}件
        </div>
      </div>

      <div className="news-main-panel">
        <div className="tab-container">
          <button
            onClick={() => setActiveTab("news")}
            className={`tab-button ${activeTab === "news" ? "active" : ""}`}
          >
            ニュース
          </button>

          <button
            onClick={() => setActiveTab("summary")}
            className={`tab-button ${activeTab === "summary" ? "active" : ""}`}
          >
            今週まとめ
          </button>
        </div>

        {activeTab === "news" ? (
          <>
            <h2 className="panel-title-mobile">{panelTitle}</h2>

            {selectedEvent && (
              <div className="related-info">
                関連国を表示中（イベント選択中）
              </div>
            )}

            {summaryData.total > 0 && (
              <div className="summary-card">
                <p className="summary-text">
                  {selectedCountry
                    ? `${selectedCountry.nameJa || selectedCountry.name}：今週 ${summaryData.total}件（外交${summaryData.categoryCounts.外交} / 軍事${summaryData.categoryCounts.軍事} / 経済${summaryData.categoryCounts.経済}）`
                    : `世界：今週 ${summaryData.total}件（外交${summaryData.categoryCounts.外交} / 軍事${summaryData.categoryCounts.軍事} / 経済${summaryData.categoryCounts.経済}）`}
                </p>
              </div>
            )}

            <div className="filter-row">
              <select
                value={selectedCategory}
                onChange={(e) => onCategoryChange(e.target.value)}
                className="select"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value)}
                className="select"
              >
                <option value="date">新着順</option>
                <option value="importance">重要度順</option>
              </select>
            </div>
          </>
        ) : (
          <>
            <h2 className="panel-title-mobile">{summaryTitle}</h2>

            <div className="summary-card">
              <p className="summary-text">
                {selectedCountry
                  ? `${selectedCountry.nameJa || selectedCountry.name} の出来事を要約表示中`
                  : "世界全体の出来事を要約表示中"}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="news-list-area">
        {activeTab === "news" ? (
          events.length === 0 ? (
            <p>該当する記事がありません。</p>
          ) : (
            events.map((event, index) => (
              <EventCard
                key={index}
                event={event}
                isSelected={selectedEvent === event}
                onClick={() => onEventClick(event)}
              />
            ))
          )
        ) : events.length === 0 ? (
          <p>この期間にまとめ対象の出来事はありません。</p>
        ) : (
          <div className="summary-grid">
            <section className="summary-card">
              <h3 className="summary-title">概要</h3>
              <p className="summary-text">
                {selectedCountry
                  ? `${selectedCountry.nameJa || selectedCountry.name} では、この期間に ${summaryData.total} 件の出来事がありました。`
                  : `世界全体では、この期間に ${summaryData.total} 件の出来事がありました。`}
              </p>
            </section>

            <section className="summary-card">
              <h3 className="summary-title">カテゴリ別件数</h3>
              <div className="summary-list">
                <SummaryRow label="外交" value={`${summaryData.categoryCounts.外交}件`} />
                <SummaryRow label="軍事" value={`${summaryData.categoryCounts.軍事}件`} />
                <SummaryRow label="経済" value={`${summaryData.categoryCounts.経済}件`} />
                <SummaryRow label="その他" value={`${summaryData.categoryCounts.その他}件`} />
              </div>
            </section>

            <section className="summary-card">
              <h3 className="summary-title">注目トピック（重要度上位）</h3>
              <div className="topics-list">
                {summaryData.topEvents.map((event, index) => (
                  <div key={`${event.title}-${index}`} className="topic-item">
                    <div className="topic-title">{event.title || "タイトルなし"}</div>
                    <div className="topic-meta">
                      {event.event_date ? formatDate(event.event_date) : "日付不明"} /{" "}
                      {event.category || "カテゴリ不明"} / 重要度 {event.importance || 0}
                    </div>
                    <div className="topic-summary">
                      {event.summary || "概要なし"}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {!selectedCountry && (
              <section className="summary-card">
                <h3 className="summary-title">出来事が多かった国</h3>
                <div className="summary-list">
                  {summaryData.topCountries.map(([countryName, count]) => (
                    <SummaryRow
                      key={countryName}
                      label={countryName}
                      value={`${count}件`}
                    />
                  ))}
                </div>
              </section>
            )}

            <section className="summary-card">
              <h3 className="summary-title">日別件数</h3>
              <div className="summary-list">
                {summaryData.dailyCounts.map(([date, count]) => (
                  <SummaryRow key={date} label={date} value={`${count}件`} />
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  </div>
);
}

function SummaryRow({ label, value }) {
  return (
    <div className="summary-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}



export default DetailPanel;