import { createHash } from "node:crypto";

export class Authentication {
  private readonly accounts = new Map<string, string>();

  createAccount(username: string, password: string): boolean {
    if (this.accounts.has(username)) {
      return false;
    }
    this.accounts.set(username, this.translatePassword(password));
    return true;
  }

  verifyAccount(username: string, password: string): { code: number; message: string } {
    const storedPassword = this.accounts.get(username);
    if (!storedPassword) {
      return { code: 1, message: "User not found" };
    }
    if (storedPassword !== this.translatePassword(password)) {
      return { code: 2, message: "Wrong password" };
    }
    return { code: 0, message: "OK" };
  }

  private translatePassword(password: string): string {
    return createHash("sha256").update(password, "utf8").digest("hex");
  }
}

export const authentication = new Authentication();
