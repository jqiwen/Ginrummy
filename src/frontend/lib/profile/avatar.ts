import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export const AVATAR_BUCKET = "avatars";
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp";

const allowedAvatarTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export class AvatarUiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AvatarUiError";
  }
}

export function validateAvatarFile(file: Pick<File, "size" | "type">): void {
  if (!allowedAvatarTypes.has(file.type)) {
    throw new AvatarUiError("Please choose a JPG, PNG, or WebP image.");
  }
  if (file.size > AVATAR_MAX_BYTES) {
    throw new AvatarUiError("Avatar images must be smaller than 2 MB.");
  }
}

export function getAvatarUrl(avatarPath?: string | null): string | null {
  if (!avatarPath) return null;
  try {
    return getSupabaseBrowserClient().storage.from(AVATAR_BUCKET).getPublicUrl(avatarPath).data.publicUrl;
  } catch {
    return null;
  }
}

function avatarExtension(type: string): "jpg" | "png" | "webp" {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export async function uploadCurrentUserAvatar(file: File, previousPath?: string | null): Promise<string> {
  validateAvatarFile(file);
  const supabase = getSupabaseBrowserClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (userError || !userId) throw new AvatarUiError("Please sign in again before changing your avatar.");

  const uniquePart = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}`;
  const avatarPath = `${userId}/avatar-${uniquePart}.${avatarExtension(file.type)}`;
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(avatarPath, file, { cacheControl: "31536000", contentType: file.type, upsert: false });
  if (uploadError) throw new AvatarUiError("Your avatar could not be uploaded. Please try again.");

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_path: avatarPath })
    .eq("id", userId);
  if (profileError) {
    await supabase.storage.from(AVATAR_BUCKET).remove([avatarPath]);
    throw new AvatarUiError("Your profile could not be updated. Please try again.");
  }

  if (previousPath?.startsWith(`${userId}/`) && previousPath !== avatarPath) {
    await supabase.storage.from(AVATAR_BUCKET).remove([previousPath]);
  }
  return avatarPath;
}
