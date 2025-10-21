import { pgTable, index, foreignKey, uuid, text, timestamp, unique, json, boolean, varchar } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const chatThread = pgTable("chat_thread", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: text().notNull(),
	userId: uuid("user_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "chat_thread_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const verification = pgTable("verification", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
});

export const account = pgTable("account", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: uuid("user_id").notNull(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at", { mode: 'string' }),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { mode: 'string' }),
	scope: text(),
	password: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "account_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const mcpServerCustomInstructions = pgTable("mcp_server_custom_instructions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	mcpServerId: uuid("mcp_server_id").notNull(),
	prompt: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "mcp_server_custom_instructions_user_id_user_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.mcpServerId],
			foreignColumns: [mcpServer.id],
			name: "mcp_server_custom_instructions_mcp_server_id_mcp_server_id_fk"
		}).onDelete("cascade"),
	unique("mcp_server_custom_instructions_user_id_mcp_server_id_unique").on(table.userId, table.mcpServerId),
]);

export const mcpServerToolCustomInstructions = pgTable("mcp_server_tool_custom_instructions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	toolName: text("tool_name").notNull(),
	mcpServerId: uuid("mcp_server_id").notNull(),
	prompt: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "mcp_server_tool_custom_instructions_user_id_user_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.mcpServerId],
			foreignColumns: [mcpServer.id],
			name: "mcp_server_tool_custom_instructions_mcp_server_id_mcp_server_id"
		}).onDelete("cascade"),
	unique("mcp_server_tool_custom_instructions_user_id_tool_name_mcp_serve").on(table.userId, table.toolName, table.mcpServerId),
]);

export const workflow = pgTable("workflow", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	version: text().default('0.1.0').notNull(),
	name: text().notNull(),
	icon: json(),
	description: text(),
	isPublished: boolean("is_published").default(false).notNull(),
	visibility: varchar().default('public').notNull(),
	userId: uuid("user_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	spaceId: uuid("space_id").notNull(),
}, (table) => [
	index("workflow_space_id_idx").using("btree", table.spaceId.asc().nullsLast().op("uuid_ops")),
	index("workflow_space_user_idx").using("btree", table.spaceId.asc().nullsLast().op("uuid_ops"), table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "workflow_user_id_user_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.spaceId],
			foreignColumns: [space.id],
			name: "workflow_space_id_space_id_fk"
		}).onDelete("cascade"),
]);

export const workflowEdge = pgTable("workflow_edge", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	version: text().default('0.1.0').notNull(),
	workflowId: uuid("workflow_id").notNull(),
	source: uuid().notNull(),
	target: uuid().notNull(),
	uiConfig: json("ui_config").default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.workflowId],
			foreignColumns: [workflow.id],
			name: "workflow_edge_workflow_id_workflow_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.source],
			foreignColumns: [workflowNode.id],
			name: "workflow_edge_source_workflow_node_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.target],
			foreignColumns: [workflowNode.id],
			name: "workflow_edge_target_workflow_node_id_fk"
		}).onDelete("cascade"),
]);

export const workflowNode = pgTable("workflow_node", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	version: text().default('0.1.0').notNull(),
	workflowId: uuid("workflow_id").notNull(),
	kind: text().notNull(),
	name: text().notNull(),
	description: text(),
	uiConfig: json("ui_config").default({}),
	nodeConfig: json("node_config").default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("workflow_node_kind_idx").using("btree", table.kind.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.workflowId],
			foreignColumns: [workflow.id],
			name: "workflow_node_workflow_id_workflow_id_fk"
		}).onDelete("cascade"),
]);

export const archive = pgTable("archive", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	userId: uuid("user_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "archive_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const archiveItem = pgTable("archive_item", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	archiveId: uuid("archive_id").notNull(),
	itemId: uuid("item_id").notNull(),
	userId: uuid("user_id").notNull(),
	addedAt: timestamp("added_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("archive_item_item_id_idx").using("btree", table.itemId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.archiveId],
			foreignColumns: [archive.id],
			name: "archive_item_archive_id_archive_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "archive_item_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const agent = pgTable("agent", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	icon: json(),
	userId: uuid("user_id").notNull(),
	instructions: json(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	visibility: varchar().default('public').notNull(),
	spaceId: uuid("space_id").notNull(),
}, (table) => [
	index("agent_space_id_idx").using("btree", table.spaceId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "agent_user_id_user_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.spaceId],
			foreignColumns: [space.id],
			name: "agent_space_id_space_id_fk"
		}).onDelete("cascade"),
]);

export const mcpOauthSession = pgTable("mcp_oauth_session", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	mcpServerId: uuid("mcp_server_id").notNull(),
	serverUrl: text("server_url").notNull(),
	clientInfo: json("client_info"),
	tokens: json(),
	codeVerifier: text("code_verifier"),
	state: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("mcp_oauth_session_server_id_idx").using("btree", table.mcpServerId.asc().nullsLast().op("uuid_ops")),
	index("mcp_oauth_session_state_idx").using("btree", table.state.asc().nullsLast().op("text_ops")),
	index("mcp_oauth_session_tokens_idx").using("btree", table.mcpServerId.asc().nullsLast().op("uuid_ops")).where(sql`(tokens IS NOT NULL)`),
	foreignKey({
			columns: [table.mcpServerId],
			foreignColumns: [mcpServer.id],
			name: "mcp_oauth_session_mcp_server_id_mcp_server_id_fk"
		}).onDelete("cascade"),
	unique("mcp_oauth_session_state_unique").on(table.state),
]);

export const bookmark = pgTable("bookmark", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	itemId: uuid("item_id").notNull(),
	itemType: varchar("item_type").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("bookmark_item_idx").using("btree", table.itemId.asc().nullsLast().op("text_ops"), table.itemType.asc().nullsLast().op("text_ops")),
	index("bookmark_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "bookmark_user_id_user_id_fk"
		}).onDelete("cascade"),
	unique("bookmark_user_id_item_id_item_type_unique").on(table.userId, table.itemId, table.itemType),
]);

