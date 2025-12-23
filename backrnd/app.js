import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import userMatchRoutes from "./controller/usermatch.js";
import adminRoutes from "./auth/adminauth.js";
import userRoutes from "./auth/userauth.js";
import insertRoutes from "./auth/insert.js"; 
import scrapeData from "./auth/scrapme.js"; 

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: [process.env.FRONTEND_URL],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// -------------------- ROUTES --------------------
app.use("/", userRoutes);             // /me, /login, /logout
app.use("/match", userMatchRoutes); // /matches, /matches/:id
app.use("/admin", adminRoutes);
app.use("/insert", insertRoutes);
app.use("/scrape", scrapeData);

app.get("/", (req, res) => {
  res.status(200).json({ status: "Backend running 🚀" });
});

// -------------------- SERVER --------------------
export default app;




