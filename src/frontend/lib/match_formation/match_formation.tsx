// matchFormation.ts（不再是 React 组件！）
//const backend_url = process.env.BACKEND_URL;
// const backend_url = "http://localhost:8080";
const backend_url = process.env.BACKEND_URL || "https://backend.ginrummys.ca";

export async function createRoom(): Promise<string | null> {
  try {
    const response = await fetch(`${backend_url}/api/match_create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bot: 'False'
      })
    });
    const data = await response.json();
    const matchID = data["match_id"];
    return matchID;
  } catch (err) {
    return null;
  }
}

export interface JoinRoomResponse {
  result: number;
  message: string;
}

export async function joinRoom(matchID: string): Promise<JoinRoomResponse> {
  try {
    const response = await fetch(`${backend_url}/api/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ matchid: matchID })
    });

    const data = await response.json();
    return { result: data.result, message: data.message };
  } catch (err) {
    return { result: -1, message: "Join failed due to network error" };
  }
}

export interface RoomStatusResponse {
  result: number;
  message: string;
}

export async function checkRoomStatus(matchID: string): Promise<RoomStatusResponse> {
  try {
    const response = await fetch(`${backend_url}/api/room_status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ matchid: matchID })
    });
    const data = await response.json();
    return { result: data.result, message: data.message };
  } catch (err) {
    console.error("Failed to check room status", err);
    return { result: -1, message: "Network error" };
  }
}


    // 设置游戏为已开始
export  async function setGameStart(matchid: string) {
      const res = await fetch(`${backend_url}/api/set_game_start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchid }),
      });
      return await res.json();
  }
  
  // 查询游戏是否开始
export async function isGameStarted(matchid: string) {
      const res = await fetch(`${backend_url}/api/is_game_started`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchid }),
      });
      return await res.json();
  }


export  async function getLastMoveOfOpponent(playerId: string, matchId: string) {
    const res = await fetch(`${backend_url}/api/match_move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host: playerId, matchid: matchId, move: "wait_opponent" })
    });
    return await res.json();
  }