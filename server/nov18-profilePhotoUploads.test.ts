import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./db")>()),
  addProfilePhoto: vi.fn().mockResolvedValue(501),
  setActiveProfilePhoto: vi.fn().mockResolvedValue(undefined),
  uploadAvatar: vi.fn().mockResolvedValue(undefined),
  getProfilePhotos: vi.fn().mockResolvedValue([]),
  addCoverPhoto: vi.fn().mockResolvedValue(601),
  setActiveCoverPhoto: vi.fn().mockResolvedValue(undefined),
  getGroupMemberRole: vi.fn().mockResolvedValue("admin"),
  updateGroupAvatar: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("./storage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./storage")>()),
  storagePut: vi.fn(),
}));
vi.mock("./imageUtils", () => ({
  compressAvatar: vi
    .fn()
    .mockResolvedValue({
      buffer: Buffer.from("compressed-profile"),
      mimeType: "image/jpeg",
    }),
  compressCover: vi
    .fn()
    .mockResolvedValue({
      buffer: Buffer.from("compressed-cover"),
      mimeType: "image/jpeg",
    }),
  compressImage: vi.fn(),
}));

import { appRouter } from "./routers";
import { storagePut } from "./storage";
import {
  addProfilePhoto,
  setActiveProfilePhoto,
  uploadAvatar,
  getProfilePhotos,
  addCoverPhoto,
  updateGroupAvatar,
  getGroupMemberRole,
} from "./db";
import { compressAvatar, compressCover } from "./imageUtils";

const context = (id = 7): TrpcContext =>
  ({
    user: {
      id,
      name: "Synthetic Test",
      email: "test@example.invalid",
      role: "user",
    },
    req: { protocol: "https", headers: {} },
    res: { clearCookie: vi.fn() },
  }) as unknown as TrpcContext;
const avatarInput = {
  filename: "../../other-user.jpg",
  contentType: "image/png",
  base64: Buffer.from("test-image").toString("base64"),
};
const photoInput = {
  dataUrl: `data:image/png;base64,${avatarInput.base64}`,
  mimeType: "image/png",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(Date, "now").mockReturnValue(1_795_000_000_000);
  vi.mocked(compressAvatar).mockResolvedValue({
    buffer: Buffer.from("compressed-profile"),
    mimeType: "image/jpeg",
  });
  vi.mocked(compressCover).mockResolvedValue({
    buffer: Buffer.from("compressed-cover"),
    mimeType: "image/jpeg",
  });
  vi.mocked(addProfilePhoto).mockResolvedValue(501);
  vi.mocked(addCoverPhoto).mockResolvedValue(601);
  vi.mocked(getGroupMemberRole).mockResolvedValue("admin");
  vi.mocked(storagePut).mockImplementation(async (key) => {
    const actualKey = key.replace(/\.jpg$/, "_a1b2c3d4.jpg");
    return { key: actualKey, url: `/media/${actualKey}` };
  });
});
afterEach(() => vi.restoreAllMocks());

