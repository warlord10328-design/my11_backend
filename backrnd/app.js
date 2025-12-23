import express from "express";
import cors from "cors";

import userMatchRoutes from "./controller/usermatch.js";
import adminRoutes from "./auth/adminauth.js";
import userRoutes from "./auth/userauth.js";
import insertRoutes from "./auth/insert.js";
import scrapeData from "./auth/scrapme.js";

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: "https://my11-admin-run.vercel.app",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// -------------------- ROUTES --------------------
app.use("/", userRoutes);
app.use("/match", userMatchRoutes);
app.use("/admin", adminRoutes);
app.use("/insert", insertRoutes);
app.use("/scrape", scrapeData);

app.get("/", (req, res) => {
  res.json({ status: "Backend running 🚀" });
});

export default app;
