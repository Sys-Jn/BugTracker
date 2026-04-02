import React, { useState, useEffect, useCallback } from "react";
import { bugs as bugsApi, users as usersApi } from "./api/client";
import BugList from "./components/BugList";
import BugForm from "./components/BugForm";
import BugDetail from "./components/BugDetail";

const STATUSES = ["", "open", "in_progress", "resolved", "closed"];
const PRIORITIES = ["", "low", "medium", "high", "critical"];

export default function App() {
  const [bugList, setBugList] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedBug, setSelectedBug] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({ status: "", priority: "", search: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({});

  const fetchBugs = useCallback(async () => {
    try {
      const data = await bugsApi.list(filters);
      setBugList(data);
      const s = {};
      data.forEach((b) => { s[b.status] = (s[b.status] || 0) + 1; });
      setStats(s);
    } catch (e) {
      setError(e.message);
    }
  }, [filters]);

  useEffect(() => {
    fetchBugs();
  }, [fetchBugs]);

  useEffect(() => {
    usersApi.list().then(setUsers).catch(() => {});
  }, []);

  const refreshSelected = async (id) => {
    const updated = await bugsApi.get(id);
    setSelectedBug(updated);
    setBugList((prev) => prev.map((b) => (b.id === id ? updated : b)));
  };

  const handleCreate = async (body) => {
    setLoading(true);
    try {
      await bugsApi.create(body);
      setShowForm(false);
      await fetchBugs();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this bug?")) return;
    await bugsApi.delete(id);
    if (selectedBug?.id === id) setSelectedBug(null);
    await fetchBugs();
  };

  const handleStatusChange = async (id, status) => {
    setLoading(true);
    try {
      await bugsApi.update(id, { status });
      await refreshSelected(id);
      await fetchBugs();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (id, assignee_id) => {
    setLoading(true);
    try {
      await bugsApi.update(id, { assignee_id });
      await refreshSelected(id);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (bug) => {
    const detail = await bugsApi.get(bug.id);
    setSelectedBug(detail);
  };

  return (
    <div style={styles.app}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <span style={styles.brandIcon}>🐛</span>
          <span style={styles.brandName}>BugTracker</span>
        </div>

        <div style={styles.statCards}>
          {[
            { label: "Open", key: "open", color: "#ffc107" },
            { label: "In Progress", key: "in_progress", color: "#007bff" },
            { label: "Resolved", key: "resolved", color: "#28a745" },
            { label: "Closed", key: "closed", color: "#6c757d" },
          ].map(({ label, key, color }) => (
            <div key={key} style={{ ...styles.statCard, borderTop: `3px solid ${color}` }}>
              <div style={styles.statNum}>{stats[key] || 0}</div>
              <div style={styles.statLabel}>{label}</div>
            </div>
          ))}
        </div>

        <div style={styles.filterGroup}>
          <input
            style={styles.searchInput}
            placeholder="Search bugs…"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Status</label>
          <select style={styles.filterSelect} value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
            {STATUSES.map((s) => <option key={s} value={s}>{s ? s.replace("_", " ") : "All statuses"}</option>)}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Priority</label>
          <select style={styles.filterSelect} value={filters.priority} onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p || "All priorities"}</option>)}
          </select>
        </div>
      </aside>

      {/* Main */}
      <main style={styles.main}>
        <div style={styles.toolbar}>
          <h1 style={styles.heading}>
            Bugs <span style={styles.count}>{bugList.length}</span>
          </h1>
          <button style={styles.newBtn} onClick={() => { setShowForm(true); setSelectedBug(null); }}>
            + Report Bug
          </button>
        </div>

        {error && (
          <div style={styles.errorBanner}>
            ⚠ {error}
            <button style={styles.dismissBtn} onClick={() => setError(null)}>✕</button>
          </div>
        )}

        <div style={styles.content}>
          <div style={styles.listPane}>
            <BugList
              bugs={bugList}
              onSelect={handleSelect}
              onDelete={handleDelete}
              selectedId={selectedBug?.id}
            />
          </div>

          <div style={styles.detailPane}>
            {showForm && (
              <BugForm
                users={users}
                onSubmit={handleCreate}
                onCancel={() => setShowForm(false)}
                loading={loading}
              />
            )}
            {!showForm && selectedBug && (
              <BugDetail
                bug={selectedBug}
                users={users}
                onStatusChange={handleStatusChange}
                onAssign={handleAssign}
                loading={loading}
              />
            )}
            {!showForm && !selectedBug && (
              <div style={styles.placeholder}>
                <span style={styles.placeholderIcon}>👈</span>
                <p>Select a bug to view details, or report a new one.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

const styles = {
  app: { display: "flex", height: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif", background: "#f4f5f7" },
  sidebar: { width: 240, background: "#1a1a2e", color: "#fff", padding: 20, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", flexShrink: 0 },
  brand: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  brandIcon: { fontSize: 22 },
  brandName: { fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" },
  statCards: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  statCard: { background: "rgba(255,255,255,0.07)", borderRadius: 6, padding: "10px 8px", textAlign: "center" },
  statNum: { fontSize: 22, fontWeight: 700 },
  statLabel: { fontSize: 10, opacity: 0.7, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.04em" },
  filterGroup: { display: "flex", flexDirection: "column", gap: 4 },
  filterLabel: { fontSize: 10, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.06em" },
  filterSelect: { padding: "6px 8px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 13 },
  searchInput: { padding: "7px 10px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.08)", color: "#fff", fontSize: 13, outline: "none" },
  main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  toolbar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", background: "#fff", borderBottom: "1px solid #e8e8e8" },
  heading: { margin: 0, fontSize: 20, fontWeight: 700, color: "#1a1a2e" },
  count: { background: "#eef2ff", color: "#4f46e5", borderRadius: 20, padding: "2px 10px", fontSize: 14, fontWeight: 600, marginLeft: 6 },
  newBtn: { padding: "8px 18px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 14 },
  errorBanner: { background: "#fff3cd", border: "1px solid #ffc107", color: "#856404", padding: "10px 20px", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" },
  dismissBtn: { background: "none", border: "none", cursor: "pointer", color: "#856404", fontSize: 16 },
  content: { display: "flex", flex: 1, overflow: "hidden", gap: 0 },
  listPane: { width: 380, borderRight: "1px solid #e8e8e8", overflowY: "auto", padding: 16, background: "#f9fafb", flexShrink: 0 },
  detailPane: { flex: 1, overflowY: "auto", padding: 24 },
  placeholder: { textAlign: "center", color: "#bbb", marginTop: 80, fontSize: 15 },
  placeholderIcon: { fontSize: 36, display: "block", marginBottom: 12 },
};
