import { waitForGameSocket } from "@/lib/socket";

export async function createRoom(): Promise<string | null> {
  try {
    const socket = await waitForGameSocket();
    return new Promise((resolve) => {
      socket.emit("room:create", { bot: false }, (response) => {
        resolve(response.success ? response.data?.matchId ?? null : null);
      });
    });
  } catch {
    return null;
  }
}

export interface JoinRoomResponse {
  result: number | string;
  message: string;
}

export async function joinRoom(matchID: string): Promise<JoinRoomResponse> {
  try {
    const socket = await waitForGameSocket();
    return new Promise((resolve) => {
      socket.emit("room:join", { matchId: matchID }, (response) => {
        resolve({ result: response.code, message: response.message });
      });
    });
  } catch {
    return { result: 1, message: "Game service is unavailable. Please try again." };
  }
}


    // 设置游戏为已开始
export async function setGameStart(matchId: string) {
  try {
    const socket = await waitForGameSocket();
    return new Promise<{ result: number | string; message: string }>((resolve) => {
      socket.emit("game:start", { matchId, playerId: "1" }, (response) => {
        resolve({ result: response.code, message: response.message });
      });
    });
  } catch {
    return { result: 1, message: "Game service is unavailable. Please try again." };
  }
}
