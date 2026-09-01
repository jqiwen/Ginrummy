import { loginSchema, signupSchema } from "@/lib/auth/validation";

describe("authentication validation", () => {
  it("rejects an invalid email", () => {
    expect(loginSchema.safeParse({ email: "not-an-email", password: "password" }).success).toBe(false);
  });

  it("rejects invalid usernames", () => {
    const result = signupSchema.safeParse({
      username: "bad name",
      email: "player@example.com",
      password: "password",
      confirmPassword: "password",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a short password", () => {
    const result = signupSchema.safeParse({
      username: "player_one",
      email: "player@example.com",
      password: "short",
      confirmPassword: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects passwords that do not match", () => {
    const result = signupSchema.safeParse({
      username: "player_one",
      email: "player@example.com",
      password: "password-one",
      confirmPassword: "password-two",
    });
    expect(result.success).toBe(false);
  });

  it("normalizes email and username", () => {
    expect(signupSchema.parse({
      username: " Player_One ",
      email: " PLAYER@EXAMPLE.COM ",
      password: "password",
      confirmPassword: "password",
    })).toMatchObject({ username: "player_one", email: "player@example.com" });
  });
});
