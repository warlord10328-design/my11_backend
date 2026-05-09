import express from "express";
import { query } from "../db.js";

const router = express.Router();

router.get("/matches", async (req, res) => {
  try {
    const result = await query(`
      SELECT
        m.id,
        tr.name AS tournament,
        t1.name AS team_a,
        t1.short AS team_a_short,
        t1.image AS team_a_logo,
        t2.name AS team_b,
        t2.short AS team_b_short,
        t2.image AS team_b_logo,

        m.match_time AT TIME ZONE 'Asia/Kolkata' AS match_time_ist,
        TO_CHAR(m.match_time AT TIME ZONE 'Asia/Kolkata', 'DD-Mon') AS match_date,
        TO_CHAR(m.match_time AT TIME ZONE 'Asia/Kolkata', 'HH12:MI AM') AS match_time_formatted,

        v.name AS venue,

        COALESCE(
          (SELECT p.image_side FROM player p WHERE p.id = m.captain1),
          (SELECT p.image_side
           FROM admin_squid s
           JOIN player p ON s.player_id = p.id
           WHERE s.match_id = m.id AND s.team_no = 1
           LIMIT 1)
        ) AS captain_a_img,

        COALESCE(
          (SELECT p.image_side FROM player p WHERE p.id = m.captain2),
          (SELECT p.image_side
           FROM admin_squid s
           JOIN player p ON s.player_id = p.id
           WHERE s.match_id = m.id AND s.team_no = 2
           LIMIT 1)
        ) AS captain_b_img

      FROM match m
      JOIN tournament tr ON m.tournament = tr.id
      JOIN team t1 ON m.team1 = t1.id
      JOIN team t2 ON m.team2 = t2.id
      JOIN venue v ON m.venue = v.id

      WHERE
        (m.match_time AT TIME ZONE 'Asia/Kolkata')
          > (NOW() AT TIME ZONE 'Asia/Kolkata')
        AND m.activity = 'active'

      ORDER BY m.match_time ASC
    `);

    // Current time in IST
    const nowIST = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );

    const matches = result.rows.map(match => {
      const matchTime = new Date(match.match_time_ist);

      const today = new Date(nowIST);
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      let day_label = "";
      if (matchTime >= today && matchTime < tomorrow) {
        day_label = "Today";
      } else if (
        matchTime >= tomorrow &&
        matchTime < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)
      ) {
        day_label = "Tomorrow";
      } else {
        day_label = match.match_date;
      }

      return {
        ...match,
        day_label,
      };
    });

    res.json({ success: true, matches });
  } catch (err) {
    console.error("MATCH FETCH ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
