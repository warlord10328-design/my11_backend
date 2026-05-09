import express from "express";
import multer from "multer";
import fs from "fs";
import imagekit from "../../controller/imagekit.js";
import { query } from "../../db.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

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

router.post("/tournament", async (req, res) => {
  try {
    const { api_id, name, startDate, endDate } = req.body;

    const result = await query(
      `INSERT INTO Tournament (api_id, name, start_date, end_date) VALUES ($1, $2, $3, $4) RETURNING *`,
      [api_id, name, startDate, endDate]
    );

    res.json({ success: true, message: "Tournament inserted successfully", data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

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

router.post("/venue", (req, res) => {

  console.log("Venue route hit");

  res.json({
    success: true,
    message: "Venue route working"
  });

});

// ---------- GET CONTESTS ----------
router.get("/contests", async (req, res) => {
  try {
    const result = await query(`SELECT * FROM contest ORDER BY contest_id DESC`);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// ---------- GET TEAMS ----------
router.get("/team", async (req, res) => {
  try {
    const result = await query(`SELECT * FROM team ORDER BY id DESC`);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.post("/contests", async (req, res) => {
  try {
    const { capacity, entry_fee, prize_pool, single_capacity, type, prizes = [] } = req.body;

    if (!capacity || !entry_fee || !prize_pool || !single_capacity || !type) {
      return res.status(400).json({ success: false, error: "Missing contest fields" });
    }

    await query("BEGIN");

    // Insert contest
    const contestResult = await query(
      `INSERT INTO contest (capacity, entry_fee, prize_pool, single_capacity, type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [capacity, entry_fee, prize_pool, single_capacity, type]
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
