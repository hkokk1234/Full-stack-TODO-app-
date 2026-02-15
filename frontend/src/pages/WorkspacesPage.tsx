import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { AuthResponse, Workspace, WorkspaceMember } from "../types";

type WorkspacesPageProps = {
  auth: AuthResponse;
};

const WORKSPACE_KEY = "todo_selected_workspace";

const WorkspacesPage = ({ auth }: WorkspacesPageProps): JSX.Element => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "viewer">("member");
  const [inviteExpiresInDays, setInviteExpiresInDays] = useState(7);
  const [lastInviteToken, setLastInviteToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadWorkspaces = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const data = await api.listWorkspaces(auth.token);
      const items = data.items ?? [];
      setWorkspaces(items);

      const remembered = localStorage.getItem(`${WORKSPACE_KEY}_${auth.user.id}`) ?? "";
      const selected = items.some((workspace) => workspace._id === remembered) ? remembered : items[0]?._id ?? "";
      setSelectedWorkspaceId(selected);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workspaces");
      setWorkspaces([]);
      setSelectedWorkspaceId("");
    } finally {
      setLoading(false);
    }
  }, [auth.token, auth.user.id]);

  const loadMembers = useCallback(async (workspaceId: string): Promise<void> => {
    if (!workspaceId) {
      setWorkspaceMembers([]);
      return;
    }

    try {
      const data = await api.listWorkspaceMembers(auth.token, workspaceId);
      setWorkspaceMembers(data.items ?? []);
    } catch (err) {
      setWorkspaceMembers([]);
      setError(err instanceof Error ? err.message : "Failed to load members");
    }
  }, [auth.token]);

  useEffect(() => {
    void loadWorkspaces();
  }, [loadWorkspaces]);

  useEffect(() => {
    if (!selectedWorkspaceId) {
      setWorkspaceMembers([]);
      localStorage.removeItem(`${WORKSPACE_KEY}_${auth.user.id}`);
      return;
    }

    localStorage.setItem(`${WORKSPACE_KEY}_${auth.user.id}`, selectedWorkspaceId);
    void loadMembers(selectedWorkspaceId);
  }, [auth.user.id, loadMembers, selectedWorkspaceId]);

  const selectedWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace._id === selectedWorkspaceId) ?? null,
    [selectedWorkspaceId, workspaces]
  );

  const canInvite = selectedWorkspace?.role === "owner" || selectedWorkspace?.role === "admin";

  const onCreateWorkspace = async (): Promise<void> => {
    const name = newWorkspaceName.trim();
    if (!name) return;

    try {
      setBusy(true);
      const workspace = await api.createWorkspace(auth.token, { name });
      setNewWorkspaceName("");
      setNotice("Workspace created.");
      await loadWorkspaces();
      setSelectedWorkspaceId(workspace._id);
      await loadMembers(workspace._id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workspace");
    } finally {
      setBusy(false);
    }
  };

  const onCreateInvite = async (): Promise<void> => {
    if (!selectedWorkspaceId || !inviteEmail.trim()) return;

    try {
      setBusy(true);
      const invite = await api.createWorkspaceInvite(auth.token, selectedWorkspaceId, {
        email: inviteEmail.trim(),
        role: inviteRole,
        expiresInDays: inviteExpiresInDays
      });
      setInviteEmail("");
      setLastInviteToken(invite.token);
      setNotice("Invite created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invite");
    } finally {
      setBusy(false);
    }
  };

  const onCopyToken = async (): Promise<void> => {
    if (!lastInviteToken) return;
    try {
      await navigator.clipboard.writeText(lastInviteToken);
      setNotice("Invite token copied.");
    } catch {
      setError("Clipboard blocked. Copy manually.");
    }
  };

  if (loading) {
    return (
      <section className="card workspaces-page">
        <h1>Workspaces</h1>
        <p>Loading...</p>
      </section>
    );
  }

  return (
    <section className="card workspaces-page">
      <header className="security-header">
        <div>
          <h1>Workspaces</h1>
          <p className="subtle">Create workspaces, choose active scope, and invite teammates.</p>
        </div>
        <Link className="oauth-link" to="/tasks">Back to tasks</Link>
      </header>

      {error ? <p className="error">{error}</p> : null}
      {notice ? <p className="notice">{notice}</p> : null}

      <div className="workspaces-grid">
        <section className="workspace-box">
          <h3>Workspace selector</h3>
          <label className="field-label">
            Active workspace
            <select value={selectedWorkspaceId} onChange={(event) => setSelectedWorkspaceId(event.target.value)}>
              {workspaces.length === 0 ? <option value="">No workspace</option> : null}
              {workspaces.map((workspace) => (
                <option key={workspace._id} value={workspace._id}>
                  {workspace.name} ({workspace.role})
                </option>
              ))}
            </select>
          </label>
          <div className="workspace-create">
            <input
              value={newWorkspaceName}
              onChange={(event) => setNewWorkspaceName(event.target.value)}
              placeholder="New workspace name"
            />
            <button type="button" onClick={() => void onCreateWorkspace()} disabled={busy || !newWorkspaceName.trim()}>
              Create
            </button>
          </div>
          {selectedWorkspace ? (
            <p className="subtle workspace-meta">
              Active scope: <strong>{selectedWorkspace.name}</strong> ({selectedWorkspace.role})
            </p>
          ) : null}
        </section>

        <section className="workspace-box">
          <h3>Members</h3>
          <ul className="workspace-members-list">
            {workspaceMembers.map((member) => (
              <li key={member.userId}>
                <strong>{member.name || member.email}</strong>
                <span>{member.role}</span>
              </li>
            ))}
          </ul>

          {canInvite ? (
            <div className="workspace-invite-form">
              <input
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="Invite member email"
              />
              <div className="workspace-invite-row">
                <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as "admin" | "member" | "viewer")}>
                  <option value="admin">admin</option>
                  <option value="member">member</option>
                  <option value="viewer">viewer</option>
                </select>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={inviteExpiresInDays}
                  onChange={(event) => setInviteExpiresInDays(Math.max(1, Math.min(30, Number(event.target.value || 7))))}
                />
              </div>
              <button type="button" onClick={() => void onCreateInvite()} disabled={busy || !inviteEmail.trim()}>
                Create invite
              </button>
              {lastInviteToken ? (
                <div className="workspace-token-box">
                  <code>{lastInviteToken}</code>
                  <button type="button" onClick={() => void onCopyToken()}>Copy token</button>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="subtle">Only owner/admin can invite members.</p>
          )}
        </section>
      </div>
    </section>
  );
};

export default WorkspacesPage;

