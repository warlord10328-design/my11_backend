import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import adminSignin from "./admin/signin/adminauth.js";


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
app.use("/admin", adminSignin);

// health route
app.get("/", (req, res) => {
  res.send("Backend Running");
});

export default app;
