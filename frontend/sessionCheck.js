import { showToast } from "./alert.js";

export async function checkSession() {
  try {
    const response = await fetch("/session-status");
    const data = await response.json();

    if (!data.eingeloggt) {
      console.warn("Session abgelaufen oder nicht eingeloggt:", data.message);
      showToast(data.message, "warning");
      // Weiterleitung zur Login-Seite
      window.location.href = "login.html";
    } else {
      console.log("Session aktiv:"/*, data.user?.username ?? "Unbekannter Benutzer"*/); 
      
    }
  } catch (err) {
    console.error("Fehler bei der Sessionprüfung:", err);
    window.location.href = "login.html";
  }
}

// Direkt beim Laden die Session prüfen
checkSession();

// Alle 30 Sekunden erneut prüfen
setInterval(checkSession, 30000);
