## Frontend

Copy `.env.example` to `.env.local`, then install and start the existing Next.js UI:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The Socket.IO game service must be running at the URL in `NEXT_PUBLIC_GAME_WS_URL` (localhost port 8080 by default).

Run the frontend tests and production build with:

```bash
npm test
npm run build
```

