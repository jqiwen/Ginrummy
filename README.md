# Gin Rummy — Dozenal Edition

A real-time multiplayer Gin Rummy web game built with **Next.js, TypeScript, Supabase Auth, Socket.IO, and Google Cloud Run**.

Unlike standard Gin Rummy, this version uses a **base-12 (dozenal) card system** with a 64-card deck, introducing a different scoring model and game strategy while keeping the core draw, discard, knock, and round mechanics of Gin Rummy.

### 🌐 [Play Gin Rummy →](https://ginrummy.jqiwen.com)

---

## Overview
Welcome to "Gin Rummy, With a Twist"! This project is a digital recreation of the classic two-player card game, Gin Rummy, but with a unique twist: it's played using a base-twelve (dozenal) number system. The game features a dozenal deck of 64 cards (5 dozen 4), introducing a fresh challenge to traditional gameplay by blending new rules with familiar mechanics. The project aims to deliver a smooth, engaging experience with rich animations and intuitive user interactions.

## Features
- **Dozenal Game Logic**: Play using a base-twelve scoring system, offering a fresh take on Gin Rummy strategies.
- **Interactive Gameplay**: Smooth animations for dealing and sorting cards, responsive card interactions, and clear game state updates.
- **Multiplayer Support**: Search registered usernames, send persistent invitations, and enter accepted private matches automatically.
- **Persistent Player Identity**: Supabase email/password accounts and database-backed public profiles secure online multiplayer seats.
- **Cross-Platform Compatibility**: Enjoy the game on desktop, mobile, and tablet with a responsive Next.js UI and a real-time Node.js game service.

## Tech Stack
- **Frontend**: Next.js, Redux, Shadcn/ui for a responsive and dynamic user interface.
- **Game service**: Node.js, TypeScript, and Socket.IO over WebSocket, with authoritative in-memory match state.
- **Authentication**: Supabase Auth and PostgreSQL profiles with row-level security.
- **Hosting target**: GitHub Pages for the frontend and Google Cloud Run for the game service.

## Authentication architecture

Supabase Auth is the only credential authority. The static frontend restores Supabase sessions, loads the matching `profiles` row, and keeps only presentation-safe identity state in Redux. It sends the current access token through the shared Socket.IO handshake; Cloud Run validates that token with Supabase and uses the verified `auth.users` UUID for player search, invitations, room seats, and reconnects. Passwords are never sent to the game service, and access tokens are never placed in Redux or persistent server storage; the verified token is retained only for the live socket so database calls remain scoped by Supabase RLS.

Guest users can use public pages and play the bot tutorial. Searching players, sending or acting on invites, and playing a private online match require a verified account on both the client and service boundaries. Invitations persist in Supabase; live card state remains in the single Cloud Run instance.

Apply the included profile and invitation migrations and complete the one-time project settings in [docs/AUTH_SETUP.md](docs/AUTH_SETUP.md) before testing real accounts.

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

Production delivery is split into two independent pipelines:

```text
Frontend: GitHub -> npm ci -> Next.js static build -> GitHub Pages
          -> https://ginrummy.jqiwen.com

Backend:  GitHub -> npm ci -> tests -> TypeScript build -> Google WIF auth
          -> Docker build -> Artifact Registry -> Cloud Run -> health/WebSocket verification
```

`.github/workflows/deploy-pages.yml` runs for frontend changes. It does not authenticate to Google Cloud or run `gcloud`; it reads the public `NEXT_PUBLIC_GAME_WS_URL` repository variable directly during the build.

`.github/workflows/deploy-game-service.yml` runs for game-service changes. It validates all deployment variables, runs tests and the TypeScript build, authenticates through Workload Identity Federation, pushes an immutable image tagged with the commit SHA, deploys a no-traffic candidate, verifies HTTP health and a direct Socket.IO WebSocket connection, and then promotes the verified revision.

The static game route remains compatible with GitHub Pages while the internal room UUID stays out of the address bar:

```text
/game
```

## Acknowledgments
Special thanks to Professor Paul Rapoport for his guidance on game rules and mechanics, and to all team members for their hard work in bringing this project to life.
