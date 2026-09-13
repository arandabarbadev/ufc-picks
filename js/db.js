// Acceso a Firestore.
// Estructura (todo bajo tu usuario → 100% privado con las reglas del README):
//   users/{uid}/events/{eventId}            → nombre, fecha
//   users/{uid}/events/{eventId}/fights/{id} → peleadores, peso, título,
//                                              pick (objeto) y result (objeto)

import { db } from "./firebase-config.js";
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, getDocs,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const eventsCol = (uid) => collection(db, "users", uid, "events");
const fightsCol = (uid, eventId) => collection(db, "users", uid, "events", eventId, "fights");
const eventDoc = (uid, eventId) => doc(db, "users", uid, "events", eventId);
const fightDoc = (uid, eventId, fightId) => doc(db, "users", uid, "events", eventId, "fights", fightId);

/* ── Eventos ─────────────────────────────────────────── */

/** Suscripción en vivo a la lista de eventos. Devuelve función para dejar de escuchar. */
export function watchEvents(uid, cb) {
  return onSnapshot(query(eventsCol(uid), orderBy("createdAt", "desc")), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function addEvent(uid, data) {
  await addDoc(eventsCol(uid), { ...data, createdAt: Date.now() });
}

export async function updateEvent(uid, eventId, data) {
  await updateDoc(eventDoc(uid, eventId), data);
}

/** Borra un evento y todas sus peleas (Firestore no borra subcolecciones en cascada). */
export async function deleteEvent(uid, eventId) {
  const snap = await getDocs(fightsCol(uid, eventId));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(eventDoc(uid, eventId));
}

/* ── Peleas ──────────────────────────────────────────── */

/** Suscripción en vivo a las peleas de un evento. */
export function watchFights(uid, eventId, cb) {
  return onSnapshot(query(fightsCol(uid, eventId), orderBy("order", "asc")), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function addFight(uid, eventId, data) {
  const snap = await getDocs(fightsCol(uid, eventId));
  await addDoc(fightsCol(uid, eventId), { ...data, order: snap.size + 1, createdAt: Date.now() });
}

export async function deleteFight(uid, eventId, fightId) {
  await deleteDoc(fightDoc(uid, eventId, fightId));
}

/* ── Picks y resultados (viven dentro de cada pelea) ─── */

export async function savePick(uid, eventId, fightId, pick) {
  await updateDoc(fightDoc(uid, eventId, fightId), { pick });
}

export async function deletePick(uid, eventId, fightId) {
  await updateDoc(fightDoc(uid, eventId, fightId), { pick: null });
}

export async function saveResult(uid, eventId, fightId, result) {
  await updateDoc(fightDoc(uid, eventId, fightId), { result });
}

export async function deleteResult(uid, eventId, fightId) {
  await updateDoc(fightDoc(uid, eventId, fightId), { result: null });
}
