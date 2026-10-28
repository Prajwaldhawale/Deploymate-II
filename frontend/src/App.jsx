import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "/api";

async function apiRequest(path, options = {}, token = null) {
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.detail || `Request failed with status ${response.status}`
    );
  }

  return data;
}

function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeDecision(decision) {
  return (decision || "PENDING").toUpperCase();
}

function StatusBadge({ value }) {
  const normalized = normalizeDecision(value);

  return (
    <span className={`badge badge-${normalized.toLowerCase()}`}>
      <span className="badge-dot" />
      {normalized}
    </span>
  );
}

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "register") {
        await apiRequest("/auth/register", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
      }

      const result = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const token =
        result.access_token ||
        result.token;

      if (!token) {
        throw new Error("Login response did not contain an access token.");
      }

      onLogin(token, email);
    } catch (err) {
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-decoration auth-decoration-one" />
      <div className="auth-decoration auth-decoration-two" />

      <section className="auth-card">
        <Brand />

        <div className="auth-heading">
          <div className="eyebrow">DEPLOYMENT INTELLIGENCE</div>
          <h1>
            Think before
            <br />
            you deploy.
          </h1>
          <p>
            Assess deployment risks, understand failures, and make safer
            release decisions.
          </p>
        </div>

        <div className="auth-tabs">
          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            Sign in
          </button>

          <button
            className={mode === "register" ? "active" : ""}
            onClick={() => {
              setMode("register");
              setError("");
            }}
          >
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            required
            minLength={8}
          />

          {error && <div className="error-message">{error}</div>}

          <button className="primary-button auth-submit" disabled={loading}>
            {loading
              ? "Please wait..."
              : mode === "login"
                ? "Sign in to DeployMate"
                : "Create account"}
            {!loading && <span aria-hidden="true">→</span>}
          </button>
        </form>

        <div className="auth-footer">
          <span className="security-indicator" />
          Secure access · JWT authentication
        </div>
      </section>
    </main>
  );
}

function Brand() {
  return (
    <div className="brand">
      <div className="brand-icon">
        <svg
          viewBox="0 0 32 32"
          width="25"
          height="25"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M16 3 27 9.3v13.4L16 29 5 22.7V9.3L16 3Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="m11 16 3.2 3.2L21.5 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div>
        <div className="brand-name">
          DeployMate<span>II</span>
        </div>
        <div className="brand-caption">DEPLOYMENT RISK INTELLIGENCE</div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, detail, icon, tone }) {
  return (
    <article className="metric-card">
      <div className="metric-top">
        <span className="metric-label">{label}</span>
        <div className={`metric-icon ${tone}`}>{icon}</div>
      </div>

      <div className="metric-value">{value}</div>
      <div className="metric-detail">{detail}</div>
    </article>
  );
}

