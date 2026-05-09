import express from "express";
import cors from "cors";

const app = express();

app.use(cors({
  origin: "https://my11-admin-run.vercel.app",
  credentials: true
}));

app.options("*", cors());

app.get("/", (req, res) => {
  res.send("working");
});

app.post("/admin/login", (req, res) => {
  res.json({
    success: true
  });
});

export default app;
