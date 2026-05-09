import express from "express";
import { query } from "../db.js";

const router = express.Router();

router.get("/contests", async (req, res) => {
  try {
    const result = await query(`
      SELECT 
    contest_id,
    capacity,
    single_capacity,
    type,
    entry_fee::int AS entry_fee,
    prize_pool::int AS prize_pool
  FROM contest
  ORDER BY contest_id DESC
    `);

    res.json({
      success: true,
      contests: result.rows
    });

  } catch (err) {
    console.error("Contest fetch error:", err);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

router.get("/prize/:contest_id", async (req, res) => {
  try {
    const { contest_id } = req.params;

    const result = await query(
      `SELECT id, contest_id, prize_range, amount
       FROM prize_brakup
       WHERE contest_id = $1
       ORDER BY id ASC`,
      [contest_id]
    );

    res.json({
      success: true,
      prizes: result.rows
    });

  } catch (err) {
    console.error("Prize breakup fetch error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

export default router;