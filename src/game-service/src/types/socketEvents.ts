import type { Card, DealState, GameOperation, PlayerId, RoundResult, ScoreSummary } from "../game/gameTypes.js";

export interface SocketResponse<T = never> {
  success: boolean;
  code: number | InviteErrorCode;
  message: string;
  data?: T;
}

export type Ack<T = never> = (response: SocketResponse<T>) => void;

export interface AuthenticatedSocketUser {
  id: string;
  email: string;
  playerId: string;
  avatarPath: string | null;
}

export interface CreateRoomPayload {
  bot: boolean;
}

export interface MatchPayload {
  matchId: string;
}

export interface PlayerMatchPayload extends MatchPayload {
  playerId: PlayerId;
}

export interface RoomMembership {
  matchId: string;
  playerId: PlayerId;
  bot: boolean;
}

export type InviteStatus = "pending" | "accepted" | "declined" | "cancelled" | "expired";

export type InviteErrorCode =
  | "AUTH_REQUIRED"
  | "PLAYER_NOT_FOUND"
  | "CANNOT_INVITE_SELF"
  | "INVITE_ALREADY_PENDING"
  | "INVITE_RATE_LIMITED"
  | "PLAYER_BUSY"
  | "INVITE_NOT_FOUND"
  | "INVITE_FORBIDDEN"
  | "INVITE_ALREADY_PROCESSED"
  | "INVITE_EXPIRED"
  | "INTERNAL_ERROR";

export interface PublicPlayerProfile {
  id: string;
  playerId: string;
  avatarPath: string | null;
}

export interface GameInvite {
  id: string;
  sender: PublicPlayerProfile;
  recipient: PublicPlayerProfile;
  status: InviteStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface InviteLists {
  received: GameInvite[];
  sent: GameInvite[];
}

export interface InviteMatchReady {
  inviteId: string | null;
  membership: RoomMembership;
  opponent: PublicPlayerProfile | null;
}

export interface StartRoundPayload extends PlayerMatchPayload {
  round: number;
  startWith: PlayerId;
}

export interface DiscardPayload extends PlayerMatchPayload {
  round: number;
  cardName: string;
}

export interface RoundPayload extends PlayerMatchPayload {
  round: number;
}

export interface SubmitRoundResultPayload extends RoundPayload {
  scoreSummary: ScoreSummary;
  winner: PlayerId;
}

export interface DrawResult {
  card: Card;
  remainingCards: number;
}

export interface PlayerPresenceEvent extends MatchPayload {
  playerId: PlayerId;
}

export interface OpponentLeftEvent extends MatchPayload {
  reason: "left";
  redirectDelayMs: number;
}

export interface GameStartedEvent extends MatchPayload {
  startedBy: PlayerId;
}

export interface PassStatusEvent extends MatchPayload {
  round: number;
  status: "one-passed" | "both-passed";
  passedPlayerId: PlayerId;
  nextPlayerId: PlayerId;
}

export interface KnockedEvent extends MatchPayload {
  round: number;
  playerId: PlayerId;
}

export interface BothReadyEvent extends MatchPayload {
  round: number;
}

export interface ClientToServerEvents {
  "room:create": (payload: CreateRoomPayload, ack: Ack<RoomMembership>) => void;
  "room:join": (payload: MatchPayload, ack: Ack<RoomMembership>) => void;
  "room:resume": (payload: PlayerMatchPayload, ack: Ack<RoomMembership>) => void;
  "room:leave": (payload: Record<string, never>, ack: Ack) => void;
  "game:start": (payload: PlayerMatchPayload, ack: Ack) => void;
  "round:start": (payload: StartRoundPayload, ack: Ack) => void;
  "game:draw-stack": (payload: RoundPayload, ack: Ack<DrawResult>) => void;
  "game:draw-discard": (payload: RoundPayload, ack: Ack<DrawResult>) => void;
  "game:discard": (payload: DiscardPayload, ack: Ack<GameOperation>) => void;
  "game:pass": (payload: RoundPayload, ack: Ack<PassStatusEvent>) => void;
  "game:knock": (payload: RoundPayload, ack: Ack) => void;
  "round:submit-result": (payload: SubmitRoundResultPayload, ack: Ack) => void;
  "round:ready-next": (payload: RoundPayload, ack: Ack) => void;
  "player:search": (payload: { query: string }, ack: Ack<PublicPlayerProfile[]>) => void;
  "invite:list": (payload: Record<string, never>, ack: Ack<InviteLists>) => void;
  "invite:send": (payload: { recipientPlayerId: string }, ack: Ack<GameInvite>) => void;
  "invite:accept": (payload: { inviteId: string }, ack: Ack<InviteMatchReady>) => void;
  "invite:decline": (payload: { inviteId: string }, ack: Ack<GameInvite>) => void;
  "invite:cancel": (payload: { inviteId: string }, ack: Ack<GameInvite>) => void;
}

export interface ServerToClientEvents {
  "room:created": (membership: RoomMembership) => void;
  "room:joined": (membership: RoomMembership) => void;
  "room:player-joined": (event: PlayerPresenceEvent) => void;
  "room:player-left": (event: PlayerPresenceEvent) => void;
  "game:opponent-left": (event: OpponentLeftEvent) => void;
  "game:started": (event: GameStartedEvent) => void;
  "game:dealing-started": (state: DealState) => void;
  "game:card-drawn": (event: PlayerMatchPayload & DrawResult) => void;
  "game:opponent-drew": (event: PlayerPresenceEvent) => void;
  "game:card-discarded": (event: PlayerMatchPayload & { card: Card }) => void;
  "game:opponent-action": (event: MatchPayload & GameOperation) => void;
  "game:player-passed": (event: RoundPayload) => void;
  "game:pass-status": (event: PassStatusEvent) => void;
  "game:knocked": (event: KnockedEvent) => void;
  "round:result": (event: RoundResult) => void;
  "round:both-ready": (event: BothReadyEvent) => void;
  "round:started": (event: DealState) => void;
  "game:error": (error: SocketResponse) => void;
  "invite:received": (invite: GameInvite) => void;
  "invite:accepted": (event: InviteMatchReady) => void;
  "invite:declined": (invite: GameInvite) => void;
  "invite:cancelled": (invite: GameInvite) => void;
  "invite:expired": (invite: GameInvite) => void;
  "match:ready": (event: InviteMatchReady) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  matchId?: string;
  playerId?: PlayerId;
  user?: AuthenticatedSocketUser;
  accessToken?: string;
}
