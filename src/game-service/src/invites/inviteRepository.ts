import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { InviteErrorCode, InviteStatus, PublicPlayerProfile } from "../types/socketEvents.js";

export interface InviteRequestContext {
  userId: string;
  accessToken: string;
}

export interface InviteRecord {
  id: string;
  senderId: string;
  recipientId: string;
  status: InviteStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  roomId: string | null;
}

export type InviteTransition = "accept" | "decline" | "cancel";

export interface InviteRepository {
  searchProfiles(context: InviteRequestContext, query: string, limit: number): Promise<PublicPlayerProfile[]>;
  getProfileByUsername(context: InviteRequestContext, username: string): Promise<PublicPlayerProfile | null>;
  getProfilesByIds(context: InviteRequestContext, ids: string[]): Promise<Map<string, PublicPlayerProfile>>;
  listInvites(context: InviteRequestContext): Promise<InviteRecord[]>;
  getInvite(context: InviteRequestContext, inviteId: string): Promise<InviteRecord | null>;
  createInvite(context: InviteRequestContext, recipientId: string, expiresAt: string): Promise<InviteRecord>;
  transitionInvite(
    context: InviteRequestContext,
    inviteId: string,
    transition: InviteTransition,
  ): Promise<InviteRecord | null>;
  expireInvites(context: InviteRequestContext): Promise<InviteRecord[]>;
}

export class InviteRepositoryError extends Error {
  constructor(readonly code: InviteErrorCode, message: string) {
    super(message);
  }
}

interface DatabaseInviteRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: InviteStatus;
  created_at: string;
  updated_at: string;
  expires_at: string;
  room_id: string | null;
}

interface DatabaseProfileRow {
  id: string;
  username: string;
  display_name: string;
}

function inviteFromRow(row: DatabaseInviteRow): InviteRecord {
  return {
    id: row.id,
    senderId: row.sender_id,
    recipientId: row.recipient_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
    roomId: row.room_id,
  };
}

function profileFromRow(row: DatabaseProfileRow): PublicPlayerProfile {
  return { id: row.id, username: row.username, displayName: row.display_name };
}

function repositoryError(error: { message?: string; code?: string }): InviteRepositoryError {
  const value = `${error.code ?? ""} ${error.message ?? ""}`;
  const knownCodes: InviteErrorCode[] = [
    "AUTH_REQUIRED",
    "PLAYER_NOT_FOUND",
    "CANNOT_INVITE_SELF",
    "INVITE_ALREADY_PENDING",
    "INVITE_RATE_LIMITED",
  ];
  const code = knownCodes.find((candidate) => value.includes(candidate));
  if (code) return new InviteRepositoryError(code, code.replaceAll("_", " ").toLowerCase());
  if (error.code === "23505") {
    return new InviteRepositoryError("INVITE_ALREADY_PENDING", "An invitation is already pending");
  }
  return new InviteRepositoryError("INTERNAL_ERROR", "Invitation storage is unavailable");
}

export class SupabaseInviteRepository implements InviteRepository {
  constructor(
    private readonly supabaseUrl: string,
    private readonly supabaseAnonKey: string,
  ) {}

  private client(context: InviteRequestContext): SupabaseClient {
    return createClient(this.supabaseUrl, this.supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${context.accessToken}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  async searchProfiles(
    context: InviteRequestContext,
    query: string,
    limit: number,
  ): Promise<PublicPlayerProfile[]> {
    const escaped = query.replace(/[\\%_]/g, "\\$&");
    const { data, error } = await this.client(context)
      .from("profiles")
      .select("id, username, display_name")
      .ilike("username", `%${escaped}%`)
      .neq("id", context.userId)
      .order("username")
      .limit(limit);
    if (error) throw repositoryError(error);
    return ((data ?? []) as DatabaseProfileRow[]).map(profileFromRow);
  }

  async getProfileByUsername(
    context: InviteRequestContext,
    username: string,
  ): Promise<PublicPlayerProfile | null> {
    const { data, error } = await this.client(context)
      .from("profiles")
      .select("id, username, display_name")
      .ilike("username", username)
      .maybeSingle();
    if (error) throw repositoryError(error);
    return data ? profileFromRow(data as DatabaseProfileRow) : null;
  }

  async getProfilesByIds(
    context: InviteRequestContext,
    ids: string[],
  ): Promise<Map<string, PublicPlayerProfile>> {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) return new Map();
    const { data, error } = await this.client(context)
      .from("profiles")
      .select("id, username, display_name")
      .in("id", uniqueIds);
    if (error) throw repositoryError(error);
    return new Map(((data ?? []) as DatabaseProfileRow[]).map((row) => [row.id, profileFromRow(row)]));
  }

  async listInvites(context: InviteRequestContext): Promise<InviteRecord[]> {
    const { data, error } = await this.client(context)
      .from("game_invites")
      .select("id, sender_id, recipient_id, status, created_at, updated_at, expires_at, room_id")
      .or(`sender_id.eq.${context.userId},recipient_id.eq.${context.userId}`)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw repositoryError(error);
    return ((data ?? []) as DatabaseInviteRow[]).map(inviteFromRow);
  }

  async getInvite(context: InviteRequestContext, inviteId: string): Promise<InviteRecord | null> {
    const { data, error } = await this.client(context)
      .from("game_invites")
      .select("id, sender_id, recipient_id, status, created_at, updated_at, expires_at, room_id")
      .eq("id", inviteId)
      .maybeSingle();
    if (error) throw repositoryError(error);
    return data ? inviteFromRow(data as DatabaseInviteRow) : null;
  }

  async createInvite(
    context: InviteRequestContext,
    recipientId: string,
    expiresAt: string,
  ): Promise<InviteRecord> {
    const { data, error } = await this.client(context).rpc("send_game_invite", {
      p_recipient_id: recipientId,
      p_expires_at: expiresAt,
    });
    if (error) throw repositoryError(error);
    const row = (data as DatabaseInviteRow[] | null)?.[0];
    if (!row) throw new InviteRepositoryError("INTERNAL_ERROR", "Invitation was not created");
    return inviteFromRow(row);
  }

  async transitionInvite(
    context: InviteRequestContext,
    inviteId: string,
    transition: InviteTransition,
  ): Promise<InviteRecord | null> {
    const functions: Record<InviteTransition, string> = {
      accept: "accept_game_invite",
      decline: "decline_game_invite",
      cancel: "cancel_game_invite",
    };
    const { data, error } = await this.client(context).rpc(functions[transition]!, {
      p_invite_id: inviteId,
    });
    if (error) throw repositoryError(error);
    const row = (data as DatabaseInviteRow[] | null)?.[0];
    return row ? inviteFromRow(row) : null;
  }

  async expireInvites(context: InviteRequestContext): Promise<InviteRecord[]> {
    const { data, error } = await this.client(context).rpc("expire_my_game_invites");
    if (error) throw repositoryError(error);
    return ((data ?? []) as DatabaseInviteRow[]).map(inviteFromRow);
  }
}

export function createSupabaseInviteRepository(
  supabaseUrl = process.env.SUPABASE_URL,
  supabaseAnonKey = process.env.SUPABASE_ANON_KEY,
): InviteRepository {
  if (!supabaseUrl?.trim() || !supabaseAnonKey?.trim()) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY are required for persistent game invitations");
  }
  return new SupabaseInviteRepository(supabaseUrl.trim(), supabaseAnonKey.trim());
}

