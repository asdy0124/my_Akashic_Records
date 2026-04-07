import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Polygon,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getJapaneseCountryNameFromIso3 } from "../utils/countryNameJa";

function MapView({
  selectedCountry,
  selectedEvent,
  relatedCountries = [],
  countriesWithArticles = [],
  countryEventCounts = {},
  onCountryClick,
  onClearSelection,
  hasSelection = false,
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
  
  const arrowConnections = useMemo(() => {
    if (!geoData?.features?.length) return [];
    if (!selectedEvent?.country_iso3) return [];

    const normalizeCode = (value) => String(value || "").toUpperCase().trim();

    const sourceIso3 = normalizeCode(selectedEvent.country_iso3);
    if (!sourceIso3) return [];

    const countryCenters = new Map();

    geoData.features.forEach((feature) => {
      if (isCrimeaFeature(feature)) return;

      const iso3 = getIso3FromFeature(feature);
      if (!iso3) return;

      const geometry = feature.geometry;
      if (!geometry?.coordinates?.length) return;

      const center = getFeatureCenter(geometry);
      if (!center) return;

      countryCenters.set(iso3, center);
    });

    const sourceCenter = countryCenters.get(sourceIso3);
    if (!sourceCenter) return [];

    const rawRelated = selectedEvent.related_countries || "";

    const targetIso3List = rawRelated
      .split(";")
      .map(normalizeCode)
      .filter((code) => code && code !== sourceIso3);

    return targetIso3List
      .map((targetIso3, index) => {
        const targetCenter = countryCenters.get(targetIso3);
        if (!targetCenter) return null;

        const polygonPoints = buildFilledArrowPolygon(
          sourceCenter,
          targetCenter,
          index,
          isMobile
        );

        if (!polygonPoints || polygonPoints.length < 3) return null;

        const shadowPoints = offsetPolygonLatLng(
          polygonPoints,
          isMobile ? 0.12 : 0.16,
          isMobile ? 0.16 : 0.2
        );

        return {
          id: `${sourceIso3}-${targetIso3}-${index}`,
          targetIso3,
          polygonPoints,
          shadowPoints,
        };
      })
      .filter(Boolean);
  }, [geoData, selectedEvent, isMobile]);

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
            relatedCountries={relatedCountries}
            isMobile={isMobile}
          />
        )}

        {geoData && (
          <GeoJSON
            data={geoData}
            style={getCountryStyle}
            onEachFeature={onEachCountry}
          />
        )}

        {/* ===== ここから：帯状カーブ矢印 ===== */}
        {arrowConnections.map((arrow) => (
          <div key={arrow.id}>
            <Polygon
              positions={arrow.shadowPoints}
              pathOptions={{
                stroke: false,
                fillColor: "#0f172a",
                fillOpacity: 0.18,
              }}
            />

            <Polygon
              positions={arrow.polygonPoints}
              pathOptions={{
                stroke: false,
                fillColor: "#334155",
                fillOpacity: 0.88,
              }}
            />
          </div>
        ))}
        {/* ===== ここまで：帯状カーブ矢印 ===== */}


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
      {hasSelection && (
        <button
          type="button"
          className="map-clear-button"
          onClick={onClearSelection}
        >
          選択解除
        </button>
      )}

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

