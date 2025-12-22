import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import {query} from "../db.js";

const router = express.Router();
router.use(cookieParser());

const JWT_SECRET = process.env.JWT_SECRET || "default_secret_key";

function generateReferralCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ------------------------------
// Middleware → Check JWT Token
// ------------------------------
function authMiddleware(req, res, next) {
  const token = req.cookies.token;

  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ error: "Invalid token" });
  }
}

// ------------------------------
// SIGNUP
// ------------------------------
router.post("/signup", async (req, res) => {
  const { email, password, referral_code } = req.body;

  if (!email || !password)
    return res.json({ error: "Email & password are required" });

  const hashed = await bcrypt.hash(password, 10);

  let referredByEmail = null;

  if (referral_code) {
    const refResult = await query(
      "SELECT email FROM users WHERE referral_code=$1",
      [referral_code]
    );

    if (refResult.rows.length > 0) {
      referredByEmail = refResult.rows[0].email;
    }
  }

  const myReferralCode = generateReferralCode();

  try {
    const result = await query(
      `INSERT INTO users (email, password, wallet, referral_code, referred_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, wallet, referral_code, referred_by`,
      [email, hashed, 0, myReferralCode, referredByEmail]
    );

    const user = result.rows[0];

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, { httpOnly: true, sameSite: "lax" });

    res.json({ message: "Signup success", user });
  } catch (err) {
    console.log(err);
    res.json({ error: "User already exists or DB error" });
  }
});

// ------------------------------
// LOGIN
// ------------------------------
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.json({ error: "Email & password required" });

  const result = await query("SELECT * FROM users WHERE email=$1", [
    email,
  ]);

  if (result.rows.length === 0)
    return res.json({ error: "User not found" });

  const user = result.rows[0];

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.json({ error: "Incorrect password" });

  const token = jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.cookie("token", token, { httpOnly: true, sameSite: "lax" });

  res.json({ message: "Login success", user });
});

// ------------------------------
// CURRENT USER
// ------------------------------
router.get("/me", authMiddleware, async (req, res) => {
  const user = await query(
    `SELECT id, email, name, phone, referral_code, referred_by, wallet,
            upi, state, birth, gender, mobile
     FROM users WHERE id=$1`,
    [req.user.id]
  );

  res.json({ user: user.rows[0] });
});

// ------------------------------
// REFERRAL STATS
// ------------------------------
router.get("/referral-stats", authMiddleware, async (req, res) => {
  try {
    const userResult = await query(
      "SELECT reffers FROM users WHERE id=$1",
      [req.user.id]
    );

    if (userResult.rows.length === 0)
      return res.json({ error: "User not found" });

    const totalReffers = userResult.rows[0].reffers || 0;
    const potentialEarnings = totalReffers * 100;

    res.json({ totalReffers, potentialEarnings });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ------------------------------
// UPDATE PROFILE
// ------------------------------
router.post("/update-user", authMiddleware, async (req, res) => {
  const { name, upi, state, birth, gender, mobile } = req.body;

  await query(
    `UPDATE users SET 
      name=$1, upi=$2, state=$3, birth=$4, gender=$5, mobile=$6 
     WHERE id=$7`,
    [name, upi, state, birth, gender, mobile, req.user.id]
  );

  const updated = await query("SELECT * FROM users WHERE id=$1", [
    req.user.id,
  ]);

  res.json({ message: "Profile updated", user: updated.rows[0] });
});

// ------------------------------
// LOGOUT
// ------------------------------
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
});

export default router;
