import { loginSchema, signupSchema } from "@/lib/auth/validation";

describe("authentication validation", () => {
  it("rejects an invalid email", () => {
    expect(loginSchema.safeParse({ email: "not-an-email", password: "password" }).success).toBe(false);
  });

  it("rejects invalid User IDs", () => {
    const result = signupSchema.safeParse({
      playerId: "bad name",
      email: "player@example.com",
      password: "password",
      confirmPassword: "password",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a short password", () => {
    const result = signupSchema.safeParse({
      playerId: "player_one",
      email: "player@example.com",
      password: "short",
      confirmPassword: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects passwords that do not match", () => {
    const result = signupSchema.safeParse({
      playerId: "player_one",
      email: "player@example.com",
      password: "password-one",
      confirmPassword: "password-two",
    });
    expect(result.success).toBe(false);
  });

  it("normalizes email and User ID", () => {
    expect(signupSchema.parse({
      playerId: " Player_One ",
      email: " PLAYER@EXAMPLE.COM ",
      password: "password",
      confirmPassword: "password",
    })).toMatchObject({ playerId: "player_one", email: "player@example.com" });
  });
});
