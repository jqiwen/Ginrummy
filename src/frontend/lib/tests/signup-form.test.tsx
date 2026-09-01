import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { signUpWithEmail } from "@/lib/auth/actions";
import { SignUpForm } from "@/lib/my-components/signup-form";

const push = jest.fn();

jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
jest.mock("@/lib/auth/actions", () => ({
  signUpWithEmail: jest.fn(),
  getAuthErrorMessage: (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback,
}));

const mockedSignUp = jest.mocked(signUpWithEmail);
const preservedValues = {
  username: " Admin_User ",
  email: " Player@Example.com ",
  password: "password-123",
  confirmPassword: "password-123",
};

async function completeSignup() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Username"), preservedValues.username);
  await user.type(screen.getByLabelText("Email"), preservedValues.email);
  await user.type(screen.getByLabelText("Password", { selector: "input" }), preservedValues.password);
  await user.type(screen.getByLabelText("Confirm password", { selector: "input" }), preservedValues.confirmPassword);
  return user;
}

function currentSignupValues() {
  return {
    username: (screen.getByLabelText("Username") as HTMLInputElement).value,
    email: (screen.getByLabelText("Email") as HTMLInputElement).value,
    password: (screen.getByLabelText("Password", { selector: "input" }) as HTMLInputElement).value,
    confirmPassword: (screen.getByLabelText("Confirm password", { selector: "input" }) as HTMLInputElement).value,
  };
}

describe("SignUpForm", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows the email-verification success state when no session is returned", async () => {
    mockedSignUp.mockResolvedValue({ email: "player@example.com", session: null });
    render(<SignUpForm />);
    const user = await completeSignup();
    await user.click(screen.getByRole("button", { name: "CREATE ACCOUNT" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Check your email");
    expect(screen.getByRole("status")).toHaveTextContent("player@example.com");
  });

  it.each([
    ["failed username availability check", "This username is already taken."],
    ["auth signup failure", "Unable to create your account. Please try again."],
    ["network failure", "Unable to create your account. Please try again."],
    ["duplicate email", "An account with this email already exists."],
  ])("preserves every form value after a %s", async (_scenario, message) => {
    mockedSignUp.mockRejectedValue(new Error(message));
    render(<SignUpForm />);
    const user = await completeSignup();
    const valuesBeforeSubmission = currentSignupValues();
    await user.click(screen.getByRole("button", { name: "CREATE ACCOUNT" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
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
