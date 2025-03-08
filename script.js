const computerImg = document.querySelector(".computer img");
const playerImg = document.querySelector(".player img");
const computerPoints = document.querySelector(".computerPoints");
const playerPoints = document.querySelector(".playerPoints");
const options = document.querySelectorAll(".options button");
const sendButton = document.createElement("button");
const roomInfo = document.getElementById("roomInfo");
const message = document.querySelector(".message");

let currentRoom = null;
let playerNumber = null;
let playerRef = null;
let hasSent = false;

// Crear botón de enviar
sendButton.textContent = "Enviar jugada";
sendButton.style.marginTop = "10px";
sendButton.disabled = true;
document.querySelector(".enviar").appendChild(sendButton);

// Generar ID de sala
function generateRoomID() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function setupDisconnectHandler() {
  if (!playerRef) return; // Verifica que playerRef esté definido

  playerRef
    .onDisconnect()
    .remove() // Elimina al jugador de la sala si se desconecta
    .then(() => {
      console.log("Handler de desconexión configurado.");
    })
    .catch((error) => {
      console.error("Error configurando el handler de desconexión:", error);
    });
}

// Crear sala
function createRoom() {
  const roomID = generateRoomID();
  currentRoom = roomID;
  playerNumber = 1;

  const playerName = prompt("Ingresa tu nombre:");
  if (!playerName) return alert("Debes ingresar un nombre.");

  database
    .ref(`rooms/${roomID}`)
    .set({
      player1: { name: playerName, choice: "", sent: false, points: 0 },
      player2: { name: "", choice: "", sent: false, points: 0 },
      gameState: "waiting",
    })
    .then(() => {
      playerRef = database.ref(`rooms/${currentRoom}/player1`);
      setupListeners();
      setupDisconnectHandler();
      roomInfo.textContent = `Sala creada: ${roomID}`;
      showMessage("Esperando jugador...");
      document.getElementById("roomIDInput").value = roomID;
      document.getElementById("copyButton").style.display = "inline-block";
    });
}

// Copiar ID de sala con notificación discreta
function copyRoomID() {
  const roomID = document.getElementById("roomIDInput").value;
  const notification = document.getElementById("copyNotification");
  
  if (roomID) {
    navigator.clipboard.writeText(roomID)
      .then(() => {
        // Mostrar notificación
        notification.textContent = "¡ID copiado al portapapeles!";
        notification.style.opacity = 1;
        
        // Ocultar después de 2 segundos
        setTimeout(() => {
          notification.style.opacity = 0;
        }, 1000);
      })
      .catch(err => {
        console.error("Error al copiar:", err);
        notification.textContent = "Error al copiar ID";
        notification.style.color = "#ff5252";
        notification.style.opacity = 1;
      });
  }
}

// Unirse a sala
function joinRoom() {
  const roomID = document.getElementById("roomIDInput").value.trim();
  if (!roomID) return alert("Ingresa un ID de sala válido.");

  database.ref(`rooms/${roomID}`).once("value", (snapshot) => {
    const room = snapshot.val();
    if (!room) return alert("Sala no encontrada.");

    if (room.player1.name && room.player2.name) {
      return alert("La sala ya está llena.");
    }

    currentRoom = roomID;
    playerNumber = room.player1.name ? 2 : 1;

    const playerName = prompt("Ingresa tu nombre:");
    if (!playerName) return alert("Debes ingresar un nombre.");

    playerRef = database.ref(`rooms/${currentRoom}/player${playerNumber}`);
    playerRef.update({ name: playerName });

    setupListeners();
    setupDisconnectHandler();
    showMessage(`Te uniste a la sala: ${roomID}`);
  });
}

// Animación de resultado
let isAnimating = false;

function startResultAnimation(room) {
  if (isAnimating) return;
  isAnimating = true;

  computerImg.classList.add("shakeComputer");
  playerImg.classList.add("shakePlayer");
  showMessage("¡Piedra, Papel o Tijeras!");

  setTimeout(() => {
    computerImg.classList.remove("shakeComputer");
    playerImg.classList.remove("shakePlayer");

    const opponent = playerNumber === 1 ? room.player2 : room.player1;
    const playerData = playerNumber === 1 ? room.player1 : room.player2;

    computerImg.src = `./img/${opponent.choice}${
      playerNumber === 1 ? "Computer" : "Player"
    }.png`;
    playerImg.src = `./img/${playerData.choice}Player.png`;

    // Todos los jugadores determinan el resultado
    const result = determineWinner(room);
    showMessage(result, 3000);

    // Solo el jugador 1 actualiza el gameState
    if (playerNumber === 1) {
      database.ref(`rooms/${currentRoom}`).update({ gameState: "waiting" });
    }

    setTimeout(() => {
      resetRound();
      isAnimating = false;
    }, 3000);
  }, 2000);
}

