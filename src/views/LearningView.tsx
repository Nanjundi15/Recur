import { useCallback, useEffect, useState } from "react";
import { api, JobState, SimPoint, Stats } from "../lib/api";
import { useAsync, usePoll } from "../lib/hooks";
import { pct } from "../lib/format";

const W = 760, H = 280, PAD_L = 44, PAD_R = 16, PAD_T = 14, PAD_B = 30;

function path(values: (number | null)[], n: number): string {
  const x = (i: number) => PAD_L + (n <= 1 ? 0 : (i * (W - PAD_L - PAD_R)) / (n - 1));
  const y = (v: number) => PAD_T + (1 - v) * (H - PAD_T - PAD_B);
  let d = "", pen = false;
  values.forEach((v, i) => {
    if (v == null) { pen = false; return; }
    d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
    pen = true;
  });
  return d;
}

function Chart({ mem, base, n }: { mem: (number | null)[]; base: (number | null)[]; n: number }) {
  const y = (v: number) => PAD_T + (1 - v) * (H - PAD_T - PAD_B);
  const xTicks = [1, Math.round(n / 2), n].filter((v, i, a) => v > 0 && a.indexOf(v) === i);
  const x = (i: number) => PAD_L + (n <= 1 ? 0 : (i * (W - PAD_L - PAD_R)) / (n - 1));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Rolling accuracy over eight incidents, with and without memory">
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line x1={PAD_L} x2={W - PAD_R} y1={y(t)} y2={y(t)} stroke="#cfd9dd" strokeDasharray={t === 0 ? undefined : "3 4"} />
          <text x={PAD_L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#74848e">{Math.round(t * 100)}%</text>
        </g>
      ))}
      {xTicks.map((t, i) => (
        <text key={t} x={x(t - 1)} y={H - 8} textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"} fontSize="11" fill="#74848e">incident {t}</text>
      ))}
      <path d={path(base, n)} fill="none" stroke="#74848e" strokeWidth="2.5" strokeDasharray="6 5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={path(mem, n)} fill="none" stroke="#1b3fa0" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      {mem.length > 0 && mem[mem.length - 1] != null && (
        <circle cx={x(mem.length - 1)} cy={y(mem[mem.length - 1]!)} r="5" fill="#1b3fa0" />
      )}
    </svg>
  );
}

function Matrix({ points }: { points: SimPoint[] }) {
  return (
    <div className="card matrix">
      <h2 className="section-title" style={{ fontSize: 17 }}>Every incident, scored</h2>
      <p className="muted small" style={{ marginBottom: 14 }}>Filled means the top recommendation matched the real root cause. Read left to right: the memory row fills in as history builds.</p>
      <div className="matrix-wrap">
        <div className="rowlabel"><span style={{ color: "var(--memory)" }}>With memory</span><span className="muted">Without</span></div>
        <div className="matrix-grid" role="img" aria-label="Correct and incorrect recommendations per incident">
          {points.map((p) => (
            <div className="col" key={p.id} title={`#${p.n} ${p.service}: truth ${p.truth}`}>
              <span className={`dot m ${p.memory_correct ? "yes" : "no"}`} />
              <span className={`dot ${p.baseline_correct ? "yes" : "no"}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LearningView() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [job, setJob] = useState<JobState | null>(null);
  const running = job?.status === "running";
  const load = useCallback(async () => { try { setStats(await api.stats()); } catch { /* shown via banner */ } }, []);
  const start = useAsync(api.simStart);

  useEffect(() => { void load(); api.simStatus().then(setJob).catch(() => undefined); }, [load]);
  usePoll(async () => {
    const s = await api.simStatus();
    setJob(s);
    await load();
  }, running, 1500);

  const sim = stats?.simulation;
  const pts = sim?.points ?? [];
  const half = Math.floor(pts.length / 2);
  const avg = (a: SimPoint[]) => (a.length ? a.filter((p) => p.memory_correct).length / a.length : null);
  const early = avg(pts.slice(0, half)), late = avg(pts.slice(half));

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Watch it get better</h1>
          <p>Replays a stream of incidents against an empty memory bank. After each one the true root cause is saved, exactly like a real on-call rotation. The dashed line is the same agent without memory.</p>
        </div>
        <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
          <button className="btn primary" disabled={running || start.loading} onClick={async () => { const j = await start.run(30); if (j) setJob(j); }}>
            {running ? <><span className="spin" />Replaying incident {job?.done ?? 0} of {job?.total}</> : pts.length ? "Run the replay again" : "Run the 30 incident replay"}
          </button>
          {running && <div className="progress"><span style={{ width: `${((job?.done ?? 0) / (job?.total || 1)) * 100}%` }} /></div>}
        </div>
      </div>

      {(start.error || job?.status === "failed") && <div className="notice err" style={{ marginBottom: 16 }}>{start.error ?? job?.error ?? "The replay failed."}</div>}

      {pts.length === 0 && !running && (
        <div className="card empty">
          <h2>No replay yet</h2>
          <p>Run it to see accuracy climb as memory fills. With the rule-based engine it takes seconds; with Hindsight and a language model expect a few minutes.</p>
        </div>
      )}

      {pts.length > 0 && sim && (
        <>
          <div className="stats">
            <div className="card stat hero"><div className="big">{pct(sim.memory_accuracy)}</div><div className="cap">Correct with memory</div></div>
            <div className="card stat"><div className="big">{pct(sim.baseline_accuracy)}</div><div className="cap">Correct without memory</div></div>
            <div className="card stat"><div className="big">{pct(early)} to {pct(late)}</div><div className="cap">First half to second half, with memory</div></div>
            <div className="card stat"><div className="big">{pts.length}</div><div className="cap">Incidents replayed</div></div>
          </div>
          <div className="card chart">
            <h2 className="section-title" style={{ fontSize: 17 }}>Accuracy over a rolling window of eight incidents</h2>
            <Chart mem={sim.memory_rolling} base={sim.baseline_rolling} n={pts.length} />
            <div className="legend">
              <span><i style={{ background: "var(--memory)" }} />With memory</span>
              <span><i style={{ background: "var(--ink-3)" }} />Without memory</span>
            </div>
          </div>
          <Matrix points={pts} />
        </>
      )}

      {stats && stats.manual.resolved > 0 && (
        <div className="card card-pad" style={{ marginTop: 20 }}>
          <h2 className="section-title" style={{ fontSize: 17 }}>Your live incidents</h2>
          <p className="muted small">{stats.manual.resolved} resolved. Recur's first recommendation was right {pct(stats.manual.recommendation_accuracy)} of the time. Average time to resolve: {stats.manual.avg_minutes_to_resolve} minutes.</p>
        </div>
      )}
    </div>
  );
}
