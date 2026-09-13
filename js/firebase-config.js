// ⚙️ CONFIGURACIÓN DE FIREBASE
// ─────────────────────────────
// Reusamos el mismo proyecto Firebase que la app de deberes (deberes-e3282):
// el login de Google ya está activado y el dominio arandabarbadev.github.io
// ya está autorizado. Esta config NO es un secreto: es la dirección pública
// del proyecto; la seguridad la ponen las reglas de Firestore + tu sesión.

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC1mBofZooE010PRKjCo-fENDYU1lqWbh0",
  authDomain: "deberes-e3282.firebaseapp.com",
  projectId: "deberes-e3282",
  storageBucket: "deberes-e3282.firebasestorage.app",
  messagingSenderId: "457365914046",
  appId: "1:457365914046:web:e3cf994128c4b75da479ef",
};

// ¿Ya está configurado? (comprueba que no queden los placeholders)
export const isConfigured = Object.values(firebaseConfig).every(
  (v) => typeof v === "string" && !v.startsWith("PEGA_AQUI")
);

export const app = isConfigured ? initializeApp(firebaseConfig) : null;
export const auth = isConfigured ? getAuth(app) : null;
export const db = isConfigured ? getFirestore(app) : null;
