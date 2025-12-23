// routes/insert.js
import express from "express";
import multer from "multer";
import imagekit from "../controller/imagekit.js";
import { query } from "../db.js";

const router = express.Router();

/* -----------------------------------
   MULTER (MEMORY STORAGE - REQUIRED)
----------------------------------- */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

/* -----------------------------------
   IMAGEKIT UPLOAD FUNCTION (BUFFER)
----------------------------------- */
async function uploadToImageKit(file, folderName) {
  if (!file) return null;

  const uploaded = await imagekit.upload({
    file: file.buffer,               // 🔥 buffer, not path
    fileName: file.originalname,
    folder: `/${folderName}`
  });

  return uploaded.url;
}

/* -----------------------------------
   INSERT TOURNAMENT
----------------------------------- */
router.post("/tournament", async (req, res) => {
  try {
    const { name } = req.body;

    const result = await query(
      `INSERT INTO tournament (name) VALUES ($1) RETURNING *`,
      [name]
    );

    res.json({
      success: true,
      message: "Tournament inserted successfully",
      data: result.rows[0]
    });
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
      `INSERT INTO team (name, image, short, tournament_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, imageUrl, name_short, tournament_id]
    );

    res.json({
      success: true,
      message: "Team inserted successfully",
      data: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -----------------------------------
   INSERT PLAYER (WITH IMAGE)
----------------------------------- */
router.post("/player", upload.single("image"), async (req, res) => {
  try {
    const { name, team_id, role, dob } = req.body;

    const imageUrl = await uploadToImageKit(req.file, "player");

    const result = await query(
      `INSERT INTO player (name, image, team_id, role, dob)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, imageUrl, team_id, role, dob]
    );

    res.json({
      success: true,
      message: "Player inserted successfully",
      data: result.rows[0]
    });
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
      `INSERT INTO venue (name, city, country)
       VALUES ($1, $2, $3) RETURNING *`,
      [name, city, country]
    );

    res.json({
      success: true,
      message: "Venue inserted successfully",
      data: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -----------------------------------
   GET ROUTES
----------------------------------- */
router.get("/tournament", async (req, res) => {
  try {
    const result = await query(`SELECT * FROM tournament ORDER BY id ASC`);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/team", async (req, res) => {
  try {
    const result = await query(`SELECT * FROM team ORDER BY id ASC`);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/player", async (req, res) => {
  try {
    const result = await query(`SELECT * FROM player ORDER BY id ASC`);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/venue", async (req, res) => {
  try {
    const result = await query(`SELECT * FROM venue ORDER BY id ASC`);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -----------------------------------
   DROPDOWN DATA
----------------------------------- */
router.get("/data", async (req, res) => {
  try {
    const tournaments = await query(`SELECT id, name FROM tournament`);
    const teams = await query(`SELECT id, name FROM team`);
    const venues = await query(`SELECT id, name FROM venue`);

    res.json({
      success: true,
      tournaments: tournaments.rows,
      teams: teams.rows,
      venues: venues.rows
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -----------------------------------
   INSERT CONTEST
----------------------------------- */
router.post("/contest", async (req, res) => {
  try {
    const { tournament_id, teamA_id, teamB_id, venue_id, date, time } = req.body;

    const result = await query(
      `INSERT INTO match
       (tournament, team1, team2, venue, date, time, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'upcoming')
       RETURNING *`,
      [tournament_id, teamA_id, teamB_id, venue_id, date, time]
    );

    res.json({
      success: true,
      message: "Match created successfully",
      data: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -----------------------------------
   GET CONTEST LIST
----------------------------------- */
router.get("/contest", async (req, res) => {
  try {
    const result = await query(`
      SELECT c.id, c.date, c.time, c.status,
             t1.short AS team1,
             t2.short AS team2,
             tr.name AS tournament,
             v.name AS venue
      FROM match c
      JOIN team t1 ON c.team1 = t1.id
      JOIN team t2 ON c.team2 = t2.id
      JOIN tournament tr ON c.tournament = tr.id
      JOIN venue v ON c.venue = v.id
      ORDER BY c.date, c.time
    `);

    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -----------------------------------
   PLAYER CHECK
----------------------------------- */
router.post("/check", async (req, res) => {
  try {
    const { teamA = [], teamB = [] } = req.body;

    const allPlayers = [...teamA, ...teamB].map(p =>
      (p || "").toLowerCase()
    );

    const result = await query(
      `SELECT name FROM player WHERE LOWER(name) = ANY($1)`,
      [allPlayers]
    );

    const present = result.rows.map(r =>
      (r.name || "").toLowerCase()
    );

    res.json({
      success: true,
      missingA: teamA.filter(p => !present.includes((p || "").toLowerCase())),
      missingB: teamB.filter(p => !present.includes((p || "").toLowerCase()))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
