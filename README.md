# 🥊 UFC PICKS

Tu diario personal de predicciones de UFC: haces tus picks antes de cada evento,
marcas los resultados después… y la app calcula qué tan buen predictor eres.

## Qué puede hacer

- 🔐 **Login privado** con email/contraseña o Google (Firebase Authentication).
  Tus picks solo los ves tú.
- 📅 **Eventos**: crea "UFC 305", añade la fecha y sus peleas (peleador A vs B,
  categoría de peso, cartelera principal/preliminar, si es por título).
- 🎯 **Picks por pelea**: ganador (esquina roja o azul), método (KO/TKO,
  Sumisión, Decisión), round, confianza de 1 a 5 estrellas y nota táctica.
- ✅ **Resultados**: marca quién ganó de verdad y la app puntúa automáticamente.
- 📊 **Dashboard**: % de acierto de ganador, % de acierto de método, racha actual,
  picks perfectos, evolución acumulada por evento y acierto por categoría de peso.
- 📜 **Historial**: todos tus picks vs los resultados reales, con filtro por año
  y por categoría de peso.

## Sistema de puntos

| Acertaste...                        | Puntos |
|-------------------------------------|--------|
| Solo el ganador                     | 1      |
| Ganador + método de victoria        | 2      |
| Ganador + método + round (perfecto) | 3      |
| Fallaste el ganador                 | 0      |

> El round solo cuenta en KO/TKO y Sumisión (una Decisión no tiene round).

---

## ⚙️ Puesta en marcha (una sola vez)

> **💡 Esta app reusa el proyecto Firebase de deberes (`deberes-e3282`)**, así que
> los pasos 1 (crear proyecto), 2 (pegar config), 3 (login de Google + dominio
> autorizado) **ya están hechos**. Solo queda el paso 4 (reglas de Firestore) —
> ¡usa las reglas combinadas de abajo para que seguir funcionando deberes!
> El paso 3.1 (email/contraseña) es opcional: con Google ya puedes entrar.

### 1. Crear el proyecto Firebase

1. Entra en [console.firebase.google.com](https://console.firebase.google.com) con tu cuenta de Google.
2. **Crear un proyecto** → nombre `ufc-picks` → desactiva Analytics → Crear.
3. En la rueda de configuración (⚙️) → **Configuración del proyecto** → abajo, en
   "Tus apps", pulsa el icono **web `</>`**, ponle el sobrenombre `ufc-picks` y
   Registra la app (el hosting no hace falta).
4. Te enseña un objeto `firebaseConfig`. Cópialo.

### 2. Pegar la configuración

Abre `js/firebase-config.js` y sustituye los valores `PEGA_AQUI_...` por los de
tu objeto. Guarda.

### 3. Activar el login

1. En Firebase → **Authentication** → **Comenzar**.
2. Pestaña **Sign-in method**:
   - Activa **Correo electrónico/contraseña**.
   - Activa **Google** (elige tu email como apoyo).
3. Pestaña **Settings → Dominios autorizados** → **Añadir dominio** y escribe:
   `arandabarbadev.github.io` (sin `https://`). Así funcionará el login desde
   GitHub Pages. `localhost` ya viene permitido para probar en local.

### 4. Crear la base de datos

1. Firebase → **Firestore Database** → la base de datos ya existe (la de deberes):
   entra en **Firestore Database → pestaña Reglas**.
2. ⚠️ **Importante:** borra lo que haya y pega estas **reglas combinadas**, que
   mantienen los datos privados en las DOS apps (deberes usa `usuarios/...` y
   UFC Picks usa `users/...`; si pegas solo las de UFC Picks, deberes se queda
   sin guardar en la nube):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // App de deberes
    match /usuarios/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    // App UFC Picks (eventos, peleas, picks...)
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
``````

3. Publica las reglas.

### 5. Probar en local

Los módulos ES no funcionan abriendo `index.html` con doble clic; hace falta un
servidor local. Cualquiera de estas vale:

- **VS Code**: extensión "Live Server" → botón derecho en `index.html` → *Open with Live Server*.
- **Python** (si lo tienes): `python -m http.server 8000` y abre `http://localhost:8000`.

Deberías poder registrarte con tu email y ver la app vacía. 🎉

### 6. Publicar en GitHub Pages

El repositorio ya está preparado: GitHub Pages sirve la rama `main` desde la raíz.
Si hubiera que activarlo a mano: repositorio → **Settings → Pages** →
*Source: Deploy from a branch* → rama `main`, carpeta `/ (root)` → Save.

Tu app quedará en: **https://arandabarbadev.github.io/ufc-picks/**

---

## Cómo se usa

1. **Antes del evento**: pestaña EVENTOS → `+` → crea el evento ("UFC 305", fecha)
   → añade peleas → en cada pelea pulsa **HACER PICK** (ganador, método, round,
   confianza y tu razonamiento).
2. **Después del evento**: entra en el evento → en cada pelea pulsa
   **MARCAR RESULTADO** → la app te dice al instante si acertaste y cuántos puntos.
3. **Ver tu nivel**: pestaña INICIO (dashboard) e HISTORIAL (picks vs resultados
   con filtros).

## Estructura de los datos (Firestore)

```
users/{uid}/events/{eventId}                 ← nombre y fecha del evento
users/{uid}/events/{eventId}/fights/{id}     ← peleadores, peso, título…
                                               pick:   { winner, method, round, confidence, note }
                                               result: { winner, method, round }
```

Todo vive bajo tu `uid`, así que las reglas del paso 4 hacen la app 100% privada.

## Código

- `index.html` — estructura de la app (login, barra inferior, vistas).
- `css/style.css` — estilo oscuro UFC (mobile-first).
- `js/firebase-config.js` — ⚙️ tu configuración de Firebase.
- `js/auth.js` — login email/contraseña y Google.
- `js/db.js` — lectura/escritura en Firestore (en vivo, sin refrescar).
- `js/stats.js` — puntuación 1/2/3 y todas las estadísticas.
- `js/views.js` — eventos, peleas, formularios de pick y resultado, historial.
- `js/dashboard.js` + `js/charts.js` — panel de estadísticas y gráficas (Chart.js).
- `js/main.js` — sesión, datos en vivo y navegación.
- `js/ui.js` — utilidades (modales, avisos, fechas…).
