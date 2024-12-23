# SWEFALL

**SWEFALL** is a fun multiplayer party game built with **React** and **Socket.IO**. Players are assigned roles, with one being the "spy." Through clever questioning, players must identify the spy before the spy guesses the location.

---

## Features

- **Multiplayer Support**: Join friends using unique room codes.
- **Real-Time Gameplay**: Seamless interaction powered by Socket.IO.
- **Dynamic Roles**: Randomized assignment of "spy" and location.
- **Language Options**: Choose between English and Swedish.

---

## How It Works

1. **Join or Create a Room**: Enter a room code or generate a new one.
2. **Get Your Role**:
   - One random player is secretly assigned the "spy."
   - Other players receive the location information.
3. **Gameplay**:
   - Players take turns asking questions about the location.
   - The spy tries to blend in without knowing the location.
4. **Accuse the Spy**:
   - Players accuse each other, aiming to identify the spy.
   - The spy wins points for every incorrect accusation.
5. **Start a New Round**: Reset roles and points to play again.

---

## Technologies Used

- **Backend**:
  - **Node.js** with Express for server logic.
  - **Socket.IO** for real-time communication.
- **Frontend**:
  - **React** and **TypeScript** for dynamic UI.
  - CSS for styling.
- **Hosting**:
  - Hosted on **Render**.