export class InMemoryInviteRepository implements InviteRepository {
  private readonly invites = new Map<string, InviteRecord>();
  private sequence = 0;

  constructor(
    profiles: PublicPlayerProfile[],
    private readonly now: () => Date = () => new Date(),
  ) {
    this.profiles = new Map(profiles.map((profile) => [profile.id, profile]));
  }

  private readonly profiles: Map<string, PublicPlayerProfile>;

  async searchProfiles(context: InviteRequestContext, query: string, limit: number) {
    const normalized = query.toLowerCase();
    return [...this.profiles.values()]
      .filter((profile) => profile.id !== context.userId && profile.username.toLowerCase().includes(normalized))
      .sort((left, right) => left.username.localeCompare(right.username))
      .slice(0, limit);
  }

  async getProfileByUsername(_context: InviteRequestContext, username: string) {
    return [...this.profiles.values()].find(
      (profile) => profile.username.toLowerCase() === username.toLowerCase(),
    ) ?? null;
  }

  async getProfilesByIds(_context: InviteRequestContext, ids: string[]) {
    return new Map(ids.flatMap((id) => {
      const profile = this.profiles.get(id);
      return profile ? [[id, profile] as const] : [];
    }));
  }

  async listInvites(context: InviteRequestContext) {
    return [...this.invites.values()]
      .filter((invite) => invite.senderId === context.userId || invite.recipientId === context.userId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async getInvite(context: InviteRequestContext, inviteId: string) {
    const invite = this.invites.get(inviteId);
    return invite && (invite.senderId === context.userId || invite.recipientId === context.userId)
      ? { ...invite }
      : null;
  }

  async createInvite(context: InviteRequestContext, recipientId: string, expiresAt: string) {
    const pending = [...this.invites.values()].find((invite) =>
      invite.status === "pending"
      && [invite.senderId, invite.recipientId].includes(context.userId)
      && [invite.senderId, invite.recipientId].includes(recipientId));
    if (pending) throw new InviteRepositoryError("INVITE_ALREADY_PENDING", "An invitation is already pending");
    const createdAt = this.now().toISOString();
    const invite: InviteRecord = {
      id: `invite-${++this.sequence}`,
      senderId: context.userId,
      recipientId,
      status: "pending",
      createdAt,
      updatedAt: createdAt,
      expiresAt,
      roomId: null,
    };
    this.invites.set(invite.id, invite);
    return { ...invite };
  }

  async transitionInvite(
    context: InviteRequestContext,
    inviteId: string,
    transition: InviteTransition,
  ) {
    const invite = this.invites.get(inviteId);
    if (!invite || invite.status !== "pending") return null;
    const ownsAction = transition === "cancel"
      ? invite.senderId === context.userId
      : invite.recipientId === context.userId;
    if (!ownsAction) return null;
    const now = this.now();
    const status: InviteStatus = new Date(invite.expiresAt) <= now
      ? "expired"
      : transition === "accept"
        ? "accepted"
        : transition === "decline"
          ? "declined"
          : "cancelled";
    const updated = {
      ...invite,
      status,
      updatedAt: now.toISOString(),
      roomId: status === "accepted" ? `internal-${invite.id}` : invite.roomId,
    };
    this.invites.set(inviteId, updated);
    return { ...updated };
  }

  async expireInvites(context: InviteRequestContext) {
    const now = this.now();
    const expired: InviteRecord[] = [];
    for (const invite of this.invites.values()) {
      if (
        invite.status === "pending"
        && new Date(invite.expiresAt) <= now
        && (invite.senderId === context.userId || invite.recipientId === context.userId)
      ) {
        const updated: InviteRecord = { ...invite, status: "expired", updatedAt: now.toISOString() };
        this.invites.set(invite.id, updated);
        expired.push({ ...updated });
      }
    }
    return expired;
  }
}
