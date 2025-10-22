import type { MCPConfigStorage } from "./create-mcp-clients-manager";
import { mcpRepository } from "lib/db/repository";
import defaultLogger from "logger";

import { colorize } from "consola/utils";

const logger = defaultLogger.withDefaults({
  message: colorize("gray", ` MCP Config Storage: `),
});

export function createDbBasedMCPConfigsStorage(): MCPConfigStorage {
  // Initializes the manager with configs from the database
  async function init(): Promise<void> {}

  return {
    init,
    async loadAll() {
      try {
        const servers = await mcpRepository.selectAll();
        return servers;
      } catch (error) {
        logger.error("Failed to load MCP configs from database:", error);
        return [];
      }
    },
    async save(server) {
      try {
        return mcpRepository.save(server);
      } catch (error) {
        logger.error(
          `Failed to save MCP config "${server.name}" to database:`,
          error,
        );
        throw error;
      }
    },
    async delete(id) {
      try {
        // First get the server to find its spaceId
        const server = await mcpRepository
          .selectAll()
          .then((servers) => servers.find((s) => s.id === id));
        if (!server) {
          throw new Error(`MCP server with id "${id}" not found`);
        }
        await mcpRepository.deleteById(id, server.spaceId);
      } catch (error) {
        logger.error(
          `Failed to delete MCP config "${id}" from database:`,
          error,
        );
        throw error;
      }
    },
    async has(id: string): Promise<boolean> {
      try {
        const servers = await mcpRepository.selectAll();
        return servers.some((s) => s.id === id);
      } catch (error) {
        logger.error(`Failed to check MCP config "${id}" in database:`, error);
        return false;
      }
    },
    async get(id) {
      try {
        const servers = await mcpRepository.selectAll();
        return servers.find((s) => s.id === id) ?? null;
      } catch (error) {
        logger.error(`Failed to get MCP config "${id}" from database:`, error);
        return null;
      }
    },
  };
}
