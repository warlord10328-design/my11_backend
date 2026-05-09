import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import userMatchRoutes from "./controller/usermatch.js";
import adminSignin from "./admin/signin/adminauth.js";
import userContest from "./user/user_contest.js";
import userRoutes from "./auth/userauth.js";
import adminMatch from "./admin/game_control/match.js";
import dataInsert from "./admin/game_control/data_insert.js";
import dataFetch from "./admin/game_control/data_fetch.js";
import apiRun from "./admin/api/fetch.js";
import jobRun from "./admin/api/job.js";
import scrapeData from "./auth/scrapme.js";
import userTeam from "./user/user_team_creation.js";

const app = express();

// -------------------- CORS --------------------
app.use(cors({
  origin: "https://my11-admin-run.vercel.app",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// IMPORTANT
app.options("*", cors());

// -------------------- MIDDLEWARE --------------------
app.use(express.json());
app.use(cookieParser());

// -------------------- ROUTES --------------------
app.use("/", userRoutes);
app.use("/match", userMatchRoutes);
app.use("/admin", adminSignin);
app.use("/insert", dataInsert);
app.use("/fetch", dataFetch);
app.use("/scrape", scrapeData);
app.use("/admin_match", adminMatch);
app.use("/contests", userContest);
app.use("/userteam", userTeam);
app.use("/jobRun", jobRun);
app.use("/apiRun", apiRun);

// health route
app.get("/", (req, res) => {
  res.send("Backend Running");
});

export default app;
