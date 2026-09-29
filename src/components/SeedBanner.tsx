import { useState } from "react";
import { api, JobState } from "../lib/api";
import { usePoll } from "../lib/hooks";

/** Loads the org's incident history into memory and reports progress. */
export default function SeedBanner({ onDone, compact }: { onDone: () => void; compact?: boolean }) {
  const [job, setJob] = useState<JobState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const running = job?.status === "running";

  const start = async () => {
    setError(null);
    try { setJob(await api.seed()); } catch (e) { setError(e instanceof Error ? e.message : "Could not start loading"); }
  };
  usePoll(async () => {
    const s = await api.seedStatus();
    setJob(s);
    if (s.status === "done") onDone();
    if (s.status === "failed") setError(s.error ?? "Loading failed");
  }, running);

  return (
    <div>
      <button className={`btn primary${compact ? "" : " block"}`} onClick={start} disabled={running}>
        {running ? <><span className="spin" />Loading {job?.done ?? 0} of {job?.total ?? 36}</> : "Load 36 past incidents"}
      </button>
      {error && <div className="notice err" style={{ marginTop: 10 }}>{error}</div>}
    </div>
  );
}
