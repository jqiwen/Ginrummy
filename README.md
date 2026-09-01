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

`.github/workflows/deploy-pages.yml` runs for frontend changes. It does not authenticate to Google Cloud or run `gcloud`; it injects the `CLOUD_RUN_GAME_SERVICE_URL` repository variable into the existing `NEXT_PUBLIC_GAME_WS_URL` client variable during the build.

`.github/workflows/deploy-game-service.yml` runs for game-service changes. It validates all deployment variables, runs tests and the TypeScript build, authenticates through Workload Identity Federation, pushes an immutable image tagged with the commit SHA, deploys a no-traffic candidate, verifies HTTP health and a direct Socket.IO WebSocket connection, and then promotes the verified revision.

The static game route remains compatible with GitHub Pages while the internal room UUID stays out of the address bar:

```text
/game
```

## Required GitHub repository variables

Configure these at **GitHub -> Repository -> Settings -> Secrets and variables -> Actions -> Variables**. They are repository variables, not Actions secrets.

| Variable | Expected value | Why it is needed | Workflow |
| --- | --- | --- | --- |
| `CLOUD_RUN_GAME_SERVICE_URL` | `https://ginrummy-game-service-rjr3zjal5a-pd.a.run.app` | Compiled into the static frontend as `NEXT_PUBLIC_GAME_WS_URL` | `deploy-pages.yml` |
| `GCP_PROJECT_ID` | `ginrummy-506118` | Selects the Google Cloud project | `deploy-game-service.yml` |
| `GCP_REGION` | `northamerica-northeast2` | Selects the Artifact Registry and Cloud Run region | `deploy-game-service.yml` |
| `GCP_ARTIFACT_REPOSITORY` | `cloud-run-source-deploy` | Selects the Docker image repository | `deploy-game-service.yml` |
| `GCP_CLOUD_RUN_SERVICE` | `ginrummy-game-service` | Selects the service that receives the candidate revision | `deploy-game-service.yml` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/869554899500/locations/global/workloadIdentityPools/github-actions/providers/github` | Exchanges the GitHub OIDC token for short-lived Google credentials | `deploy-game-service.yml` |
| `GCP_SERVICE_ACCOUNT` | `ginrummy-github-deployer@ginrummy-506118.iam.gserviceaccount.com` | Identifies the least-privilege deployment identity | `deploy-game-service.yml` |
| `FRONTEND_ORIGIN` | `https://ginrummy.jqiwen.com` | Configures the exact production origin allowed by Socket.IO CORS | `deploy-game-service.yml` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Configures the browser client and is mapped to `SUPABASE_URL` on Cloud Run | Both deployment workflows |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon/publishable key | Configures the browser client and is mapped to `SUPABASE_ANON_KEY` on Cloud Run | Both deployment workflows |

The backend uses Google Workload Identity Federation. Do not create or store a service-account JSON key. The one-time provider and least-privilege IAM setup is documented in [docs/CICD_SETUP.md](docs/CICD_SETUP.md).

## One-time GitHub and Google Cloud setup

1. Complete the Workload Identity Federation and IAM setup in [docs/CICD_SETUP.md](docs/CICD_SETUP.md).
2. Apply and configure Supabase by following [docs/AUTH_SETUP.md](docs/AUTH_SETUP.md).
3. Create all ten repository variables in the table above.
4. In **Settings -> Pages**, keep **Source** set to **GitHub Actions** and keep the custom domain set to `ginrummy.jqiwen.com`.
5. Keep the Cloud Run service publicly invokable so browser WebSocket clients and candidate verification can reach it.
6. Deploy the backend first. If its service URL changes, update `CLOUD_RUN_GAME_SERVICE_URL`, then deploy the frontend.

Both workflows also support manual runs from the Actions tab. Their push path filters are independent: frontend and its workflow file trigger Pages; game service and its workflow file trigger Cloud Run. The general CI workflow verifies both packages without deploying.

## WebSocket and CORS configuration

Local development uses the fallback in `src/frontend/lib/socket.ts` and the example environment files:

```text
http://localhost:3000 -> http://localhost:8080
```

Production receives the Cloud Run HTTPS service origin through this single mapping:

```text
CLOUD_RUN_GAME_SERVICE_URL -> NEXT_PUBLIC_GAME_WS_URL -> Socket.IO client
```

The client passes the HTTPS origin to Socket.IO and restricts transport to WebSocket; Socket.IO therefore uses secure `wss://` from the HTTPS site. No Cloud Run URL or `ws://` URL is hardcoded into application source.

The game service always permits `http://localhost:3000` for local development and reads the production origin from `FRONTEND_ORIGIN`. It uses exact origin matching and does not allow `Access-Control-Allow-Origin: *`.

## Cloud Run operating constraints

The deployment keeps port `8080`, request timeout `3600`, `min instances = 0`, and `max instances = 1`. Scale-to-zero minimizes idle cost; the first connection after an idle period may wait for a cold start and the Socket.IO client will reconnect automatically.

Rooms and match state are currently stored in one process's memory. Production must remain at one maximum instance until shared state such as Redis is added; otherwise players in the same room could reach different in-memory maps.

For a production multiplayer check, open `https://ginrummy.jqiwen.com` in two browser sessions, sign in as different registered users, search/invite/accept, and verify automatic seating, deal, draw, discard, turn changes, knock, scoring, round synchronization, and identity-based reconnection.

## Acknowledgments
Special thanks to Professor Paul Rapoport for his guidance on game rules and mechanics, and to all team members for their hard work in bringing this project to life.