export const chatMessage = pgTable("chat_message", {
	id: text().primaryKey().notNull(),
	threadId: uuid("thread_id").notNull(),
	role: text().notNull(),
	parts: json().array(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	metadata: json(),
}, (table) => [
	foreignKey({
			columns: [table.threadId],
			foreignColumns: [chatThread.id],
			name: "chat_message_thread_id_chat_thread_id_fk"
		}).onDelete("cascade"),
]);

export const session = pgTable("session", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	token: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: uuid("user_id").notNull(),
	impersonatedBy: text("impersonated_by"),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "session_user_id_user_id_fk"
		}).onDelete("cascade"),
	unique("session_token_unique").on(table.token),
]);

export const user = pgTable("user", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	password: text(),
	image: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	preferences: json().default({}),
	emailVerified: boolean("email_verified").default(false).notNull(),
	banned: boolean(),
	banReason: text("ban_reason"),
	banExpires: timestamp("ban_expires", { mode: 'string' }),
	role: text("role").notNull().default("user"),
}, (table) => [
	unique("user_email_unique").on(table.email),
]);

export const mcpServer = pgTable("mcp_server", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	config: json().notNull(),
	enabled: boolean().default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	userId: uuid("user_id").notNull(),
	visibility: varchar().default('public').notNull(),
	spaceId: uuid("space_id").notNull(),
}, (table) => [
	index("mcp_server_space_id_idx").using("btree", table.spaceId.asc().nullsLast().op("uuid_ops")),
	index("mcp_server_space_user_idx").using("btree", table.spaceId.asc().nullsLast().op("uuid_ops"), table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "mcp_server_user_id_user_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.spaceId],
			foreignColumns: [space.id],
			name: "mcp_server_space_id_space_id_fk"
		}).onDelete("cascade"),
]);

export const chatExport = pgTable("chat_export", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: text().notNull(),
	exporterId: uuid("exporter_id").notNull(),
	originalThreadId: uuid("original_thread_id"),
	messages: json().notNull(),
	exportedAt: timestamp("exported_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.exporterId],
			foreignColumns: [user.id],
			name: "chat_export_exporter_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const chatExportComment = pgTable("chat_export_comment", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	exportId: uuid("export_id").notNull(),
	authorId: uuid("author_id").notNull(),
	parentId: uuid("parent_id"),
	content: json().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.exportId],
			foreignColumns: [chatExport.id],
			name: "chat_export_comment_export_id_chat_export_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [user.id],
			name: "chat_export_comment_author_id_user_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "chat_export_comment_parent_id_chat_export_comment_id_fk"
		}).onDelete("cascade"),
]);

export const spaceInvite = pgTable("space_invite", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	spaceId: uuid("space_id").notNull(),
	email: text().notNull(),
	role: varchar().notNull(),
	token: text().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("space_invite_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("space_invite_space_id_idx").using("btree", table.spaceId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.spaceId],
			foreignColumns: [space.id],
			name: "space_invite_space_id_space_id_fk"
		}).onDelete("cascade"),
	unique("space_invite_space_id_email_unique").on(table.spaceId, table.email),
	unique("space_invite_token_unique").on(table.token),
]);

export const spaceMember = pgTable("space_member", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	spaceId: uuid("space_id").notNull(),
	userId: uuid("user_id").notNull(),
	role: varchar().default('user').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("space_member_space_id_idx").using("btree", table.spaceId.asc().nullsLast().op("uuid_ops")),
	index("space_member_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.spaceId],
			foreignColumns: [space.id],
			name: "space_member_space_id_space_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "space_member_user_id_user_id_fk"
		}).onDelete("cascade"),
	unique("space_member_space_id_user_id_unique").on(table.spaceId, table.userId),
]);

export const space = pgTable("space", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	status: varchar().default('active').notNull(),
	archivedAt: timestamp("archived_at", { mode: 'string' }),
	archivedBy: uuid("archived_by"),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	deletedBy: uuid("deleted_by"),
}, (table) => [
	foreignKey({
			columns: [table.archivedBy],
			foreignColumns: [user.id],
			name: "space_archived_by_user_id_fk"
		}),
	foreignKey({
			columns: [table.deletedBy],
			foreignColumns: [user.id],
			name: "space_deleted_by_user_id_fk"
		}),
]);
