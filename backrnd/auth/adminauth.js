import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { query } from "../db.js";

dotenv.config();

const router = express.Router();
router.use(cookieParser());

const JWT_SECRET = process.env.JWT_SECRET || "default_secret_key";

// ======================================================
// 🔐 MIDDLEWARE – CHECK COOKIE TOKEN
// ======================================================
function auth(req, res, next) {
  const token = req.cookies.token; // GET TOKEN FROM COOKIE

  if (!token) {
    return res.status(401).json({ error: "Not authorized" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
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
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ error: "username & password required" });

  try {
    const result = await query("SELECT * FROM admin WHERE username=$1", [
      username,
    ]);

    if (result.rows.length === 0)
      return res.status(401).json({ error: "Admin not found" });

    const admin = result.rows[0];
    const valid = await bcrypt.compare(password, admin.password);

    if (!valid) return res.status(401).json({ error: "Incorrect password" });

    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: admin.role },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    // Store token in cookie
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 2, // 2 hours
    });

    res.json({
      message: "Login success",
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ======================================================
// 📝 SIGNUP
// ======================================================
router.post("/signup", async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password)
    return res.status(400).json({ error: "Username & password required" });

  try {
    const exists = await query("SELECT * FROM admin WHERE username=$1", [
      username,
    ]);

    if (exists.rows.length > 0)
      return res.status(400).json({ error: "Username already exists" });

    const hashed = await bcrypt.hash(password, 10);

    const result = await query(
      "INSERT INTO admin (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role",
      [username, hashed, role || "superadmin"]
    );

    const admin = result.rows[0];

    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: admin.role },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 2,
    });

    res.json({ message: "Signup success", admin });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ======================================================
// 🔥 GET ADMIN DETAILS
// ======================================================
router.get("/me", auth, async (req, res) => {
  try {
    const result = await query(
      "SELECT id, username, role FROM admin WHERE id=$1",
      [req.admin.id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Admin not found" });

    res.json(result.rows[0]);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ======================================================
// 🚪 LOGOUT
// ======================================================
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
});

export default router;
