import { relations } from "drizzle-orm/relations";
import { user, chatThread, space, account, mcpServerCustomInstructions, mcpServer, mcpServerToolCustomInstructions, workflow, workflowEdge, workflowNode, archive, archiveItem, agent, mcpOauthSession, bookmark, chatMessage, session, chatExport, chatExportComment, spaceInvite, spaceMember } from "./schema";

export const chatThreadRelations = relations(chatThread, ({one, many}) => ({
	user: one(user, {
		fields: [chatThread.userId],
		references: [user.id]
	}),
	space: one(space, {
		fields: [chatThread.spaceId],
		references: [space.id]
	}),
	chatMessages: many(chatMessage),
}));

export const userRelations = relations(user, ({many}) => ({
	chatThreads: many(chatThread),
	accounts: many(account),
	mcpServerCustomInstructions: many(mcpServerCustomInstructions),
	mcpServerToolCustomInstructions: many(mcpServerToolCustomInstructions),
	workflows: many(workflow),
	archives: many(archive),
	archiveItems: many(archiveItem),
	agents: many(agent),
	bookmarks: many(bookmark),
	sessions: many(session),
	mcpServers: many(mcpServer),
	chatExports: many(chatExport),
	chatExportComments: many(chatExportComment),
	spaceMembers: many(spaceMember),
	spaces_archivedBy: many(space, {
		relationName: "space_archivedBy_user_id"
	}),
	spaces_deletedBy: many(space, {
		relationName: "space_deletedBy_user_id"
	}),
}));

export const spaceRelations = relations(space, ({one, many}) => ({
	chatThreads: many(chatThread),
	workflows: many(workflow),
	agents: many(agent),
	mcpServers: many(mcpServer),
	spaceInvites: many(spaceInvite),
	spaceMembers: many(spaceMember),
	user_archivedBy: one(user, {
		fields: [space.archivedBy],
		references: [user.id],
		relationName: "space_archivedBy_user_id"
	}),
	user_deletedBy: one(user, {
		fields: [space.deletedBy],
		references: [user.id],
		relationName: "space_deletedBy_user_id"
	}),
}));

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
}));

export const mcpServerCustomInstructionsRelations = relations(mcpServerCustomInstructions, ({one}) => ({
	user: one(user, {
		fields: [mcpServerCustomInstructions.userId],
		references: [user.id]
	}),
	mcpServer: one(mcpServer, {
		fields: [mcpServerCustomInstructions.mcpServerId],
		references: [mcpServer.id]
	}),
}));

export const mcpServerRelations = relations(mcpServer, ({one, many}) => ({
	mcpServerCustomInstructions: many(mcpServerCustomInstructions),
	mcpServerToolCustomInstructions: many(mcpServerToolCustomInstructions),
	mcpOauthSessions: many(mcpOauthSession),
	user: one(user, {
		fields: [mcpServer.userId],
		references: [user.id]
	}),
	space: one(space, {
		fields: [mcpServer.spaceId],
		references: [space.id]
	}),
}));

export const mcpServerToolCustomInstructionsRelations = relations(mcpServerToolCustomInstructions, ({one}) => ({
	user: one(user, {
		fields: [mcpServerToolCustomInstructions.userId],
		references: [user.id]
	}),
	mcpServer: one(mcpServer, {
		fields: [mcpServerToolCustomInstructions.mcpServerId],
		references: [mcpServer.id]
	}),
}));

export const workflowRelations = relations(workflow, ({one, many}) => ({
	user: one(user, {
		fields: [workflow.userId],
		references: [user.id]
	}),
	space: one(space, {
		fields: [workflow.spaceId],
		references: [space.id]
	}),
	workflowEdges: many(workflowEdge),
	workflowNodes: many(workflowNode),
}));

export const workflowEdgeRelations = relations(workflowEdge, ({one}) => ({
	workflow: one(workflow, {
		fields: [workflowEdge.workflowId],
		references: [workflow.id]
	}),
	workflowNode_source: one(workflowNode, {
		fields: [workflowEdge.source],
		references: [workflowNode.id],
		relationName: "workflowEdge_source_workflowNode_id"
	}),
	workflowNode_target: one(workflowNode, {
		fields: [workflowEdge.target],
		references: [workflowNode.id],
		relationName: "workflowEdge_target_workflowNode_id"
	}),
}));

export const workflowNodeRelations = relations(workflowNode, ({one, many}) => ({
	workflowEdges_source: many(workflowEdge, {
		relationName: "workflowEdge_source_workflowNode_id"
	}),
	workflowEdges_target: many(workflowEdge, {
		relationName: "workflowEdge_target_workflowNode_id"
	}),
	workflow: one(workflow, {
		fields: [workflowNode.workflowId],
		references: [workflow.id]
	}),
}));

export const archiveRelations = relations(archive, ({one, many}) => ({
	user: one(user, {
		fields: [archive.userId],
		references: [user.id]
	}),
	archiveItems: many(archiveItem),
}));

export const archiveItemRelations = relations(archiveItem, ({one}) => ({
	archive: one(archive, {
		fields: [archiveItem.archiveId],
		references: [archive.id]
	}),
	user: one(user, {
		fields: [archiveItem.userId],
		references: [user.id]
	}),
}));

export const agentRelations = relations(agent, ({one}) => ({
	user: one(user, {
		fields: [agent.userId],
		references: [user.id]
	}),
	space: one(space, {
		fields: [agent.spaceId],
		references: [space.id]
	}),
}));

export const mcpOauthSessionRelations = relations(mcpOauthSession, ({one}) => ({
	mcpServer: one(mcpServer, {
		fields: [mcpOauthSession.mcpServerId],
		references: [mcpServer.id]
	}),
}));

export const bookmarkRelations = relations(bookmark, ({one}) => ({
	user: one(user, {
		fields: [bookmark.userId],
		references: [user.id]
	}),
}));

export const chatMessageRelations = relations(chatMessage, ({one}) => ({
	chatThread: one(chatThread, {
		fields: [chatMessage.threadId],
		references: [chatThread.id]
	}),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const chatExportRelations = relations(chatExport, ({one, many}) => ({
	user: one(user, {
		fields: [chatExport.exporterId],
		references: [user.id]
	}),
	chatExportComments: many(chatExportComment),
}));

export const chatExportCommentRelations = relations(chatExportComment, ({one, many}) => ({
	chatExport: one(chatExport, {
		fields: [chatExportComment.exportId],
		references: [chatExport.id]
	}),
	user: one(user, {
		fields: [chatExportComment.authorId],
		references: [user.id]
	}),
	chatExportComment: one(chatExportComment, {
		fields: [chatExportComment.parentId],
		references: [chatExportComment.id],
		relationName: "chatExportComment_parentId_chatExportComment_id"
	}),
	chatExportComments: many(chatExportComment, {
		relationName: "chatExportComment_parentId_chatExportComment_id"
	}),
}));

export const spaceInviteRelations = relations(spaceInvite, ({one}) => ({
	space: one(space, {
		fields: [spaceInvite.spaceId],
		references: [space.id]
	}),
}));

export const spaceMemberRelations = relations(spaceMember, ({one}) => ({
	space: one(space, {
		fields: [spaceMember.spaceId],
		references: [space.id]
	}),
	user: one(user, {
		fields: [spaceMember.userId],
		references: [user.id]
	}),
}));