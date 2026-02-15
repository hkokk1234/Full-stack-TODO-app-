import crypto from "crypto";
import mongoose from "mongoose";
import type { Request, Response } from "express";
import Workspace from "../models/Workspace";
import WorkspaceInvite from "../models/WorkspaceInvite";
import WorkspaceMember from "../models/WorkspaceMember";
import { asyncHandler } from "../utils/asyncHandler";
import {
  acceptWorkspaceInviteSchema,
  createWorkspaceInviteSchema,
  createWorkspaceSchema
} from "../validators.workspace";
import { canManageWorkspaceMembers, canReadWorkspace, getWorkspaceRole } from "../services/workspaceAccessService";
import User from "../models/User";

export const listWorkspaces = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const memberships = await WorkspaceMember.find({ userId }).lean();
  const workspaceIds = memberships.map((member) => member.workspaceId);
  const workspaces = await Workspace.find({ _id: { $in: workspaceIds } }).lean();
  const roleMap = new Map(memberships.map((member) => [String(member.workspaceId), member.role]));

  return res.status(200).json({
    items: workspaces.map((workspace) => ({
      ...workspace,
      role: roleMap.get(String(workspace._id)) ?? "viewer"
    }))
  });
});

export const createWorkspace = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const payload = createWorkspaceSchema.parse(req.body);
  const workspace = await Workspace.create({
    name: payload.name,
    ownerId: new mongoose.Types.ObjectId(userId)
  });

  await WorkspaceMember.create({
    workspaceId: workspace._id,
    userId: new mongoose.Types.ObjectId(userId),
    role: "owner",
    invitedBy: null
  });

  return res.status(201).json(workspace);
});

export const listWorkspaceMembers = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { workspaceId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) return res.status(400).json({ message: "Invalid workspace id" });

  const role = await getWorkspaceRole(workspaceId, userId);
  if (!canReadWorkspace(role)) return res.status(403).json({ message: "Forbidden" });

  const members = await WorkspaceMember.find({ workspaceId }).populate("userId", "name email").lean();
  return res.status(200).json({
    items: members.map((member) => ({
      userId: (member.userId as { _id: mongoose.Types.ObjectId })._id,
      name: (member.userId as { name?: string }).name ?? "",
      email: (member.userId as { email?: string }).email ?? "",
      role: member.role,
      createdAt: member.createdAt
    }))
  });
});

export const createWorkspaceInvite = asyncHandler(async (req: Request, res: Response) => {
  const requesterId = req.user?.id;
  if (!requesterId) return res.status(401).json({ message: "Unauthorized" });

  const { workspaceId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) return res.status(400).json({ message: "Invalid workspace id" });

  const requesterRole = await getWorkspaceRole(workspaceId, requesterId);
  if (!canManageWorkspaceMembers(requesterRole)) return res.status(403).json({ message: "Forbidden" });

  const payload = createWorkspaceInviteSchema.parse(req.body);
  const normalizedEmail = payload.email.toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail }).select("_id").lean();
  if (existingUser) {
    const existingMembership = await WorkspaceMember.findOne({ workspaceId, userId: existingUser._id }).lean();
    if (existingMembership) return res.status(409).json({ message: "User is already a workspace member" });
  }

  const expiresAt = new Date(Date.now() + payload.expiresInDays * 24 * 60 * 60 * 1000);
  const token = crypto.randomBytes(24).toString("hex");

  const invite = await WorkspaceInvite.findOneAndUpdate(
    { workspaceId, email: normalizedEmail, status: "pending" },
    {
      role: payload.role,
      token,
      invitedBy: new mongoose.Types.ObjectId(requesterId),
      expiresAt
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  ).lean();

  return res.status(201).json({
    id: String(invite._id),
    workspaceId: String(invite.workspaceId),
    email: invite.email,
    role: invite.role,
    token: invite.token,
    expiresAt: invite.expiresAt
  });
});

export const acceptWorkspaceInvite = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const payload = acceptWorkspaceInviteSchema.parse(req.body);
  const user = await User.findById(userId).select("_id email");
  if (!user) return res.status(404).json({ message: "User not found" });

  const invite = await WorkspaceInvite.findOne({ token: payload.token, status: "pending" });
  if (!invite) return res.status(404).json({ message: "Invite not found" });

  if (invite.expiresAt.getTime() < Date.now()) {
    invite.status = "expired";
    await invite.save();
    return res.status(410).json({ message: "Invite expired" });
  }

  if (invite.email !== user.email.toLowerCase()) return res.status(403).json({ message: "Invite email mismatch" });

  const membership = await WorkspaceMember.findOneAndUpdate(
    { workspaceId: invite.workspaceId, userId: user._id },
    { role: invite.role, invitedBy: invite.invitedBy },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  invite.status = "accepted";
  invite.acceptedBy = user._id;
  await invite.save();

  return res.status(200).json({
    workspaceId: String(membership.workspaceId),
    role: membership.role
  });
});

