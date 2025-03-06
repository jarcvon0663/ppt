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
document.querySelector(".options").appendChild(sendButton);

// Generar ID de sala
function generateRoomID() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function setupDisconnectHandler() {
  if (!playerRef) return; // Verifica que playerRef esté definido

  playerRef.onDisconnect().remove() // Elimina al jugador de la sala si se desconecta
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

  database.ref(`rooms/${roomID}`).set({
    player1: { choice: "", sent: false, points: 0 },
    player2: { choice: "", sent: false, points: 0 }
  }).then(() => {
    playerRef = database.ref(`rooms/${currentRoom}/player1`);
    setupListeners();
    setupDisconnectHandler();
    roomInfo.textContent = `Sala creada: ${roomID}`;
    showMessage("Esperando jugador...");
    document.getElementById("roomIDInput").value = roomID;
  });
}

// Unirse a sala
function joinRoom() {
  const roomID = document.getElementById("roomIDInput").value.trim().toUpperCase();
  if (!roomID) return alert("Ingresa un ID válido");

  database.ref(`rooms/${roomID}`).once("value").then(snapshot => {
    const roomData = snapshot.val();
    if (!roomData) return alert("Sala no existe");
    
    currentRoom = roomID;
    playerNumber = 2;
    playerRef = database.ref(`rooms/${currentRoom}/player2`);
    
    // Verificar si el jugador 2 ya existe
    if (roomData.player2 && roomData.player2.choice) {
      return alert("Sala llena");
    }

    database.ref(`rooms/${currentRoom}/player2`).set({
      choice: "",
      sent: false,
      points: 0
    }).then(() => {
      setupListeners();
      setupDisconnectHandler();
      roomInfo.textContent = `Unido a: ${roomID}`;
      showMessage("Esperando oponente...");
    });
  });
}

// Configurar listeners
function setupListeners() {
  database.ref(`rooms/${currentRoom}`).on("value", snapshot => {
    const room = snapshot.val();
    if (!room) return;

    // Actualizar UI
    const opponent = playerNumber === 1 ? room.player2 : room.player1;
    const playerData = playerNumber === 1 ? room.player1 : room.player2;

    // Mostrar elecciones solo si han sido enviadas
    computerImg.src = opponent.sent 
      ? `./img/${opponent.choice}${playerNumber === 1 ? 'Computer' : 'Player'}.png`
      : "./img/piedraComputer.png";
    
    playerImg.src = playerData.sent 
      ? `./img/${playerData.choice}Player.png`
      : "./img/piedraPlayer.png";

    // Verificar si ambos enviaron
    if (room.player1.sent && room.player2.sent) {
      startResultAnimation(room);
    }
  });
}

// Manejar elecciones
options.forEach(option => {
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
});

// Animación de resultado
function startResultAnimation(room) {
  // Mostrar animación de espera
  computerImg.classList.add("shake");
  playerImg.classList.add("shake");
  showMessage("¡Jugando!");

  setTimeout(() => {
    computerImg.classList.remove("shake");
    playerImg.classList.remove("shake");
    
    // Calcular ganador
    const result = determineWinner(room);
    showMessage(result, 3000);
    
    // Actualizar puntos
    updatePoints(result);
    
    // Reiniciar para siguiente ronda
    resetRound();
  }, 2000);
}

// Determinar ganador
function determineWinner(room) {
  const p1 = room.player1;
  const p2 = room.player2;
  
  if (p1.choice === p2.choice) return "¡Empate!";
  
  const rules = {
    piedra: "tijeras",
    papel: "piedra",
    tijeras: "papel"
  };

  if (rules[p1.choice] === p2.choice) {
    return "¡Jugador 1 gana!";
  } else {
    return "¡Jugador 2 gana!";
  }
}

// Actualizar puntos
function updatePoints(result) {
  if (result.includes("Empate")) return;

  const winner = result.includes("1") ? "player1" : "player2";
  database.ref(`rooms/${currentRoom}/${winner}/points`).transaction(points => {
    return (points || 0) + 1;
  });
}

// Reiniciar ronda
function resetRound() {
  setTimeout(() => {
    database.ref(`rooms/${currentRoom}/player1`).update({ choice: "", sent: false });
    database.ref(`rooms/${currentRoom}/player2`).update({ choice: "", sent: false });
    hasSent = false;
    sendButton.disabled = true;
    showMessage("Elige");
  }, 3000);
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