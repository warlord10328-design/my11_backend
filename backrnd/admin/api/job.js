import express from "express";
import { query } from "../../db.js";
import { fetchSeriesSmart, fetchMatchesBySeries, fetchLiveSeriesMatches } from "../../controller/scraper.js";

const router = express.Router();

router.post("/run-job", async (req, res) => {
  try {
    const { job_name, seriesApiId } = req.body; // ✅ FIXED

    if (!job_name) {
      return res.status(400).json({
        success: false,
        message: "job_name required",
      });
    }

    const jobRes = await query(
      `SELECT last_run, cooldown_interval
       FROM job_tracker
       WHERE job_name = $1
       FOR UPDATE`,
      [job_name]
    );

    if (jobRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Job not found",
      });
    }

    const { last_run, cooldown_interval } = jobRes.rows[0];

    if (last_run) {
      const check = await query(
        `SELECT NOW() - $1::timestamp >= $2 AS can_run`,
        [last_run, cooldown_interval]
      );

      if (!check.rows[0].can_run) {
        return res.json({
          success: false,
          message: "Cooldown not finished",
        });
      }
    }

    let jobResult = null;

    if (job_name === "series_sync") {
      jobResult = await fetchSeriesSmart();
    } 
    
    else if (job_name === "match_sync") { // ✅ MATCH YOUR FRONTEND
      if (!seriesApiId) {
        return res.status(400).json({
          success: false,
          message: "api_id required",
        });
      }

      jobResult = await fetchMatchesBySeries(seriesApiId);
    } 
    
    // optional
    else if (job_name === "live_sync") {
      jobResult = await runLiveSync();
    }

    else if (job_name === "all_match_sync") {
      jobResult = await fetchLiveSeriesMatches();
    }

    await query(
      `UPDATE job_tracker 
       SET last_run = NOW() 
       WHERE job_name = $1`,
      [job_name]
    );

    return res.json({
      success: true,
      message: `${job_name} executed successfully`,
      data: jobResult?.matches || [], // ✅ FIX (matches not series)
      meta: {
        total: jobResult?.total || 0,
        inserted: jobResult?.inserted || 0,
      },
    });

  } catch (err) {
    console.error("❌ ERROR:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

export default router;