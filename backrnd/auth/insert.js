// routes/insert.js
import express from "express";
import multer from "multer";
import fs from "fs";
import imagekit from "../controller/imagekit.js";
import { query } from "../db.js";

const router = express.Router();

/* -----------------------------------
   MULTER CONFIG
----------------------------------- */
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

/* -----------------------------------
   IMAGEKIT UPLOAD FUNCTION
----------------------------------- */
async function uploadToImageKit(file, folderName) {
  if (!file) return null;
  const uploaded = await imagekit.upload({
    file: fs.readFileSync(file.path),
    fileName: file.originalname,
    folder: `/${folderName}`,
  });
  fs.unlinkSync(file.path); // remove local file
  return uploaded.url;
}

/* -----------------------------------
   INSERT TOURNAMENT (WITHOUT IMAGE)
----------------------------------- */
router.post("/tournament", async (req, res) => {
  try {
    const { name } = req.body;
    const result = await query(
      `INSERT INTO Tournament (name) VALUES ($1) RETURNING *`,
      [name]
    );
    res.json({ success: true, message: "Tournament inserted successfully", data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -----------------------------------
   INSERT TEAM (WITH IMAGE)
----------------------------------- */
router.post("/team", upload.single("image"), async (req, res) => {
  try {
    const { name, tournament_id, name_short } = req.body;
    const imageUrl = await uploadToImageKit(req.file, "team");
    const result = await query(
      `INSERT INTO Team (name, image, short) VALUES ($1, $2, $3) RETURNING *`,
      [name, imageUrl, name_short]
    );
    res.json({ success: true, message: "Team inserted successfully", data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------- INSERT PLAYER (WITH 2 IMAGES) -----------------
router.post("/player", upload.fields([
  { name: "image_side", maxCount: 1 },
  { name: "image_front", maxCount: 1 }
]), async (req, res) => {
  try {
    const { name, team_id, role, dob } = req.body;

    const sideFile = req.files?.image_side?.[0] || null;
    const frontFile = req.files?.image_front?.[0] || null;

    const image_side_url = await uploadToImageKit(sideFile, "player");
    const image_front_url = await uploadToImageKit(frontFile, "player");

    const result = await query(
      `INSERT INTO Player (name, image_side, image_front, team_id, role, dob)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, image_side_url, image_front_url, team_id, role, dob]
    );

    res.json({ success: true, message: "Player inserted successfully", data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


/* -----------------------------------
   INSERT VENUE
----------------------------------- */
router.post("/venue", async (req, res) => {
  try {
    const { name, city, country } = req.body;
    const result = await query(
      `INSERT INTO Venue (name, city, country) VALUES ($1, $2, $3) RETURNING *`,
      [name, city, country]
    );
    res.json({ success: true, message: "Venue inserted successfully", data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -----------------------------------
   GET ROUTES
----------------------------------- */
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

/* -----------------------------------
   GET ALL DROPDOWN DATA
----------------------------------- */
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

router.get("/match-squad/:contest_id", async (req, res) => {
  try {
    const { contest_id } = req.params;

    const result = await query(
      `SELECT 
          a.team_no,
          p.*
       FROM admin_squid a
       JOIN player p 
         ON p.id = a.player_id
       WHERE a.match_id = $1
       ORDER BY a.team_no`,
      [contest_id]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/match-squad", async (req, res) => {
  try {
    const { contest_id, teamA_players, teamB_players, captainA, captainB } = req.body;

    if (!contest_id)
      return res.status(400).json({ error: "match_id is required" });

    await query("BEGIN");

    // delete old squad for this match
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

/* -----------------------------------
   INSERT CONTEST (UPDATED)
----------------------------------- */
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

      let activity = "upcoming";

      if (now < matchTime) {
        activity = "upcoming";
      } else if (diffMs <= threeHours) {
        activity = "live";
      } else if (diffMs <= threeDays) {
        activity = "completed";
      } else {
        activity = "old";
      }

      return {
        ...match,
        activity,
      };
    });

    res.json({ success: true, data: matchesWithStatus });
  } catch (err) {
    console.error("GET MATCH ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});


/* ------------------ INSERT CONTEST WITH PRIZES ------------------ */
router.post("/contests", async (req, res) => {
  try {
    const { capacity, entry_fee, prize_pool, prizes = [] } = req.body;

    if (!capacity || !entry_fee || !prize_pool) {
      return res.status(400).json({ success: false, error: "Missing contest fields" });
    }

    await query("BEGIN");

    // Insert contest
    const contestResult = await query(
      `INSERT INTO contest (capacity, entry_fee, prize_pool)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [capacity, entry_fee, prize_pool]
    );

    const contest_id = contestResult.rows[0].contest_id;

    // Insert prize breakup
    for (const prize of prizes) {
      const { rank_from, rank_to, amount } = prize;
      if (!rank_from || !amount) continue;

      await query(
        `INSERT INTO prize_brakup (contest_id, prize_range, amount)
         VALUES ($1, $2, $3)`,
        [contest_id, rank_to ? `${rank_from}-${rank_to}` : `${rank_from}`, amount]
      );
    }

    await query("COMMIT");

    res.json({
      success: true,
      message: "Contest and prizes inserted successfully",
      data: contestResult.rows[0],
    });
  } catch (err) {
    await query("ROLLBACK");
    console.error("CONTEST INSERT ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ------------------ GET CONTEST WITH PRIZES ------------------ */
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
