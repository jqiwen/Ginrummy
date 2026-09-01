import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import PvpPage from "@/app/(pages)/pvp/page";

const replace = jest.fn();
const searchPlayers = jest.fn();
const sendInvite = jest.fn();
const acceptInvite = jest.fn();
const declineInvite = jest.fn();
const cancelInvite = jest.fn();

const invitationState = {
  received: [{
    id: "invite-1",
    sender: { id: "sender", username: "kyra123", displayName: "Kyra" },
    recipient: { id: "me", username: "player", displayName: "Player" },
    status: "pending" as const,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    expiresAt: "2026-09-01T00:30:00.000Z",
  }],
  sent: [],
  loading: false,
  searchPlayers,
  sendInvite,
  acceptInvite,
  declineInvite,
  cancelInvite,
};

jest.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
jest.mock("react-redux", () => ({ useSelector: () => "authenticated" }));
jest.mock("@/lib/my-components/header-bar", () => ({ HeaderBar: () => <div data-testid="header" /> }));
jest.mock("@/lib/invites/invitation-provider", () => ({ useInvitations: () => invitationState }));

describe("Private Match", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    searchPlayers.mockResolvedValue([
      { id: "guest", username: "guestplayer", displayName: "Guest Player" },
    ]);
    sendInvite.mockResolvedValue(undefined);
    acceptInvite.mockResolvedValue(undefined);
    declineInvite.mockResolvedValue(undefined);
    cancelInvite.mockResolvedValue(undefined);
  });

  it("debounces public username search and never renders an email", async () => {
    jest.useFakeTimers();
    render(<PvpPage />);
    fireEvent.change(screen.getByLabelText("Search by username"), { target: { value: "gu" } });
    expect(searchPlayers).not.toHaveBeenCalled();
    await act(async () => { jest.advanceTimersByTime(300); });
    await waitFor(() => expect(searchPlayers).toHaveBeenCalledWith("gu"));
    expect(await screen.findByText("guestplayer")).toBeInTheDocument();
    expect(screen.getByText("Guest Player")).toBeInTheDocument();
    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
    jest.useRealTimers();
  });

  it("sends an invite from a search result and accepts a received invite", async () => {
    render(<PvpPage />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Search by username"), "gu");
    await waitFor(() => expect(searchPlayers).toHaveBeenCalledWith("gu"), { timeout: 1_000 });
    await user.click(await screen.findByRole("button", { name: "Invite" }));
    await waitFor(() => expect(sendInvite).toHaveBeenCalledWith("guestplayer"));

    await user.click(screen.getByRole("button", { name: "Accept" }));
    await waitFor(() => expect(acceptInvite).toHaveBeenCalledWith("invite-1"));
  });
});
