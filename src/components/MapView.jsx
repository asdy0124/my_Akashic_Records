import { useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Polyline,
  TileLayer,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getJapaneseCountryNameFromIso3 } from "../utils/countryNameJa";

function MapView({
  selectedCountry,
  relatedCountries,
  countriesWithArticles,
  countryEventCounts,
  onCountryClick,
}) {
  const [geoData, setGeoData] = useState(null);
  const [showSeaRoutes, setShowSeaRoutes] = useState(true);
  const [showAirRoutes, setShowAirRoutes] = useState(false);

  useEffect(() => {
    fetch("/data/countries.geojson")
      .then((res) => res.json())
      .then((data) => setGeoData(data))
      .catch((error) => {
        console.error("GeoJSONの読み込みに失敗しました:", error);
      });
  }, []);

  const defaultStyle = {
    weight: 1,
    opacity: 1,
    color: "#64748b",
    fillOpacity: 0.85,
  };

  const getCountryFillColor = (iso3) => {
    const code = String(iso3 || "").toUpperCase().trim();
    const count = countryEventCounts?.[code] || 0;

    if (selectedCountry?.iso3 === code) {
      return "#2563eb";
    }

    if (relatedCountries.includes(code)) {
      return "#93c5fd";
    }

    if (count >= 10) return "#7f1d1d";
    if (count >= 6) return "#b91c1c";
    if (count >= 3) return "#ef4444";
    if (count >= 1) return "#fecaca";

    return "#e5e7eb";
  };

  const getCountryStyle = (feature) => {
    const iso3 = String(feature.properties.ISO_A3 || "").toUpperCase();

    return {
      ...defaultStyle,
      fillColor: getCountryFillColor(iso3),
      color:
        selectedCountry?.iso3 === iso3
          ? "#1d4ed8"
          : relatedCountries.includes(iso3)
          ? "#3b82f6"
          : "#64748b",
      weight:
        selectedCountry?.iso3 === iso3 || relatedCountries.includes(iso3)
          ? 2
          : 1,
    };
  };

  const geoJsonResetStyle = (layer, feature) => {
    const style = getCountryStyle(feature);
    layer.setStyle(style);
  };

  const articleMarkers = useMemo(() => {
    if (!geoData?.features?.length) return [];

    const articleCountrySet = new Set(
      (countriesWithArticles || []).map((code) =>
        String(code || "").toUpperCase().trim()
      )
    );

    return geoData.features
      .map((feature) => {
        const iso3 = String(feature?.properties?.ISO_A3 || "")
          .toUpperCase()
          .trim();

        if (!articleCountrySet.has(iso3)) return null;

        const geometry = feature.geometry;
        if (!geometry?.coordinates?.length) return null;

        const center = getFeatureCenter(geometry);
        if (!center) return null;

        return {
          iso3,
          center,
        };
      })
      .filter(Boolean);
  }, [geoData, countriesWithArticles]);

  const seaRoutes = [
    {
      id: "sea-asia-europe",
      name: "アジア - 欧州航路",
      positions: [
        [31.2, 121.5], // 上海
        [1.29, 103.85], // シンガポール
        [25.27, 55.3], // ドバイ付近
        [31.0, 32.3], // スエズ運河付近
        [51.92, 4.48], // ロッテルダム
      ],
    },
    {
      id: "sea-indian-ocean",
      name: "インド洋航路",
      positions: [
        [35.68, 139.76], // 東京
        [22.3, 114.17], // 香港
        [1.29, 103.85], // シンガポール
        [19.07, 72.88], // ムンバイ
        [25.2, 55.27], // ドバイ
      ],
    },
  ];

  const airRoutes = [
    {
      id: "air-europe-middle-asia",
      name: "欧州 - 中東 - アジア航空路",
      positions: [
        [51.47, -0.45], // ロンドン
        [25.25, 55.36], // ドバイ
        [13.69, 100.75], // バンコク
        [35.55, 139.78], // 東京
      ],
    },
    {
      id: "air-europe-asia",
      name: "欧州 - 東アジア航空路",
      positions: [
        [48.35, 11.79], // ミュンヘン
        [41.27, 28.75], // イスタンブール
        [25.25, 55.36], // ドバイ
        [1.36, 103.99], // シンガポール
      ],
    },
  ];

  
  const onEachCountry = (feature, layer) => {
    const iso3 = String(feature.properties.ISO_A3 || "").toUpperCase();
    const name =
      feature.properties.ADMIN ||
      feature.properties.NAME ||
      feature.properties.NAME_EN ||
      "";

    const nameJa =
      feature.properties.NAME_JA ||
      getJapaneseCountryNameFromIso3(iso3, name);

    const count = countryEventCounts?.[iso3] || 0;

    layer.bindTooltip(
      `${nameJa || name}：${count}件`,
      {
        sticky: true,
      }
    );

    layer.on({
      mouseover: (e) => {
        const targetLayer = e.target;
        targetLayer.setStyle({
          weight: 2,
          color: "#334155",
          fillOpacity: 1,
        });
        targetLayer.bringToFront();
      },
      mouseout: (e) => {
        geoJsonResetStyle(e.target, feature);
      },
      click: () => {
        onCountryClick({
          iso3,
          name,
          nameJa,
        });
      },
    });
  };

  return (
    <div className="map-wrapper">
      <div className="map-overlay-controls">
        <button
          type="button"
          className={`map-toggle-button ${showSeaRoutes ? "active" : ""}`}
          onClick={() => setShowSeaRoutes((prev) => !prev)}
        >
          航路
        </button>

        <button
          type="button"
          className={`map-toggle-button ${showAirRoutes ? "active" : ""}`}
          onClick={() => setShowAirRoutes((prev) => !prev)}
        >
          航空ルート
        </button>
      </div>
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        scrollWheelZoom={true}
        className="leaflet-map"
        worldCopyJump={true}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {geoData && (
          <GeoJSON
            data={geoData}
            style={getCountryStyle}
            onEachFeature={onEachCountry}
          />
        )}
        
        {showSeaRoutes &&
          seaRoutes.map((route) => (
            <Polyline
              key={route.id}
              positions={route.positions}
              pathOptions={{
                color: "#0ea5e9",
                weight: 3,
                opacity: 0.8,
                dashArray: "8 6",
              }}
            />
          ))}

        {showAirRoutes &&
          airRoutes.map((route) => (
            <Polyline
              key={route.id}
              positions={route.positions}
              pathOptions={{
                color: "#8b5cf6",
                weight: 2,
                opacity: 0.75,
              }}
            />
          ))}

        {articleMarkers.map((marker) => (
          <CircleMarker
            key={marker.iso3}
            center={marker.center}
            radius={5}
            pathOptions={{
              color: "#ffffff",
              weight: 2,
              fillColor: "#ef4444",
              fillOpacity: 1,
            }}
          />
        ))}
      </MapContainer>

      {/* 凡例 */}
      <div className="map-legend">
        <div className="map-legend-title">地図の見方</div>

        <LegendItem color="#2563eb" label="選択中の国" />
        <LegendItem color="#93c5fd" label="関連国" />
        <LegendItem color="#7f1d1d" label="多発（10件以上）" />
        <LegendItem color="#b91c1c" label="やや多い（6〜9件）" />
        <LegendItem color="#ef4444" label="中程度（3〜5件）" />
        <LegendItem color="#fecaca" label="少ない（1〜2件）" />
        <LegendItem color="#e5e7eb" label="なし（0件）" />

        <div className="map-legend-note">
          ※ 色が濃いほど、その期間の出来事が多い
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label }) {
  return (
    <div className="map-legend-item">
      <span
        className="map-legend-color"
        style={{ background: color }}
      />
      <span>{label}</span>
    </div>
      );
    }

// --- 以下ユーティリティ ---
function getFeatureCenter(geometry) {
  if (!geometry) return null;

  if (geometry.type === "Polygon") {
    return getPolygonCenter(geometry.coordinates);
  }

  if (geometry.type === "MultiPolygon") {
    const largestPolygon = geometry.coordinates.reduce((largest, current) => {
      const largestSize = getPolygonPointCount(largest);
      const currentSize = getPolygonPointCount(current);
      return currentSize > largestSize ? current : largest;
    }, geometry.coordinates[0]);

    return getPolygonCenter(largestPolygon);
  }

  return null;
}

function getPolygonCenter(polygonCoordinates) {
  if (!polygonCoordinates?.length || !polygonCoordinates[0]?.length) {
    return null;
  }

  const outerRing = polygonCoordinates[0];
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  outerRing.forEach(([lng, lat]) => {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  });

  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  return [centerLat, centerLng];
}

function getPolygonPointCount(polygonCoordinates) {
  if (!polygonCoordinates?.length) return 0;
  return polygonCoordinates[0]?.length || 0;
}

export default MapView;