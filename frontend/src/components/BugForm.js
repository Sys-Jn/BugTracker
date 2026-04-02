import React, { useState } from "react";

const PRIORITIES = ["low", "medium", "high", "critical"];

export default function BugForm({ users, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    reporter_id: "",
    assignee_id: "",
  });
  const [errors, setErrors] = useState({});

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = "Title is required.";
    if (!form.description.trim()) errs.description = "Description is required.";
    if (!form.reporter_id) errs.reporter_id = "Select a reporter.";
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit({
      title: form.title.trim(),
      description: form.description.trim(),
      priority: form.priority,
      reporter_id: Number(form.reporter_id),
      assignee_id: form.assignee_id ? Number(form.assignee_id) : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form} noValidate>
      <h3 style={styles.title}>Report a Bug</h3>

      <Field label="Title" error={errors.title}>
        <input style={styles.input} value={form.title} onChange={set("title")} placeholder="Brief description of the bug" />
      </Field>

      <Field label="Description" error={errors.description}>
        <textarea style={{ ...styles.input, ...styles.textarea }} value={form.description} onChange={set("description")} placeholder="Steps to reproduce, expected vs actual behaviour..." />
      </Field>

      <div style={styles.row}>
        <Field label="Priority" style={{ flex: 1 }}>
          <select style={styles.input} value={form.priority} onChange={set("priority")}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
        </Field>

        <Field label="Reporter" error={errors.reporter_id} style={{ flex: 1 }}>
          <select style={styles.input} value={form.reporter_id} onChange={set("reporter_id")}>
            <option value="">Select reporter…</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.username}</option>)}
          </select>
        </Field>

        <Field label="Assignee (optional)" style={{ flex: 1 }}>
          <select style={styles.input} value={form.assignee_id} onChange={set("assignee_id")}>
            <option value="">Unassigned</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.username}</option>)}
          </select>
        </Field>
      </div>

      <div style={styles.actions}>
        <button type="button" style={styles.cancelBtn} onClick={onCancel}>Cancel</button>
        <button type="submit" style={styles.submitBtn} disabled={loading}>
          {loading ? "Submitting…" : "Submit Bug"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, error, children, style }) {
  return (
    <div style={{ marginBottom: 14, ...style }}>
      <label style={fieldStyles.label}>{label}</label>
      {children}
      {error && <span style={fieldStyles.error}>{error}</span>}
    </div>
  );
}

const fieldStyles = {
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" },
  error: { fontSize: 12, color: "#dc3545", marginTop: 3, display: "block" },
};

const styles = {
  form: { background: "#fff", borderRadius: 8, padding: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" },
  title: { margin: "0 0 18px", fontSize: 18, fontWeight: 700, color: "#1a1a2e" },
  input: {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid #ddd",
    borderRadius: 5,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
    color: "#333",
    background: "#fafafa",
    transition: "border-color 0.15s",
  },
  textarea: { resize: "vertical", minHeight: 90 },
  row: { display: "flex", gap: 12 },
  actions: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 },
  cancelBtn: {
    padding: "8px 18px", borderRadius: 5, border: "1px solid #ddd",
    background: "#fff", cursor: "pointer", fontSize: 14, color: "#555",
  },
  submitBtn: {
    padding: "8px 20px", borderRadius: 5, border: "none",
    background: "#4f46e5", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600,
  },
};
