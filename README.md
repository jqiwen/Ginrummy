# Gin Rummy, With a Twist

## Overview

Gin Rummy, With a Twist is a real-time, two-player card game built around a 64-card dozenal deck. The frontend combines a responsive Next.js interface with animated card play; the authoritative Node.js game service keeps rooms, hands, turns, and scoring synchronized over Socket.IO WebSocket connections.

## Features

- Dozenal Gin Rummy rules and scoring
- Animated dealing, drawing, discarding, passing, knocking, and round transitions
- Tutorial play against a bot and real-time friend rooms
- Next.js static frontend with a TypeScript/Socket.IO game service
- Automated CI plus independently deployable frontend and backend pipelines

## Tech stack

- **Frontend:** Next.js, React, TypeScript, Redux, and Shadcn/ui
- **Backend:** Node.js 22, TypeScript, and Socket.IO
- **Hosting:** GitHub Pages at [ginrummy.jqiwen.com](https://ginrummy.jqiwen.com) and Google Cloud Run
- **Container registry:** Google Artifact Registry

## Run locally

Start the game service:

```bash
cd src/game-service
npm ci
npm test
npm run build
npm run dev
```

In another terminal, start the frontend:

```bash
cd src/frontend
npm ci
npm run build
npm run dev
```

Copy each directory's `.env.example` when local overrides are needed. The frontend runs at `http://localhost:3000`; the game service and `/health` endpoint run at `http://localhost:8080`.

## CI/CD

Pull requests and relevant pushes to `master` run `.github/workflows/ci.yml`:

- Backend: `npm ci` → tests → TypeScript build → Docker build
- Frontend: `npm ci` → production static build with a harmless CI service URL

Production delivery is split so each application can deploy independently:

```text
Frontend: GitHub → GitHub Actions → query active Cloud Run URL
         → Next.js static export → GitHub Pages → ginrummy.jqiwen.com

Backend:  GitHub → GitHub Actions → test/build → Docker
         → Artifact Registry → no-traffic Cloud Run candidate
         → HTTP + direct WebSocket smoke tests → 100% traffic
```

The Pages workflow queries `status.url` from the existing Cloud Run service during every build and exposes it as `NEXT_PUBLIC_GAME_WS_URL`. No generated `run.app` URL is hardcoded in source or stored as a separate repository variable.

The backend workflow deploys an immutable `${GITHUB_SHA}` image. It first creates a tagged candidate revision with no production traffic, checks `/health`, proves a Socket.IO connection using the `websocket` transport and production `Origin` header, and only then promotes that revision.

Both production workflows authenticate with GitHub OIDC and Google Cloud Workload Identity Federation. No service-account key is stored in GitHub. See [docs/CICD_SETUP.md](docs/CICD_SETUP.md) for the exact one-time setup and least-privilege IAM grants.

### Required GitHub Actions variables

| Variable | Production value |
| --- | --- |
| `GCP_PROJECT_ID` | `ginrummy-506118` |
| `GCP_REGION` | `northamerica-northeast2` |
| `GCP_ARTIFACT_REPOSITORY` | `cloud-run-source-deploy` |
| `GCP_CLOUD_RUN_SERVICE` | `ginrummy-game-service` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/869554899500/locations/global/workloadIdentityPools/github-actions/providers/github` |
| `GCP_SERVICE_ACCOUNT` | `ginrummy-github-deployer@ginrummy-506118.iam.gserviceaccount.com` |
| `FRONTEND_ORIGIN` | `https://ginrummy.jqiwen.com` |

No GitHub Actions secret is required for Google Cloud authentication.

### Manual deployment

Open the repository's **Actions** tab and run either **Deploy frontend to GitHub Pages** or **Deploy game service to Cloud Run**. From an authenticated GitHub CLI, the equivalent commands are:

```bash
gh workflow run deploy-pages.yml --repo jqiwen/Ginrummy --ref master
gh workflow run deploy-game-service.yml --repo jqiwen/Ginrummy --ref master
```

### Production smoke tests

Check HTTP health:

```bash
curl https://<ACTIVE_CLOUD_RUN_URL>/health
```

Expected response:

```json
{"status":"ok"}
```

Prove direct WebSocket connectivity with the same origin validation used by the browser:

```bash
cd src/game-service
GAME_SERVICE_URL=https://<ACTIVE_CLOUD_RUN_URL> \
FRONTEND_ORIGIN=https://ginrummy.jqiwen.com \
npm run smoke:websocket
```

## Cloud Run safety constraint

Rooms and match state currently live in one process's memory. Production must keep Cloud Run at `max instances = 1`; otherwise players in one match could be routed to different memory. The deployment workflow enforces `min instances = 0`, `max instances = 1`, port `8080`, and a 3600-second request timeout. Redis or another shared-state system is intentionally outside this project phase.

The server always permits `http://localhost:3000` and `https://ginrummy.jqiwen.com`. `FRONTEND_ORIGIN` may add a comma-separated list of additional exact origins; wildcard browser origins are not allowed. Rejected handshakes log only timestamp, origin, transport, and request path.

See [docs/MIGRATION_MAPPING.md](docs/MIGRATION_MAPPING.md) for the REST-to-WebSocket migration map.

## Acknowledgments

Special thanks to Professor Paul Rapoport for his guidance on game rules and mechanics, and to all team members who contributed to the project.
