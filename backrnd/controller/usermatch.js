import express from "express";
import { query } from "../db.js";

const router = express.Router();

/**
 * GET ALL MATCHES
 * URL: GET /match/matches
 */
router.get("/matches", async (req, res) => {
  try {
    const result = await query(`
      SELECT
        c.id,

        tr.name AS tournament,

        t1.name  AS team_a,
        t1.short AS team_a_short,
        t1.image AS team_a_logo,

        t2.name  AS team_b,
        t2.short AS team_b_short,
        t2.image AS team_b_logo,

        p1.image AS captain_a_img,
        p2.image AS captain_b_img,

        c.date   AS match_date,
        c.time   AS match_time,

        v.name   AS venue,
        c.status
      FROM match c
      JOIN tournament tr ON c.tournament = tr.id
      JOIN team t1 ON c.team1 = t1.id
      JOIN team t2 ON c.team2 = t2.id
      JOIN venue v ON c.venue = v.id

      -- ✅ only one captain per team
      LEFT JOIN LATERAL (
        SELECT image FROM player
        WHERE team_id = t1.id
        ORDER BY id ASC
        LIMIT 1
      ) p1 ON true

      LEFT JOIN LATERAL (
        SELECT image FROM player
        WHERE team_id = t2.id
        ORDER BY id ASC
        LIMIT 1
      ) p2 ON true

      ORDER BY c.date ASC, c.time ASC
    `);

    res.json({
      success: true,
      matches: result.rows,
    });
  } catch (err) {
    console.error("USER MATCH FETCH ERROR:", err.message);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * GET SINGLE MATCH
 * URL: GET /match/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const result = await query(
      `
      SELECT
        c.id,
        tr.name AS tournament,

        t1.name AS team_a,
        t1.image AS team_a_logo,

        t2.name AS team_b,
        t2.image AS team_b_logo,

        c.date AS match_date,
        c.time AS match_time,

        v.name AS venue,
        c.status
      FROM contest c
      JOIN tournament tr ON c.tournament = tr.id
      JOIN team t1 ON c.team1 = t1.id
      JOIN team t2 ON c.team2 = t2.id
      JOIN venue v ON c.venue = v.id
      WHERE c.id = $1
      `,
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false });
    }

    res.json({
      success: true,
      match: result.rows[0],
    });
  } catch (err) {
    console.error("SINGLE MATCH ERROR:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
