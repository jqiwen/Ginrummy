# Gin Rummy, With a Twist

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
- **Hosting**: Deployed on Google Cloud Platform for scalability and availability.

## Run locally

Start the real-time game service:

```bash
cd src/game-service
npm install
npm run dev
```

In another terminal, start the existing frontend:

```bash
cd src/frontend
npm install
npm run dev
```

Copy each directory's `.env.example` first. The frontend runs on [http://localhost:3000](http://localhost:3000), and the WebSocket game service runs on [http://localhost:8080](http://localhost:8080).

See [docs/MIGRATION_MAPPING.md](docs/MIGRATION_MAPPING.md) for the REST-to-WebSocket migration map.

## Acknowledgments
Special thanks to Professor Paul Rapoport for his guidance on game rules and mechanics, and to all team members for their hard work in bringing this project to life.
