let ejercicios = [];

/* ===============================
   CARGA DE MÚLTIPLES JSON
================================ */

document.addEventListener("DOMContentLoaded", () => {
  const archivos = [
    "guia1.json",
    "guia2.json"
  ];

  Promise.all(
    archivos.map(a => fetch(a).then(r => r.json()))
  )
    .then(data => {
      ejercicios = data.flat();

      mensajeBot(
        "Hola 👋 Soy Isaias-Bot, el asistente virtual de <strong>Matemática 51</strong>.<br>" +
        "Cátedra: <strong>Rossomando</strong>.<br><br>" +
        "Podés buscar así:<br>" +
        "<strong>Recuerda escribir la palabra guia sin tilde.</strong><br>"+
        "<em>ejercicio 2 guia 1</em>, <em>ejercicio 4 guia 2</em>"
      );
    })
    .catch(() => {
      mensajeBot("❌ Error al cargar los ejercicios.");
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
   SONIDO SUAVE (SOFT BUBBLE)
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
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    audioCtx.currentTime + 0.12
  );

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
  escribiendoDiv.innerHTML = "<strong>Isaias-Bot</strong> está escribiendo<span class='dots'>...</span>";

  chat.appendChild(escribiendoDiv);
  chat.scrollTop = chat.scrollHeight;

  // sonido sincronizado (no molesto)
  playTypingSound();
  typingInterval = setInterval(playTypingSound, 900);
}

function ocultarEscribiendo() {
  if (typingInterval) {
    clearInterval(typingInterval);
    typingInterval = null;
  }

  if (escribiendoDiv) {
    escribiendoDiv.remove();
    escribiendoDiv = null;
  }
}

/* ===============================
   BÚSQUEDA
================================ */

function buscar() {
  const input = document.getElementById("inputPregunta");
  const textoOriginal = input.value.trim();
  const texto = textoOriginal.toLowerCase();

  if (!texto) return;

  mensajeUsuario(textoOriginal);
  input.value = "";

  mostrarEscribiendo();

  let respuesta = "";

  const numeroMatch = texto.match(/\d+/);
  const numeroEjercicio = numeroMatch ? parseInt(numeroMatch[0]) : null;

  const guiaMatch = texto.match(/guia\s*(\d+)/);
  const numeroGuia = guiaMatch ? guiaMatch[1] : null;

  /* ===== CONTAR COINCIDENCIAS ===== */
  let coincidencias = 0;

  ejercicios.forEach(bloque => {
    bloque.ejercicios.forEach(ej => {
      if (numeroEjercicio === ej.numero && ej.resolucion) {
        coincidencias++;
      }
    });
  });

  /* ===== AMBIGÜEDAD ===== */
  if (numeroEjercicio && !numeroGuia && coincidencias > 1) {
    ocultarEscribiendo();
    mensajeBot(
      "Ese ejercicio aparece en más de una guía.<br><br>" +
      "Por favor, especificá el número de guia.<br>" +
      "<strong>Recuerda escribir la palabra guia sin tilde.</strong><br>"+
      "Ejemplo: <em>ejercicio 2 guia 1</em>"
    );
    return;
  }

  /* ===== BÚSQUEDA ===== */
  ejercicios.forEach(bloque => {

    if (
      numeroGuia &&
      !bloque.archivo.toLowerCase().includes(`guia ${numeroGuia}`)
    ) {
      return;
    }

    bloque.ejercicios.forEach(ej => {
      if (numeroEjercicio === ej.numero && ej.resolucion) {

        respuesta += `<strong>${bloque.titulo}</strong> (pág. ${bloque.pagina})<br>`;
        respuesta += `<strong>Ejercicio ${ej.numero}:</strong><br>`;
        respuesta += `<strong>${ej.enunciado}</strong><br><br>`;

        if (ej.expresiones) {
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

  /* ===== RESPUESTA CON DELAY ===== */
  setTimeout(() => {
    ocultarEscribiendo();

    if (respuesta === "") {
      mensajeBot(
        "No encontré información para esa consulta.<br><br>" +
        "Probá con:<br>" +
        "• ejercicio 2 guia 1<br>" +
        "• ejercicio 4 guia 2"+
        "<strong>Recuerda escribir la palabra guia sin tilde.</strong><br>"
      );
    } else {
      mensajeBot(respuesta);
    }
  }, 4000);
}
