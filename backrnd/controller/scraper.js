import { query } from "../db.js";
import fs from "fs";
import fetch from "node-fetch";


const API_KEY = process.env.DS1;
const BASE_URL = process.env.SERIES_URL;
const MATCH_URL = process.env.MATCH_URL;
const limit = 25;

function formatDate(date) {
  try {
    const d = new Date(date);

    // ✅ use UTC to avoid -1 day timezone issue
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  } catch {
    return "2000-01-01";
  }
}

function getFullEndDate(series) {
  try {
    if (!series.startDate) return "2000-01-01";

    // ✅ parse start date manually
    let start;

    if (series.startDate.includes("-")) {
      const [y, m, d] = series.startDate.split("-").map(Number);

      // use UTC date creation
      start = new Date(Date.UTC(y, m - 1, d));
    } else {
      start = new Date(series.startDate);
    }

    if (isNaN(start.getTime())) return "2000-01-01";

    // ✅ if endDate already full date like 2025-04-11
    if (series.endDate && series.endDate.includes("-")) {
      const [y, m, d] = series.endDate.split("-").map(Number);

      const end = new Date(Date.UTC(y, m - 1, d));

      return formatDate(end);
    }

    // ✅ parse "Apr 11" format
    const monthMap = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11
    };

    const [monthStr, dayStr] = (series.endDate || "").split(" ");

    const month = monthMap[monthStr] ?? 0;
    const day = parseInt(dayStr) || 1;

    let end = new Date(
      Date.UTC(
        start.getUTCFullYear(),
        month,
        day
      )
    );

    // ✅ if end < start → next year
    if (end < start) {
      end = new Date(
        Date.UTC(
          start.getUTCFullYear() + 1,
          month,
          day
        )
      );
    }

    return formatDate(end);

  } catch (e) {
    console.error("Date parse error:", e);
    return "2000-01-01";
  }
}
function isValid(series) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(getFullEndDate(series));
  return end >= today;
}

export async function fetchSeriesSmart() {
  let offset = 0;
  let finalData = [];

  try {
    while (true) {
      console.log("Fetching offset:", offset);

      const res = await fetch(`${BASE_URL}?apikey=${API_KEY}&offset=${offset}`);
      const data = await res.json();

      if (data.status !== "success") break;

      const series = data.data || [];
      if (series.length === 0) break;

      const valid = series.filter(isValid);
      console.log(`Valid series in page: ${valid.length}/${series.length}`);
      finalData.push(...valid);

      // STOP if fewer valid than limit
      if (valid.length < limit) break;

      offset += limit;
      if (offset >= data.info.totalRows) break;
    }

    let inserted = 0;
    for (let s of finalData) {
      // ✅ check if exists by api_id
      const existing = await query(
        `SELECT id FROM tournament WHERE api_id = $1`,
        [s.id]
      );

      if (existing.rows.length > 0) {
        // Update existing
        await query(
          `UPDATE tournament
           SET name = $1,
               start_date = $2,
               end_date = $3
           WHERE api_id = $4`,
          [
            s.name,
            formatDate(s.startDate),
            getFullEndDate(s),
            s.id
          ]
        );
      } else {
        // Insert new
        await query(
          `INSERT INTO tournament (name, api_id, start_date, end_date)
           VALUES ($1, $2, $3, $4)`,
          [
            s.name,
            s.id,
            formatDate(s.startDate),
            getFullEndDate(s)
          ]
        );
        inserted++;
      }
    }

    console.log(`Total fetched: ${finalData.length}, inserted: ${inserted}`);

    const dbData = await query(
      `SELECT id, name, api_id, start_date, end_date
       FROM tournament
       ORDER BY id DESC`
    );

    return {
      total: finalData.length,
      inserted,
      series: dbData.rows
    };

  } catch (e) {
    console.error("❌ ERROR:", e);
    throw e;
  }
}

