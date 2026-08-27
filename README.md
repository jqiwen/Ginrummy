# Gin Rummy — Dozenal Edition

A real-time multiplayer Gin Rummy web game built with **Next.js, TypeScript, Socket.IO, and Google Cloud Run**.

Unlike standard Gin Rummy, this version uses a **base-12 (dozenal) card system** with a 64-card deck, introducing a different scoring model and game strategy while keeping the core draw, discard, knock, and round mechanics of Gin Rummy.

### 🌐 [Play Gin Rummy →](https://ginrummy.jqiwen.com)

---

## Overview
Welcome to "Gin Rummy, With a Twist"! This project is a digital recreation of the classic two-player card game, Gin Rummy, but with a unique twist: it's played using a base-twelve (dozenal) number system. The game features a dozenal deck of 64 cards (5 dozen 4), introducing a fresh challenge to traditional gameplay by blending new rules with familiar mechanics. The project aims to deliver a smooth, engaging experience with rich animations and intuitive user interactions.

## Features
- **Dozenal Game Logic**: Play using a base-twelve scoring system, offering a fresh take on Gin Rummy strategies.
- **Interactive Gameplay**: Smooth animations for dealing and sorting cards, responsive card interactions, and clear game state updates.
- **Multiplayer Support**: Engage in matches with other players through online matchmaking or by inviting friends.
- **User Profiles & Rankings**: Create accounts, track your progress, and see where you rank on the global leaderboard.
- **Cross-Platform Compatibility**: Enjoy the game on desktop, mobile, and tablet with a responsive Next.js UI and a real-time Node.js game service.

## Tech Stack
- **Frontend**: Next.js, Redux, Shadcn/ui for a responsive and dynamic user interface.
- **Game service**: Node.js, TypeScript, and Socket.IO over WebSocket, with authoritative in-memory match state.
- **Hosting target**: GitHub Pages for the frontend and Google Cloud Run for the game service.

## Run locally

Start the real-time game service:

```bash
cd src/game-service
npm ci
npm test
npm run build
npm run dev
```

In another terminal, start the existing frontend:

```bash
cd src/frontend
npm ci
npm run build
npm run dev
```

Copy each directory's `.env.example` first. The frontend runs on [http://localhost:3000](http://localhost:3000), and the WebSocket game service runs on [http://localhost:8080](http://localhost:8080).

See [docs/MIGRATION_MAPPING.md](docs/MIGRATION_MAPPING.md) for the REST-to-WebSocket migration map.

## Deployment architecture

Production uses a static Next.js export at `https://ginrummy.jqiwen.com`. Browser clients connect directly over Socket.IO/WebSocket to the public HTTPS URL of the `ginrummy-game-service` Cloud Run service. Socket.IO selects secure WebSocket (`wss://`) automatically when `NEXT_PUBLIC_GAME_WS_URL` is an `https://` URL.

Local development remains:

```text
http://localhost:3000  ->  http://localhost:8080
```

The static game route uses a query parameter so GitHub Pages can serve one exported page:

```text
/game?roomId=<ROOM_ID>-<PLAYER_ID>
```

## Google Cloud Run Deployment

Cloud Run deployment is intentionally manual in this phase. No Google Cloud resources are created by this repository or its GitHub Actions workflow.

### 1. Google Cloud project setup

1. Open the Google Cloud Console.
2. Create or select a Google Cloud project.
3. Enable billing for that project.
4. Install the Google Cloud CLI, or open Cloud Shell.
5. Authenticate:

   ```bash
   gcloud auth login
   ```

6. Select the project, replacing the placeholder with your real project ID:

   ```bash
   gcloud config set project <GCP_PROJECT_ID>
   ```

7. Enable the APIs needed for a Cloud Run source deployment:

   ```bash
   gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
   ```

### 2. Build and test the game service

From the repository root:

```bash
cd src/game-service
npm ci
npm run build
npm test
npm start
```

`npm start` runs the compiled `dist/server.js`; it does not use `tsx`, watch mode, or a development server. In another terminal, verify the local health endpoint:

```bash
curl http://localhost:8080/health
```

Expected response:

```json
{"status":"ok"}
```

Stop the local process before deploying if it is no longer needed.

### 3. Deploy from the game-service directory

Run this exact command from `src/game-service`:

