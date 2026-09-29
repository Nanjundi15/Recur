export interface MemoryHit {
  id: string;
  text: string;
  type: string;
  rank: number;
  occurred_at: string | null;
  used: boolean;
}
export interface Step { action: string; rationale: string; source: string | null }
export interface PatternStat { category: string; label: string; count: number; share: number }
export interface Briefing {
  memory_enabled: boolean;
  engine: "llm" | "heuristic";
  category: string;
  category_label: string;
  confidence: number;
  summary: string;
  likely_root_cause: string;
  steps: Step[];
  pattern: PatternStat[];
  insight: string | null;
  memories: MemoryHit[];
  latency_ms: number;
  warnings: string[];
}
export interface TriageResponse { incident_id: string; with_memory: Briefing; without_memory: Briefing | null }
export interface Sample { title: string; service: string; severity: Severity; logs: string }
export type Severity = "SEV1" | "SEV2" | "SEV3";
export interface Meta {
  services: string[];
  categories: { slug: string; label: string }[];
  samples: Sample[];
}
export interface Health {
  status: string;
  memory_backend: "hindsight" | "local";
  memory_ok: boolean;
  llm_enabled: boolean;
  llm_model: string | null;
  bank_id: string;
}
export interface JobState { status: "idle" | "running" | "done" | "failed"; done: number; total: number; error: string | null; run_id?: string | null }
export interface SimPoint {
  n: number; id: string; service: string; truth: string;
  memory_correct: boolean; baseline_correct: boolean | null; confidence: number | null; memories_used: number;
}
export interface Stats {
  simulation: {
    run_id: string | null; points: SimPoint[];
    memory_rolling: (number | null)[]; baseline_rolling: (number | null)[];
    memory_accuracy: number | null; baseline_accuracy: number | null;
  };
  manual: { resolved: number; recommendation_accuracy: number | null; avg_minutes_to_resolve: number | null };
}
export interface ResolveBody {
  category: string; root_cause: string; fix: string; minutes_to_resolve: number; recommendation_worked: boolean | null;
}

export class ApiError extends Error {}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { headers: { "Content-Type": "application/json" }, ...init });
  } catch {
    throw new ApiError("Can't reach the Recur API. Check that the backend is running on port 8000.");
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") detail = body.detail;
      else if (Array.isArray(body.detail)) detail = body.detail.map((d: { msg: string }) => d.msg).join("; ");
    } catch { /* keep default */ }
    throw new ApiError(detail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => req<Health>("/health"),
  meta: () => req<Meta>("/meta"),
  triage: (b: { title: string; service: string; severity: Severity; logs: string; compare: boolean }) =>
    req<TriageResponse>("/triage", { method: "POST", body: JSON.stringify(b) }),
  resolve: (id: string, b: ResolveBody) =>
    req<{ status: string; recommendation_worked: boolean | null }>(`/incidents/${id}/resolve`, { method: "POST", body: JSON.stringify(b) }),
  memory: (q = "") => req<{ items: MemoryHit[]; total: number; mode: "list" | "recall" }>(`/memory?q=${encodeURIComponent(q)}`),
  ask: (question: string) => req<{ answer: string }>("/ask", { method: "POST", body: JSON.stringify({ question }) }),
  seed: () => req<JobState>("/memory/seed", { method: "POST" }),
  seedStatus: () => req<JobState>("/memory/seed"),
  simStart: (n: number) => req<JobState>("/simulation", { method: "POST", body: JSON.stringify({ n }) }),
  simStatus: () => req<JobState>("/simulation"),
  stats: () => req<Stats>("/stats"),
};
