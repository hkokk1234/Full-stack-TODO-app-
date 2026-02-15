import type { Types } from "mongoose";
import WorkspaceMember, { type WorkspaceRole } from "../models/WorkspaceMember";

export const getWorkspaceRole = async (
  workspaceId: string | Types.ObjectId,
  userId: string | Types.ObjectId
): Promise<WorkspaceRole | null> => {
  const membership = await WorkspaceMember.findOne({ workspaceId, userId }).lean();
  return membership?.role ?? null;
};

export const canReadWorkspace = (role: WorkspaceRole | null): boolean => role !== null;

export const canWriteWorkspace = (role: WorkspaceRole | null): boolean =>
  role === "owner" || role === "admin" || role === "member";

export const canManageWorkspaceMembers = (role: WorkspaceRole | null): boolean => role === "owner" || role === "admin";
