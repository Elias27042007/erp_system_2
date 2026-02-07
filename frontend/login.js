import { showToast } from "./alert.js";

const userInput = document.getElementById("floatingInput");
const passInput = document.getElementById("floatingPassword");

[userInput, passInput].forEach(input => {
    input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            document.getElementById("loginButton").click();
        }
    });
});


document.getElementById("loginButton").addEventListener("click", async () => {
    const benutzername = document.getElementById("floatingInput").value;
    const passwort = document.getElementById("floatingPassword").value;


    const res = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ benutzername, passwort }),
    });

    const data = await res.json();
    console.log("Antwort vom Server:", data);

    if (data.success) {
        window.location.href = "index.html";
    } else {
        showToast(data.message, "error")
    }
});