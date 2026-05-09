import express from "express";
import cors from "cors";

import adminRoutes from "./admin/signin/adminauth.js";
import adminMatch from "./admin/game_control/match.js";
import dataInsert from "./admin/game_control/data_insert.js"; 
import dataFetch from "./admin/game_control/data_fetch.js";


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
app.use("/insert", dataInsert);
app.use("/fetch", dataFetch);
app.use("/admin_match", adminMatch);





app.get("/", (req, res) => {
  res.json({ status: "Backend running 🚀" });


});

export default app;
