import { checkPlayerIdAvailability, signUpWithEmail } from "@/lib/auth/actions";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

jest.mock("@/lib/supabase/client", () => ({ getSupabaseBrowserClient: jest.fn() }));

const mockedGetClient = jest.mocked(getSupabaseBrowserClient);
const values = {
  playerId: "Admin_User",
  email: " Player@Example.com ",
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
  const eq = jest.fn(() => ({ maybeSingle }));
  const select = jest.fn(() => ({ eq }));
  const signUp = options.signupReject === undefined
    ? jest.fn().mockResolvedValue({
      data: options.signupData ?? { user: { identities: [{}] }, session: null },
      error: options.signupError ?? null,
    })
    : jest.fn().mockRejectedValue(options.signupReject);
  const client = { from: jest.fn(() => ({ select })), auth: { signUp } };
  mockedGetClient.mockReturnValue(client as never);
  return { eq, maybeSingle, select, signUp };
}

describe("registration identity checks", () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SITE_URL = "https://ginrummy.jqiwen.com";
    consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => consoleError.mockRestore());

  it("reports an available User ID and performs a lowercase player_id lookup", async () => {
    const { eq } = mockSupabase({});
    await expect(checkPlayerIdAvailability("  ADMIN_User ")).resolves.toBe(true);
    expect(eq).toHaveBeenCalledWith("player_id", "admin_user");
  });

  it("treats case-only duplicate User IDs as taken and blocks auth signup", async () => {
    const { signUp } = mockSupabase({ profileData: { id: "existing-user" } });
    await expect(signUpWithEmail(values)).rejects.toMatchObject({
      code: "player_id_exists",
      message: "This User ID is already taken.",
    });
    expect(signUp).not.toHaveBeenCalled();
  });

  it("identifies an unapplied profiles migration and never calls auth signup", async () => {
    const { signUp } = mockSupabase({
      profileError: { code: "PGRST205", message: "Could not find the table 'public.profiles' in the schema cache" },
    });
    await expect(signUpWithEmail(values)).rejects.toMatchObject({ code: "unavailable" });
    expect(signUp).not.toHaveBeenCalled();
  });

  it("fails safely when the availability request has a network error", async () => {
    const { signUp } = mockSupabase({ profileReject: new TypeError("fetch failed") });
    await expect(signUpWithEmail(values)).rejects.toMatchObject({ code: "unavailable" });
    expect(signUp).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      "[auth] Unexpected Supabase error",
      { operation: "player_id_availability_network" },
    );
  });

  it("maps duplicate email responses without exposing an email directory", async () => {
    mockSupabase({ signupError: { message: "User already registered" } });
    await expect(signUpWithEmail(values)).rejects.toMatchObject({
      code: "email_exists",
      message: "An account with this email already exists. Try signing in instead.",
    });
  });

  it("maps a profile uniqueness race to the friendly User ID error", async () => {
    mockSupabase({ signupError: { code: "23505", message: "PLAYER_ID_TAKEN duplicate key" } });
    await expect(signUpWithEmail(values)).rejects.toMatchObject({
      code: "player_id_exists",
      message: "This User ID is already taken.",
    });
  });

  it("normalizes signup identity and sends no display name or public email metadata", async () => {
    const { signUp } = mockSupabase({});
    await expect(signUpWithEmail(values)).resolves.toMatchObject({ email: "player@example.com", session: null });
    expect(signUp).toHaveBeenCalledWith({
      email: "player@example.com",
      password: values.password,
      options: {
        data: { player_id: "admin_user" },
        emailRedirectTo: "https://ginrummy.jqiwen.com/login/?confirmed=1",
      },
    });
  });
});
