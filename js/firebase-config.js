// ⚙️ CONFIGURACIÓN DE FIREBASE
// ─────────────────────────────
// 1. Entra en https://console.firebase.google.com y crea un proyecto.
// 2. Añade una app WEB (icono "</>") y copia el objeto firebaseConfig que te da.
// 3. Pega aquí esos valores (los pasos detallados están en el README.md).
//
// Mientras los valores empiecen por "PEGA_AQUI", la app mostrará un aviso
// y no dejará iniciar sesión.

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "PEGA_AQUI_API_KEY",
  authDomain: "PEGA_AQUI_AUTH_DOMAIN",
  projectId: "PEGA_AQUI_PROJECT_ID",
  storageBucket: "PEGA_AQUI_STORAGE_BUCKET",
  messagingSenderId: "PEGA_AQUI_MESSAGING_SENDER_ID",
  appId: "PEGA_AQUI_APP_ID",
};

// ¿Ya está configurado? (comprueba que no queden los placeholders)
export const isConfigured = Object.values(firebaseConfig).every(
  (v) => typeof v === "string" && !v.startsWith("PEGA_AQUI")
);

export const app = isConfigured ? initializeApp(firebaseConfig) : null;
export const auth = isConfigured ? getAuth(app) : null;
export const db = isConfigured ? getFirestore(app) : null;
