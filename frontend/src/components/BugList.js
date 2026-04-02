import React from "react";

const STATUS_COLORS = {
  open: { bg: "#fff3cd", text: "#856404", border: "#ffc107" },
  in_progress: { bg: "#cce5ff", text: "#004085", border: "#007bff" },
  resolved: { bg: "#d4edda", text: "#155724", border: "#28a745" },
  closed: { bg: "#e2e3e5", text: "#383d41", border: "#6c757d" },
};

const PRIORITY_COLORS = {
  low: "#28a745",
  medium: "#fd7e14",
  high: "#dc3545",
  critical: "#6f1214",
};

export default function BugList({ bugs, onSelect, onDelete, selectedId }) {
  if (bugs.length === 0) {
    return (
      <div style={styles.empty}>
        <span style={styles.emptyIcon}>🐛</span>
        <p style={styles.emptyText}>No bugs found. The code is clean — for now.</p>
      </div>
    );
  }

  return (
    <div style={styles.list}>
      {bugs.map((bug) => {
        const sc = STATUS_COLORS[bug.status] || STATUS_COLORS.open;
        const isSelected = bug.id === selectedId;
        return (
          <div
            key={bug.id}
            style={{
              ...styles.card,
              ...(isSelected ? styles.cardSelected : {}),
              borderLeft: `4px solid ${sc.border}`,
            }}
            onClick={() => onSelect(bug)}
          >
            <div style={styles.cardHeader}>
              <span style={styles.bugId}>#{bug.id}</span>
              <span style={{ ...styles.statusBadge, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                {bug.status.replace("_", " ")}
              </span>
            </div>
            <div style={styles.cardTitle}>{bug.title}</div>
            <div style={styles.cardMeta}>
              <span style={{ ...styles.priorityDot, background: PRIORITY_COLORS[bug.priority] }} />
              <span style={styles.metaText}>{bug.priority}</span>
              {bug.assignee && (
                <span style={styles.assignee}>→ {bug.assignee.username}</span>
              )}
              <span style={styles.metaDate}>
                {new Date(bug.created_at).toLocaleDateString()}
              </span>
              <button
                style={styles.deleteBtn}
                onClick={(e) => { e.stopPropagation(); onDelete(bug.id); }}
                title="Delete bug"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  list: { display: "flex", flexDirection: "column", gap: 8 },
  card: {
    background: "#fff",
    border: "1px solid #e0e0e0",
    borderRadius: 6,
    padding: "12px 14px",
    cursor: "pointer",
    transition: "box-shadow 0.15s, transform 0.1s",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  cardSelected: {
    boxShadow: "0 0 0 2px #4f46e5",
  },
  cardHeader: { display: "flex", alignItems: "center", gap: 8, marginBottom: 4 },
  bugId: { fontSize: 11, color: "#999", fontFamily: "monospace" },
  statusBadge: {
    fontSize: 11,
    fontWeight: 600,
    padding: "2px 8px",
    borderRadius: 20,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  cardTitle: { fontSize: 14, fontWeight: 600, color: "#1a1a2e", marginBottom: 6 },
  cardMeta: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" },
  priorityDot: { width: 8, height: 8, borderRadius: "50%", display: "inline-block" },
  metaText: { fontSize: 12, color: "#666", textTransform: "capitalize" },
  assignee: { fontSize: 12, color: "#4f46e5", fontStyle: "italic" },
  metaDate: { fontSize: 11, color: "#aaa", marginLeft: "auto" },
  deleteBtn: {
    background: "none",
    border: "none",
    color: "#ccc",
    cursor: "pointer",
    fontSize: 12,
    padding: "0 4px",
    transition: "color 0.15s",
  },
  empty: { textAlign: "center", padding: "48px 20px", color: "#aaa" },
  emptyIcon: { fontSize: 40, display: "block", marginBottom: 12 },
  emptyText: { fontSize: 14 },
};
