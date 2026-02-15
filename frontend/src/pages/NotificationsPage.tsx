import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { AuthResponse, Notification, NotificationPreferences } from "../types";

type NotificationsPageProps = {
  auth: AuthResponse;
};

const NotificationsPage = ({ auth }: NotificationsPageProps): JSX.Element => {
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    inAppDueSoon: true,
    emailDueSoon: true,
    unsubscribedAll: false
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (): Promise<void> => {
    try {
      const [notifs, prefs] = await Promise.all([
        api.listNotifications(auth.token, unreadOnly),
        api.getNotificationPreferences(auth.token)
      ]);
      setItems(notifs.items);
      setUnreadCount(notifs.unreadCount);
      setPreferences(prefs.notificationPreferences);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [auth.token, unreadOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  const updatePrefs = async (patch: Partial<NotificationPreferences>) => {
    try {
      const result = await api.updateNotificationPreferences(auth.token, patch);
      setPreferences(result.notificationPreferences);
      setNotice("Preferences updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update preferences");
    }
  };

  const markRead = async (id: string): Promise<void> => {
    try {
      await api.markNotificationRead(auth.token, id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark read");
    }
  };

  const markAllRead = async (): Promise<void> => {
    try {
      await api.markAllNotificationsRead(auth.token);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark all read");
    }
  };

  const unsubscribeAll = async (): Promise<void> => {
    try {
      const result = await api.unsubscribeAllNotifications(auth.token);
      setPreferences(result.notificationPreferences);
      setNotice("Unsubscribed from all email notifications.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unsubscribe");
    }
  };

  return (
    <section className="card notifications-page">
      <header className="security-header">
        <div>
          <h1>Notification Center</h1>
          <p className="subtle">Unread: {unreadCount}</p>
        </div>
        <Link className="oauth-link" to="/tasks">Back to tasks</Link>
      </header>

      {error && <p className="error">{error}</p>}
      {notice && <p className="notice">{notice}</p>}
      {loading ? <p className="subtle">Loading...</p> : null}

      <section className="prefs-box">
        <h2>Preferences</h2>
        <label className="pref-row">
          <input
            type="checkbox"
            checked={preferences.inAppDueSoon}
            onChange={(event) => void updatePrefs({ inAppDueSoon: event.target.checked })}
          />
          <span>In-app due reminders</span>
        </label>
        <label className="pref-row">
          <input
            type="checkbox"
            checked={preferences.emailDueSoon}
            onChange={(event) => void updatePrefs({ emailDueSoon: event.target.checked, unsubscribedAll: false })}
          />
          <span>Email due reminders</span>
        </label>
        <button type="button" onClick={() => void unsubscribeAll()}>Unsubscribe all emails</button>
      </section>

      <section className="prefs-box">
        <div className="notify-head">
          <h2>Items</h2>
          <div className="inline-actions">
            <label className="pref-row">
              <input type="checkbox" checked={unreadOnly} onChange={(event) => setUnreadOnly(event.target.checked)} />
              <span>Unread only</span>
            </label>
            <button type="button" onClick={() => void markAllRead()}>Mark all read</button>
          </div>
        </div>

        <ul className="notify-list center-list">
          {items.map((notification) => (
            <li key={notification._id} className={notification.readAt ? "is-read" : "is-unread"}>
              <strong>{notification.title}</strong>
              <p>{notification.message}</p>
              <p>
                {new Date(notification.createdAt).toLocaleString()}
                {notification.lastEmailError ? ` | email error: ${notification.lastEmailError}` : ""}
              </p>
              {!notification.readAt ? (
                <button type="button" onClick={() => void markRead(notification._id)}>Mark read</button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
};

export default NotificationsPage;
