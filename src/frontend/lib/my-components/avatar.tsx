import { ProfileAvatar } from "../profile/profile-avatar";
import type { AvatarDisplayProps, ChatBubbleProps } from "../models/card-animation.model";

export function AvatarDisplay({
  avatarPath,
  imageUrl,
  player,
  playerId,
  p2Playing,
  p1Playing,
}: AvatarDisplayProps) {
  const active = (p2Playing !== null && player === 2) || (p1Playing !== null && player === 1);

  return (
    <div className="relative flex flex-col items-center gap-2">
      <ProfileAvatar
        playerId={playerId}
        avatarPath={avatarPath}
        imageUrl={imageUrl}
        size="table"
        className="transition-shadow"
        style={{ boxShadow: active ? "0 0 20px rgba(216, 187, 113, 0.95)" : "none" }}
      />
      <div className="text-lg font-medium tracking-widest text-[#e9dfc8]">{playerId}</div>
    </div>
  );
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ content, bgColor }) => (
  <div
    className={`relative ml-4 max-w-xs rounded-3xl px-4 py-2 font-semibold text-black shadow-lg ${bgColor} bg-opacity-60`}
    style={{ transform: "translateY(-80%)", whiteSpace: "pre-wrap" }}
  >
    {content}
    <div className={`absolute h-[20px] w-[20px] rounded-full shadow-lg ${bgColor} bg-opacity-60`} style={{ left: "-25px", bottom: "-20px", transform: "translateY(-50%)" }} />
    <div className={`absolute h-[10px] w-[10px] rounded-full shadow-lg ${bgColor} bg-opacity-60`} style={{ left: "-40px", bottom: "-25px", transform: "translateY(-50%)" }} />
  </div>
);