describe("dedicated individual profile-photo upload folder", () => {
  it("stores new history rows with the actual returned key and activates only after storage succeeds", async () => {
    const result = await appRouter
      .createCaller(context())
      .photos.uploadProfilePhoto(photoInput);
    const key = "profile-photos/7/1795000000000_a1b2c3d4.jpg";
    expect(storagePut).toHaveBeenCalledWith(
      "profile-photos/7/1795000000000.jpg",
      Buffer.from("compressed-profile"),
      "image/jpeg",
    );
    expect(addProfilePhoto).toHaveBeenCalledWith({
      userId: 7,
      storageKey: key,
      url: `/media/${key}`,
    });
    expect(setActiveProfilePhoto).toHaveBeenCalledWith(501, 7);
    expect(result).toEqual({ id: 501, url: `/media/${key}` });
    expect(uploadAvatar).not.toHaveBeenCalled();
    expect(vi.mocked(storagePut).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(addProfilePhoto).mock.invocationCallOrder[0],
    );
    expect(vi.mocked(addProfilePhoto).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(setActiveProfilePhoto).mock.invocationCallOrder[0],
    );
  });

  it("routes the alternate avatar upload into the same folder and preserves its existing response/history contract", async () => {
    const result = await appRouter
      .createCaller(context(11))
      .auth.uploadAvatar({ ...avatarInput, userId: 7 } as any);
    expect(storagePut).toHaveBeenCalledWith(
      "profile-photos/11/1795000000000.jpg",
      Buffer.from("compressed-profile"),
      "image/jpeg",
    );
    expect(uploadAvatar).toHaveBeenCalledWith(
      11,
      "/media/profile-photos/11/1795000000000_a1b2c3d4.jpg",
    );
    expect(result).toEqual({
      url: "/media/profile-photos/11/1795000000000_a1b2c3d4.jpg",
    });
    expect(addProfilePhoto).not.toHaveBeenCalled();
    expect(setActiveProfilePhoto).not.toHaveBeenCalled();
  });

  it("uses the configured provider's returned URL rather than hardcoding /media", async () => {
    vi.mocked(storagePut).mockResolvedValueOnce({
      key: "profile-photos/7/object_a1b2c3d4.jpg",
      url: "https://storage.example.invalid/photos/profile-photos/7/object_a1b2c3d4.jpg",
    });
    const result = await appRouter
      .createCaller(context())
      .photos.uploadProfilePhoto(photoInput);
    expect(result.url).toBe(
      "https://storage.example.invalid/photos/profile-photos/7/object_a1b2c3d4.jpg",
    );
    expect(addProfilePhoto).toHaveBeenCalledWith(
      expect.objectContaining({
        storageKey: "profile-photos/7/object_a1b2c3d4.jpg",
        url: result.url,
      }),
    );
  });

  it.each(["history", "avatar"] as const)(
    "does not change the profile when %s storage fails",
    async (route) => {
      vi.mocked(storagePut).mockRejectedValueOnce(
        new Error("Synthetic storage failure"),
      );
      const caller = appRouter.createCaller(context());
      const operation =
        route === "history"
          ? caller.photos.uploadProfilePhoto(photoInput)
          : caller.auth.uploadAvatar(avatarInput);
      await expect(operation).rejects.toThrow("Synthetic storage failure");
      expect(addProfilePhoto).not.toHaveBeenCalled();
      expect(setActiveProfilePhoto).not.toHaveBeenCalled();
      expect(uploadAvatar).not.toHaveBeenCalled();
    },
  );

  it("retains authentication requirements on both upload routes", async () => {
    const ctx = context();
    ctx.user = null;
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.photos.uploadProfilePhoto(photoInput),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.auth.uploadAvatar(avatarInput)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(storagePut).not.toHaveBeenCalled();
  });

  it("retains the alternate avatar endpoint's 5 MB limit before any write", async () => {
    await expect(
      appRouter
        .createCaller(context())
        .auth.uploadAvatar({
          ...avatarInput,
          base64: Buffer.alloc(5 * 1024 * 1024 + 1).toString("base64"),
        }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(storagePut).not.toHaveBeenCalled();
    expect(uploadAvatar).not.toHaveBeenCalled();
  });

  it("returns legacy history URLs without replacing or relocating them", async () => {
    const urls = [
      "/media/avatars/7/old.jpg",
      "/media/media/7/old.jpg",
      "/media/profile-photos/7/old.jpg",
      "/manus-storage/avatars/7/old.jpg",
      "https://old.example.invalid/avatar.jpg",
    ];
    const rows = urls.map((url, index) => ({
      id: index + 1,
      userId: 7,
      url,
      storageKey: `legacy-profile-${index}`,
      isActive: index === 0,
      createdAt: new Date(0),
    }));
    vi.mocked(getProfilePhotos).mockResolvedValueOnce(rows);
    expect(
      await appRouter
        .createCaller(context())
        .photos.listProfilePhotos({ userId: 7 }),
    ).toEqual(rows);
    expect(storagePut).not.toHaveBeenCalled();
    expect(uploadAvatar).not.toHaveBeenCalled();
  });

  it("retains selection of an existing legacy history entry without a storage rewrite", async () => {
    expect(
      await appRouter
        .createCaller(context())
        .photos.setActiveProfilePhoto({ photoId: 92 }),
    ).toEqual({ success: true });
    expect(setActiveProfilePhoto).toHaveBeenCalledWith(92, 7);
    expect(storagePut).not.toHaveBeenCalled();
  });

  it("keeps cover photos and group logos in their original separate namespaces", async () => {
    const caller = appRouter.createCaller(context());
    await caller.photos.uploadCoverPhoto({ ...photoInput, cropY: 25 });
    expect(storagePut).toHaveBeenLastCalledWith(
      "cover-photos/7/1795000000000.jpg",
      Buffer.from("compressed-cover"),
      "image/jpeg",
    );
    expect(addCoverPhoto).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 7, cropY: 25 }),
    );
    await caller.groups.uploadAvatar({ ...avatarInput, groupId: 42 });
    expect(storagePut).toHaveBeenLastCalledWith(
      "group-avatars/42/1795000000000.jpg",
      Buffer.from("compressed-profile"),
      "image/jpeg",
    );
    expect(updateGroupAvatar).toHaveBeenCalledWith(
      42,
      "/media/group-avatars/42/1795000000000_a1b2c3d4.jpg",
    );
  });
});
