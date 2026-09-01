import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { InvitationProvider, useInvitations } from "@/lib/invites/invitation-provider";

const replace = jest.fn();
const push = jest.fn();
const router = { push, replace };
const dispatch = jest.fn();
const handlers = new Map<string, Set<(payload?: never) => void>>();
const socket = {
  connected: false,
  emit: jest.fn((event: string, _payload: unknown, ack?: (response: unknown) => void) => {
    if (event === "room:leave") ack?.({ success: true, code: 0, message: "Room left" });
  }),
  on: jest.fn((event: string, handler: (payload?: never) => void) => {
    const eventHandlers = handlers.get(event) ?? new Set();
    eventHandlers.add(handler);
    handlers.set(event, eventHandlers);
  }),
  off: jest.fn((event: string, handler: (payload?: never) => void) => {
    handlers.get(event)?.delete(handler);
  }),
};

jest.mock("next/navigation", () => ({
  usePathname: () => "/game",
  useRouter: () => router,
}));
jest.mock("react-redux", () => ({
  useDispatch: () => dispatch,
  useSelector: (selector: (state: unknown) => unknown) => selector({ user: { status: "authenticated" } }),
}));
jest.mock("@/lib/socket", () => ({
  connectGameSocket: () => socket,
  waitForGameSocket: jest.fn(async () => socket),
}));

const activeMatch = {
  inviteId: "invite-1",
  membership: { matchId: "internal-match", playerId: "1", bot: false },
  opponent: { id: "user-2", playerId: "opponent", avatarPath: null },
};

function trigger(event: string, payload: unknown) {
  for (const handler of handlers.get(event) ?? []) handler(payload as never);
}

function LeaveHarness() {
  const { leaveActiveMatch } = useInvitations();
  return <button type="button" onClick={() => void leaveActiveMatch()}>Leave now</button>;
}

describe("opponent-left flow", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    handlers.clear();
    window.sessionStorage.setItem("ginrummy.activeMatch", JSON.stringify(activeMatch));
  });

  afterEach(() => {
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
    window.sessionStorage.clear();
  });

  it("shows 3-2-1, clears only game state, and redirects home once", () => {
    render(<InvitationProvider><div>Game board</div></InvitationProvider>);

    act(() => trigger("game:opponent-left", {
      matchId: "internal-match",
      reason: "left",
      redirectDelayMs: 3_000,
    }));
    act(() => trigger("game:opponent-left", {
      matchId: "internal-match",
      reason: "left",
      redirectDelayMs: 3_000,
    }));

    expect(screen.getByRole("dialog", { name: "Opponent left the table" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("3");
    expect(window.sessionStorage.getItem("ginrummy.activeMatch")).toBeNull();
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "game/resetGameStatus" }));
    expect(dispatch.mock.calls.some(([action]) => String(action?.type).startsWith("user/"))).toBe(false);

    act(() => jest.advanceTimersByTime(1_000));
    expect(screen.getByRole("status")).toHaveTextContent("2");
    act(() => jest.advanceTimersByTime(1_000));
    expect(screen.getByRole("status")).toHaveTextContent("1");
    act(() => jest.advanceTimersByTime(1_001));

    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/home");
  });

  it("keeps temporary disconnect separate and clears its notice on reconnect", () => {
    render(<InvitationProvider><div>Game board</div></InvitationProvider>);
    act(() => trigger("room:player-left", { matchId: "internal-match", playerId: "0" }));

    expect(screen.getByRole("status")).toHaveTextContent("Opponent disconnected");
    expect(screen.queryByRole("dialog", { name: "Opponent left the table" })).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();

    act(() => trigger("room:player-joined", { matchId: "internal-match", playerId: "0" }));
    expect(screen.queryByText(/Opponent disconnected/)).not.toBeInTheDocument();
  });

  it("deduplicates local leave requests and clears the active match after acknowledgement", async () => {
    render(<InvitationProvider><LeaveHarness /></InvitationProvider>);
    const button = screen.getByRole("button", { name: "Leave now" });
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => expect(socket.emit).toHaveBeenCalledWith("room:leave", {}, expect.any(Function)));
    expect(socket.emit.mock.calls.filter((call: unknown[]) => call[0] === "room:leave")).toHaveLength(1);
    expect(window.sessionStorage.getItem("ginrummy.activeMatch")).toBeNull();
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "game/resetGameStatus" }));
  });
});
