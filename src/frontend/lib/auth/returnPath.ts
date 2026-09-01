const ALLOWED_RETURN_PATHS = new Set(["/account", "/home", "/pvp"]);

export function safeReturnPath(value: string | null | undefined, fallback = "/home"): string {
  if (!value || !ALLOWED_RETURN_PATHS.has(value)) {
    return fallback;
  }
  return value;
}

export function returnPathFromLocation(): string {
  if (typeof window === "undefined") {
    return "/home";
  }
  const params = new URLSearchParams(window.location.search);
  return safeReturnPath(params.get("returnTo"));
}
