import express from "express";
import { query } from "../../db.js";

const router = express.Router();

router.get("/tournament", async (req, res) => {
  try {
    const result = await query(`SELECT * FROM Tournament ORDER BY id ASC`);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/team", async (req, res) => {
  try {
    const result = await query(`SELECT * FROM Team ORDER BY id ASC`);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/player", async (req, res) => {
  try {
    const result = await query(`SELECT * FROM Player ORDER BY id ASC`);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/venue", async (req, res) => {
  try {
    const result = await query(`SELECT * FROM Venue ORDER BY id ASC`);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/data", async (req, res) => {
  try {
    const q = req.query.q || "";

    const tournaments = await query(
      `
      SELECT id, name
      FROM Tournament
      WHERE name ILIKE $1
      ORDER BY name ASC
      LIMIT 5
      `,
      [`%${q}%`]
    );

    const teams = await query(
      `
      SELECT id, name
      FROM Team
      WHERE name ILIKE $1
      ORDER BY name ASC
      LIMIT 5
      `,
      [`%${q}%`]
    );

    const venues = await query(
      `
      SELECT id, name
      FROM Venue
      WHERE name ILIKE $1
      ORDER BY name ASC
      LIMIT 5
      `,
      [`%${q}%`]
    );

    res.json({
      success: true,
      tournaments: tournaments.rows,
      teams: teams.rows,
      venues: venues.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});
router.get("/contests", async (req, res) => {
  try {
    const contests = await query(`SELECT * FROM contest ORDER BY contest_id DESC`);
    const result = [];

    for (const c of contests.rows) {
      const prizes = await query(
        `SELECT prize_range, amount FROM prize_brakup WHERE contest_id = $1 ORDER BY id ASC`,
        [c.contest_id]
      );

      result.push({
        ...c,
        prizes: prizes.rows,
      });
    }

    res.json({ success: true, data: result });
  } catch (err) {
    console.error("GET CONTEST ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/tournament-ids", async (req, res) => {
  try {
    const result = await query(`SELECT api_id FROM Tournament`);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.post("/prize", async (req, res) => {
  try {
    const { contest_id, prize_range, amount } = req.body;
    if (!contest_id || !prize_range || !amount)
      return res.status(400).json({ success: false, message: "Missing fields" });

    await query(
      `INSERT INTO prize_brakup (contest_id, prize_range, amount) VALUES ($1, $2, $3)`,
      [contest_id, prize_range, amount]
    );

    res.json({ success: true, message: "Prize added successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
