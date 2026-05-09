import express from "express";
import { query } from "../db.js";

const router = express.Router();

router.get("/players", async (req, res) => {
  const { match_id } = req.query;

  try {

    const result = await query(
      `SELECT
        m.match_time,

        t1.short AS team1_short,
        t1.image AS team1_flag,

        t2.short AS team2_short,
        t2.image AS team2_flag,

        p.id AS player_id,
        p.name,
        p.image_front,
        p.image_side,
        p.role,

        a.team_no

      FROM match m

      JOIN team t1 ON m.team1 = t1.id
      JOIN team t2 ON m.team2 = t2.id

      JOIN admin_squid a ON a.match_id = m.id
      JOIN player p ON a.player_id = p.id

      WHERE m.id = $1
      ORDER BY a.team_no, p.role`,
      [match_id]
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false
    });
  }
});

export default router;