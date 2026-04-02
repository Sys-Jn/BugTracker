const BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  if (res.status === 204) return null;

  const data = await res.json();

  if (!res.ok) {
    const message =
      data?.error || Object.values(data?.errors || {}).join(", ") || "Request failed";
    throw Object.assign(new Error(message), { errors: data?.errors, status: res.status });
  }

  return data;
}

export const bugs = {
  list: (params = {}) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v))
    ).toString();
    return request(`/bugs${q ? `?${q}` : ""}`);
  },
  get: (id) => request(`/bugs/${id}`),
  create: (body) => request("/bugs", { method: "POST", body: JSON.stringify(body) }),
  update: (id, body) => request(`/bugs/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (id) => request(`/bugs/${id}`, { method: "DELETE" }),
};

export const users = {
  list: () => request("/users"),
};
