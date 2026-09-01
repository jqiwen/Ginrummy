import { render, screen } from "@testing-library/react";

import { AVATAR_MAX_BYTES, uploadCurrentUserAvatar, validateAvatarFile } from "@/lib/profile/avatar";
import { ProfileAvatar } from "@/lib/profile/profile-avatar";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

jest.mock("@/lib/supabase/client", () => ({ getSupabaseBrowserClient: jest.fn() }));

const mockedGetClient = jest.mocked(getSupabaseBrowserClient);
const upload = jest.fn();
const remove = jest.fn();
const update = jest.fn();
const eq = jest.fn();

function installClient() {
  upload.mockResolvedValue({ error: null });
  remove.mockResolvedValue({ error: null });
  eq.mockResolvedValue({ error: null });
  update.mockReturnValue({ eq });
  mockedGetClient.mockReturnValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "auth-user-uuid" } }, error: null }) },
    storage: {
      from: jest.fn(() => ({
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://project.supabase.co/storage/v1/object/public/avatars/${path}` } }),
        upload,
        remove,
      })),
    },
    from: jest.fn(() => ({ update })),
  } as never);
}

describe("profile avatars", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    installClient();
  });

  it("rejects unsupported and oversized files with friendly messages", () => {
    expect(() => validateAvatarFile({ type: "image/gif", size: 10 })).toThrow("Please choose a JPG, PNG, or WebP image.");
    expect(() => validateAvatarFile({ type: "image/png", size: AVATAR_MAX_BYTES + 1 })).toThrow("Avatar images must be smaller than 2 MB.");
  });

  it("uploads into the authenticated UUID folder and updates avatar_path", async () => {
    const file = new File(["image"], "avatar.png", { type: "image/png" });
    const path = await uploadCurrentUserAvatar(file, "auth-user-uuid/old.png");

    expect(path).toMatch(/^auth-user-uuid\/avatar-.+\.png$/);
    expect(upload).toHaveBeenCalledWith(path, file, expect.objectContaining({ upsert: false, contentType: "image/png" }));
    expect(update).toHaveBeenCalledWith({ avatar_path: path });
    expect(eq).toHaveBeenCalledWith("id", "auth-user-uuid");
    expect(remove).toHaveBeenCalledWith(["auth-user-uuid/old.png"]);
  });

  it("uses the User ID initial as fallback and replaces it with the uploaded image", () => {
    const view = render(<ProfileAvatar playerId="admin2" avatarPath={null} />);
    expect(screen.getByLabelText("admin2 avatar fallback")).toHaveTextContent("A");

    view.rerender(<ProfileAvatar playerId="admin2" avatarPath="auth-user-uuid/avatar.webp" />);
    expect(screen.getByAltText("admin2 avatar")).toHaveAttribute(
      "src",
      expect.stringContaining("/avatars/auth-user-uuid/avatar.webp"),
    );
    expect(screen.queryByLabelText("admin2 avatar fallback")).not.toBeInTheDocument();
  });
});
