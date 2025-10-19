import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUserSpaceRole, requireSpaceRole } from "./permissions";
import { spacesRepository } from "./repository";
import { USER_ROLES } from "app-types/roles";

// Mock the repository
vi.mock("./repository", () => ({
  spacesRepository: {
    getMember: vi.fn(),
  },
}));

const mockSpacesRepository = vi.mocked(spacesRepository);

describe("Spaces Permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getUserSpaceRole", () => {
    it("should return 'owner' for global admin users", async () => {
      const result = await getUserSpaceRole(
        "user1",
        "space1",
        USER_ROLES.ADMIN,
      );
      expect(result).toBe("owner");
      expect(mockSpacesRepository.getMember).not.toHaveBeenCalled();
    });

    it("should return null for non-members", async () => {
      mockSpacesRepository.getMember.mockResolvedValue(undefined);
      const result = await getUserSpaceRole("user1", "space1", "user");
      expect(result).toBe(null);
      expect(mockSpacesRepository.getMember).toHaveBeenCalledWith(
        "space1",
        "user1",
      );
    });

    it("should return member role for space members", async () => {
      mockSpacesRepository.getMember.mockResolvedValue({
        id: "member1",
        spaceId: "space1",
        userId: "user1",
        role: "curator",
        createdAt: new Date(),
      } as any);
      const result = await getUserSpaceRole("user1", "space1", "user");
      expect(result).toBe("curator");
    });
  });

  describe("requireSpaceRole", () => {
    it("should allow global admin for any role", async () => {
      const result = await requireSpaceRole(
        "user1",
        "space1",
        USER_ROLES.ADMIN,
        ["owner"],
      );
      expect(result).toBe(true);
      expect(mockSpacesRepository.getMember).not.toHaveBeenCalled();
    });

    it("should deny access for non-members", async () => {
      mockSpacesRepository.getMember.mockResolvedValue(undefined);
      const result = await requireSpaceRole("user1", "space1", "user", [
        "admin",
      ]);
      expect(result).toBe(false);
    });

    it("should allow access for members with required role", async () => {
      mockSpacesRepository.getMember.mockResolvedValue({
        id: "member1",
        spaceId: "space1",
        userId: "user1",
        role: "admin",
        createdAt: new Date(),
      } as any);
      const result = await requireSpaceRole("user1", "space1", "user", [
        "admin",
        "owner",
      ]);
      expect(result).toBe(true);
    });

    it("should deny access for members without required role", async () => {
      mockSpacesRepository.getMember.mockResolvedValue({
        id: "member1",
        spaceId: "space1",
        userId: "user1",
        role: "user",
        createdAt: new Date(),
      } as any);
      const result = await requireSpaceRole("user1", "space1", "user", [
        "admin",
        "owner",
      ]);
      expect(result).toBe(false);
    });
  });
});
