import { io } from "socket.io-client";

const gameServiceUrl = process.env.GAME_SERVICE_URL?.trim();
const frontendOrigin = process.env.FRONTEND_ORIGIN?.trim();
const timeoutMs = Number.parseInt(process.env.SMOKE_TIMEOUT_MS ?? "15000", 10);

if (!gameServiceUrl || !/^https?:\/\//.test(gameServiceUrl)) {
  console.error("GAME_SERVICE_URL must be a valid HTTP(S) URL");
  process.exit(2);
}

if (!frontendOrigin || !frontendOrigin.startsWith("http")) {
  console.error("FRONTEND_ORIGIN must be a valid HTTP(S) origin");
  process.exit(2);
}

const socket = io(gameServiceUrl, {
  transports: ["websocket"],
  upgrade: false,
  forceNew: true,
  reconnection: false,
  timeout: timeoutMs,
  extraHeaders: { Origin: frontendOrigin },
});

let finished = false;

function finish(exitCode, message) {
  if (finished) return;
  finished = true;
  clearTimeout(deadline);
  socket.disconnect();

  if (exitCode === 0) {
    console.log(message);
  } else {
    console.error(message);
  }

  process.exitCode = exitCode;
}

const deadline = setTimeout(() => {
  finish(1, `Socket.IO WebSocket connection: FAIL (timed out after ${timeoutMs}ms)`);
}, timeoutMs + 1_000);

socket.once("connect", () => {
  const transport = socket.io.engine.transport.name;
  if (transport !== "websocket") {
    finish(1, `Socket.IO WebSocket connection: FAIL (connected with ${transport})`);
    return;
  }

  finish(0, "Socket.IO WebSocket connection: PASS");
});

socket.once("connect_error", (error) => {
  finish(1, `Socket.IO WebSocket connection: FAIL (${error.message})`);
});
