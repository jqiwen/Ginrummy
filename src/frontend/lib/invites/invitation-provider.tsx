"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSelector } from "react-redux";

import {
  connectGameSocket,
  type GameInvite,
  type InviteLists,
  type InviteMatchReady,
  type PublicPlayerProfile,
  type SocketResponse,
  waitForGameSocket,
} from "@/lib/socket";
import type { RootState } from "@shared-store/index";

const ACTIVE_MATCH_KEY = "ginrummy.activeMatch";

interface InvitationContextValue {
  received: GameInvite[];
  sent: GameInvite[];
  activeMatch: InviteMatchReady | null;
  loading: boolean;
  error: string | null;
  refreshInvites: () => Promise<void>;
  searchPlayers: (query: string) => Promise<PublicPlayerProfile[]>;
  sendInvite: (username: string) => Promise<void>;
  acceptInvite: (inviteId: string) => Promise<void>;
  declineInvite: (inviteId: string) => Promise<void>;
  cancelInvite: (inviteId: string) => Promise<void>;
  leaveActiveMatch: () => Promise<void>;
}

const InvitationContext = createContext<InvitationContextValue | null>(null);

function messageFor(response: SocketResponse<unknown>): string {
  if (typeof response.code === "string") {
    const messages: Record<string, string> = {
      AUTH_REQUIRED: "Log in to use private matches.",
      PLAYER_NOT_FOUND: "No registered player has that username.",
      CANNOT_INVITE_SELF: "You cannot invite yourself.",
      INVITE_ALREADY_PENDING: "An invitation between these players is already pending.",
      INVITE_RATE_LIMITED: "Please wait before sending another invitation.",
      PLAYER_BUSY: "One of you is already seated in an active match.",
      INVITE_EXPIRED: "That invitation has expired.",
      INVITE_ALREADY_PROCESSED: "That invitation has already been handled.",
    };
    return messages[response.code] ?? response.message;
  }
  return response.message;
}

function requireData<T>(response: SocketResponse<T>): T {
  if (!response.success || response.data === undefined) throw new Error(messageFor(response));
  return response.data;
}

function readStoredMatch(): InviteMatchReady | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.sessionStorage.getItem(ACTIVE_MATCH_KEY);
    return stored ? JSON.parse(stored) as InviteMatchReady : null;
  } catch {
    return null;
  }
}

