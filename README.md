# Gin Rummy — Dozenal Edition

A real-time multiplayer Gin Rummy web game built with **Next.js, TypeScript, Socket.IO, and Google Cloud Run**.

Unlike standard Gin Rummy, this version uses a **base-12 (dozenal) card system** with a 64-card deck, introducing a different scoring model and game strategy while keeping the core draw, discard, knock, and round mechanics of Gin Rummy.

🌐 **Live Site:** [Play Gin Rummy](https://ginrummy.jqiwen.com)

---

## Overview

Gin Rummy is a full-stack multiplayer card game focused on real-time communication and server-authoritative game state.

Players can create a room, invite another player with a room ID, and play a complete match through the browser. Game actions are synchronized through WebSocket connections so both players receive updates immediately.

The project separates the static frontend from the real-time game service:

* **Frontend:** Next.js application deployed through GitHub Pages
* **Backend:** Node.js + TypeScript game service running on Google Cloud Run
* **Real-time communication:** Socket.IO over WebSocket
* **Deployment:** GitHub Actions + Google Cloud

---

## Features

### Real-Time Multiplayer

* Create and join private game rooms
* Two-player synchronized gameplay
* Real-time game state updates through Socket.IO
* Automatic WebSocket reconnection
* Server-side validation of player actions

### Complete Gin Rummy Game Flow

* Card dealing
* Draw from stock or discard pile
* Discard cards
* Turn management
* Pass handling
* Knock validation
* Deadwood calculation
* Round scoring
* Multi-round match progression

### Dozenal Game Rules

The project implements a custom **base-12 Gin Rummy variant** using a 64-card deck.

Game rules and scoring logic are handled by the backend so clients cannot directly modify the authoritative match state.

---
## Tech Stack

**Frontend**
`Next.js` `React` `TypeScript` `Redux` `shadcn/ui`

**Backend**
`Node.js` `TypeScript` `Socket.IO` `WebSocket`

**Cloud & DevOps**
`Google Cloud Run` `GitHub Pages` `GitHub Actions` `Cloud Build` `Artifact Registry`


---


# Running Locally

## 1. Start the Game Service

```bash
cd src/game-service
npm install
npm run dev
```

The service runs locally on:

```text
localhost:8080
```

## 2. Start the Frontend

Open another terminal:

```bash
cd src/frontend
npm install
npm run dev
```

The frontend runs on:

```text
localhost:3000
```

---



# Current Architecture Limitation

The current version stores:

* Rooms
* Player sessions
* Socket connections
* Match state
* Round state

in the memory of the Cloud Run instance.

Because two Cloud Run instances would have separate memory, the production environment currently uses:

```text
max instances = 1
```

This guarantees that both players in the same game access the same game state.

---

# Future Improvements

The next architecture step is moving shared game state outside the application instance.

### Redis-backed Multiplayer State

```text
                 ┌── Cloud Run Instance 1
Players ────────►│
                 ├────────► Redis
Players ────────►│
                 └── Cloud Run Instance 2
```

Moving room and match state to **Redis** would allow multiple Cloud Run instances to share the same source of truth.

This would enable:

* Horizontal scaling
* Multiple backend instances
* Higher concurrent player capacity
* More reliable session recovery
* Cross-instance event coordination

Other planned improvements include:

* Persistent player accounts
* Match history
* Player statistics
* Ranking system
* Improved matchmaking
* Automated backend deployment
* Expanded integration testing

---

# Engineering Highlights

This project explores several practical full-stack and cloud engineering concepts:

* Real-time browser communication with **WebSocket**
* Server-authoritative multiplayer architecture
* Client/server state synchronization
* Room and session management
* Stateful workloads on serverless infrastructure
* Cloud Run scale-to-zero
* WebSocket reconnection handling
* Static frontend + independent backend architecture
* CI/CD deployment with GitHub Actions
* Custom domain and HTTPS configuration
* Migration path from single-instance state to distributed state


