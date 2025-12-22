import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export const query = (text, params) => pool.query(text, params);

pool.connect((err, client, release) => {
  if (err) {
    return console.error("Error connecting to Neon database", err.stack);
  }
  console.log("Connected to Neon PostgreSQL database successfully!");
  release();
});
