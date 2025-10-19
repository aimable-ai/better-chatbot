import { describe, it, expect, vi, beforeEach } from "vitest";
import { spacesRepository } from "./repository";
import { SPACE_RETENTION_DAYS } from "./config";

// Mock the database
vi.mock("lib/db/pg/db.pg", () => ({
  pgDb: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockPgDb = vi.mocked(require("lib/db/pg/db.pg").pgDb);

describe("Spaces Repository Lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("archiveSpace", () => {
    it("should archive a space with timestamp and user", async () => {
      const mockSpace = {
        id: "space1",
        name: "Test Space",
        status: "archived",
        archivedAt: new Date(),
        archivedBy: "user1",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockSpace]),
      };
      mockPgDb.update.mockReturnValue(mockUpdate as any);

      const result = await spacesRepository.archiveSpace("space1", "user1");

      expect(mockPgDb.update).toHaveBeenCalled();
      expect(mockUpdate.set).toHaveBeenCalledWith({
        status: "archived",
        archivedAt: expect.any(Date),
        archivedBy: "user1",
        updatedAt: expect.any(Date),
      });
      expect(result).toEqual(mockSpace);
    });
  });

  describe("unarchiveSpace", () => {
    it("should unarchive a space", async () => {
      const mockSpace = {
        id: "space1",
        name: "Test Space",
        status: "active",
        archivedAt: null,
        archivedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockSpace]),
      };
      mockPgDb.update.mockReturnValue(mockUpdate as any);

      const result = await spacesRepository.unarchiveSpace("space1");

      expect(mockPgDb.update).toHaveBeenCalled();
      expect(mockUpdate.set).toHaveBeenCalledWith({
        status: "active",
        archivedAt: null,
        archivedBy: null,
        updatedAt: expect.any(Date),
      });
      expect(result).toEqual(mockSpace);
    });
  });

  describe("permanentlyDeleteSpace", () => {
    it("should mark space as deleted with tombstone", async () => {
      const mockSpace = {
        id: "space1",
        name: "Test Space",
        status: "deleted",
        deletedAt: new Date(),
        deletedBy: "user1",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockUpdate = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockSpace]),
      };
      mockPgDb.update.mockReturnValue(mockUpdate as any);

      const result = await spacesRepository.permanentlyDeleteSpace(
        "space1",
        "user1",
      );

      expect(mockPgDb.update).toHaveBeenCalled();
      expect(mockUpdate.set).toHaveBeenCalledWith({
        status: "deleted",
        deletedAt: expect.any(Date),
        deletedBy: "user1",
        updatedAt: expect.any(Date),
      });
      expect(result).toEqual(mockSpace);
    });
  });

  describe("isWithinRetentionPeriod", () => {
    it("should return true for recently archived space", async () => {
      const recentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
      const mockSpace = {
        id: "space1",
        name: "Test Space",
        status: "archived",
        archivedAt: recentDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock getSpaceById
      vi.spyOn(spacesRepository, "getSpaceById").mockResolvedValue(
        mockSpace as any,
      );

      const result = await spacesRepository.isWithinRetentionPeriod("space1");

      expect(result).toBe(true);
    });

    it("should return false for old archived space", async () => {
      const oldDate = new Date(
        Date.now() - (SPACE_RETENTION_DAYS + 5) * 24 * 60 * 60 * 1000,
      );
      const mockSpace = {
        id: "space1",
        name: "Test Space",
        status: "archived",
        archivedAt: oldDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(spacesRepository, "getSpaceById").mockResolvedValue(
        mockSpace as any,
      );

      const result = await spacesRepository.isWithinRetentionPeriod("space1");

      expect(result).toBe(false);
    });

    it("should return false for space without archivedAt", async () => {
      const mockSpace = {
        id: "space1",
        name: "Test Space",
        status: "active",
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(spacesRepository, "getSpaceById").mockResolvedValue(
        mockSpace as any,
      );

      const result = await spacesRepository.isWithinRetentionPeriod("space1");

      expect(result).toBe(false);
    });
  });

  describe("getSpacesForCleanup", () => {
    it("should return archived spaces older than cutoff date", async () => {
      const cutoffDate = new Date(
        Date.now() - SPACE_RETENTION_DAYS * 24 * 60 * 60 * 1000,
      );
      const mockSpaces = [
        {
          id: "space1",
          name: "Old Space",
          status: "archived",
          archivedAt: new Date(cutoffDate.getTime() - 1000),
        },
      ];

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockSpaces),
      };
      mockPgDb.select.mockReturnValue(mockSelect as any);

      const result = await spacesRepository.getSpacesForCleanup(cutoffDate);

      expect(mockPgDb.select).toHaveBeenCalled();
      expect(result).toEqual(mockSpaces);
    });
  });
});
