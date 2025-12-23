import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { query } from "../db.js";

dotenv.config();

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "default_secret_key";

/* ======================================================
   🔐 AUTH MIDDLEWARE (Bearer Token)
====================================================== */
function auth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

/* ======================================================
   🔐 LOGIN
====================================================== */
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "username & password required" });
  }

  try {
    const result = await query(
      "SELECT * FROM admin WHERE username=$1",
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Admin not found" });
    }

    const admin = result.rows[0];
    const valid = await bcrypt.compare(password, admin.password);

    if (!valid) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    const token = jwt.sign(
      {
        id: admin.id,
        username: admin.username,
        role: admin.role,
      },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    return res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* ======================================================
   🔥 GET LOGGED-IN ADMIN
====================================================== */
router.get("/me", auth, async (req, res) => {
  try {
    const result = await query(
      "SELECT id, username, role FROM admin WHERE id=$1",
      [req.admin.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Admin not found" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

/* ======================================================
   🚪 LOGOUT (CLIENT SIDE TOKEN DELETE)
====================================================== */
router.post("/logout", (req, res) => {
  return res.json({ message: "Logged out" });
});

export default router;
