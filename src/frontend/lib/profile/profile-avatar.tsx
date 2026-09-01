/* eslint-disable @next/next/no-img-element */
"use client";

import { getAvatarUrl } from "@/lib/profile/avatar";

interface ProfileAvatarProps {
  playerId: string;
  avatarPath?: string | null;
  imageUrl?: string | null;
  previewUrl?: string | null;
  size?: "sm" | "md" | "lg" | "table";
  className?: string;
  style?: React.CSSProperties;
}

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl",
  table: "h-[100px] w-[100px] text-4xl",
};

export function ProfileAvatar({
  playerId,
  avatarPath,
  imageUrl,
  previewUrl,
  size = "md",
  className = "",
  style,
}: ProfileAvatarProps) {
  const resolvedUrl = previewUrl ?? imageUrl ?? getAvatarUrl(avatarPath);
  const label = playerId || "Player";

  return (
    <span style={style} className={`relative inline-flex shrink-0 overflow-hidden rounded-full border border-[#c8aa63]/55 bg-[#10271d] text-[#d8bb71] ${sizes[size]} ${className}`}>
      {resolvedUrl ? (
        <img src={resolvedUrl} alt={`${label} avatar`} className="h-full w-full object-cover object-center" />
      ) : (
        <span aria-label={`${label} avatar fallback`} className="flex h-full w-full items-center justify-center font-serif font-semibold uppercase">
          {label.charAt(0).toUpperCase() || "?"}
        </span>
      )}
    </span>
  );
}
