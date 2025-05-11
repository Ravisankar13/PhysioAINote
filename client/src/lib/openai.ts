import { SoapNoteInput } from "@shared/schema";
import { apiRequest } from "./queryClient";

export async function generateSoapNote(input: SoapNoteInput) {
  const response = await apiRequest("POST", "/api/notes/generate", input);
  return await response.json();
}

export async function saveClinicalNote(noteData: any) {
  const response = await apiRequest("POST", "/api/notes", noteData);
  return await response.json();
}

export async function getClinicalNotes() {
  const response = await apiRequest("GET", "/api/notes");
  return await response.json();
}

export async function getClinicalNote(id: number) {
  const response = await apiRequest("GET", `/api/notes/${id}`);
  return await response.json();
}
