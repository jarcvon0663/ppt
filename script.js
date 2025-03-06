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

function checkChoicesAndDecideWinner() {
  const roomRef = database.ref(`rooms/${currentRoom}`);
  roomRef.once("value", (snapshot) => {
    const roomData = snapshot.val();
    if (roomData.player1.choice && roomData.player2.choice) {
      const choice1 = roomData.player1.choice;
      const choice2 = roomData.player2.choice;
      let winner = "";

      if (choice1 === choice2) {
        alert("Empate! 🤝");
      } else if (
        (choice1 === "piedra" && choice2 === "tijeras") ||
        (choice1 === "papel" && choice2 === "piedra") ||
        (choice1 === "tijeras" && choice2 === "papel")
      ) {
        winner = "player1";
      } else {
        winner = "player2";
      }

      if (winner) {
        alert(`${winner === "player1" ? "Jugador 1" : "Jugador 2"} gana esta ronda! 🎉`);
        database.ref(`rooms/${currentRoom}/${winner}`).update({ points: roomData[winner].points + 1 });
      }
    }
  });
}

options.forEach((option) => {
  option.addEventListener("click", () => {
    if (!currentRoom) {
      alert("Debes crear o unirte a una sala primero.");
      return;
    }

    const playerChoice = option.innerHTML.toLowerCase();
    player.src = `./img/${playerChoice}Player.png`;
    
    const playerRef = database.ref(`rooms/${currentRoom}/player${playerNumber}`);
    playerRef.update({ choice: playerChoice }).then(() => {
      checkChoicesAndDecideWinner();
    });
  });
});
