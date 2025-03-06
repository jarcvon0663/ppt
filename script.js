// script.js
const computerImg = document.querySelector(".computer img");
const playerImg = document.querySelector(".player img");
const computerPoints = document.querySelector(".computerPoints");
const playerPoints = document.querySelector(".playerPoints");
const options = document.querySelectorAll(".options button");
const roomInfo = document.getElementById("roomInfo");

let currentRoom = null;
let playerNumber = null;
let playerRef = null;

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
    player1: { choice: "piedra", points: 0 }, // Piedra por defecto
    player2: null
  }).then(() => {
    playerRef = database.ref(`rooms/${currentRoom}/player1`);
    setupListeners();
    setupDisconnectHandler();
    roomInfo.textContent = `Sala creada: ${roomID}`;
    alert(`Sala creada: ${roomID} (Comparte este ID)`);
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
      choice: "piedra", // Piedra por defecto
      points: 0
    }).then(() => {
      playerRef = database.ref(`rooms/${currentRoom}/player2`);
      setupListeners();
      setupDisconnectHandler();
      roomInfo.textContent = `Unido a: ${roomID}`;
    });
  });
}

// Configurar listeners
function setupListeners() {
  database.ref(`rooms/${currentRoom}`).on("value", snapshot => {
    const room = snapshot.val();
    if (!room) return;

    // Actualizar imágenes
    computerImg.src = playerNumber === 1 
      ? `./img/${room.player2?.choice || 'piedra'}Computer.png` 
      : `./img/${room.player1.choice}Computer.png`;
    
    playerImg.src = playerNumber === 1 
      ? `./img/${room.player1.choice}Player.png` 
      : `./img/${room.player2.choice}Player.png`;

    // Actualizar puntos
    computerPoints.textContent = playerNumber === 1 
      ? room.player2?.points || 0 
      : room.player1.points;
    
    playerPoints.textContent = playerNumber === 1 
      ? room.player1.points 
      : room.player2.points;

    // Verificar elecciones
    if (room.player1.choice && room.player2?.choice) {
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
  alert(winner);
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
    
    const choice = option.textContent.toLowerCase();
    playerRef.update({ choice: choice });
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

// Cargar estado al recargar
window.addEventListener("load", () => {
  const savedRoom = sessionStorage.getItem("roomID");
  if (savedRoom) {
    currentRoom = savedRoom;
    playerNumber = sessionStorage.getItem("playerRole") === "player1" ? 1 : 2;
    playerRef = database.ref(`rooms/${currentRoom}/player${playerNumber}`);
    setupListeners();
  }
});