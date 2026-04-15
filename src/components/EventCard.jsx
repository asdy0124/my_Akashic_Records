import { countryNamesJa } from "../data/countryNamesJa";
import { expandCountryCodes } from "../utils/countryGroups";

function formatDate(dateString) {
  if (!dateString) return "日付不明";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatRelatedCountries(relatedCountries) {
  if (!relatedCountries) return "なし";

  const rawItems = relatedCountries
    .split(";")
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);

  const labels = rawItems.map((code) => {
    if (code === "EU") {
      return "EU（欧州連合）";
    }

    return countryNamesJa[code] || code;
  });

  return labels.join(" / ");
}

function getImportanceClass(importance) {
  switch (importance) {
    case "高":
      return "importance-high";
    case "中":
      return "importance-medium";
    case "低":
      return "importance-low";
    default:
      return "importance-default";
  }
}

function getCategoryClass(category) {
  switch (category) {
    case "外交":
      return "category-diplomacy";
    case "軍事":
      return "category-military";
    case "安全保障":
      return "category-security";
    case "経済":
      return "category-economy";
    case "制裁":
      return "category-sanctions";
    case "首脳会談":
      return "category-summit";
    case "紛争":
      return "category-conflict";
    case "エネルギー":
      return "category-energy";
    default:
      return "category-default";
  }
}

function isValidUrl(url) {
  if (!url) return false;

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function EventCard({ event, eventId, isSelected = false, onClick }) {
  const category = event.category?.trim();
  const importanceValue = Number(event.importance ?? 0);

  let importanceClass = "importance-default";
  let importanceLabel = "重要度 不明";

  if (importanceValue >= 5) {
    importanceClass = "importance-high";
    importanceLabel = "重要度 高";
  } else if (importanceValue >= 3) {
    importanceClass = "importance-medium";
    importanceLabel = "重要度 中";
  } else if (importanceValue >= 1) {
    importanceClass = "importance-low";
    importanceLabel = "重要度 低";
}
  const sourceName = event.source_name?.trim();
  const sourceUrl = event.source_url?.trim();

  return (
    <article
      className={`event-card ${isSelected ? "event-card-selected" : ""}`}
      data-event-id={eventId}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <div className="event-card-top">
        <div className="event-badges">
          {category && (
            <span
              className={`event-badge category-badge ${getCategoryClass(category)}`}
            >
              {category}
            </span>
          )}

          <span
            className={`event-badge importance-badge ${importanceClass}`}
          >
            {importanceLabel}
          </span>

          {isSelected && <span className="event-badge selected-badge">選択中</span>}
        </div>

        <time className="event-date">{formatDate(event.event_date)}</time>
      </div>

      <h3 className="event-title">{event.title}</h3>

      <p className="event-summary">{event.summary}</p>

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

        {(sourceName || isValidUrl(sourceUrl)) && (
          <div className="meta-row">
            <span className="meta-label">出典</span>
            <div className="meta-value source-block">
              {sourceName && <span className="source-name">{sourceName}</span>}

              {isValidUrl(sourceUrl) && (
                <a
                  className="source-link"
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  記事を見る
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

export default EventCard;