// Configurar listeners
function setupListeners() {
  database.ref(`rooms/${currentRoom}`).on("value", (snapshot) => {
    const room = snapshot.val();
    if (!room) return;

    const opponent = playerNumber === 1 ? room.player2 : room.player1;
    const playerData = playerNumber === 1 ? room.player1 : room.player2;

    // 🔵 Mostrar nombres y puntos actualizados en la UI
    document.querySelector(".points").innerHTML = `
      ${opponent.name || "Adversario"} <span class="computerPoints">${
      opponent.points
    }</span> /
      <span class="playerPoints">${playerData.points}</span> ${
      playerData.name || "Jugador"
    }
    `;

    // 🔴 Si el juego está en estado "animating", activar animación
    if (room.gameState === "animating") {
      startResultAnimation(room);
      return; // Evita ejecutar el resto hasta que termine la animación
    }

    // 🔴 No mostrar la elección del oponente hasta que ambos hayan enviado su jugada
    if (room.player1.sent && room.player2.sent) {
      // Retrasar 2 segundos la actualización de las imágenes
      setTimeout(() => {
        computerImg.src = `./img/${opponent.choice}${
          playerNumber === 1 ? "Computer" : "Player"
        }.png`;
        playerImg.src = `./img/${playerData.choice}Player.png`;
      }, 2000); // Tiempo de espera
    } else {
      computerImg.src = "./img/piedraComputer.png";
      playerImg.src = "./img/piedraPlayer.png";
    }
  });
}

// Manejar elecciones
options.forEach((option) => {
  option.addEventListener("click", () => {
    if (!currentRoom) return alert("Únete o crea una sala primero");
    if (hasSent) return;

    const choice = option.textContent.toLowerCase();
    playerRef.update({ choice: choice });
    sendButton.disabled = false;
    showMessage("¡Listo! Pulsa 'Enviar jugada'");
  });
});

// Enviar jugada
sendButton.addEventListener("click", () => {
  if (!currentRoom || hasSent) return;

  hasSent = true;
  sendButton.disabled = true;
  playerRef.update({ sent: true });
  showMessage("Esperando al oponente...");

  // 🔥 Usar transacción para evitar carreras
  database.ref(`rooms/${currentRoom}`).transaction((room) => {
    if (
      room &&
      room.player1.sent &&
      room.player2.sent &&
      room.gameState === "waiting"
    ) {
      room.gameState = "animating";
    }
    return room;
  });
});

// Determinar ganador (ahora usado por todos los jugadores)
function determineWinner(room) {
  const p1 = room.player1.choice;
  const p2 = room.player2.choice;

  // 🛠️ Agregar logs para depuración
  console.log("------ NUEVA JUGADA ------");
  console.log("Player 1 (Arturo) eligió:", p1);
  console.log("Player 2 (Denis) eligió:", p2);

  if (p1 === p2) {
    console.log("Resultado: EMPATE");
    return "Empate";
  }

  // Lógica de victoria
  let winner;
  if (
    (p1 === "piedra" && p2 === "tijeras") ||
    (p1 === "papel" && p2 === "piedra") ||
    (p1 === "tijeras" && p2 === "papel")
  ) {
    winner = "player1";
    console.log("Resultado: Gana Player 1 (Arturo)");
  } else {
    winner = "player2";
    console.log("Resultado: Gana Player 2 (Denis)");
  }

  // Actualizar puntos (solo jugador 1)
  if (playerNumber === 1) {
    console.log("Actualizando puntos para:", winner);
    database
      .ref(`rooms/${currentRoom}/${winner}/points`)
      .transaction((points) => (points || 0) + 1);
  }

  // Mensaje para el jugador actual
  const message = winner === `player${playerNumber}` ? "¡Ganaste!" : "Perdiste";

  console.log("Mensaje mostrado al jugador:", message);
  return message;
}

// Reiniciar ronda
function resetRound() {
  setTimeout(() => {
    database
      .ref(`rooms/${currentRoom}/player1`)
      .update({ choice: "", sent: false });
    database
      .ref(`rooms/${currentRoom}/player2`)
      .update({ choice: "", sent: false });
    hasSent = false;
    sendButton.disabled = true;
    showMessage("Elige");
  }, 500);
}

// Sistema de mensajes
function showMessage(text, timeout = 0) {
  message.textContent = text;
  if (timeout > 0) {
    setTimeout(() => {
      message.textContent = "Elige";
    }, timeout);
  }
}

// Estado inicial
showMessage("Elige");
