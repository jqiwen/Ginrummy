import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { HeaderBar } from "@/lib/my-components/header-bar";

const replace = jest.fn();
const leaveActiveMatch = jest.fn<Promise<void>, []>();
const dispatch = jest.fn();

jest.mock("next/navigation", () => ({
  usePathname: () => "/game",
  useRouter: () => ({ push: jest.fn(), replace }),
}));
jest.mock("react-redux", () => ({
  useDispatch: () => dispatch,
  useSelector: (selector: (state: unknown) => unknown) => selector({
    user: { id: "user-1", email: "player@example.com", playerId: "player", avatarPath: null, status: "authenticated" },
    game: { showSideBar: null },
  }),
}));
jest.mock("@/lib/invites/invitation-provider", () => ({
  useInvitations: () => ({
    received: [],
    acceptInvite: jest.fn(),
    declineInvite: jest.fn(),
    leaveActiveMatch,
  }),
}));
jest.mock("@/lib/auth/actions", () => ({ signOutUser: jest.fn() }));
jest.mock("@/lib/socket", () => ({ setGameSocketAccessToken: jest.fn() }));

describe("leave game confirmation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    leaveActiveMatch.mockResolvedValue(undefined);
  });

  it("opens the themed dialog and Stay in game closes it without leaving", async () => {
    const user = userEvent.setup();
    render(<HeaderBar />);

    await user.click(screen.getByRole("button", { name: "Leave game" }));
    expect(screen.getByRole("dialog", { name: "Leave the table?" })).toBeInTheDocument();
    expect(screen.getByText(/Your current round will end/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Stay in game" }));
    expect(screen.queryByRole("dialog", { name: "Leave the table?" })).not.toBeInTheDocument();
    expect(leaveActiveMatch).not.toHaveBeenCalled();
  });

  it("submits one leave request, shows progress, and redirects home after success", async () => {
    let resolveLeave!: () => void;
    leaveActiveMatch.mockReturnValue(new Promise<void>((resolve) => { resolveLeave = resolve; }));
    const user = userEvent.setup();
    render(<HeaderBar />);

    await user.click(screen.getByRole("button", { name: "Leave game" }));
    const confirm = screen.getByRole("button", { name: "Leave game" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    expect(leaveActiveMatch).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Leaving table…" })).toBeDisabled();

    resolveLeave();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/home"));
  });

  it("closes with Escape before leave processing begins", async () => {
    const user = userEvent.setup();
    render(<HeaderBar />);
    await user.click(screen.getByRole("button", { name: "Leave game" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Leave the table?" })).not.toBeInTheDocument();
  });
});