function MapAutoFocus({
  geoData,
  selectedCountry,
  relatedCountries = [],
  isMobile = false,
}) {
  const map = useMap();

  useEffect(() => {
    if (!geoData?.features?.length) return;
    if (!selectedCountry?.iso3) return;

    const targetCodes = new Set([
      String(selectedCountry.iso3 || "").toUpperCase().trim(),
      ...relatedCountries.map((code) => String(code || "").toUpperCase().trim()),
    ]);

    const targetFeatures = geoData.features.filter((feature) => {
      const iso3 = getIso3FromFeature(feature);
      return targetCodes.has(iso3);
    });

    if (targetFeatures.length === 0) return;

    const layer = L.geoJSON(targetFeatures);
    const bounds = layer.getBounds();

    if (!bounds.isValid()) return;

    map.fitBounds(bounds, {
      paddingTopLeft: isMobile ? [20, 20] : [40, 40],
      paddingBottomRight: isMobile ? [20, 140] : [40, 40],
      maxZoom: isMobile ? 2.8 : 3.5,
      animate: true,
    });
  }, [geoData, selectedCountry, relatedCountries, isMobile, map]);

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

/* ===== ここから：帯状カーブ矢印用関数 ===== */

function buildFilledArrowPolygon(start, end, index = 0, isMobile = false) {
  const [startLat, startLng] = start;
  const [endLat, endLng] = end;

  const diffLat = endLat - startLat;
  const diffLng = endLng - startLng;
  const distance = Math.sqrt(diffLat * diffLat + diffLng * diffLng);

  if (distance === 0) return null;

  const unitPerpLat = -diffLng / distance;
  const unitPerpLng = diffLat / distance;

  const direction = index % 2 === 0 ? 1 : -1;

  const isShortDistance = distance < 8;
  const isMiddleDistance = distance >= 8 && distance < 18;

  const curveBase = isMobile ? 0.18 : 0.22;
  const minCurve = isMobile ? 1.2 : 1.6;
  const maxCurve = isMobile ? 4.8 : 6.2;

  let curveBoost = 1 + Math.floor(index / 2) * 0.18;

  if (isShortDistance) {
    curveBoost *= isMobile ? 2.2 : 2.0;
  } else if (isMiddleDistance) {
    curveBoost *= isMobile ? 1.45 : 1.35;
  }

  const curveAmount = clamp(
    distance * curveBase * curveBoost,
    isShortDistance ? (isMobile ? 2.2 : 2.8) : minCurve,
    maxCurve
  );

  const controlLat =
    (startLat + endLat) / 2 + unitPerpLat * curveAmount * direction;
  const controlLng =
    (startLng + endLng) / 2 + unitPerpLng * curveAmount * direction;

  const steps = distance < 8 ? 16 : distance < 18 ? 22 : distance < 28 ? 26 : 32;
  const centerPoints = [];

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;

    const lat =
      (1 - t) * (1 - t) * startLat +
      2 * (1 - t) * t * controlLat +
      t * t * endLat;

    const lng =
      (1 - t) * (1 - t) * startLng +
      2 * (1 - t) * t * controlLng +
      t * t * endLng;

    centerPoints.push([lat, lng]);
  }

  if (centerPoints.length < 6) return null;

  const widthScale = isShortDistance ? 0.72 : isMiddleDistance ? 0.88 : 1;

  const tailWidth = clamp(
    distance * (isMobile ? 0.04 : 0.045) * widthScale,
    isMobile ? 0.16 : 0.2,
    isMobile ? 0.5 : 0.62
  );

  const bodyWidth = clamp(
    distance * (isMobile ? 0.065 : 0.075) * widthScale,
    isMobile ? 0.32 : 0.4,
    isMobile ? 1.05 : 1.35
  );

  const neckWidth = bodyWidth * (isShortDistance ? 0.34 : 0.42);
  const headWidth = bodyWidth * (isShortDistance ? 1.08 : 1.28);

  const tipInset = clamp(
    distance * (isShortDistance ? 0.1 : 0.14),
    isMobile ? 0.38 : 0.48,
    isMobile ? 1.5 : 2.1
  );

  const tipPoint = centerPoints[centerPoints.length - 1];
  const neckPointIndex = Math.max(2, centerPoints.length - 3);
  const bodyEndIndex = Math.max(2, centerPoints.length - 5);

  const leftSide = [];
  const rightSide = [];

  for (let i = 0; i <= bodyEndIndex; i += 1) {
    const point = centerPoints[i];
    const prev = centerPoints[Math.max(0, i - 1)];
    const next = centerPoints[Math.min(centerPoints.length - 1, i + 1)];

    const widthT = i / Math.max(1, bodyEndIndex);

    let currentWidth;
    if (widthT < 0.18) {
      currentWidth = lerp(tailWidth, bodyWidth * 0.92, widthT / 0.18);
    } else if (widthT < 0.72) {
      currentWidth = lerp(bodyWidth * 0.92, bodyWidth, (widthT - 0.18) / 0.54);
    } else {
      currentWidth = lerp(bodyWidth, neckWidth, (widthT - 0.72) / 0.28);
    }

    const offset = getRibbonOffset(prev, point, next, currentWidth);

    leftSide.push([point[0] + offset.lat, point[1] + offset.lng]);
    rightSide.push([point[0] - offset.lat, point[1] - offset.lng]);
  }

  const neckCenter = centerPoints[neckPointIndex];
  const neckPrev = centerPoints[Math.max(0, neckPointIndex - 1)];
  const neckNext =
    centerPoints[Math.min(centerPoints.length - 1, neckPointIndex + 1)];

  const neckOffset = getRibbonOffset(neckPrev, neckCenter, neckNext, neckWidth);
  const headOffset = getRibbonOffset(neckPrev, neckCenter, neckNext, headWidth);

  const tipBackPoint = movePointBackward(
    tipPoint,
    centerPoints[centerPoints.length - 2],
    tipInset
  );

  const leftNeck = [
    tipBackPoint[0] + neckOffset.lat,
    tipBackPoint[1] + neckOffset.lng,
  ];

  const rightNeck = [
    tipBackPoint[0] - neckOffset.lat,
    tipBackPoint[1] - neckOffset.lng,
  ];

  const leftShoulder = [
    neckCenter[0] + headOffset.lat,
    neckCenter[1] + headOffset.lng,
  ];

  const rightShoulder = [
    neckCenter[0] - headOffset.lat,
    neckCenter[1] - headOffset.lng,
  ];

  const polygon = [
    ...leftSide,
    leftNeck,
    leftShoulder,
    tipPoint,
    rightShoulder,
    rightNeck,
    ...rightSide.reverse(),
  ];

  return polygon;
}