export function InvitationProvider({ children }: { children: React.ReactNode }) {
  const authStatus = useSelector((state: RootState) => state.user.status);
  const router = useRouter();
  const pathname = usePathname();
  const [lists, setLists] = useState<InviteLists>({ received: [], sent: [] });
  const [activeMatch, setActiveMatch] = useState<InviteMatchReady | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rememberMatch = useCallback((match: InviteMatchReady) => {
    const stored = readStoredMatch();
    setActiveMatch(match);
    window.sessionStorage.setItem(ACTIVE_MATCH_KEY, JSON.stringify(match));
    if (stored?.membership.matchId === match.membership.matchId) return;
    if (pathname !== "/game") router.push("/game");
  }, [pathname, router]);

  const refreshInvites = useCallback(async () => {
    if (authStatus !== "authenticated") return;
    setLoading(true);
    setError(null);
    try {
      const socket = await waitForGameSocket();
      const response = await new Promise<SocketResponse<InviteLists>>((resolve) => {
        socket.emit("invite:list", {}, resolve);
      });
      setLists(requireData(response));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load invitations.");
    } finally {
      setLoading(false);
    }
  }, [authStatus]);

  useEffect(() => {
    setActiveMatch(readStoredMatch());
  }, []);

  useEffect(() => {
    if (authStatus !== "authenticated") {
      setLists({ received: [], sent: [] });
      if (authStatus === "unauthenticated") {
        setActiveMatch(null);
        window.sessionStorage.removeItem(ACTIVE_MATCH_KEY);
      }
      return;
    }

    const socket = connectGameSocket();
    const onReceived = (invite: GameInvite) => {
      setLists((current) => ({
        ...current,
        received: [invite, ...current.received.filter((item) => item.id !== invite.id)],
      }));
    };
    const removeInvite = (invite: GameInvite) => {
      setLists((current) => ({
        received: current.received.filter((item) => item.id !== invite.id),
        sent: current.sent.filter((item) => item.id !== invite.id),
      }));
    };
    const removeAcceptedInvite = (event: InviteMatchReady) => {
      if (!event.inviteId) return;
      setLists((current) => ({
        received: current.received.filter((item) => item.id !== event.inviteId),
        sent: current.sent.filter((item) => item.id !== event.inviteId),
      }));
    };
    const onConnect = () => void refreshInvites();

    socket.on("invite:received", onReceived);
    socket.on("invite:declined", removeInvite);
    socket.on("invite:cancelled", removeInvite);
    socket.on("invite:expired", removeInvite);
    socket.on("invite:accepted", removeAcceptedInvite);
    socket.on("match:ready", rememberMatch);
    socket.on("connect", onConnect);
    if (socket.connected) void refreshInvites();

    return () => {
      socket.off("invite:received", onReceived);
      socket.off("invite:declined", removeInvite);
      socket.off("invite:cancelled", removeInvite);
      socket.off("invite:expired", removeInvite);
      socket.off("invite:accepted", removeAcceptedInvite);
      socket.off("match:ready", rememberMatch);
      socket.off("connect", onConnect);
    };
  }, [authStatus, refreshInvites, rememberMatch]);

  const searchPlayers = useCallback(async (query: string) => {
    if (query.trim().length < 2) return [];
    const socket = await waitForGameSocket();
    const response = await new Promise<SocketResponse<PublicPlayerProfile[]>>((resolve) => {
      socket.emit("player:search", { query: query.trim() }, resolve);
    });
    return requireData(response);
  }, []);

  const sendInvite = useCallback(async (username: string) => {
    setError(null);
    const socket = await waitForGameSocket();
    const response = await new Promise<SocketResponse<GameInvite>>((resolve) => {
      socket.emit("invite:send", { recipientUsername: username }, resolve);
    });
    const invite = requireData(response);
    setLists((current) => ({
      ...current,
      sent: [invite, ...current.sent.filter((item) => item.id !== invite.id)],
    }));
  }, []);

  const acceptInvite = useCallback(async (inviteId: string) => {
    setError(null);
    const socket = await waitForGameSocket();
    const response = await new Promise<SocketResponse<InviteMatchReady>>((resolve) => {
      socket.emit("invite:accept", { inviteId }, resolve);
    });
    const match = requireData(response);
    setLists((current) => ({ ...current, received: current.received.filter((item) => item.id !== inviteId) }));
    rememberMatch(match);
  }, [rememberMatch]);

  const declineInvite = useCallback(async (inviteId: string) => {
    setError(null);
    const socket = await waitForGameSocket();
    const response = await new Promise<SocketResponse<GameInvite>>((resolve) => {
      socket.emit("invite:decline", { inviteId }, resolve);
    });
    requireData(response);
    setLists((current) => ({ ...current, received: current.received.filter((item) => item.id !== inviteId) }));
  }, []);

  const cancelInvite = useCallback(async (inviteId: string) => {
    setError(null);
    const socket = await waitForGameSocket();
    const response = await new Promise<SocketResponse<GameInvite>>((resolve) => {
      socket.emit("invite:cancel", { inviteId }, resolve);
    });
    requireData(response);
    setLists((current) => ({ ...current, sent: current.sent.filter((item) => item.id !== inviteId) }));
  }, []);

  const leaveActiveMatch = useCallback(async () => {
    const match = activeMatch ?? readStoredMatch();
    if (match) {
      try {
        const socket = await waitForGameSocket();
        await new Promise<SocketResponse>((resolve) => {
          socket.emit("room:leave", {
            matchId: match.membership.matchId,
            playerId: match.membership.playerId,
          }, resolve);
        });
      } catch {
        // The local active seat is still cleared when the service is unavailable.
      }
    }
    window.sessionStorage.removeItem(ACTIVE_MATCH_KEY);
    setActiveMatch(null);
  }, [activeMatch]);

  const value = useMemo<InvitationContextValue>(() => ({
    received: lists.received,
    sent: lists.sent,
    activeMatch,
    loading,
    error,
    refreshInvites,
    searchPlayers,
    sendInvite,
    acceptInvite,
    declineInvite,
    cancelInvite,
    leaveActiveMatch,
  }), [
    lists,
    activeMatch,
    loading,
    error,
    refreshInvites,
    searchPlayers,
    sendInvite,
    acceptInvite,
    declineInvite,
    cancelInvite,
    leaveActiveMatch,
  ]);

  return <InvitationContext.Provider value={value}>{children}</InvitationContext.Provider>;
}

export function useInvitations(): InvitationContextValue {
  const context = useContext(InvitationContext);
  if (!context) throw new Error("useInvitations must be used inside InvitationProvider");
  return context;
}
