import express from "express";
import cors from "cors";

import adminRoutes from "./admin/signin/adminauth.js";

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

app.use("/admin", adminRoutes);







app.get("/", (req, res) => {
  res.json({ status: "Backend running 🚀" });


});

export default app;
