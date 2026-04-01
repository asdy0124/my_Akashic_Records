// src/utils/countryGroups.js

export const COUNTRY_GROUPS = {
  EU: [
    "AUT","BEL","BGR","HRV","CYP","CZE","DNK","EST","FIN","FRA",
    "DEU","GRC","HUN","IRL","ITA","LVA","LTU","LUX","MLT","NLD",
    "POL","PRT","ROU","SVK","SVN","ESP","SWE"
  ],

  CPTPP: [
    "JPN",
    "AUS",
    "CAN",
    "MEX",
    "PER",
    "CHL",
    "NZL",
    "SGP",
    "MYS",
    "VNM",
    "BRN",
  ],
};

export function expandCountryCode(code) {
  const normalized = String(code || "").trim().toUpperCase();
  if (!normalized) return [];

  return COUNTRY_GROUPS[normalized] || [normalized];
}

export function expandCountryCodes(input) {
  if (!input) return [];

  const rawList = Array.isArray(input)
    ? input
    : String(input)
        .split(";")
        .map((item) => item.trim());

  return [...new Set(rawList.flatMap((code) => expandCountryCode(code)).filter(Boolean))];
}

export function includesCountryCode(targetCode, input) {
  const normalizedTarget = String(targetCode || "").trim().toUpperCase();
  if (!normalizedTarget) return false;

  return expandCountryCodes(input).includes(normalizedTarget);
}