import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LogInForm } from "@/lib/my-components/login-form";
import { getAuthErrorMessage, signInWithEmail } from "@/lib/auth/actions";
import { initializeAuthenticatedSession } from "@/lib/auth/session-initialization";

const push = jest.fn();
const dispatch = jest.fn();

jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
jest.mock("react-redux", () => ({ useDispatch: () => dispatch }));
jest.mock("@/lib/auth/actions", () => ({
  signInWithEmail: jest.fn(),
  getAuthErrorMessage: jest.fn((error: unknown, fallback: string) => error instanceof Error ? error.message : fallback),
}));
jest.mock("@/lib/auth/session-initialization", () => ({ initializeAuthenticatedSession: jest.fn() }));

const mockedSignIn = jest.mocked(signInWithEmail);
const mockedErrorMessage = jest.mocked(getAuthErrorMessage);
const mockedInitializeSession = jest.mocked(initializeAuthenticatedSession);
const session = { access_token: "current-access-token", user: { id: "user-1" } } as never;

async function fillLogin() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), "player@example.com");
  await user.type(screen.getByLabelText("Password"), "password");
  return user;
}

describe("LogInForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.history.replaceState({}, "", "/login/");
    mockedErrorMessage.mockImplementation((error, fallback) => error instanceof Error ? error.message : fallback);
    mockedInitializeSession.mockResolvedValue({} as never);
  });

  it("redirects after a successful login", async () => {
    mockedSignIn.mockResolvedValue(session);
    const user = userEvent.setup();
    render(<LogInForm />);
    await user.type(screen.getByLabelText("Email"), "player@example.com");
    await user.type(screen.getByLabelText("Password"), "password");
    await user.click(screen.getByRole("button", { name: "SIGN IN" }));
    await waitFor(() => expect(mockedInitializeSession).toHaveBeenCalledWith(session, dispatch, { connectSocket: false }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/home"));
  });

  it("applies the returned session and authenticated socket before the first multiplayer navigation", async () => {
    window.history.replaceState({}, "", "/login/?next=%2Fpvp");
    mockedSignIn.mockResolvedValue(session);
    render(<LogInForm />);
    const user = await fillLogin();
    await user.click(screen.getByRole("button", { name: "SIGN IN" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/pvp"));
    expect(mockedSignIn).toHaveBeenCalledTimes(1);
    expect(mockedInitializeSession).toHaveBeenCalledWith(session, dispatch, { connectSocket: true });
    expect(mockedInitializeSession.mock.invocationCallOrder[0]).toBeLessThan(push.mock.invocationCallOrder[0]!);
  });

  it("shows a friendly inline login error", async () => {
    mockedSignIn.mockRejectedValue(new Error("Email or password is incorrect."));
    render(<LogInForm />);
    const user = await fillLogin();
    await user.click(screen.getByRole("button", { name: "SIGN IN" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Email or password is incorrect.");
  });

  it("prevents duplicate submissions while login is pending", async () => {
    let resolveLogin!: (value: Awaited<ReturnType<typeof signInWithEmail>>) => void;
    mockedSignIn.mockImplementation(() => new Promise((resolve) => { resolveLogin = resolve; }));
    render(<LogInForm />);
    const user = await fillLogin();
    const button = screen.getByRole("button", { name: "SIGN IN" });
    await user.dblClick(button);
    expect(mockedSignIn).toHaveBeenCalledTimes(1);
    resolveLogin(session);
    await waitFor(() => expect(push).toHaveBeenCalled());
  });

  it("shows the email confirmation success message from the static callback URL", async () => {
    window.history.replaceState({}, "", "/login/?confirmed=1");
    render(<LogInForm />);
    expect(await screen.findByRole("status")).toHaveTextContent("Email confirmed. You can sign in now.");
  });
});
