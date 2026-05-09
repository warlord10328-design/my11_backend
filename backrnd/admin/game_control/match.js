import express from "express";
import { query } from "../../db.js";

const router = express.Router();

router.post("/match-squad", async (req, res) => {
  try {
    const { contest_id, teamA_players, teamB_players, captainA, captainB } = req.body;

    if (!contest_id)
      return res.status(400).json({ error: "match_id is required" });

    await query("BEGIN");

    await query(
      "DELETE FROM admin_squid WHERE match_id = $1",
      [contest_id]
    );

    // insert team A
    for (const player of teamA_players) {
      await query(
        `INSERT INTO admin_squid (match_id, player_id, team_no)
         VALUES ($1, $2, 1)`,
        [contest_id, player]
      );
    }
      await query(
  `UPDATE match
   SET captain1 = $1,
       captain2 = $2,
       activity = 'active'
   WHERE id = $3`,
  [captainA, captainB, contest_id]
);

    for (const player of teamB_players) {
      await query(
        `INSERT INTO admin_squid (match_id, player_id, team_no)
         VALUES ($1, $2, 2)`,
        [contest_id, player]
      );
    }

    await query("COMMIT");

    res.json({ success: true });
  } catch (err) {
    await query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/match-squad/:contest_id", async (req, res) => {
  try {
    const { contest_id } = req.params;

    const result = await query(
      `SELECT 
      a.team_no,
      p.*,
      m.captain1,
      m.captain2
      FROM admin_squid a
      JOIN player p 
      ON p.id = a.player_id
      JOIN match m
      ON m.id = a.match_id
      WHERE a.match_id = $1
      ORDER BY a.team_no;`,
      [contest_id]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/contest", async (req, res) => {
  const { ids } = req.body;

  if (!ids || ids.length === 0) {
    return res.status(400).json({ success: false, error: "No IDs provided" });
  }

  try {
    await query("BEGIN");

    // 1️⃣ Delete associated squad
    await query(
      `DELETE FROM admin_squid 
       WHERE match_id = ANY($1::int[])`,
      [ids]
    );

    // 2️⃣ Delete matches
    const result = await query(
      `DELETE FROM match 
       WHERE id = ANY($1::int[])
       RETURNING *`,
      [ids]
    );

    await query("COMMIT");

    res.json({
      success: true,
      message: "Contests deleted successfully",
      deleted: result.rowCount
    });

  } catch (err) {
    await query("ROLLBACK");
    console.error(err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

router.get("/datafeed", async (req, res) => {
  try {
    const q = req.query.q || "";

    const players = await query(
      `
      SELECT id, name, role
      FROM Player
      WHERE LOWER(name) LIKE LOWER($1)
      ORDER BY name ASC
      LIMIT 5
      `,
      [`%${q}%`]
    );

    res.json({ success: true, players: players.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/contest", async (req, res) => {
  try {
    const { tournament_id, teamA_id, teamB_id, venue_id, date, time } = req.body;
    const match_time = `${date}T${time}:00+05:30`;
    const result = await query(
      `INSERT INTO match (tournament, team1, team2, venue, match_time)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [tournament_id, teamA_id, teamB_id, venue_id, match_time]
    );
    res.json({ success: true, message: "Match created successfully", data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.get("/contest", async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        m.id,
        m.match_time,
        m.activity,
        t.name AS tournament,
        ta.name AS team1,
        tb.name AS team2,
        v.name AS venue
      FROM match m
      JOIN Tournament t ON m.tournament = t.id
      JOIN Team ta ON m.team1 = ta.id
      JOIN Team tb ON m.team2 = tb.id
      JOIN Venue v ON m.venue = v.id
      ORDER BY m.id DESC
    `);

    const now = new Date();

    const matchesWithStatus = result.rows.map((match) => {
      const matchTime = new Date(match.match_time);
      const diffMs = now - matchTime;

      const threeHours = 3 * 60 * 60 * 1000;
      const threeDays = 3 * 24 * 60 * 60 * 1000;

      let activityt = "upcoming";

      if (now < matchTime) {
        activityt = "upcoming";
      } else if (diffMs <= threeHours) {
        activityt = "live";
      } else if (diffMs <= threeDays) {
        activityt = "completed";
      } else {
        activityt = "old";
      }

      return {
        ...match,
        activityt,
      };
    });

    res.json({ success: true, data: matchesWithStatus });
  } catch (err) {
    console.error("GET MATCH ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;