function getRibbonOffset(prevPoint, currentPoint, nextPoint, width) {
  const beforeLat = currentPoint[0] - prevPoint[0];
  const beforeLng = currentPoint[1] - prevPoint[1];
  const afterLat = nextPoint[0] - currentPoint[0];
  const afterLng = nextPoint[1] - currentPoint[1];

  let tangentLat = beforeLat + afterLat;
  let tangentLng = beforeLng + afterLng;

  const tangentLength = Math.sqrt(
    tangentLat * tangentLat + tangentLng * tangentLng
  );

  if (tangentLength === 0) {
    const fallbackLat = nextPoint[0] - prevPoint[0];
    const fallbackLng = nextPoint[1] - prevPoint[1];
    const fallbackLength = Math.sqrt(
      fallbackLat * fallbackLat + fallbackLng * fallbackLng
    );

    if (fallbackLength === 0) {
      return { lat: 0, lng: 0 };
    }

    tangentLat = fallbackLat / fallbackLength;
    tangentLng = fallbackLng / fallbackLength;
  } else {
    tangentLat /= tangentLength;
    tangentLng /= tangentLength;
  }

  const perpLat = -tangentLng;
  const perpLng = tangentLat;

  return {
    lat: perpLat * (width / 2),
    lng: perpLng * (width / 2),
  };
}

function movePointBackward(point, previousPoint, amount) {
  const diffLat = point[0] - previousPoint[0];
  const diffLng = point[1] - previousPoint[1];
  const length = Math.sqrt(diffLat * diffLat + diffLng * diffLng);

  if (length === 0) return point;

  const unitLat = diffLat / length;
  const unitLng = diffLng / length;

  return [point[0] - unitLat * amount, point[1] - unitLng * amount];
}

function offsetPolygonLatLng(points, latOffset = 0, lngOffset = 0) {
  return points.map(([lat, lng]) => [lat + latOffset, lng + lngOffset]);
}

function lerp(start, end, t) {
  return start + (end - start) * t;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/* ===== ここまで：帯状カーブ矢印用関数 ===== */

export default MapView;