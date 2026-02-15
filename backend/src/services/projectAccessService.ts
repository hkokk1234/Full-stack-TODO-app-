import mongoose, { type Types } from "mongoose";
import ProjectMember from "../models/ProjectMember";

export type ResolvedProjectRole = "owner" | "admin" | "member" | "viewer" | null;

export const getProjectRole = async (projectId: string | Types.ObjectId, userId: string | Types.ObjectId): Promise<ResolvedProjectRole> => {
  const membership = await ProjectMember.findOne({ projectId, userId }).lean();
  return membership?.role ?? null;
};

export const canReadProject = (role: ResolvedProjectRole): boolean => role !== null;

export const canWriteProject = (role: ResolvedProjectRole): boolean => role === "owner" || role === "admin" || role === "member";

export const canManageMembers = (role: ResolvedProjectRole): boolean => role === "owner" || role === "admin";

export const toObjectId = (id: string): mongoose.Types.ObjectId => new mongoose.Types.ObjectId(id);
