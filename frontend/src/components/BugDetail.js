import React, { useState } from "react";

const TRANSITIONS = {
  open: ["in_progress"],
  in_progress: ["resolved", "open"],
  resolved: ["closed", "in_progress"],
  closed: [],
};

const PRIORITY_COLORS = {
  low: "#28a745", medium: "#fd7e14", high: "#dc3545", critical: "#6f1214",
};

export default function BugDetail({ bug, users, onStatusChange, onAssign, loading }) {
  const [assigneeId, setAssigneeId] = useState(bug.assignee?.id || "");

  const handleAssign = () => {
    onAssign(bug.id, assigneeId ? Number(assigneeId) : null);
  };

  const allowedNext = TRANSITIONS[bug.status] || [];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.id}>#{bug.id}</span>
        <h2 style={styles.title}>{bug.title}</h2>
      </div>

      <div style={styles.meta}>
        <MetaItem label="Status">
          <span style={styles.statusPill}>{bug.status.replace("_", " ")}</span>
        </MetaItem>
        <MetaItem label="Priority">
          <span style={{ color: PRIORITY_COLORS[bug.priority], fontWeight: 700, textTransform: "capitalize" }}>
            {bug.priority}
          </span>
        </MetaItem>
        <MetaItem label="Reporter">{bug.reporter?.username}</MetaItem>
        <MetaItem label="Reported">{new Date(bug.created_at).toLocaleString()}</MetaItem>
        <MetaItem label="Updated">{new Date(bug.updated_at).toLocaleString()}</MetaItem>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionLabel}>Description</div>
        <p style={styles.description}>{bug.description}</p>
      </div>

      {/* Status Transitions */}
      {allowedNext.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Advance Status</div>
          <div style={styles.transitionBtns}>
            {allowedNext.map((s) => (
              <button
                key={s}
                style={styles.transitionBtn}
                onClick={() => onStatusChange(bug.id, s)}
                disabled={loading}
              >
                → {s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
      )}
      {allowedNext.length === 0 && (
        <div style={styles.closedNote}>This bug is closed and cannot be transitioned further.</div>
      )}

      {/* Assign */}
      <div style={styles.section}>
        <div style={styles.sectionLabel}>Assignee</div>
        <div style={styles.assignRow}>
          <select
            style={styles.select}
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
          >
            <option value="">Unassigned</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.username}</option>)}
          </select>
          <button style={styles.assignBtn} onClick={handleAssign} disabled={loading}>
            Assign
          </button>
        </div>
      </div>

      {/* History */}
      {bug.history?.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionLabel}>Change History</div>
          <div style={styles.historyList}>
            {[...bug.history].reverse().map((h) => (
              <div key={h.id} style={styles.historyItem}>
                <span style={styles.historyField}>{h.field_changed}</span>
                <span style={styles.historyArrow}>{h.old_value} → {h.new_value}</span>
                <span style={styles.historyWho}>
                  {h.changed_by ? `by ${h.changed_by}` : ""} {new Date(h.changed_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetaItem({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "#aaa", fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 13, color: "#333" }}>{children}</span>
    </div>
  );
}

const styles = {
  container: { background: "#fff", borderRadius: 8, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" },
  header: { marginBottom: 16 },
  id: { fontSize: 11, color: "#aaa", fontFamily: "monospace" },
  title: { margin: "4px 0 0", fontSize: 20, fontWeight: 700, color: "#1a1a2e", lineHeight: 1.3 },
  meta: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px,1fr))", gap: 12, padding: "12px 0", borderTop: "1px solid #f0f0f0", borderBottom: "1px solid #f0f0f0", marginBottom: 18 },
  statusPill: { background: "#eef2ff", color: "#4f46e5", padding: "2px 8px", borderRadius: 20, fontSize: 12, fontWeight: 600, textTransform: "capitalize" },
  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 },
  description: { fontSize: 14, color: "#444", lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0 },
  transitionBtns: { display: "flex", gap: 8 },
  transitionBtn: {
    padding: "6px 16px", border: "1px solid #4f46e5", borderRadius: 5,
    background: "#eef2ff", color: "#4f46e5", cursor: "pointer", fontSize: 13,
    fontWeight: 600, textTransform: "capitalize", transition: "all 0.15s",
  },
  closedNote: { fontSize: 13, color: "#aaa", fontStyle: "italic", marginBottom: 16 },
  assignRow: { display: "flex", gap: 8 },
  select: {
    flex: 1, padding: "7px 10px", border: "1px solid #ddd",
    borderRadius: 5, fontSize: 13, background: "#fafafa",
  },
  assignBtn: {
    padding: "7px 16px", border: "none", borderRadius: 5,
    background: "#4f46e5", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600,
  },
  historyList: { display: "flex", flexDirection: "column", gap: 6 },
  historyItem: { display: "flex", gap: 8, alignItems: "center", fontSize: 12, padding: "6px 10px", background: "#f8f9fa", borderRadius: 5 },
  historyField: { fontWeight: 700, color: "#4f46e5", textTransform: "capitalize", minWidth: 70 },
  historyArrow: { color: "#555", flex: 1 },
  historyWho: { color: "#aaa", whiteSpace: "nowrap" },
};
