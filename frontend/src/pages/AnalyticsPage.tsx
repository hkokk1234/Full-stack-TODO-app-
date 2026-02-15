import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { AnalyticsSummary, AuthResponse, Workspace } from "../types";

type AnalyticsPageProps = {
  auth: AuthResponse;
};

const maxValue = (values: number[]): number => Math.max(1, ...values);
const WORKSPACE_KEY = "todo_selected_workspace";

const AnalyticsPage = ({ auth }: AnalyticsPageProps): JSX.Element => {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(
    () => localStorage.getItem(`${WORKSPACE_KEY}_${auth.user.id}`) ?? ""
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadWorkspaces = useCallback(async (): Promise<void> => {
    try {
      const result = await api.listWorkspaces(auth.token);
      setWorkspaces(result.items ?? []);
    } catch {
      setWorkspaces([]);
    }
  }, [auth.token]);

  const loadSummary = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError("");
      const summary = await api.analyticsSummary(auth.token, selectedWorkspaceId || undefined);
      setData(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [auth.token, selectedWorkspaceId]);

  useEffect(() => {
    void loadWorkspaces();
  }, [loadWorkspaces]);

  useEffect(() => {
    localStorage.setItem(`${WORKSPACE_KEY}_${auth.user.id}`, selectedWorkspaceId);
    void loadSummary();
  }, [auth.user.id, loadSummary, selectedWorkspaceId]);

  const selectedWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace._id === selectedWorkspaceId) ?? null,
    [selectedWorkspaceId, workspaces]
  );

  if (loading) {
    return (
      <section className="card analytics-page">
        <h1>Analytics</h1>
        <p>Loading...</p>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="card analytics-page">
        <h1>Analytics</h1>
        {error ? <p className="error">{error}</p> : <p>No data.</p>}
      </section>
    );
  }

  const overdueMax = maxValue(data.overdueTrend.map((item) => item.count));
  const weeklyMax = maxValue(data.productivityWeekly.flatMap((item) => [item.created, item.completed]));
  const monthlyMax = maxValue(data.productivityMonthly.flatMap((item) => [item.created, item.completed]));

  return (
    <section className="card analytics-page">
      <header className="security-header">
        <div>
          <h1>Analytics Dashboard</h1>
          <p className="subtle">Completion rate, overdue trend, and productivity.</p>
        </div>
        <div className="inline-actions">
          <label className="field-label">
            Workspace scope
            <select value={selectedWorkspaceId} onChange={(event) => setSelectedWorkspaceId(event.target.value)}>
              <option value="">All workspaces</option>
              {workspaces.map((workspace) => (
                <option key={workspace._id} value={workspace._id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </label>
          <Link className="oauth-link" to="/workspaces">Manage workspaces</Link>
          <Link className="oauth-link" to="/tasks">Back to tasks</Link>
        </div>
      </header>
      <p className="subtle">
        Scope: {selectedWorkspace ? selectedWorkspace.name : "All workspaces"}
      </p>

      <div className="analytics-kpis">
        <article><strong>{data.totals.total}</strong><span>Total</span></article>
        <article><strong>{data.totals.done}</strong><span>Done</span></article>
        <article><strong>{data.totals.overdue}</strong><span>Overdue</span></article>
        <article><strong>{data.completionRate}%</strong><span>Completion rate</span></article>
      </div>

      <section className="chart-card">
        <h2>Overdue Trend (14 days)</h2>
        <div className="bars-grid">
          {data.overdueTrend.map((point) => (
            <div key={point.date} className="bar-col">
              <div className="bar stack-red" style={{ height: `${(point.count / overdueMax) * 100}%` }} />
              <span>{point.date.slice(5)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="chart-card">
        <h2>Weekly Productivity (8 weeks)</h2>
        <div className="bars-grid">
          {data.productivityWeekly.map((point) => (
            <div key={point.weekStart} className="bar-col">
              <div className="bar stack-blue" style={{ height: `${(point.created / weeklyMax) * 100}%` }} />
              <div className="bar stack-green" style={{ height: `${(point.completed / weeklyMax) * 100}%` }} />
              <span>{point.weekStart.slice(5)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="chart-card">
        <h2>Monthly Productivity (6 months)</h2>
        <div className="bars-grid">
          {data.productivityMonthly.map((point) => (
            <div key={point.month} className="bar-col">
              <div className="bar stack-blue" style={{ height: `${(point.created / monthlyMax) * 100}%` }} />
              <div className="bar stack-green" style={{ height: `${(point.completed / monthlyMax) * 100}%` }} />
              <span>{point.month}</span>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
};

export default AnalyticsPage;
