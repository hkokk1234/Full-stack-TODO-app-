import mongoose from "mongoose";
import type { Request, Response } from "express";
import Project from "../models/Project";
import ProjectMember from "../models/ProjectMember";
import User from "../models/User";
import { asyncHandler } from "../utils/asyncHandler";
import { addMemberSchema, createProjectSchema, updateMemberRoleSchema } from "../validators.project";
import { canManageMembers, getProjectRole } from "../services/projectAccessService";

export const listProjects = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const memberships = await ProjectMember.find({ userId }).lean();
  const projectIds = memberships.map((member) => member.projectId);

  const projects = await Project.find({ _id: { $in: projectIds } }).lean();

  const roleMap = new Map(memberships.map((m) => [String(m.projectId), m.role]));

  return res.status(200).json({
    items: projects.map((project) => ({
      ...project,
      role: roleMap.get(String(project._id)) ?? "viewer"
    }))
  });
});

export const createProject = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const payload = createProjectSchema.parse(req.body);

  const project = await Project.create({
    name: payload.name,
    description: payload.description ?? "",
    ownerId: userId
  });

  await ProjectMember.create({
    projectId: project._id,
    userId,
    role: "owner",
    invitedBy: null
  });

  return res.status(201).json(project);
});

export const getProjectMembers = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { projectId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(projectId)) return res.status(400).json({ message: "Invalid project id" });

  const role = await getProjectRole(projectId, userId);
  if (!role) return res.status(403).json({ message: "Forbidden" });

  const members = await ProjectMember.find({ projectId }).populate("userId", "name email").lean();

  return res.status(200).json({
    items: members.map((member) => ({
      userId: (member.userId as { _id: mongoose.Types.ObjectId })._id,
      name: (member.userId as { name?: string }).name ?? "",
      email: (member.userId as { email?: string }).email ?? "",
      role: member.role,
      invitedBy: member.invitedBy,
      createdAt: member.createdAt
    }))
  });
});

export const addProjectMember = asyncHandler(async (req: Request, res: Response) => {
  const requesterId = req.user?.id;
  if (!requesterId) return res.status(401).json({ message: "Unauthorized" });

  const { projectId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(projectId)) return res.status(400).json({ message: "Invalid project id" });

  const requesterRole = await getProjectRole(projectId, requesterId);
  if (!canManageMembers(requesterRole)) return res.status(403).json({ message: "Forbidden" });

  const payload = addMemberSchema.parse(req.body);

  const user = await User.findOne({ email: payload.email.toLowerCase() });
  if (!user) return res.status(404).json({ message: "User with this email not found" });

  const member = await ProjectMember.findOneAndUpdate(
    { projectId, userId: user._id },
    { role: payload.role, invitedBy: requesterId },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return res.status(200).json(member);
});

export const updateProjectMemberRole = asyncHandler(async (req: Request, res: Response) => {
  const requesterId = req.user?.id;
  if (!requesterId) return res.status(401).json({ message: "Unauthorized" });

  const { projectId, memberUserId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(memberUserId)) {
    return res.status(400).json({ message: "Invalid ids" });
  }

  const requesterRole = await getProjectRole(projectId, requesterId);
  if (!canManageMembers(requesterRole)) return res.status(403).json({ message: "Forbidden" });

  const { role } = updateMemberRoleSchema.parse(req.body);

  const member = await ProjectMember.findOneAndUpdate({ projectId, userId: memberUserId }, { role }, { new: true });
  if (!member) return res.status(404).json({ message: "Member not found" });

  return res.status(200).json(member);
});

export const removeProjectMember = asyncHandler(async (req: Request, res: Response) => {
  const requesterId = req.user?.id;
  if (!requesterId) return res.status(401).json({ message: "Unauthorized" });

  const { projectId, memberUserId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(memberUserId)) {
    return res.status(400).json({ message: "Invalid ids" });
  }

  const requesterRole = await getProjectRole(projectId, requesterId);
  if (!canManageMembers(requesterRole)) return res.status(403).json({ message: "Forbidden" });

  const member = await ProjectMember.findOne({ projectId, userId: memberUserId });
  if (!member) return res.status(404).json({ message: "Member not found" });
  if (member.role === "owner") return res.status(400).json({ message: "Cannot remove owner" });

  await ProjectMember.deleteOne({ _id: member._id });
  return res.status(204).send();
});
