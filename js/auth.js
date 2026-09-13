// Pantalla de login: email/contraseña (entrar o registrarse) + Google.

import { auth, isConfigured } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { toast } from "./ui.js";

let modoRegistro = false;

/** Traduce los códigos de error de Firebase a mensajes claros. */
function errorES(e) {
  const map = {
    "auth/invalid-email": "Ese email no parece válido.",
    "auth/missing-password": "Escribe tu contraseña.",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
    "auth/email-already-in-use": "Ya existe una cuenta con ese email. Prueba a entrar.",
    "auth/invalid-credential": "Email o contraseña incorrectos.",
    "auth/wrong-password": "Contraseña incorrecta.",
    "auth/user-not-found": "No existe una cuenta con ese email.",
    "auth/popup-closed-by-user": "Ventana de Google cerrada antes de terminar.",
    "auth/unauthorized-domain": "Este dominio no está autorizado en Firebase (mira el README, paso 3).",
    "auth/operation-not-allowed": "Activa este método de login en Firebase → Authentication (mira el README, paso 3).",
  };
  return map[e?.code] || e?.message || "Error desconocido.";
}

export function initAuthUI() {
  const form = document.getElementById("login-form");
  const errBox = document.getElementById("auth-error");
  const btnLogin = document.getElementById("btn-login");
  const btnGoogle = document.getElementById("btn-google");
  const btnSwitch = document.getElementById("btn-switch");
  const switchText = document.getElementById("switch-text");
  const setupWarning = document.getElementById("setup-warning");

  // Si Firebase no está configurado, muestra el aviso y desactiva el formulario
  if (!isConfigured) {
    setupWarning.hidden = false;
    form.querySelectorAll("input, button").forEach((el) => (el.disabled = true));
    return;
  }

  function showError(msg) {
    errBox.textContent = msg;
    errBox.hidden = false;
  }
  function busy(b) {
    btnLogin.disabled = b;
    btnGoogle.disabled = b;
    btnLogin.textContent = b ? "UN MOMENTO…" : modoRegistro ? "CREAR CUENTA" : "ENTRAR";
  }

  btnSwitch.addEventListener("click", () => {
    modoRegistro = !modoRegistro;
    switchText.textContent = modoRegistro ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?";
    btnSwitch.textContent = modoRegistro ? "Entrar" : "Regístrate";
    btnLogin.textContent = modoRegistro ? "CREAR CUENTA" : "ENTRAR";
    errBox.hidden = true;
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errBox.hidden = true;
    const email = document.getElementById("email").value.trim();
    const pass = document.getElementById("password").value;
    if (!email || !pass) return showError("Rellena email y contraseña.");

    busy(true);
    try {
      if (modoRegistro) {
        await createUserWithEmailAndPassword(auth, email, pass);
        toast("¡Cuenta creada! Bienvenido al octágono 🥊", "ok");
      } else {
        await signInWithEmailAndPassword(auth, email, pass);
        toast("¡Listo para la cartelera! 🥊", "ok");
      }
    } catch (err) {
      showError(errorES(err));
    } finally {
      busy(false);
    }
  });

  btnGoogle.addEventListener("click", async () => {
    busy(true);
    errBox.hidden = true;
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      toast("¡Listo para la cartelera! 🥊", "ok");
    } catch (err) {
      showError(errorES(err));
    } finally {
      busy(false);
    }
  });
}
