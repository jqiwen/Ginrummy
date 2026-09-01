const LOCAL_SITE_URL = "http://localhost:3000";

export function getSiteUrl(
  configuredUrl = process.env.NEXT_PUBLIC_SITE_URL,
  environment = process.env.NODE_ENV,
): string {
  const value = configuredUrl?.trim();
  if (!value) {
    if (environment === "production") {
      throw new Error("NEXT_PUBLIC_SITE_URL is required in production");
    }
    return LOCAL_SITE_URL;
  }

  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_SITE_URL must use http or https");
  }
  return url.toString().replace(/\/$/, "");
}

export function emailConfirmationRedirectUrl(
  configuredUrl = process.env.NEXT_PUBLIC_SITE_URL,
  environment = process.env.NODE_ENV,
): string {
  return new URL("/login/?confirmed=1", `${getSiteUrl(configuredUrl, environment)}/`).toString();
}
