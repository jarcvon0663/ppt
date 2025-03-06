const computer = document.querySelector(".computer img");
const player = document.querySelector(".player img");
const computerPoints = document.querySelector(".computerPoints");
const playerPoints = document.querySelector(".playerPoints");
const options = document.querySelectorAll(".options button");

// Variables para el sistema de salas
let currentRoom = null;
let playerNumber = null;

// Función para generar un ID de sala aleatorio
function generateRoomID() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function createRoom() {
  const roomID = generateRoomID();
  const roomRef = database.ref("rooms/" + roomID);

  roomRef.set({
    player1: { choice: "", points: 0 },
    player2: { choice: "", points: 0 },
    turn: "player1"
  }).then(() => {
    sessionStorage.setItem("roomID", roomID);
    sessionStorage.setItem("playerRole", "player1");
    currentRoom = roomID;
    playerNumber = 1;
    document.getElementById("roomInfo").innerText = "Sala creada con ID: " + roomID;
    alert("Sala creada. Comparte este ID con tu amigo: " + roomID);
  }).catch((error) => {
    console.error("Error al crear la sala:", error);
  });
}

function joinRoom() {
  const roomID = document.getElementById("roomIDInput").value.trim();
  if (!roomID) {
    alert("Por favor, ingresa un ID de sala válido.");
    return;
  }

  const roomRef = database.ref("rooms/" + roomID);

  roomRef.once("value", (snapshot) => {
    const roomData = snapshot.val();

    if (!roomData) {
      alert("La sala no existe.");
      return;
    }

    if (!roomData.player2.choice) {
      roomRef.child("player2").update({ choice: "", points: 0 });
      sessionStorage.setItem("roomID", roomID);
      sessionStorage.setItem("playerRole", "player2");
      currentRoom = roomID;
      playerNumber = 2;
      document.getElementById("roomInfo").innerText = "Unido a la sala: " + roomID;
    } else {
      alert("La sala ya está llena.");
    }
  });
}

// Lógica del juego
options.forEach((option) => {
  option.addEventListener("click", () => {
    if (!currentRoom) {
      alert("Debes crear o unirte a una sala primero.");
      return;
    }

    const playerChoice = option.innerHTML.toLowerCase();
    player.classList.add("shakePlayer");
    computer.classList.add("shakeComputer");

    setTimeout(() => {
      player.classList.remove("shakePlayer");
      computer.classList.remove("shakeComputer");

      // Guardar la elección en Firebase
      const playerRef = database.ref(`rooms/${currentRoom}/player${playerNumber}`);
      playerRef.update({ choice: playerChoice });
    }, 900);
  });
});

// Escuchar cambios en Firebase para actualizar la UI
const roomRef = database.ref("rooms/");
roomRef.on("value", (snapshot) => {
  const roomData = snapshot.val();
  if (!roomData || !currentRoom) return;

  const room = roomData[currentRoom];
  if (!room) return;

  const player1Choice = room.player1.choice;
  const player2Choice = room.player2.choice;

  if (player1Choice && player2Choice) {
    player.src = `./img/${player1Choice}Player.png`;
    computer.src = `./img/${player2Choice}Computer.png`;

    let p1Points = room.player1.points;
    let p2Points = room.player2.points;
    let winner = "";

    if (player1Choice === player2Choice) {
      winner = "Empate!";
    } else if (
      (player1Choice === "piedra" && player2Choice === "tijeras") ||
      (player1Choice === "papel" && player2Choice === "piedra") ||
      (player1Choice === "tijeras" && player2Choice === "papel")
    ) {
      winner = "¡Jugador 1 gana esta ronda!";
      p1Points++;
    } else {
      winner = "¡Jugador 2 gana esta ronda!";
      p2Points++;
    }

    alert(winner);

    database.ref(`rooms/${currentRoom}/player1`).update({ points: p1Points });
    database.ref(`rooms/${currentRoom}/player2`).update({ points: p2Points });
    playerPoints.innerHTML = p1Points;
    computerPoints.innerHTML = p2Points;
  }
});
