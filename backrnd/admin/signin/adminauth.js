import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { query } from "../../db.js";

dotenv.config();

const router = express.Router();
router.use(cookieParser());

const JWT_SECRET_ADMIN = process.env.JWT_SECRET_ADMIN || "default_secret_key";

// ======================================================
// 🔐 MIDDLEWARE – CHECK COOKIE TOKEN
// ======================================================
function auth(req, res, next) {
  const token = req.cookies.admin_token; // GET TOKEN FROM COOKIE

  if (!token) {
    return res.status(401).json({ error: "Not authorized" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET_ADMIN);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ======================================================
// 🔐 LOGIN
// ======================================================
router.post("/login", async (req, res) => {
  res.json({
    success: true
  });
});

export default router;
