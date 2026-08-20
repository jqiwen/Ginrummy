import { connectGameSocket } from "@/lib/socket";

export async function createRoom(): Promise<string | null> {
  const socket = connectGameSocket();
  return new Promise((resolve) => {
    socket.emit("room:create", { bot: false }, (response) => {
      resolve(response.success ? response.data?.matchId ?? null : null);
    });
  });
}

export interface JoinRoomResponse {
  result: number;
  message: string;
}

export async function joinRoom(matchID: string): Promise<JoinRoomResponse> {
  const socket = connectGameSocket();
  return new Promise((resolve) => {
    socket.emit("room:join", { matchId: matchID }, (response) => {
      resolve({ result: response.code, message: response.message });
    });
  });
}


    // 设置游戏为已开始
export async function setGameStart(matchId: string) {
  const socket = connectGameSocket();
  return new Promise<{ result: number; message: string }>((resolve) => {
    socket.emit("game:start", { matchId, playerId: "1" }, (response) => {
      resolve({ result: response.code, message: response.message });
    });
  });
}
