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

function VulnSummary({ findings }) {
  if (!findings || typeof findings !== "object") {
    return <span className="vuln-pill vuln-pill-clean">0 vulns</span>;
  }

  const crit = Number(findings.critical || 0);
  const high = Number(findings.high || 0);
  const med = Number(findings.medium || 0);
  const low = Number(findings.low || 0);

  if (crit === 0 && high === 0 && med === 0 && low === 0) {
    return <span className="vuln-pill vuln-pill-clean">Clean (0)</span>;
  }

  return (
    <div className="vuln-badges">
      {crit > 0 && <span className="vuln-pill vuln-pill-crit">{crit} Crit</span>}
      {high > 0 && <span className="vuln-pill vuln-pill-high">{high} High</span>}
      {med > 0 && <span className="vuln-pill vuln-pill-med">{med} Med</span>}
      {low > 0 && <span className="vuln-pill vuln-pill-low">{low} Low</span>}
    </div>
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

      const token = result.access_token || result.token;

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
          <div className="eyebrow">CONTINUOUS DELIVERY GATEWAY</div>
          <h1>
            Automated Release
            <br />
            Risk Governance.
          </h1>
          <p>
            Deterministic policy gates and advisory AWS Bedrock intelligence for
            mission-critical cloud deployments.
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
          viewBox="0 0 28 28"
          width="20"
          height="20"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M14 3.5L24 8.5V19.5L14 24.5L4 19.5V8.5L14 3.5Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M14 8.5V19.5M8.5 14H19.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="14" cy="14" r="2.2" fill="#38bdf8" />
        </svg>
      </div>

      <div>
        <div className="brand-name">
          DeployMate<span className="brand-badge">II</span>
        </div>
        <div className="brand-caption">RELEASE GATEWAY & RISK AUDIT</div>
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

function AssessmentTable({ assessments, selectedId, onSelect }) {
  if (assessments.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">↗</div>
        <h3>No assessments yet</h3>
        <p>Trigger a pipeline assessment or click "New assessment" to evaluate risk.</p>
      </div>
    );
  }

  return (
    <div className="table-scroll">
      <table className="deployment-table">
        <thead>
          <tr>
            <th>PROJECT / ENV</th>
            <th>COMMIT / BRANCH</th>
            <th>BUILD</th>
            <th>TESTS</th>
            <th>VULNERABILITIES</th>
            <th>RISK SCORE</th>
            <th>DECISION</th>
            <th>DATE</th>
          </tr>
        </thead>

        <tbody>
          {assessments.map((item) => (
            <tr
              key={item.id}
              className={selectedId === item.id ? "selected-row" : ""}
              onClick={() => onSelect(item)}
            >
              <td>
                <div style={{ fontWeight: 600, color: "#e2e8f5" }}>
                  {item.project_name || "demo-chat-app"}
                </div>
                <div style={{ fontSize: "10px", color: "#8a96ae" }}>
                  {item.environment || "staging"}
                </div>
              </td>

              <td>
                <div className="commit-cell">
                  <span className="commit-icon">⑂</span>
                  <div>
                    <strong>{item.commit_hash}</strong>
                    <span className="branch-name">
                      {item.branch || "unknown"}
                    </span>
                  </div>
                </div>
              </td>

              <td>
                <StatusBadge value={item.build_status} />
              </td>

              <td>
                <StatusBadge value={item.test_status} />
              </td>

              <td>
                <VulnSummary findings={item.security_findings} />
              </td>

              <td>
                <div className="risk-cell">
                  <div className="risk-track">
                    <div
                      className={`risk-fill ${
                        Number(item.risk_score) >= 60
                          ? "risk-high"
                          : Number(item.risk_score) >= 30
                            ? "risk-medium"
                            : "risk-low"
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, Number(item.risk_score) || 0)
                        )}%`,
                      }}
                    />
                  </div>
                  <strong>{item.risk_score ?? "—"}</strong>
                </div>
              </td>

              <td>
                <StatusBadge value={item.decision} />
              </td>

              <td className="date-cell">{formatDate(item.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AssessModal({ onClose, onSubmit, submitting }) {
  const [projectName, setProjectName] = useState("demo-chat-app");
  const [environment, setEnvironment] = useState("staging");
  const [commitHash, setCommitHash] = useState("a1b2c3d");
  const [branch, setBranch] = useState("main");
  const [buildStatus, setBuildStatus] = useState("SUCCESS");
  const [testStatus, setTestStatus] = useState("PASS");

  const [critVulns, setCritVulns] = useState(0);
  const [highVulns, setHighVulns] = useState(0);
  const [medVulns, setMedVulns] = useState(0);
  const [lowVulns, setLowVulns] = useState(0);

  const [cpuUsage, setCpuUsage] = useState(45);
  const [memoryUsage, setMemoryUsage] = useState(55);
  const [recentFailures, setRecentFailures] = useState(0);

  const [error, setError] = useState("");

  function applyPreset(type) {
    if (type === "safe") {
      setCommitHash("f7a29c1");
      setBranch("main");
      setBuildStatus("SUCCESS");
      setTestStatus("PASS");
      setCritVulns(0);
      setHighVulns(0);
      setMedVulns(0);
      setLowVulns(0);
      setCpuUsage(42);
      setMemoryUsage(50);
      setRecentFailures(0);
    } else if (type === "review") {
      setCommitHash("b8e401f");
      setBranch("feature/chat-v2");
      setBuildStatus("SUCCESS");
      setTestStatus("PASS");
      setCritVulns(0);
      setHighVulns(2);
      setMedVulns(1);
      setLowVulns(4);
      setCpuUsage(88);
      setMemoryUsage(86);
      setRecentFailures(1);
    } else if (type === "block") {
      setCommitHash("d39c5aa");
      setBranch("hotfix/auth-bypass");
      setBuildStatus("SUCCESS");
      setTestStatus("PASS");
      setCritVulns(1);
      setHighVulns(3);
      setMedVulns(2);
      setLowVulns(0);
      setCpuUsage(96);
      setMemoryUsage(92);
      setRecentFailures(3);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      await onSubmit({
        project_name: projectName.trim(),
        environment: environment.trim(),
        commit_hash: commitHash.trim(),
        branch: branch.trim(),
        build_status: buildStatus,
        test_status: testStatus,
        security_findings: {
          critical: Number(critVulns) || 0,
          high: Number(highVulns) || 0,
          medium: Number(medVulns) || 0,
          low: Number(lowVulns) || 0,
        },
        infrastructure_metrics: {
          cpu_usage_percent: Number(cpuUsage) || 0,
          memory_usage_percent: Number(memoryUsage) || 0,
        },
        recent_failures: Number(recentFailures) || 0,
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
        style={{ maxWidth: "560px" }}
      >
        <div className="modal-heading">
          <div>
            <div className="eyebrow">RISK ASSESSMENT ENGINE</div>
            <h2 id="modal-title">Evaluate Pipeline Evidence</h2>
            <p>Supply build, test, security, and infrastructure metrics for risk scoring.</p>
          </div>

          <button className="icon-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="preset-scenarios">
          <span className="preset-label">SIMULATION SCENARIOS:</span>
          <div className="preset-buttons">
            <button
              type="button"
              className="preset-btn preset-safe"
              onClick={() => applyPreset("safe")}
            >
              <span className="preset-dot dot-green" /> Safe Baseline
            </button>
            <button
              type="button"
              className="preset-btn preset-review"
              onClick={() => applyPreset("review")}
            >
              <span className="preset-dot dot-yellow" /> Elevated Risk
            </button>
            <button
              type="button"
              className="preset-btn preset-block"
              onClick={() => applyPreset("block")}
            >
              <span className="preset-dot dot-red" /> Critical Blocker
            </button>
          </div>
        </div>

        <form className="deployment-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div>
              <label htmlFor="project">Project Name</label>
              <input
                id="project"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="environment">Environment</label>
              <select
                id="environment"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
              >
                <option value="staging">staging</option>
                <option value="production">production</option>
                <option value="development">development</option>
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div>
              <label htmlFor="commit">Commit Hash</label>
              <input
                id="commit"
                value={commitHash}
                onChange={(e) => setCommitHash(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="branch">Git Branch</label>
              <input
                id="branch"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-grid">
            <div>
              <label htmlFor="build-status">Build Status</label>
              <select
                id="build-status"
                value={buildStatus}
                onChange={(e) => setBuildStatus(e.target.value)}
              >
                <option value="SUCCESS">SUCCESS</option>
                <option value="FAIL">FAIL</option>
              </select>
            </div>

            <div>
              <label htmlFor="test-status">Test Status</label>
              <select
                id="test-status"
                value={testStatus}
                onChange={(e) => setTestStatus(e.target.value)}
              >
                <option value="PASS">PASS</option>
                <option value="FAIL">FAIL</option>
              </select>
            </div>
          </div>

          <div className="section-label-small">Security Findings (CVE / SAST)</div>
          <div className="form-grid-4">
            <div>
              <label htmlFor="crit-v">Critical</label>
              <input
                id="crit-v"
                type="number"
                min="0"
                value={critVulns}
                onChange={(e) => setCritVulns(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="high-v">High</label>
              <input
                id="high-v"
                type="number"
                min="0"
                value={highVulns}
                onChange={(e) => setHighVulns(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="med-v">Medium</label>
              <input
                id="med-v"
                type="number"
                min="0"
                value={medVulns}
                onChange={(e) => setMedVulns(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="low-v">Low</label>
              <input
                id="low-v"
                type="number"
                min="0"
                value={lowVulns}
                onChange={(e) => setLowVulns(e.target.value)}
              />
            </div>
          </div>

          <div className="section-label-small">Infrastructure & Reliability</div>
          <div className="form-grid-3">
            <div>
              <label htmlFor="cpu-v">CPU %</label>
              <input
                id="cpu-v"
                type="number"
                min="0"
                max="100"
                value={cpuUsage}
                onChange={(e) => setCpuUsage(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="mem-v">Memory %</label>
              <input
                id="mem-v"
                type="number"
                min="0"
                max="100"
                value={memoryUsage}
                onChange={(e) => setMemoryUsage(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="fail-v">Recent Fails</label>
              <input
                id="fail-v"
                type="number"
                min="0"
                value={recentFailures}
                onChange={(e) => setRecentFailures(e.target.value)}
              />
            </div>
          </div>

          <div className="assessment-note">
            <span>✳</span>
            Deterministic engine computes the decision (APPROVE / REVIEW / BLOCK).
            Amazon Bedrock generates advisory explanation.
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
              {submitting ? "Analyzing Risk..." : "Evaluate Release →"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function DetailPanel({ assessment, onClose }) {
  if (!assessment) {
    return (
      <aside className="detail-panel detail-placeholder">
        <div className="detail-placeholder-icon">⌁</div>
        <h3>Assessment details</h3>
        <p>Select a deployment from the table to inspect risk gates & AI recommendations.</p>
      </aside>
    );
  }

  const findings = assessment.security_findings || {};
  const metrics = assessment.infrastructure_metrics || {};
  const reasons = Array.isArray(assessment.risk_reasons)
    ? assessment.risk_reasons
    : assessment.ai_reasoning
      ? [assessment.ai_reasoning]
      : [];

  const isAiActive = assessment.ai_status === "success";

  return (
    <aside className="detail-panel" style={{ width: "380px", flex: "0 0 380px" }}>
      <div className="detail-heading">
        <div>
          <div className="eyebrow">ASSESSMENT #{assessment.id}</div>
          <h3>{assessment.project_name || "demo-chat-app"}</h3>
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
          <div className="detail-score">{assessment.risk_score ?? "—"}</div>
          <span className="detail-muted">out of 100</span>
        </div>

        <StatusBadge value={assessment.decision} />
      </div>

      <div className="detail-fields">
        <div>
          <span>Target Environment</span>
          <strong style={{ textTransform: "uppercase", color: "#a8b6ff" }}>
            {assessment.environment || "staging"}
          </strong>
        </div>

        <div>
          <span>Commit & Branch</span>
          <strong className="break-text">
            {assessment.commit_hash} ({assessment.branch})
          </strong>
        </div>

        <div>
          <span>Build & Tests</span>
          <div style={{ display: "flex", gap: "6px" }}>
            <StatusBadge value={assessment.build_status} />
            <StatusBadge value={assessment.test_status} />
          </div>
        </div>

        <div>
          <span>Security Findings</span>
          <VulnSummary findings={findings} />
        </div>

        <div>
          <span>Host Metrics</span>
          <strong>
            CPU: {metrics.cpu_usage_percent ?? "—"}% · Mem:{" "}
            {metrics.memory_usage_percent ?? "—"}%
          </strong>
        </div>

        <div>
          <span>Assessed At</span>
          <strong>{formatDate(assessment.created_at)}</strong>
        </div>
      </div>

      {reasons.length > 0 && (
        <div className="reasoning-box">
          <div className="reasoning-title">
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 2l6 3v5c0 4.5-3 8-6 9-3-1-6-4.5-6-9V5l6-3z"/>
              <path d="M7.5 10l2 2 3.5-3.5"/>
            </svg>
            <span>Deterministic Policy Evaluation</span>
          </div>
          <ul className="reasons-list">
            {reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Amazon Bedrock AI Analysis Card */}
      <div className="ai-card">
        <div className="ai-card-header">
          <div className="ai-card-title">
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="14" height="14" rx="2.5"/>
              <path d="M7 10h6M10 7v6"/>
            </svg>
            <span>Bedrock Advisory Analysis</span>
          </div>

          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span
              className={`ai-badge ${isAiActive ? "ai-badge-active" : "ai-badge-fallback"}`}
            >
              {isAiActive ? "Bedrock Active" : "Heuristic Mode"}
            </span>
            {assessment.ai_confidence && (
              <span className="ai-confidence-pill">
                Confidence: {assessment.ai_confidence}
              </span>
            )}
          </div>
        </div>

        <p className="ai-summary-text">
          {assessment.ai_summary ||
            "Deterministic rules applied. Configure Amazon Bedrock credentials to activate LLM reasoning."}
        </p>

        {Array.isArray(assessment.ai_risk_factors) &&
          assessment.ai_risk_factors.length > 0 && (
            <div>
              <div className="ai-subheading">Identified Risk Factors</div>
              <ul className="ai-list">
                {assessment.ai_risk_factors.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}

        {Array.isArray(assessment.ai_recommendations) &&
          assessment.ai_recommendations.length > 0 && (
            <div>
              <div className="ai-subheading">Actionable Recommendations</div>
              <ul className="ai-list">
                {assessment.ai_recommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
      </div>

      <div className="detail-disclaimer">
        The deterministic risk engine owns the hard gate decision.
        Bedrock AI explanations are advisory and ground on submitted pipeline evidence.
      </div>
    </aside>
  );
}

function Dashboard({ token, email, onLogout }) {
  const [assessments, setAssessments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const loadAssessments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // First try /assessments
      let result = [];
      try {
        result = await apiRequest("/assessments", {}, token);
      } catch (e) {
        // Fallback to legacy /deployments if /assessments isn't populated
        result = await apiRequest("/deployments", {}, token);
      }
      setAssessments(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err.message || "Unable to load assessment records.");

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
    loadAssessments();
  }, [loadAssessments]);

  const metrics = useMemo(() => {
    const approved = assessments.filter(
      (item) => normalizeDecision(item.decision) === "APPROVE"
    ).length;

    const blocked = assessments.filter(
      (item) => normalizeDecision(item.decision) === "BLOCK"
    ).length;

    const scored = assessments.filter(
      (item) => Number.isFinite(Number(item.risk_score))
    );

    const averageRisk = scored.length
      ? Math.round(
          scored.reduce((total, item) => total + Number(item.risk_score), 0) /
            scored.length
        )
      : 0;

    return {
      total: assessments.length,
      approved,
      blocked,
      averageRisk,
    };
  }, [assessments]);

  const filteredAssessments = useMemo(() => {
    return assessments.filter((item) => {
      const decision = normalizeDecision(item.decision);
      const matchesFilter = filter === "ALL" || decision === filter;

      const term = search.trim().toLowerCase();
      const matchesSearch =
        !term ||
        String(item.project_name || "").toLowerCase().includes(term) ||
        String(item.commit_hash || "").toLowerCase().includes(term) ||
        String(item.branch || "").toLowerCase().includes(term) ||
        String(item.id || "").includes(term);

      return matchesFilter && matchesSearch;
    });
  }, [assessments, filter, search]);

  async function createAssessment(payload) {
    setSubmitting(true);

    try {
      const created = await apiRequest(
        "/assessments",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        token
      );

      setAssessments((previous) => [created, ...previous]);
      setSelected(created);
      setShowModal(false);
      setNotice(`Assessment complete: Decision is ${created.decision} (Risk score: ${created.risk_score})`);

      window.setTimeout(() => setNotice(""), 4500);
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
          <span className="nav-icon">
            <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="6" height="6" rx="1.5"/>
              <rect x="11" y="3" width="6" height="6" rx="1.5"/>
              <rect x="3" y="11" width="6" height="6" rx="1.5"/>
              <rect x="11" y="11" width="6" height="6" rx="1.5"/>
            </svg>
          </span>
          Overview
          <span className="nav-indicator" />
        </button>

        <button
          className="nav-item"
          onClick={() => {
            setFilter("ALL");
            document
              .getElementById("assessment-history")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          <span className="nav-icon">
            <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h12M4 10h12M4 14h8"/>
            </svg>
          </span>
          Risk Assessments
        </button>

        <div className="sidebar-section-label sidebar-section-spaced">
          SECURITY ENGINES
        </div>

        <div className="sidebar-info">
          <span className="connection-dot" />
          <div>
            <strong>Rule Gate Engine</strong>
            <span>Active · 10 Policy Gates</span>
          </div>
        </div>

        <div className="sidebar-info" style={{ marginTop: "8px" }}>
          <span className="connection-dot" style={{ background: "#38bdf8" }} />
          <div>
            <strong>Amazon Bedrock</strong>
            <span>Claude 3 Sonnet · Active</span>
          </div>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="avatar">
              {(email || "U").charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-user-text">
              <strong>{email}</strong>
              <span>Authenticated</span>
            </div>
          </div>

          <button className="logout-button" onClick={logout}>
            ↗ Sign out
          </button>

          <div className="sidebar-version">DEPLOYMATE II · DEVSECOPS AGENT</div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> <strong>Deployment Overview</strong>
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
              <h1>Release Risk Overview</h1>
              <p>
                Evaluate CI/CD build, security scan, and host metrics through
                deterministic risk gates and Amazon Bedrock advisory.
              </p>
            </div>

            <button
              className="primary-button new-deployment-button"
              onClick={() => setShowModal(true)}
            >
              <span>＋</span> Evaluate Release
            </button>
          </section>

          {error && (
            <div className="alert-error">
              <strong>Unable to load assessments</strong>
              <span>{error}</span>
              <button onClick={loadAssessments}>Retry</button>
            </div>
          )}

          {notice && <div className="success-notice">{notice}</div>}

          <section className="metrics-grid">
            <MetricCard
              label="TOTAL ASSESSMENTS"
              value={loading ? "—" : metrics.total}
              detail="Evaluated pipelines"
              icon={
                <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="14" height="14" rx="2.5"/>
                  <path d="M3 8.5h14M8.5 17V8.5"/>
                </svg>
              }
              tone="tone-blue"
            />

            <MetricCard
              label="APPROVED"
              value={loading ? "—" : metrics.approved}
              detail="Safe release passed"
              icon={
                <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 6.5L8.5 14L4 9.5"/>
                </svg>
              }
              tone="tone-green"
            />

            <MetricCard
              label="BLOCKED"
              value={loading ? "—" : metrics.blocked}
              detail="Blocked by risk gate"
              icon={
                <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="10" cy="10" r="7"/>
                  <path d="M5.5 5.5l9 9"/>
                </svg>
              }
              tone="tone-red"
            />

            <MetricCard
              label="AVG RISK SCORE"
              value={loading ? "—" : metrics.averageRisk}
              detail="Scale 0 to 100"
              icon={
                <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 3a7 7 0 1 0 7 7M10 7v3l2 2"/>
                </svg>
              }
              tone="tone-purple"
            />
          </section>

          <section className="history-section" id="assessment-history">
            <div className="section-heading">
              <div>
                <h2>Assessment History</h2>
                <p>Latest CI/CD evaluations and risk decisions.</p>
              </div>

              <button
                className="secondary-button refresh-button"
                onClick={loadAssessments}
                disabled={loading}
              >
                ↻ Refresh
              </button>
            </div>

            <div className="table-toolbar">
              <div className="search-box">
                <span>⌕</span>
                <input
                  aria-label="Search assessments"
                  placeholder="Search project, commit, branch, or ID..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              <select
                aria-label="Filter assessments"
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
                Loading assessment records...
              </div>
            ) : (
              <AssessmentTable
                assessments={filteredAssessments}
                selectedId={selected?.id}
                onSelect={setSelected}
              />
            )}

            <div className="table-footer">
              <span>
                Showing {filteredAssessments.length} of {assessments.length}{" "}
                assessments
              </span>
              <span>
                <span className="connection-dot" /> Live API data
              </span>
            </div>
          </section>

          <section className="bottom-grid">
            <div className="information-card">
              <div className="info-icon">⚖</div>
              <div>
                <h3>Deterministic Risk Gates</h3>
                <p>
                  Zero hallucinations in release decisions: build failure, test failure,
                  or critical CVEs trigger non-negotiable blocks.
                </p>
              </div>
            </div>

            <div className="information-card">
              <div className="info-icon info-icon-purple">✦</div>
              <div>
                <h3>Amazon Bedrock Advisory</h3>
                <p>
                  Grounds strictly on pipeline logs and metrics to deliver executive summaries
                  and actionable DevSecOps remediation.
                </p>
              </div>
            </div>
          </section>

          <footer className="page-footer">
            <span>DeployMate-II · DevSecOps AI Gateway</span>
            <span>Think before you deploy.</span>
          </footer>
        </div>
      </main>

      {selected && (
        <DetailPanel
          assessment={selected}
          onClose={() => setSelected(null)}
        />
      )}

      {showModal && (
        <AssessModal
          onClose={() => setShowModal(false)}
          onSubmit={createAssessment}
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