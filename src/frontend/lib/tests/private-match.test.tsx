import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import HomePage from "@/app/(pages)/home/page";
import PvpPage from "@/app/(pages)/pvp/page";

const replace = jest.fn();
const searchPlayers = jest.fn();
const sendInvite = jest.fn();
const acceptInvite = jest.fn();
const declineInvite = jest.fn();
const cancelInvite = jest.fn();
let authStatus = "authenticated";

const invitationState = {
  received: [{
    id: "invite-1",
    sender: { id: "sender", playerId: "kyra123", avatarPath: "sender/avatar.webp" },
    recipient: { id: "me", playerId: "player", avatarPath: null },
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
jest.mock("react-redux", () => ({ useSelector: () => authStatus }));
jest.mock("@/lib/my-components/header-bar", () => ({ HeaderBar: () => <div data-testid="header" /> }));
jest.mock("@/lib/invites/invitation-provider", () => ({ useInvitations: () => invitationState }));
jest.mock("@/components/ui/drawer", () => ({
  Drawer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DrawerContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DrawerHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DrawerTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("Private Match", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authStatus = "authenticated";
    searchPlayers.mockResolvedValue([
      { id: "guest", playerId: "guestplayer", avatarPath: null },
    ]);
    sendInvite.mockResolvedValue(undefined);
    acceptInvite.mockResolvedValue(undefined);
    declineInvite.mockResolvedValue(undefined);
    cancelInvite.mockResolvedValue(undefined);
  });

  it("redirects a logged-out player to login with the multiplayer destination", async () => {
    authStatus = "unauthenticated";
    render(<PvpPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login?next=%2Fpvp"));
  });

  it("sends a logged-out Play with a Friend click to login with its destination", () => {
    authStatus = "unauthenticated";
    render(<HomePage />);
    expect(screen.getByRole("link", { name: /Play with a Friend/i }))
      .toHaveAttribute("href", "/login?next=%2Fpvp");
  });

  it("debounces public User ID search, renders one identity, and never renders an email", async () => {
    jest.useFakeTimers();
    render(<PvpPage />);
    fireEvent.change(screen.getByLabelText("Search by User ID"), { target: { value: "gu" } });
    expect(searchPlayers).not.toHaveBeenCalled();
    await act(async () => { jest.advanceTimersByTime(300); });
    await waitFor(() => expect(searchPlayers).toHaveBeenCalledWith("gu"));
    expect(await screen.findByText("guestplayer")).toBeInTheDocument();
    expect(screen.getAllByText("guestplayer")).toHaveLength(1);
    expect(screen.getByLabelText("guestplayer avatar fallback")).toBeInTheDocument();
    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
    jest.useRealTimers();
  });

  it("sends an invite from a search result and accepts a received invite", async () => {
    render(<PvpPage />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Search by User ID"), "gu");
    await waitFor(() => expect(searchPlayers).toHaveBeenCalledWith("gu"), { timeout: 1_000 });
    await user.click(await screen.findByRole("button", { name: "Invite" }));
    await waitFor(() => expect(sendInvite).toHaveBeenCalledWith("guestplayer"));

    await user.click(screen.getByRole("button", { name: "Accept" }));
    await waitFor(() => expect(acceptInvite).toHaveBeenCalledWith("invite-1"));
  });
});
