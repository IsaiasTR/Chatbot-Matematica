let ejercicios = [];

/* ===============================
   NORMALIZACIÓN DE TEXTO
================================ */

function normalizarTexto(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/* ===============================
   CARGA DE MÚLTIPLES JSON (ROBUSTA)
================================ */

document.addEventListener("DOMContentLoaded", () => {
  const archivos = ["guia1.json", "guia2.json"];

  Promise.all(
    archivos.map(a =>
      fetch(a)
        .then(r => {
          if (!r.ok) throw new Error(`Error HTTP ${r.status} en ${a}`);
          return r.text();
        })
        .then(t => {
          try {
            return JSON.parse(t);
          } catch {
            throw new Error(`JSON inválido en ${a}`);
          }
        })
    )
  )
    .then(data => {
      // data = [ [bloques guia1], [bloques guia2] ]
      ejercicios = data
        .flat()
        .filter(b => Array.isArray(b.ejercicios));

      mensajeBot(
        "Hola 👋 Soy Isaias-Bot, el asistente virtual de <strong>Matemática 51</strong>.<br>" +
        "Cátedra: <strong>Rossomando</strong>.<br><br>" +
        "Podés buscar así:<br>" +
        "<em>ejercicio 2 guia 1</em>, <em>ejercicio 6 guia 2</em>"
      );
    })
    .catch(err => {
      console.error(err);
      mensajeBot("❌ Error al cargar los ejercicios.<br>" + err.message);
    });
});

/* ===============================
   MENSAJES
================================ */

function mensajeUsuario(texto) {
  const chat = document.getElementById("chat-container");
  const div = document.createElement("div");
  div.className = "mensaje usuario";
  div.textContent = texto;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function mensajeBot(html) {
  const chat = document.getElementById("chat-container");
  const div = document.createElement("div");
  div.className = "mensaje bot";
  div.innerHTML = html;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;

  if (window.MathJax) {
    MathJax.typesetPromise();
  }
}

/* ===============================
   SONIDO SUAVE
================================ */

let audioCtx = null;

function playTypingSound() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = "sine";
  osc.frequency.value = 520;

  gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + 0.12);
}

/* ===============================
   ANIMACIÓN ESCRIBIENDO
================================ */

let escribiendoDiv = null;
let typingInterval = null;

function mostrarEscribiendo() {
  const chat = document.getElementById("chat-container");

  escribiendoDiv = document.createElement("div");
  escribiendoDiv.className = "mensaje bot escribiendo";
  escribiendoDiv.innerHTML =
    "<strong>Isaias-Bot</strong> está escribiendo<span class='dots'>...</span>";

  chat.appendChild(escribiendoDiv);
  chat.scrollTop = chat.scrollHeight;

  playTypingSound();
  typingInterval = setInterval(playTypingSound, 900);
}

function ocultarEscribiendo() {
  if (typingInterval) clearInterval(typingInterval);
  typingInterval = null;

  if (escribiendoDiv) escribiendoDiv.remove();
  escribiendoDiv = null;
}

/* ===============================
   BÚSQUEDA
================================ */

function buscar() {
  const input = document.getElementById("inputPregunta");
  const textoOriginal = input.value.trim();
  const textoInterno = normalizarTexto(textoOriginal);

  if (!textoInterno) return;

  mensajeUsuario(textoOriginal);
  input.value = "";

  mostrarEscribiendo();

  let respuesta = "";

  /* ===== NÚMERO DE EJERCICIO ===== */
  const numeroMatch = textoInterno.match(/\d+/);
  const numeroEjercicio = numeroMatch ? Number(numeroMatch[0]) : null;

  /* ===== NÚMERO DE GUÍA ===== */
  const guiaMatch = textoInterno.match(/guia\s*(\d+)/);
  const numeroGuia = guiaMatch ? Number(guiaMatch[1]) : null;

  /* ===== CONTAR COINCIDENCIAS ===== */
  let coincidencias = 0;

  ejercicios.forEach(bloque => {
    if (!Array.isArray(bloque.ejercicios)) return;

    bloque.ejercicios.forEach(ej => {
      if (
        numeroEjercicio !== null &&
        Number(ej.numero) === numeroEjercicio &&
        Array.isArray(ej.resolucion)
      ) {
        coincidencias++;
      }
    });
  });

  /* ===== AMBIGÜEDAD ===== */
  if (numeroEjercicio && !numeroGuia && coincidencias > 1) {
    ocultarEscribiendo();
    mensajeBot(
      "Ese ejercicio aparece en más de una guía.<br><br>" +
      "Por favor, especificá el número de guía.<br><br>" +
      "⚠️ Importante: escribí <strong>guia</strong> <u>sin tilde</u>.<br>" +
      "Ejemplo correcto: <em>ejercicio 2 guia 1</em>"
    );
    return;
  }

  /* ===== BÚSQUEDA ===== */
  ejercicios.forEach(bloque => {
    if (!Array.isArray(bloque.ejercicios)) return;

    if (numeroGuia !== null) {
      const archivoNormalizado = normalizarTexto(bloque.archivo || "");
      const match = archivoNormalizado.match(/guia(\d+)/);
      if (!match || Number(match[1]) !== numeroGuia) return;
    }

    bloque.ejercicios.forEach(ej => {
      if (
        Number(ej.numero) === numeroEjercicio &&
        Array.isArray(ej.resolucion)
      ) {
        respuesta += `<strong>${bloque.titulo}</strong> (pág. ${bloque.pagina})<br>`;
        respuesta += `<strong>Ejercicio ${ej.numero}:</strong><br>`;
        respuesta += `<strong>${ej.enunciado}</strong><br><br>`;

        if (Array.isArray(ej.expresiones)) {
          ej.expresiones.forEach(e => {
            respuesta += `$$${e}$$`;
          });
          respuesta += "<br>";
        }

        respuesta += "<strong>Resolución:</strong><ul>";
        ej.resolucion.forEach(r => {
          respuesta += `<li>${r}</li>`;
        });
        respuesta += "</ul><br>";
      }
    });
  });

  /* ===== RESPUESTA ===== */
  setTimeout(() => {
    ocultarEscribiendo();

    if (respuesta === "") {
      mensajeBot(
        "No encontré información para esa consulta.<br><br>" +
        "Probá con:<br>" +
        "• ejercicio 2 guia 1<br>" +
        "• ejercicio 4 guia 2"
      );
    } else {
      mensajeBot(respuesta);
    }
  }, 4000);
}
