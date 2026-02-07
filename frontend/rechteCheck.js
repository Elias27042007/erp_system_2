
export async function darf(modul, aktion) {
  const res = await fetch("/darf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ modul, aktion })
  });

  if (!res.ok) {
    console.error("Fehler beim Rechtecheck");
    return false;
  }

  const data = await res.json();
  return data.erlaubt;
}
