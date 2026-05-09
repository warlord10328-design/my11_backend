import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import pool from "./db.js";

dotenv.config();

const app = express();

// middleware
app.use(express.json());

app.use(cors({
  origin: "https://my11-admin-run.vercel.app",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.options("*", cors());

// routes
app.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      message: "✅ Backend connected successfully!",
      time: result.rows[0].now,
    });

  } catch (err) {
    console.error("Database error:", err);

    res.status(500).json({
      error: "Database connection failed"
    });
  }
});

// IMPORTANT
export default app;
