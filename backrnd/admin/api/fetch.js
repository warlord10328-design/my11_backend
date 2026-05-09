import express from "express";
import { query } from "../../db.js";

const router = express.Router();

router.get("/series", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 25;
    const offset = parseInt(req.query.offset) || 0;

    const dbData = await query(
      `
      SELECT id, name, api_id, start_date, end_date
      FROM tournament
      ORDER BY start_date ASC   -- ✅ ASC ORDER
      LIMIT $1 OFFSET $2
      `,
      [limit, offset]
    );

    res.json({
      success: true,
      data: dbData.rows,
    });

  } catch (err) {
    console.error("DB Error:", err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch series",
    });
  }
});

export default router;