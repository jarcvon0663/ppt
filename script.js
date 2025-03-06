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

console.log("Firebase en script.js:", firebase);
console.log("Base de datos en script.js:", database);

function createRoom() {
  const roomID = generateRoomID();
  console.log("Generando sala con ID:", roomID);

  const roomRef = database.ref("rooms/" + roomID);

  roomRef.set({
    player1: { choice: "", points: 0 },
    player2: { choice: "", points: 0 }
  }).then(() => {
    console.log("Sala creada en Firebase correctamente");
    document.getElementById("roomInfo").innerText = "Sala creada con ID: " + roomID;
  }).catch((error) => {
    console.error("Error al crear la sala:", error);
  });
}


// Función para unirse a una sala
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
      console.log("Uniéndose como jugador 2");
      roomRef.child("player2").update({ choice: "", points: 0 });
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

    computer.classList.add("shakeComputer");
    player.classList.add("shakePlayer");

    setTimeout(() => {
      computer.classList.remove("shakeComputer");
      player.classList.remove("shakePlayer");

      const choices = ["piedra", "papel", "tijeras"];
      let computerChoice = choices[Math.floor(Math.random() * 3)];
      let playerChoice = option.innerHTML.toLowerCase();

      // Asignar imágenes desde la carpeta 'img'
      player.src = `./img/${playerChoice}Player.png`;
      computer.src = `./img/${computerChoice}Computer.png`;

      let cPoints = parseInt(computerPoints.innerHTML);
      let pPoints = parseInt(playerPoints.innerHTML);

      if (playerChoice === "piedra") {
        if (computerChoice === "papel") computerPoints.innerHTML = cPoints + 1;
        else if (computerChoice === "tijeras") playerPoints.innerHTML = pPoints + 1;
      } else if (playerChoice === "papel") {
        if (computerChoice === "tijeras") computerPoints.innerHTML = cPoints + 1;
        else if (computerChoice === "piedra") playerPoints.innerHTML = pPoints + 1;
      } else {
        if (computerChoice === "piedra") computerPoints.innerHTML = cPoints + 1;
        else if (computerChoice === "papel") playerPoints.innerHTML = pPoints + 1;
      }

      // Guardar la elección en Firebase
      if (playerNumber === 1) {
        database.ref(`rooms/${currentRoom}/player1`).update({ choice: playerChoice, points: pPoints });
      } else if (playerNumber === 2) {
        database.ref(`rooms/${currentRoom}/player2`).update({ choice: playerChoice, points: pPoints });
      }
    }, 900);
  });
});
