import express from "express";
import session from "express-session";
import path from "node:path";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

import { loginHandler } from "./login.js";
import {
  hinzufuegenMitarbeiter,
  ladeMitarbeiter,
  abwesend,
  loescheMitarbeiter,
  updateMitarbeiter,
  checkaktivMitarbeiter,
  updateaktivMitarbeiter,
  ladeUrlaubMitarbeiter,
  ladeKrankenstandMitarbeiter,
  hinzufuegenUrlaubMitarbeiter,
  hinzufuegenKrankenstandMitarbeiter
} from "./mitarbeiter.js";
import { pruefeRechte } from "./rechtesystem.js";
import { sessionStatus, sessionVerlaengern } from "./session.js";

import lagerRoutes from "./lagerRoutes.js";
import rechnungenRoutes from "./rechnungenRoutes.js";
import kundenRoutes from "./kundenRoutes.js";
import serviceRoutes from "./serviceRoutes.js";


import statsRouter from "./indexRoutes.js";

dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPfad = path.resolve(__dirname, "../frontend");
const isDev = process.env.NODE_ENV !== "production";

// Middleware
app.use(express.json());
app.use(express.static(frontendPfad));

// Home
app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPfad, "index.html"));
});

// ✅ Stats-Routen (JETZT korrekt, weil app existiert)
app.use("/stats", statsRouter);

// Session
app.use(
  session({
    secret: "superGeheimesPasswort123",
    resave: false,
    saveUninitialized: false,
    rolling: false,
    cookie: {
      maxAge: 1000 * 60 * 30,
      httpOnly: true,
    },
  })
);

app.use(sessionVerlaengern);
app.get("/session-status", sessionStatus);

// Mitarbeiter
app.get("/mitarbeiter/laden", ladeMitarbeiter);
app.get("/mitarbeiter/abwesend", abwesend);
app.post("/mitarbeiter/hinzufuegen", hinzufuegenMitarbeiter);
app.put("/mitarbeiter/update", updateMitarbeiter);
app.post("/mitarbeiter/loeschen", loescheMitarbeiter);
app.post("/mitarbeiter/checkaktiv", checkaktivMitarbeiter);
app.put("/mitarbeiter/updateaktiv", updateaktivMitarbeiter);
app.post("/mitarbeiter/ladeurlaub", ladeUrlaubMitarbeiter);
app.post("/mitarbeiter/ladekrankenstand", ladeKrankenstandMitarbeiter);
app.put("/mitarbeiter/urlaub/hinzufuegen", hinzufuegenUrlaubMitarbeiter);
app.put("/mitarbeiter/krankenstand/hinzufuegen", hinzufuegenKrankenstandMitarbeiter);

// Login
app.use("/login", loginHandler);

// Rechtesystem
app.post("/darf", pruefeRechte);

// Lager
app.use("/api/lager", lagerRoutes);
app.get("/lager", (req, res) => {
  res.sendFile(process.cwd() + "/public/lager.html");
});

// Rechnungen
app.use("/api/rechnungen", rechnungenRoutes);
app.get("/rechnungen", (req, res) => {
  res.sendFile(process.cwd() + "/public/rechnungen.html");
});

// Kunden
app.use("/api/kunden", kundenRoutes);

//Service
app.use("/api/service", serviceRoutes);


// Logout
app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true, message: "Logout erfolgreich." });
  });
});

// Server Fehler
app.use((error, _req, res, _next) => {
  console.error("Serverfehler:", error);
  return res.status(500).json({
    success: false,
    message: "Unerwarteter Serverfehler.",
    details: isDev ? error.message : undefined,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
