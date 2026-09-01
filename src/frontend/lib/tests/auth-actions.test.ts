import { signUpWithEmail } from "@/lib/auth/actions";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

jest.mock("@/lib/supabase/client", () => ({ getSupabaseBrowserClient: jest.fn() }));

const mockedGetClient = jest.mocked(getSupabaseBrowserClient);
const values = {
  username: "admin_user",
  email: "player@example.com",
  password: "password-123",
  confirmPassword: "password-123",
};

function mockSupabase(options: {
  profileData?: unknown;
  profileError?: unknown;
  profileReject?: unknown;
  signupData?: unknown;
  signupError?: unknown;
  signupReject?: unknown;
}) {
  const maybeSingle = options.profileReject === undefined
    ? jest.fn().mockResolvedValue({ data: options.profileData ?? null, error: options.profileError ?? null })
    : jest.fn().mockRejectedValue(options.profileReject);
  const signUp = options.signupReject === undefined
    ? jest.fn().mockResolvedValue({
      data: options.signupData ?? { user: { identities: [{}] }, session: null },
      error: options.signupError ?? null,
    })
    : jest.fn().mockRejectedValue(options.signupReject);
  const client = {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({ maybeSingle })),
      })),
    })),
    auth: { signUp },
  };
  mockedGetClient.mockReturnValue(client as never);
  return { maybeSingle, signUp };
}

describe("signUpWithEmail", () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SITE_URL = "https://ginrummy.jqiwen.com";
    consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => consoleError.mockRestore());

  it("identifies an unapplied profiles migration and never calls auth signup", async () => {
    const { signUp } = mockSupabase({
      profileError: {
        code: "PGRST205",
        message: "Could not find the table 'public.profiles' in the schema cache",
      },
    });

    await expect(signUpWithEmail(values)).rejects.toMatchObject({
      code: "unavailable",
      message: "Unable to create your account. Please try again.",
    });
    expect(signUp).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      "[auth] Supabase profiles table is unavailable. Apply the auth database migration.",
    );
  });

  it("stops when the username already exists", async () => {
    const { signUp } = mockSupabase({ profileData: { id: "existing-user" } });
    await expect(signUpWithEmail(values)).rejects.toMatchObject({ code: "username_exists" });
    expect(signUp).not.toHaveBeenCalled();
  });

  it("fails safely when the username availability request has a network error", async () => {
    const { signUp } = mockSupabase({ profileReject: new TypeError("fetch failed") });
    await expect(signUpWithEmail(values)).rejects.toMatchObject({ code: "unavailable" });
    expect(signUp).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      "[auth] Unexpected Supabase error",
      { operation: "username_availability_network" },
    );
  });

  it("maps duplicate email responses to a friendly error", async () => {
    mockSupabase({ signupError: { message: "User already registered" } });
    await expect(signUpWithEmail(values)).rejects.toMatchObject({
      code: "email_exists",
      message: "An account with this email already exists.",
    });
  });

  it("logs a safe operation name for network failures", async () => {
    mockSupabase({ signupReject: new TypeError("fetch failed") });
    await expect(signUpWithEmail(values)).rejects.toMatchObject({ code: "unavailable" });
    expect(consoleError).toHaveBeenCalledWith(
      "[auth] Unexpected Supabase error",
      { operation: "auth_signup_network" },
    );
  });

  it("maps unexpected auth signup responses to a generic error", async () => {
    mockSupabase({ signupError: { code: "unexpected_failure", message: "Auth service unavailable" } });
    await expect(signUpWithEmail(values)).rejects.toMatchObject({
      code: "unavailable",
      message: "Unable to create your account. Please try again.",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "[auth] Unexpected Supabase error",
      { operation: "auth_signup", code: "unexpected_failure" },
    );
  });

  it("returns the email-confirmation result after successful auth signup", async () => {
    const { signUp } = mockSupabase({});
    await expect(signUpWithEmail(values)).resolves.toMatchObject({
      email: values.email,
      session: null,
    });
    expect(signUp).toHaveBeenCalledWith(expect.objectContaining({
      options: expect.objectContaining({
        emailRedirectTo: "https://ginrummy.jqiwen.com/login/?confirmed=1",
      }),
    }));
  });
});
