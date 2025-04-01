import request from "./request.js";

declare let lineSets: DeckInfo[]

let _lineSets: DeckInfo[] = lineSets;

async function pull() {
  try {
    _lineSets = await request("/feline/linesets", { method: "GET" });
  } catch (err) {
    console.log("Failed updating linset listing!");
    console.error(err);
  }
}

export async function RenameLineset(id: number, newName: string) {
  await request(`/feline/linesets/${id}`, {
    method: "PUT",
    body: JSON.stringify({ title: newName }),
  });

  await pull();
}

export async function AddLineset(title: string) {
  const data = await request(`/feline/linesets`, {
    method: "POST",
    body: JSON.stringify({ title })
  });
  await pull();
  return parseInt(data.id);
}

export async function DeleteLineset(id: number) {
  await request(`/feline/linesets/${id}`, { method: "DELETE" });
  await pull();
}

export async function GetLinesets() {
  return _lineSets;
}
