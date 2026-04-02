import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getJapaneseCountryNameFromIso3 } from "../utils/countryNameJa";

function MapView({
  selectedCountry,
  relatedCountries = [],
  countriesWithArticles = [],
  countryEventCounts = {},
  onCountryClick,
}) {
  const [geoData, setGeoData] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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
    const iso3 = getIso3FromFeature(feature);

    if (isCrimeaFeature(feature)) {
      return {
        ...defaultStyle,
        fillColor: "transparent",
        fillOpacity: 0,
        color: "transparent",
        opacity: 0,
        weight: 0,
      };
    }

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

  function isCrimeaFeature(feature) {
    const props = feature?.properties || {};

    const nameCandidates = [
      props.NAME,
      props.NAME_EN,
      props.NAME_JA,
      props.ADMIN,
      props.NAME_LONG,
      props.BRK_NAME,
      props.formal_en,
      props.name,
    ]
      .map((value) => String(value || "").toLowerCase().trim())
      .filter(Boolean);

    return nameCandidates.some((name) => {
      return (
        name.includes("crimea") ||
        name.includes("crimean") ||
        name.includes("クリミア")
      );
    });
  }

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
        const iso3 = getIso3FromFeature(feature);

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

  const onEachCountry = (feature, layer) => {
    if (isCrimeaFeature(feature)) {
      return;
    }

    const iso3 = getIso3FromFeature(feature);
    const name =
      feature.properties.ADMIN ||
      feature.properties.NAME ||
      feature.properties.NAME_EN ||
      "";

    const nameJa =
      feature.properties.NAME_JA ||
      getJapaneseCountryNameFromIso3(iso3, name);

    const count = countryEventCounts?.[iso3] || 0;

    layer.bindTooltip(`${nameJa || name}：${count}件`, {
      sticky: true,
    });

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
      <MapContainer
        center={isMobile ? [22, 10] : [20, 0]}
        zoom={isMobile ? 1.5 : 2}
        minZoom={isMobile ? 1.5 : 2}
        zoomSnap={0.1}
        zoomDelta={0.25}
        scrollWheelZoom={true}
        className="leaflet-map"
        worldCopyJump={true}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {geoData && selectedCountry && (
          <MapAutoFocus
            geoData={geoData}
            selectedCountry={selectedCountry}
          />
        )}

        {geoData && (
          <GeoJSON
            data={geoData}
            style={getCountryStyle}
            onEachFeature={onEachCountry}
          />
        )}

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

function MapAutoFocus({ geoData, selectedCountry }) {
  const map = useMap();

  useEffect(() => {
    if (!geoData?.features?.length) return;
    if (!selectedCountry?.iso3) return;

    const targetIso3 = String(selectedCountry.iso3).toUpperCase().trim();

    const feature = geoData.features.find((item) => {
      const iso3 = getIso3FromFeature(item);
      return iso3 === targetIso3;
    });

    if (!feature) return;

    const layer = L.geoJSON(feature);
    const bounds = layer.getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [20, 20],
        maxZoom: 5,
        animate: true,
      });
    }
  }, [geoData, selectedCountry, map, getIso3FromFeature]);

  return null;
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
function getIso3FromFeature(feature) {
  const props = feature?.properties || {};

  const candidates = [
    props.ADM0_A3,
    props.SOV_A3,
    props.GU_A3,
    props.ISO_A3,
    props.iso_a3,
    props.id,
  ];

  const found = candidates.find((value) => {
    const code = String(value || "").toUpperCase().trim();
    return code && code !== "-99";
  });

  return String(found || "").toUpperCase().trim();
}
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