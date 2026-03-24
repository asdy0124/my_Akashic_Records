import Papa from "papaparse";

export async function loadCsv() {
  const response = await fetch("/data/events.csv");
  const text = await response.text();

  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
  });

  return result.data;
}