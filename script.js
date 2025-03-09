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
let inactivityCheck;

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
  if (!playerRef) return;

  playerRef.onDisconnect().remove()
    .then(() => {
      console.log("Handler de desconexión configurado");
      checkEmptyRoom();
    })
    .catch((error) => {
      console.error("Error configurando handler:", error);
    });
}

// Verificar si la sala está vacía
function checkEmptyRoom() {
  database.ref(`rooms/${currentRoom}`).once('value')
    .then(snapshot => {
      const room = snapshot.val();
      if (room && (!room.player1 || !room.player2)) {
        database.ref(`rooms/${currentRoom}`).remove()
          .then(() => {
            clearInterval(inactivityCheck);
            showMessage("Sala eliminada por inactividad");
          });
      }
    });
}

// Iniciar verificación de inactividad
function startInactivityCheck() {
  inactivityCheck = setInterval(() => {
    if (!currentRoom) return;
    
    database.ref(`rooms/${currentRoom}`).once('value')
      .then(snapshot => {
        const room = snapshot.val();
        if (room && Date.now() - room.lastActive > 70000) {
          database.ref(`rooms/${currentRoom}`).remove()
            .then(() => {
              clearInterval(inactivityCheck);
              showMessage('Sala eliminada por inactividad');
              window.location.reload();
            });
        }
      });
  }, 60000);
}

// Crear sala
function createRoom() {
  const roomID = generateRoomID();
  currentRoom = roomID;
  playerNumber = 1;

  const playerName = prompt("Ingresa tu nombre:");
  if (!playerName) return alert("Debes ingresar un nombre.");

  database.ref(`rooms/${roomID}`).set({
    player1: { 
      name: playerName, 
      choice: "", 
      sent: false, 
      points: 0 
    },
    player2: { 
      name: "", 
      choice: "", 
      sent: false, 
      points: 0 
    },
    gameState: "waiting",
    lastActive: Date.now()
  }).then(() => {
    playerRef = database.ref(`rooms/${currentRoom}/player1`);
    setupListeners();
    setupDisconnectHandler();
    roomInfo.textContent = `Sala creada: ${roomID}`;
    showMessage("Esperando jugador...");
    document.getElementById("roomIDInput").value = roomID;
    document.getElementById("copyButton").style.display = "inline-block";
    
    startInactivityCheck();
  });
}

// Copiar ID de sala
function copyRoomID() {
  const roomID = document.getElementById("roomIDInput").value;
  const notification = document.getElementById("copyNotification");
  
  if (roomID) {
    navigator.clipboard.writeText(roomID)
      .then(() => {
        notification.textContent = "¡ID copiado al portapapeles!";
        notification.style.opacity = 1;
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
    
    database.ref(`rooms/${currentRoom}/lastActive`).set(Date.now());

    setupListeners();
    setupDisconnectHandler();
    showMessage(`Te uniste a la sala: ${roomID}`);
    
    startInactivityCheck();
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

    const result = determineWinner(room); // ¡Aquí se usa la función!
    showMessage(result, 3000);

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
    if (!room) {
      clearInterval(inactivityCheck);
      showMessage("La sala fue eliminada por inactividad");
      setTimeout(() => window.location.reload(), 3000);
      return;
    }

    const opponent = playerNumber === 1 ? room.player2 : room.player1;
    const playerData = playerNumber === 1 ? room.player1 : room.player2;

    document.querySelector(".points").innerHTML = `
      ${opponent.name || "Adversario"} <span class="computerPoints">${
      opponent.points
    }</span> /
      <span class="playerPoints">${playerData.points}</span> ${
      playerData.name || "Jugador"
    }
    `;

    if (room.gameState === "animating") {
      startResultAnimation(room);
      return;
    }

    if (room.player1.sent && room.player2.sent) {
      setTimeout(() => {
        computerImg.src = `./img/${opponent.choice}${
          playerNumber === 1 ? "Computer" : "Player"
        }.png`;
        playerImg.src = `./img/${playerData.choice}Player.png`;
      }, 2000);
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
    
    database.ref(`rooms/${currentRoom}/lastActive`).set(Date.now());
    
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
  
  database.ref(`rooms/${currentRoom}/lastActive`).set(Date.now());

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

// Reiniciar ronda
function resetRound() {
  setTimeout(() => {
    database.ref(`rooms/${currentRoom}/player1`)
      .update({ choice: "", sent: false });
    database.ref(`rooms/${currentRoom}/player2`)
      .update({ choice: "", sent: false });
    
    database.ref(`rooms/${currentRoom}/lastActive`).set(Date.now());
    
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

// Limpiar al cerrar ventana
window.addEventListener('beforeunload', () => {
  if (currentRoom) {
    clearInterval(inactivityCheck);
    database.ref(`rooms/${currentRoom}`).off();
  }
});

// FUNCIÓN DETERMINEWINNER ORIGINAL 
function determineWinner(room) {
  const p1 = room.player1.choice;
  const p2 = room.player2.choice;

  if (p1 === p2) {
    return "Empate";
  }

  let winner;
  if (
    (p1 === "piedra" && p2 === "tijeras") ||
    (p1 === "papel" && p2 === "piedra") ||
    (p1 === "tijeras" && p2 === "papel")
  ) {
    winner = "player1";
  } else {
    winner = "player2";
  }

  if (playerNumber === 1) {
    database
      .ref(`rooms/${currentRoom}/${winner}/points`)
      .transaction((points) => (points || 0) + 1);
  }

  return winner === `player${playerNumber}` ? "¡Ganaste!" : "Perdiste";
}