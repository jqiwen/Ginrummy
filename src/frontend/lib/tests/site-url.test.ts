import { emailConfirmationRedirectUrl, getSiteUrl } from "@/lib/auth/site-url";

describe("site URL configuration", () => {
  it("generates a production confirmation URL without localhost", () => {
    const redirect = emailConfirmationRedirectUrl("https://ginrummy.jqiwen.com", "production");
    expect(redirect).toBe("https://ginrummy.jqiwen.com/login/?confirmed=1");
    expect(redirect).not.toContain("localhost");
  });

  it("supports localhost for local development", () => {
    expect(getSiteUrl("http://localhost:3000", "development")).toBe("http://localhost:3000");
    expect(emailConfirmationRedirectUrl(undefined, "development"))
      .toBe("http://localhost:3000/login/?confirmed=1");
  });

  it("fails closed when production is missing NEXT_PUBLIC_SITE_URL", () => {
    expect(() => getSiteUrl(undefined, "production")).toThrow("NEXT_PUBLIC_SITE_URL is required in production");
  });
});
