const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface User {
  id: number;
  email: string;
  name: string;
  picture: string | null;
}

export interface Exercise {
  name: string;
  sets?: number;
  reps?: string;
  notes?: string;
  youtube_search_query?: string;
}

export interface WorkoutDay {
  day: number;
  date: string;
  title: string;
  duration_minutes: number;
  exercises: Exercise[];
  notes: string;
}

export interface WorkoutPlan {
  plan_title: string;
  summary: string;
  days: WorkoutDay[];
}

export interface Plan {
  id: number;
  goals: string;
  needs: string;
  duration_days: number;
  start_date: string;
  plan_json: WorkoutPlan | null;
  calendar_event_ids: string[] | null;
  created_at: string;
}

export interface CreatePlanPayload {
  goals: string;
  needs: string;
  duration_days: number;
  start_date: string;
  workout_time: string; // HH:MM format
  timezone: string;     // IANA timezone string
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || "Request failed");
  }
  return res.json() as Promise<T>;
}

export const api = {
  getMe: () => apiFetch<User>("/api/auth/me"),

  getCurrentPlan: () => apiFetch<Plan>("/api/plans/current"),

  getPlan: (id: number) => apiFetch<Plan>(`/api/plans/${id}`),

  /**
   * Create a plan — returns the raw Response for SSE streaming.
   * The caller handles the event stream.
   */
  createPlanStream: (payload: CreatePlanPayload): Promise<Response> =>
    fetch(`${API_URL}/api/plans`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  deletePlan: (id: number) => apiFetch<{ message: string }>(`/api/plans/${id}`, { method: "DELETE" }),

  logout: () =>
    fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    }),
};