```bash
gcloud run deploy ginrummy-game-service \
  --source . \
  --region northamerica-northeast2 \
  --allow-unauthenticated \
  --timeout 3600 \
  --min-instances 0 \
  --max-instances 1 \
  --session-affinity \
  --set-env-vars FRONTEND_ORIGIN=https://ginrummy.jqiwen.com
```

This keeps the service public for browser clients and cost-conscious for a portfolio project. `min instances = 0` permits scale-to-zero, so the first connection after idle time may remain in a temporary connecting state while Cloud Run starts the container. The Socket.IO client logs `connect`, `disconnect`, `connect_error`, `reconnect_attempt`, and `reconnect` events and automatically reconnects.

The `3600`-second request timeout is intentional: Cloud Run WebSocket requests are finite and can be disconnected after 60 minutes. Session affinity is enabled as a best-effort aid for reconnections, but **session affinity is not shared state and is not a correctness mechanism**.

After deployment, copy the service URL from the command output or retrieve it with:

```bash
gcloud run services describe ginrummy-game-service \
  --region northamerica-northeast2 \
  --format='value(status.url)'
```

Do not guess or add a trailing path to this URL.

### 4. Verify Cloud Run health

Before connecting the frontend, open or request:

```text
https://<CLOUD_RUN_SERVICE_URL>/health
```

or:

```bash
curl https://<CLOUD_RUN_SERVICE_URL>/health
```

Continue only after it returns:

```json
{"status":"ok"}
```

### 5. Configure and deploy GitHub Pages

1. In GitHub, open `jqiwen/ginrummy`.
2. Open **Settings -> Secrets and variables -> Actions -> Variables**.
3. Create a repository variable named `CLOUD_RUN_GAME_SERVICE_URL`.
4. Set its value to the exact Cloud Run service URL, for example `https://<service-id>.a.run.app`. Do not add quotes and do not invent the URL.
5. Open **Settings -> Pages**.
6. Under **Build and deployment**, set **Source** to **GitHub Actions**.
7. Push the deployment changes to `master`, or manually run **Deploy frontend to GitHub Pages** from the Actions tab.
8. Confirm the deployment environment reports `https://ginrummy.jqiwen.com`.

The workflow exposes the repository variable only during the frontend build:

```text
CLOUD_RUN_GAME_SERVICE_URL -> NEXT_PUBLIC_GAME_WS_URL
```

It runs `npm ci`, builds the static export in `src/frontend/out`, uploads that directory, and deploys only the frontend. The workflow fails early if the repository variable is missing, which prevents publishing a build that points to localhost.

### 6. Production multiplayer test

Health alone does not validate the real-time game. Use two separate browser windows, preferably one normal and one incognito:

1. Open `https://ginrummy.jqiwen.com` in both windows.
2. Player A creates a room and copies the room ID.
3. Player B joins that room.
4. Verify both players see the join and Player A can start the game.
5. Start the game and deal.
6. Draw a card and discard a card.
7. Verify the other browser receives the update and the turn switches.
8. Verify pass behavior.
9. Verify knock and scoring.
10. Verify the next round starts for both players.
11. Refresh or briefly interrupt one browser connection and verify the client reconnects/resumes when practical.

### Current single-instance limitation

Rooms, socket memberships, matches, and round state are held in memory by `src/game-service/src/state/gameStore.ts`. Two Cloud Run instances would have independent maps, so players in one room could be routed to different state and the game would fail. For that reason, production **must keep `max instances = 1`** even when session affinity is enabled.

TODO: Move game/session state to Redis before enabling multiple Cloud Run instances.

Future Redis-backed room/session state would give all instances a shared source of truth (and cross-instance event coordination), allowing `max instances` to be raised safely. Redis is deliberately not part of this deployment phase.

## Deployment environment variables

Frontend (`src/frontend/.env.example`):

```env
NEXT_PUBLIC_GAME_WS_URL=http://localhost:8080
```

For the GitHub Pages build, the value must be the Cloud Run HTTPS service URL and comes from the `CLOUD_RUN_GAME_SERVICE_URL` repository variable.

Game service (`src/game-service/.env.example`):

```env
PORT=8080
FRONTEND_ORIGIN=http://localhost:3000
```

Cloud Run supplies `PORT` automatically. The deployment command sets `FRONTEND_ORIGIN=https://ginrummy.jqiwen.com`. The service also permits `http://localhost:3000` so local development continues to work. No runtime credentials are required or committed.

## Acknowledgments
Special thanks to Professor Paul Rapoport for his guidance on game rules and mechanics, and to all team members for their hard work in bringing this project to life.