function DeploymentTable({ deployments, selectedId, onSelect }) {
  if (deployments.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">↗</div>
        <h3>No deployments yet</h3>
        <p>Submit your first deployment to start assessing release risk.</p>
      </div>
    );
  }

  return (
    <div className="table-scroll">
      <table className="deployment-table">
        <thead>
          <tr>
            <th>COMMIT / BRANCH</th>
            <th>BUILD</th>
            <th>TESTS</th>
            <th>RISK SCORE</th>
            <th>DECISION</th>
            <th>CREATED</th>
          </tr>
        </thead>

        <tbody>
          {deployments.map((deployment) => (
            <tr
              key={deployment.id}
              className={
                selectedId === deployment.id ? "selected-row" : ""
              }
              onClick={() => onSelect(deployment)}
            >
              <td>
                <div className="commit-cell">
                  <span className="commit-icon">⑂</span>
                  <div>
                    <strong>{deployment.commit_hash}</strong>
                    <span className="branch-name">
                      {deployment.branch || "unknown"}
                    </span>
                  </div>
                </div>
              </td>

              <td>
                <StatusBadge value={deployment.build_status} />
              </td>

              <td>
                <StatusBadge value={deployment.test_status} />
              </td>

              <td>
                <div className="risk-cell">
                  <div className="risk-track">
                    <div
                      className={`risk-fill ${
                        Number(deployment.risk_score) >= 60
                          ? "risk-high"
                          : Number(deployment.risk_score) >= 30
                            ? "risk-medium"
                            : "risk-low"
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, Number(deployment.risk_score) || 0)
                        )}%`,
                      }}
                    />
                  </div>
                  <strong>{deployment.risk_score ?? "—"}</strong>
                </div>
              </td>

              <td>
                <StatusBadge value={deployment.decision} />
              </td>

              <td className="date-cell">{formatDate(deployment.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NewDeploymentModal({ onClose, onSubmit, submitting }) {
  const [commitHash, setCommitHash] = useState("");
  const [branch, setBranch] = useState("main");
  const [buildStatus, setBuildStatus] = useState("SUCCESS");
  const [testStatus, setTestStatus] = useState("PASS");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      await onSubmit({
        commit_hash: commitHash.trim(),
        branch: branch.trim(),
        build_status: buildStatus,
        test_status: testStatus,
      });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-heading">
          <div>
            <div className="eyebrow">RISK ASSESSMENT</div>
            <h2 id="modal-title">Assess deployment</h2>
            <p>Submit pipeline results for an automated risk decision.</p>
          </div>

          <button className="icon-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="deployment-form" onSubmit={handleSubmit}>
          <label htmlFor="commit">Commit hash</label>
          <input
            id="commit"
            value={commitHash}
            onChange={(event) => setCommitHash(event.target.value)}
            placeholder="e.g. a82fc1d"
            required
          />

          <label htmlFor="branch">Branch</label>
          <input
            id="branch"
            value={branch}
            onChange={(event) => setBranch(event.target.value)}
            placeholder="main"
            required
          />

          <div className="form-grid">
            <div>
              <label htmlFor="build-status">Build status</label>
              <select
                id="build-status"
                value={buildStatus}
                onChange={(event) => setBuildStatus(event.target.value)}
              >
                <option value="SUCCESS">SUCCESS</option>
                <option value="FAIL">FAIL</option>
              </select>
            </div>

            <div>
              <label htmlFor="test-status">Test status</label>
              <select
                id="test-status"
                value={testStatus}
                onChange={(event) => setTestStatus(event.target.value)}
              >
                <option value="PASS">PASS</option>
                <option value="FAIL">FAIL</option>
              </select>
            </div>
          </div>

          <div className="assessment-note">
            <span>✳</span>
            The backend calculates the risk score and makes the final decision.
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
            >
              Cancel
            </button>

            <button className="primary-button" disabled={submitting}>
              {submitting ? "Assessing..." : "Assess risk →"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function DetailPanel({ deployment, onClose }) {
  if (!deployment) {
    return (
      <aside className="detail-panel detail-placeholder">
        <div className="detail-placeholder-icon">⌁</div>
        <h3>Deployment details</h3>
        <p>Select a deployment from the table to inspect its risk assessment.</p>
      </aside>
    );
  }

  return (
    <aside className="detail-panel">
      <div className="detail-heading">
        <div>
          <div className="eyebrow">ASSESSMENT DETAILS</div>
          <h3>Deployment #{deployment.id}</h3>
        </div>

        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close details"
        >
          ×
        </button>
      </div>

      <div className="detail-decision">
        <div>
          <span className="detail-label">Risk score</span>
          <div className="detail-score">{deployment.risk_score ?? "—"}</div>
          <span className="detail-muted">out of 100</span>
        </div>

        <StatusBadge value={deployment.decision} />
      </div>

      <div className="detail-fields">
        <div>
          <span>Commit</span>
          <strong className="break-text">{deployment.commit_hash}</strong>
        </div>

        <div>
          <span>Branch</span>
          <strong>{deployment.branch}</strong>
        </div>

        <div>
          <span>Build</span>
          <StatusBadge value={deployment.build_status} />
        </div>

        <div>
          <span>Tests</span>
          <StatusBadge value={deployment.test_status} />
        </div>

        <div>
          <span>Deployment status</span>
          <StatusBadge value={deployment.deployment_status} />
        </div>

        <div>
          <span>Created</span>
          <strong>{formatDate(deployment.created_at)}</strong>
        </div>
      </div>

      <div className="reasoning-box">
        <div className="reasoning-title">
          <span>✳</span> Risk reasoning
        </div>

        <p>
          {deployment.ai_reasoning ||
            "No additional reasoning was recorded for this assessment."}
        </p>
      </div>

      <div className="detail-disclaimer">
        The risk decision is produced by the deterministic assessment engine.
        AI-generated recommendations are not yet connected.
      </div>
    </aside>
  );
}

function Dashboard({ token, email, onLogout }) {
  const [deployments, setDeployments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const loadDeployments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await apiRequest("/deployments", {}, token);
      setDeployments(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err.message || "Unable to load deployments.");

      if (
        err.message.toLowerCase().includes("token") ||
        err.message.toLowerCase().includes("credential")
      ) {
        onLogout();
      }
    } finally {
      setLoading(false);
    }
  }, [token, onLogout]);

  useEffect(() => {
    loadDeployments();
  }, [loadDeployments]);

  const metrics = useMemo(() => {
    const approved = deployments.filter(
      (item) => normalizeDecision(item.decision) === "APPROVE"
    ).length;

    const blocked = deployments.filter(
      (item) => normalizeDecision(item.decision) === "BLOCK"
    ).length;

    const scored = deployments.filter(
      (item) => Number.isFinite(Number(item.risk_score))
    );

    const averageRisk = scored.length
      ? Math.round(
          scored.reduce((total, item) => total + Number(item.risk_score), 0) /
            scored.length
        )
      : 0;

    return {
      total: deployments.length,
      approved,
      blocked,
      averageRisk,
    };
  }, [deployments]);

  const filteredDeployments = useMemo(() => {
    return deployments.filter((item) => {
      const decision = normalizeDecision(item.decision);

      const matchesFilter = filter === "ALL" || decision === filter;

      const term = search.trim().toLowerCase();
      const matchesSearch =
        !term ||
        String(item.commit_hash || "").toLowerCase().includes(term) ||
        String(item.branch || "").toLowerCase().includes(term) ||
        String(item.id || "").includes(term);

      return matchesFilter && matchesSearch;
    });
  }, [deployments, filter, search]);

  async function createDeployment(payload) {
    setSubmitting(true);

    try {
      const created = await apiRequest(
        "/deployments",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        token
      );

      setDeployments((previous) => [created, ...previous]);
      setSelected(created);
      setShowModal(false);
      setNotice(`Deployment assessed: ${created.decision}.`);

      window.setTimeout(() => setNotice(""), 4000);
    } finally {
      setSubmitting(false);
    }
  }

  function logout() {
    onLogout();
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />

        <div className="sidebar-section-label">WORKSPACE</div>

        <button className="nav-item nav-active">
          <span className="nav-icon">▦</span>
          Overview
          <span className="nav-indicator" />
        </button>

        <button
          className="nav-item"
          onClick={() => {
            setFilter("ALL");
            document
              .getElementById("deployment-history")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          <span className="nav-icon">⇄</span>
          Deployments
        </button>

        <div className="sidebar-section-label sidebar-section-spaced">
          SYSTEM
        </div>

        <div className="sidebar-info">
          <span className="connection-dot" />
          <div>
            <strong>Risk engine</strong>
            <span>API-connected</span>
          </div>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="avatar">
              {(email || "U").charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-user-text">
              <strong>{email}</strong>
              <span>Authenticated user</span>
            </div>
          </div>

          <button className="logout-button" onClick={logout}>
            ↗ Sign out
          </button>

          <div className="sidebar-version">DEPLOYMATE II · LOCAL DEVELOPMENT</div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> <strong>Overview</strong>
          </div>

          <div className="topbar-right">
            <div className="live-status">
              <span className="connection-dot" />
              API connected
            </div>

            <button
              className="avatar top-avatar"
              title={email}
              onClick={logout}
            >
              {(email || "U").charAt(0).toUpperCase()}
            </button>
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-row">
            <div>
              <div className="eyebrow">DEPLOYMENT CONTROL CENTER</div>
              <h1>Deployment overview</h1>
              <p>
                Monitor release health and make risk-aware deployment
                decisions.
              </p>
            </div>

            <button
              className="primary-button new-deployment-button"
              onClick={() => setShowModal(true)}
            >
              <span>＋</span> New assessment
            </button>
          </section>

          {error && (
            <div className="alert-error">
              <strong>Unable to load deployments</strong>
              <span>{error}</span>
              <button onClick={loadDeployments}>Retry</button>
            </div>
          )}

          {notice && <div className="success-notice">{notice}</div>}

          <section className="metrics-grid">
            <MetricCard
              label="TOTAL DEPLOYMENTS"
              value={loading ? "—" : metrics.total}
              detail="Recorded assessments"
              icon="↗"
              tone="tone-blue"
            />

            <MetricCard
              label="APPROVED"
              value={loading ? "—" : metrics.approved}
              detail="Passed risk assessment"
              icon="✓"
              tone="tone-green"
            />

            <MetricCard
              label="BLOCKED"
              value={loading ? "—" : metrics.blocked}
              detail="Require corrective action"
              icon="⊘"
              tone="tone-red"
            />

            <MetricCard
              label="AVERAGE RISK"
              value={loading ? "—" : metrics.averageRisk}
              detail="Risk score out of 100"
              icon="◈"
              tone="tone-purple"
            />
          </section>

          <section className="history-section" id="deployment-history">
            <div className="section-heading">
              <div>
                <h2>Deployment history</h2>
                <p>Your latest deployment assessments from the API.</p>
              </div>

              <button
                className="secondary-button refresh-button"
                onClick={loadDeployments}
                disabled={loading}
              >
                ↻ Refresh
              </button>
            </div>

            <div className="table-toolbar">
              <div className="search-box">
                <span>⌕</span>
                <input
                  aria-label="Search deployments"
                  placeholder="Search commit, branch, or ID..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              <select
                aria-label="Filter deployments"
                className="filter-select"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              >
                <option value="ALL">All decisions</option>
                <option value="APPROVE">Approved</option>
                <option value="REVIEW">Needs review</option>
                <option value="BLOCK">Blocked</option>
              </select>
            </div>

            {loading ? (
              <div className="loading-state">
                <span className="loading-spinner" />
                Loading deployment records...
              </div>
            ) : (
              <DeploymentTable
                deployments={filteredDeployments}
                selectedId={selected?.id}
                onSelect={setSelected}
              />
            )}

            <div className="table-footer">
              <span>
                Showing {filteredDeployments.length} of {deployments.length}{" "}
                deployments
              </span>
              <span>
                <span className="connection-dot" /> Live API data
              </span>
            </div>
          </section>

          <section className="bottom-grid">
            <div className="information-card">
              <div className="info-icon">✳</div>
              <div>
                <h3>Risk-based deployment decisions</h3>
                <p>
                  DeployMate evaluates build and test results before assigning
                  an approval decision.
                </p>
              </div>
            </div>

            <div className="information-card">
              <div className="info-icon info-icon-purple">⌘</div>
              <div>
                <h3>CI/CD integration</h3>
                <p>
                  Jenkins risk enforcement is the next integration milestone.
                </p>
              </div>
            </div>
          </section>

          <footer className="page-footer">
            <span>DeployMate-II</span>
            <span>Think before you deploy.</span>
          </footer>
        </div>
      </main>

      {selected && (
        <DetailPanel
          deployment={selected}
          onClose={() => setSelected(null)}
        />
      )}

      {showModal && (
        <NewDeploymentModal
          onClose={() => setShowModal(false)}
          onSubmit={createDeployment}
          submitting={submitting}
        />
      )}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(() => ({
    token: localStorage.getItem("deploymate_token"),
    email: localStorage.getItem("deploymate_email") || "",
  }));

  const login = useCallback((token, email) => {
    localStorage.setItem("deploymate_token", token);
    localStorage.setItem("deploymate_email", email);
    setSession({ token, email });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("deploymate_token");
    localStorage.removeItem("deploymate_email");
    setSession({ token: null, email: "" });
  }, []);

  if (!session.token) {
    return <AuthScreen onLogin={login} />;
  }

  return (
    <Dashboard
      key={session.token}
      token={session.token}
      email={session.email}
      onLogout={logout}
    />
  );
}