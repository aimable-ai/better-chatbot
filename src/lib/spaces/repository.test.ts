import { describe, it, expect, vi, beforeEach } from "vitest";
import { spacesRepository } from "./repository";
import { pgDb } from "lib/db/pg/db.pg";
import {
  SpaceSchema,
  SpaceMemberSchema,
  SpaceInviteSchema,
} from "lib/db/pg/schema.pg";

// Mock the database
vi.mock("lib/db/pg/db.pg", () => ({
  pgDb: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockPgDb = vi.mocked(pgDb);

describe("Spaces Repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createSpace", () => {
    it("should create a new space", async () => {
      const mockSpace = {
        id: "space1",
        name: "Test Space",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockSpace]),
      };
      mockPgDb.insert.mockReturnValue(mockInsert as any);

      const result = await spacesRepository.createSpace("Test Space");

      expect(mockPgDb.insert).toHaveBeenCalledWith(SpaceSchema);
      expect(mockInsert.values).toHaveBeenCalledWith({ name: "Test Space" });
      expect(result).toEqual(mockSpace);
    });
  });

  describe("getSpaceById", () => {
    it("should return space by id", async () => {
      const mockSpace = {
        id: "space1",
        name: "Test Space",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([mockSpace]),
      };
      mockPgDb.select.mockReturnValue(mockSelect as any);

      const result = await spacesRepository.getSpaceById("space1");

      expect(mockPgDb.select).toHaveBeenCalled();
      expect(mockSelect.from).toHaveBeenCalledWith(SpaceSchema);
      expect(result).toEqual(mockSpace);
    });

    it("should return undefined for non-existent space", async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };
      mockPgDb.select.mockReturnValue(mockSelect as any);

      const result = await spacesRepository.getSpaceById("nonexistent");

      expect(result).toBeUndefined();
    });
  });

  describe("upsertMember", () => {
    it("should create new member if not exists", async () => {
      const mockMember = {
        id: "member1",
        spaceId: "space1",
        userId: "user1",
        role: "admin",
        createdAt: new Date(),
      };
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockMember]),
      };
      mockPgDb.select.mockReturnValue(mockSelect as any);
      mockPgDb.insert.mockReturnValue(mockInsert as any);

      const result = await spacesRepository.upsertMember(
        "space1",
        "user1",
        "admin",
      );

      expect(mockPgDb.select).toHaveBeenCalled();
      expect(mockPgDb.insert).toHaveBeenCalledWith(SpaceMemberSchema);
      expect(result).toEqual(mockMember);
    });

    it("should update existing member", async () => {
      const existingMember = {
        id: "member1",
        spaceId: "space1",
        userId: "user1",
        role: "user",
        createdAt: new Date(),
      };
      const updatedMember = { ...existingMember, role: "admin" };
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([existingMember]),
      };
      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([updatedMember]),
      };
      mockPgDb.select.mockReturnValue(mockSelect as any);
      mockPgDb.update.mockReturnValue(mockUpdate as any);

      const result = await spacesRepository.upsertMember(
        "space1",
        "user1",
        "admin",
      );

      expect(mockPgDb.update).toHaveBeenCalledWith(SpaceMemberSchema);
      expect(mockUpdate.set).toHaveBeenCalledWith({ role: "admin" });
      expect(result).toEqual(updatedMember);
    });
  });

  describe("createInvite", () => {
    it("should create a new invite", async () => {
      const mockInvite = {
        id: "invite1",
        spaceId: "space1",
        email: "test@example.com",
        role: "admin",
        token: "token123",
        expiresAt: new Date(),
        createdAt: new Date(),
      };
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockInvite]),
      };
      mockPgDb.insert.mockReturnValue(mockInsert as any);

      const result = await spacesRepository.createInvite(
        "space1",
        "test@example.com",
        "admin",
        "token123",
        new Date(),
      );

      expect(mockPgDb.insert).toHaveBeenCalledWith(SpaceInviteSchema);
      expect(result).toEqual(mockInvite);
    });
  });
});
