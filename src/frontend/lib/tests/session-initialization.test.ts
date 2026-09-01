import type { Session } from "@supabase/supabase-js";

import { loadProfile } from "@/lib/auth/actions";
import { clearAuthenticatedSession, initializeAuthenticatedSession } from "@/lib/auth/session-initialization";
import { setGameSocketAccessToken, waitForGameSocket } from "@/lib/socket";

jest.mock("@/lib/auth/actions", () => ({ loadProfile: jest.fn() }));
jest.mock("@/lib/socket", () => ({
  setGameSocketAccessToken: jest.fn(),
  waitForGameSocket: jest.fn(),
}));

const mockedLoadProfile = jest.mocked(loadProfile);
const mockedSetToken = jest.mocked(setGameSocketAccessToken);
const mockedWaitForSocket = jest.mocked(waitForGameSocket);
const session = {
  access_token: "fresh-access-token",
  user: {
    id: "user-1",
    email: "player@example.com",
    user_metadata: { username: "player", display_name: "Player" },
  },
} as unknown as Session;

describe("authenticated session initialization", () => {
  beforeEach(() => {
    clearAuthenticatedSession(jest.fn());
    jest.clearAllMocks();
    mockedLoadProfile.mockResolvedValue({ id: "user-1", username: "player", displayName: "Player" });
    mockedWaitForSocket.mockResolvedValue({} as never);
  });

  it("immediately applies the returned session and current token before multiplayer continues", async () => {
    const dispatch = jest.fn();
    await initializeAuthenticatedSession(session, dispatch, { connectSocket: true });

    expect(mockedSetToken).toHaveBeenCalledWith("fresh-access-token", true);
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: "user/setAuthenticatedUser",
      payload: expect.objectContaining({ id: "user-1", username: "player" }),
    }));
    expect(mockedWaitForSocket).toHaveBeenCalledTimes(1);
  });

  it("deduplicates profile loading and Redux transitions for the login callback and auth listener", async () => {
    const dispatch = jest.fn();
    await Promise.all([
      initializeAuthenticatedSession(session, dispatch),
      initializeAuthenticatedSession(session, dispatch),
    ]);

    expect(mockedLoadProfile).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });
});
