# Gin Rummy game service

This is the in-memory, server-authoritative real-time backend for the existing Next.js Gin Rummy UI. It ports the former Python `Match`, `Bot`, dozenal deck, room, pass, auth, and round synchronization behavior to strict TypeScript and Socket.IO. It also mirrors the existing meld, deadwood, lay-off, and round-scoring functions so submitted results are verified against server-owned hands.

Socket.IO accepts WebSocket transport only. A match ID is also the Socket.IO room name. Game state intentionally remains in memory for this migration phase.

## Run locally

Copy `.env.example` to `.env`, then:

```bash
npm install
npm run dev
```

The service listens on [http://localhost:8080](http://localhost:8080) by default. `FRONTEND_ORIGIN` accepts a comma-separated list when more than one local or deployed frontend origin is needed.

Production and verification commands:

```bash
npm run build
npm start
npm test
```

## Flow

1. A client creates or joins a room and the socket joins the match ID.
2. `game:start` is broadcast immediately to both players.
3. The dealer sends `round:start`; the service deals one player-specific state payload to each socket.
4. Draw requests are acknowledged only after server-side validation.
5. A discard commits the move and pushes `game:opponent-action` to the other player. Bot turns use the same event.
6. Knock results are recomputed from server-owned hands before the score is broadcast.
7. Pass, next-round readiness, and disconnect changes are pushed to the room instead of polled.

The full Flask endpoint mapping is in [`../../docs/MIGRATION_MAPPING.md`](../../docs/MIGRATION_MAPPING.md).