export async function fetchMatchesBySeries(seriesApiId) {
  try {
    console.log("🔥 FUNCTION CALLED");
    console.log("👉 seriesApiId:", seriesApiId);

    const url = `${MATCH_URL}?apikey=${API_KEY}&id=${seriesApiId}`;

    // ✅ PRINT EXACT URL
    console.log("🌐 FINAL REQUEST URL:");
    console.log(url);

    const res = await fetch(url);

    console.log("📡 STATUS:", res.status);

    const text = await res.text(); // 👈 important (debug raw response)

    console.log("📦 RAW RESPONSE TEXT:");
    console.log(text);

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.log("❌ JSON parse failed");
      return { total: 0, matches: [] };
    }

    console.log("✅ PARSED JSON:");
    console.log(JSON.stringify(data, null, 2));

    const matchList = data?.data?.matchList || [];

    console.log("🎯 MATCH COUNT:", matchList.length);

    return {
      total: matchList.length,
      matches: matchList,
    };

  } catch (err) {
    console.error("❌ ERROR IN FETCH:", err);
    return { total: 0, matches: [] };
  }
}

export async function fetchLiveSeriesMatches() {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // next 3 days for MATCH filter only
    const next3Days = new Date();
    next3Days.setDate(next3Days.getDate() + 3);
    const next3DaysStr = next3Days.toISOString().split("T")[0];

    /*
      STEP 1:
      Fetch all ongoing/live series from DB
      (NO 3-day filter here)
    */
    const seriesResult = await query(
      `SELECT id, api_id, name, start_date, end_date
       FROM tournament
       WHERE start_date <= $1
       AND end_date >= $1
       ORDER BY start_date ASC`,
      [todayStr]
    );

    const liveSeries = seriesResult.rows;

    if (!liveSeries.length) {
      return {
        totalSeries: 0,
        totalMatches: 0,
        matches: [],
      };
    }

    let allMatches = [];

    /*
      STEP 2:
      Fetch matches for all live series
    */
    for (const series of liveSeries) {
      try {
        const url = `${MATCH_URL}?apikey=${API_KEY}&id=${series.api_id}`;

        console.log("Fetching:", series.name);
        console.log("URL:", url);

        const res = await fetch(url);
        const data = await res.json();

        if (data.status !== "success") {
          console.log("Failed:", series.name);
          continue;
        }

        const matchList = data?.data?.matchList || [];

        /*
          STEP 3:
          FILTER MATCHES ONLY
          Today → Next 3 Days
        */
        const filteredMatches = matchList
          .filter((match) => {
            const rawDate =
              match.dateTimeGMT ||
              match.match_date ||
              match.date;

            if (!rawDate) return false;

            const matchDate = new Date(rawDate);
            const matchDateStr =
              matchDate.toISOString().split("T")[0];

            return (
              matchDateStr >= todayStr &&
              matchDateStr <= next3DaysStr
            );
          })
          .map((match) => ({
            ...match,
            tournament_id: series.id,
            tournament_name: series.name,
            fantasyEnabled: match.fantasyEnabled || false,
          }));

        allMatches.push(...filteredMatches);
      } catch (err) {
        console.log(`Error in ${series.name}:`, err.message);
        continue;
      }
    }

    /*
      STEP 4:
      Sort nearest upcoming first
    */
    allMatches.sort((a, b) => {
      const dateA = new Date(
        a.dateTimeGMT ||
          a.match_date ||
          a.date ||
          0
      );

      const dateB = new Date(
        b.dateTimeGMT ||
          b.match_date ||
          b.date ||
          0
      );

      return dateA - dateB;
    });

    console.log("Final matches:", allMatches.length);

    return {
      totalSeries: liveSeries.length,
      totalMatches: allMatches.length,
      matches: allMatches,
    };
  } catch (error) {
    console.error(
      "❌ Error in fetchLiveSeriesMatches:",
      error
    );

    return {
      totalSeries: 0,
      totalMatches: 0,
      matches: [],
    };
  }
}