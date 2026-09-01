# Gin Rummy game service

This is the in-memory, server-authoritative real-time backend for the existing Next.js Gin Rummy UI. It ports the former Python `Match`, `Bot`, dozenal deck, room, pass, auth, and round synchronization behavior to strict TypeScript and Socket.IO. It also mirrors the existing meld, deadwood, lay-off, and round-scoring functions so submitted results are verified against server-owned hands.

Socket.IO accepts WebSocket transport only. Accepted invitations receive an internal match UUID, which also becomes the Socket.IO room name. Game state intentionally remains in memory, while invitations persist in Supabase.

## Run locally

Copy `.env.example` to `.env`, then:

```bash
npm install
npm run dev
```

The service listens on [http://localhost:8080](http://localhost:8080) by default. Check it with `GET /health`. `http://localhost:3000` is allowed for local development. `FRONTEND_ORIGIN` accepts a comma-separated list of additional exact origins and supplies `https://ginrummy.jqiwen.com` in production.

Production and verification commands:

```bash
npm run build
npm start
npm test
```

## Flow

1. An authenticated player searches public profiles by username and sends a persistent invite.
2. The recipient accepts; Supabase atomically marks the invite accepted and generates the internal room UUID.
3. The service binds both verified user UUIDs to seats, joins their active sockets, and emits `match:ready`.
4. The dealer sends `round:start`; the service deals one player-specific state payload to each socket.
5. Draw requests are acknowledged only after server-side validation.
6. A discard commits the move and pushes `game:opponent-action` to the other player. Bot turns use the same event.
7. Knock results are recomputed from server-owned hands before the score is broadcast.
8. Pass, next-round readiness, disconnect, and user-ID reconnect changes are pushed instead of polled.

The full Flask endpoint mapping is in [`../../docs/MIGRATION_MAPPING.md`](../../docs/MIGRATION_MAPPING.md).

## Google Cloud Run Deployment

The full deployment sequence is documented in the repository [README](../../README.md#google-cloud-run-deployment). Cloud Run injects `PORT`; the production server reads it, binds to `0.0.0.0`, and starts compiled JavaScript with `npm start`.
