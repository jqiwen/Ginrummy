import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AuthUiError, checkPlayerIdAvailability, signUpWithEmail } from "@/lib/auth/actions";
import { SignUpForm } from "@/lib/my-components/signup-form";

const push = jest.fn();

jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
jest.mock("@/lib/auth/actions", () => ({
  ...jest.requireActual("@/lib/auth/actions"),
  signUpWithEmail: jest.fn(),
  checkPlayerIdAvailability: jest.fn(),
}));

const mockedSignUp = jest.mocked(signUpWithEmail);
const mockedAvailability = jest.mocked(checkPlayerIdAvailability);
const preservedValues = {
  playerId: "Admin_User",
  email: "Player@Example.com",
  password: "password-123",
  confirmPassword: "password-123",
};

async function completeSignup() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("User ID"), preservedValues.playerId);
  await user.type(screen.getByLabelText("Email"), preservedValues.email);
  await user.type(screen.getByLabelText("Password", { selector: "input" }), preservedValues.password);
  await user.type(screen.getByLabelText("Confirm password", { selector: "input" }), preservedValues.confirmPassword);
  return user;
}

function currentSignupValues() {
  return {
    playerId: (screen.getByLabelText("User ID") as HTMLInputElement).value,
    email: (screen.getByLabelText("Email") as HTMLInputElement).value,
    password: (screen.getByLabelText("Password", { selector: "input" }) as HTMLInputElement).value,
    confirmPassword: (screen.getByLabelText("Confirm password", { selector: "input" }) as HTMLInputElement).value,
  };
}

describe("SignUpForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAvailability.mockResolvedValue(true);
  });

  it("uses User ID copy and shows debounced availability feedback", async () => {
    render(<SignUpForm />);
    const user = userEvent.setup();
    expect(screen.queryByText(/^Username$/i)).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("User ID"), "Kyra123");
    await waitFor(() => expect(mockedAvailability).toHaveBeenCalledWith("kyra123"), { timeout: 1_000 });
    expect(await screen.findByText("User ID is available.")).toBeInTheDocument();
    expect(screen.getByText(/cannot be changed later/i)).toBeInTheDocument();
  });

  it("blocks signup when the debounced availability check finds a duplicate", async () => {
    mockedAvailability.mockResolvedValue(false);
    render(<SignUpForm />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("User ID"), "ADMIN");
    expect(await screen.findByText("This User ID is already taken. Choose another one.", {}, { timeout: 1_000 })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "CREATE ACCOUNT" }));
    expect(mockedSignUp).not.toHaveBeenCalled();
  });

  it("shows the email-verification success state when no session is returned", async () => {
    mockedSignUp.mockResolvedValue({ email: "player@example.com", session: null });
    render(<SignUpForm />);
    const user = await completeSignup();
    await user.click(screen.getByRole("button", { name: "CREATE ACCOUNT" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Check your email");
    expect(screen.getByRole("status")).toHaveTextContent("player@example.com");
  });

  it.each([
    ["duplicate User ID", new AuthUiError("This User ID is already taken.", "player_id_exists"), "This User ID is already taken. Choose another one."],
    ["duplicate email", new AuthUiError("An account with this email already exists. Try signing in instead.", "email_exists"), "An account with this email already exists. Try signing in instead."],
    ["network failure", new AuthUiError("Unable to create your account. Please try again.", "unavailable"), "Unable to create your account. Please try again."],
  ])("preserves every form value after a %s", async (_scenario, failure, displayedMessage) => {
    mockedSignUp.mockRejectedValue(failure);
    render(<SignUpForm />);
    const user = await completeSignup();
    const valuesBeforeSubmission = currentSignupValues();
    await user.click(screen.getByRole("button", { name: "CREATE ACCOUNT" }));
    expect(await screen.findByText(displayedMessage)).toBeInTheDocument();
    expect(currentSignupValues()).toEqual(valuesBeforeSubmission);
  });

  it("redirects only after signup returns an authenticated session", async () => {
    mockedSignUp.mockResolvedValue({ email: "player@example.com", session: {} as never });
    render(<SignUpForm />);
    const user = await completeSignup();
    await user.click(screen.getByRole("button", { name: "CREATE ACCOUNT" }));
    expect(push).toHaveBeenCalledWith("/home");
  });
});
