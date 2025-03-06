// script.js
const computerImg = document.querySelector(".computer img");
const playerImg = document.querySelector(".player img");
const computerPoints = document.querySelector(".computerPoints");
const playerPoints = document.querySelector(".playerPoints");
const options = document.querySelectorAll(".options button");
const roomInfo = document.getElementById("roomInfo");
const message = document.querySelector(".message");

let currentRoom = null;
let playerNumber = null;
let playerRef = null;
let isChoosing = false;

// Generar ID de sala
function generateRoomID() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Crear sala
function createRoom() {
  const roomID = generateRoomID();
  currentRoom = roomID;
  playerNumber = 1;

  database.ref(`rooms/${roomID}`).set({
    player1: { choice: "", points: 0 }, // Inicia sin elección
    player2: null
  }).then(() => {
    playerRef = database.ref(`rooms/${currentRoom}/player1`);
    setupListeners();
    setupDisconnectHandler();
    roomInfo.textContent = `Sala creada: ${roomID}`;
    showMessage("Esperando jugador...");
    document.getElementById("roomIDInput").value = roomID; // Autocompletar ID
  });
}

// Unirse a sala
function joinRoom() {
  const roomID = document.getElementById("roomIDInput").value.trim().toUpperCase();
  if (!roomID) return alert("Ingresa un ID válido");

  database.ref(`rooms/${roomID}`).once("value").then(snapshot => {
    const roomData = snapshot.val();
    if (!roomData) return alert("Sala no existe");
    if (roomData.player2) return alert("Sala llena");

    currentRoom = roomID;
    playerNumber = 2;

    database.ref(`rooms/${currentRoom}/player2`).set({
      choice: "",
      points: 0
    }).then(() => {
      playerRef = database.ref(`rooms/${currentRoom}/player2`);
      setupListeners();
      setupDisconnectHandler();
      roomInfo.textContent = `Unido a: ${roomID}`;
      showMessage("Esperando elección del oponente...");
    });
  });
}

// Configurar listeners
function setupListeners() {
  database.ref(`rooms/${currentRoom}`).on("value", snapshot => {
    const room = snapshot.val();
    if (!room) return;

    // Actualizar imágenes
    const opponent = playerNumber === 1 ? room.player2 : room.player1;
    const playerData = playerNumber === 1 ? room.player1 : room.player2;

    computerImg.src = opponent?.choice 
      ? `./img/${opponent.choice}${playerNumber === 1 ? 'Computer' : 'Player'}.png`
      : "./img/piedraComputer.png"; // Imagen por defecto
    
    playerImg.src = playerData.choice 
      ? `./img/${playerData.choice}Player.png`
      : "./img/piedraPlayer.png";

    // Actualizar puntos
    computerPoints.textContent = playerNumber === 1 
      ? opponent?.points || 0 
      : room.player1.points;
    
    playerPoints.textContent = playerData.points;

    // Verificar elecciones
    if (room.player1.choice && room.player2?.choice && !isChoosing) {
      isChoosing = true;
      determineWinner(room);
    }
  });
}

// Determinar ganador
function determineWinner(room) {
  const p1 = room.player1;
  const p2 = room.player2;
  
  let winner = "";
  if (p1.choice === p2.choice) {
    winner = "¡Empate!";
  } else if (
    (p1.choice === "piedra" && p2.choice === "tijeras") ||
    (p1.choice === "papel" && p2.choice === "piedra") ||
    (p1.choice === "tijeras" && p2.choice === "papel")
  ) {
    winner = "¡Jugador 1 gana!";
    updatePoints("player1");
  } else {
    winner = "¡Jugador 2 gana!";
    updatePoints("player2");
  }
  
  // Mostrar resultado en mensaje no bloqueante
  showMessage(winner, 3000);
  resetChoicesAfterDelay(3000);
}

// Actualizar puntos
function updatePoints(winner) {
  database.ref(`rooms/${currentRoom}/${winner}/points`).transaction(points => {
    return (points || 0) + 1;
  });
}

// Manejar elecciones
options.forEach(option => {
  option.addEventListener("click", () => {
    if (!currentRoom) return alert("Únete o crea una sala primero");
    if (isChoosing) return; // Prevenir múltiples clicks
    
    const choice = option.textContent.toLowerCase();
    isChoosing = true;
    playerRef.update({ choice: choice });
    showMessage("Esperando oponente...");
  });
});

// Limpiar al desconectar
function setupDisconnectHandler() {
  playerRef.onDisconnect().remove().then(() => {
    if (playerNumber === 1) {
      database.ref(`rooms/${currentRoom}`).remove();
    }
  });
}

// Resetear elecciones después de 3 segundos
function resetChoicesAfterDelay(delay) {
  setTimeout(() => {
    database.ref(`rooms/${currentRoom}/player1`).update({ choice: "" });
    database.ref(`rooms/${currentRoom}/player2`).update({ choice: "" });
    isChoosing = false;
    showMessage("Elige");
  }, delay);
}

// Mostrar mensajes en UI
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