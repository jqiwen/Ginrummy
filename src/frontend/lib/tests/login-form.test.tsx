import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LogInForm } from "@/lib/my-components/login-form";
import { getAuthErrorMessage, signInWithEmail } from "@/lib/auth/actions";

const push = jest.fn();

jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
jest.mock("@/lib/auth/actions", () => ({
  signInWithEmail: jest.fn(),
  getAuthErrorMessage: jest.fn((error: unknown, fallback: string) => error instanceof Error ? error.message : fallback),
}));

const mockedSignIn = jest.mocked(signInWithEmail);
const mockedErrorMessage = jest.mocked(getAuthErrorMessage);

async function fillLogin() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), "player@example.com");
  await user.type(screen.getByLabelText("Password"), "password");
  return user;
}

describe("LogInForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedErrorMessage.mockImplementation((error, fallback) => error instanceof Error ? error.message : fallback);
  });

  it("redirects after a successful login", async () => {
    mockedSignIn.mockResolvedValue({} as Awaited<ReturnType<typeof signInWithEmail>>);
    const user = userEvent.setup();
    render(<LogInForm />);
    await user.type(screen.getByLabelText("Email"), "player@example.com");
    await user.type(screen.getByLabelText("Password"), "password");
    await user.click(screen.getByRole("button", { name: "SIGN IN" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/home"));
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
    resolveLogin({} as Awaited<ReturnType<typeof signInWithEmail>>);
    await waitFor(() => expect(push).toHaveBeenCalled());
  });
});
