export async function sessionStatus(req, res){
    if (req.session.user) {
        res.json({ eingeloggt: true, user: req.session.user });
    } else {
        res.json({ eingeloggt: false, message: "Ausgeloggt" });
    }
}


export async function sessionVerlaengern(req, res, next){
    const now = Date.now();

    // Prüfen, ob der Benutzer zu lange inaktiv war
    if (req.session?.lastActivity && now - req.session.lastActivity > 10 * 60 * 1000) {
        console.log("Session wegen 5 Minuten Inaktivität beendet");
        req.session.destroy(() => {
        console.log("Session gelöscht");
    });
    return res.status(401).json({
      eingeloggt: false,
      message: "Sitzung abgelaufen (Inaktivität). Bitte erneut einloggen.",
    });
    }

  // verlängern bei aktivität
  if (req.session && ["POST", "PUT", "DELETE"].includes(req.method)) {
    req.session.lastActivity = now;
    console.log("Session verlängert")
  }

  next();
}