import express from "express";
import { fetchSquad } from "../controller/insert.js";

const router = express.Router();

router.post("/scrape-squad", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) return res.json({ success: false, msg: "URL required" });

    const squads = await fetchSquad(url);

    res.json({
      success: true,
      squads,
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});


export default router;
