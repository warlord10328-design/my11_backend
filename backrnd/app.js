import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// ======================================================
// MIDDLEWARE
// ======================================================

app.use(express.json());

app.use(cookieParser());

// ======================================================
// CORS
// ======================================================

app.use(
  cors({
    origin: "https://my11-admin-run.vercel.app",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// IMPORTANT FOR PREFLIGHT
app.options("*", cors());

// ======================================================
// HEALTH CHECK
// ======================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Backend Working",
  });
});

// ======================================================
// SAFE ROUTES
// ======================================================

// add routes one-by-one slowly

import adminSignin from "./admin/signin/adminauth.js";
app.use("/admin", adminSignin);

// ======================================================
// OPTIONAL ROUTES (ADD LATER ONE-BY-ONE)
// ======================================================

// import userRoutes from "./auth/userauth.js";
// app.use("/", userRoutes);

// import userMatchRoutes from "./controller/usermatch.js";
// app.use("/match", userMatchRoutes);

// import userContest from "./user/user_contest.js";
// app.use("/contests", userContest);

// import userTeam from "./user/user_team_creation.js";
// app.use("/userteam", userTeam);

// import adminMatch from "./admin/game_control/match.js";
// app.use("/admin_match", adminMatch);

// import dataInsert from "./admin/game_control/data_insert.js";
// app.use("/insert", dataInsert);

// import dataFetch from "./admin/game_control/data_fetch.js";
// app.use("/fetch", dataFetch);

// ======================================================
// DANGEROUS ROUTES (TEST LAST)
// ======================================================

// import scrapeData from "./auth/scrapme.js";
// app.use("/scrape", scrapeData);

// import apiRun from "./admin/api/fetch.js";
// app.use("/apiRun", apiRun);

// import jobRun from "./admin/api/job.js";
// app.use("/jobRun", jobRun);

// ======================================================
// ERROR HANDLER
// ======================================================

app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);

  res.status(500).json({
    success: false,
    error: "Internal Server Error",
  });
});

// ======================================================
// EXPORT FOR VERCEL
// ======================================================

export default app;
