import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { AssistantMessage, AuthResponse } from "../types";

type AssistantPageProps = {
  auth: AuthResponse;
  clearAuth: () => void;
};

const AssistantPage = ({ auth, clearAuth }: AssistantPageProps): JSX.Element => {
  const [items, setItems] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.listAssistantMessages(auth.token);
        setItems(data.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load messages");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [auth.token]);

  const onSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = input.trim();
    if (!message) return;

    try {
      setSending(true);
      setError("");
      setInput("");

      const optimistic: AssistantMessage = {
        _id: `temp-${Date.now()}`,
        userId: auth.user.id,
        role: "user",
        content: message,
        createdAt: new Date().toISOString()
      };
      setItems((prev) => [...prev, optimistic]);

      const response = await api.chatAssistant(auth.token, { message });
      setItems((prev) => [
        ...prev.filter((entry) => entry._id !== optimistic._id),
        optimistic,
        response.message
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="assistant-page card">
      <header className="security-header">
        <div>
          <h1>AI Task Assistant</h1>
          <p className="subtle">Ask for planning, summaries, or task creation.</p>
        </div>
        <Link className="oauth-link" to="/tasks">Back to tasks</Link>
      </header>

      {error && <p className="error">{error}</p>}
      {loading && <p className="subtle">Loading chat...</p>}

      <div className="assistant-thread">
        {items.map((entry) => (
          <article key={entry._id} className={entry.role === "assistant" ? "bubble assistant" : "bubble user"}>
            <strong>{entry.role === "assistant" ? "Assistant" : "You"}</strong>
            <p>{entry.content}</p>
          </article>
        ))}
      </div>

      <form className="assistant-form" onSubmit={onSend}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder='Try: "Create task prepare release notes for tomorrow high"'
          disabled={sending}
        />
        <button type="submit" disabled={sending}>{sending ? "Sending..." : "Send"}</button>
      </form>

      <div className="security-actions">
        <Link className="oauth-link" to="/security">Account / Security</Link>
        <button onClick={clearAuth}>Logout</button>
      </div>
    </section>
  );
};

export default AssistantPage;
