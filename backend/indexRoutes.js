import express from "express";
import db from "./db.js";

const router = express.Router();

router.get("/umsatz-monate", async (req, res) => {
  try {
    const months = Math.max(1, Number(req.query.months ?? 6));

    const sql = `
      SELECT
        DATE_FORMAT(datum, '%Y-%m') AS monat,
        ROUND(SUM(netto_summe), 2) AS umsatz
      FROM rechnung
      WHERE
        typ = 'rechnung'
        AND status = 'bezahlt'
        AND datum >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      GROUP BY DATE_FORMAT(datum, '%Y-%m')
      ORDER BY monat;
    `;

    const [rows] = await db.query(sql, [months]);
    res.json(rows);
  } catch (err) {
    console.error("Umsatz-Statistik Fehler:", err);
  res.status(500).json({
    error: "Umsatz konnte nicht geladen werden",
    code: err.code,
    message: err.message
  });
  }
});

export default router;
