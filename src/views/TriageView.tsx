import { useCallback, useEffect, useRef, useState } from "react";
import { api, Health, Meta, Severity, TriageResponse } from "../lib/api";
import { useAsync } from "../lib/hooks";
import BriefingCard from "../components/BriefingCard";
import MemoryCard from "../components/MemoryCard";
import ResolvePanel from "../components/ResolvePanel";
import SeedBanner from "../components/SeedBanner";

const DEFAULT_LOGS = "2026-09-29T02:14:03Z checkout-api 504 Gateway Timeout on checkout-api (upstream request timeout)\n2026-09-29T02:14:10Z checkout-api p99 latency above 5s for checkout-api, error budget burning at 14x";

export default function TriageView({ meta, health }: { meta: Meta | null; health: Health | null }) {
  const [service, setService] = useState("checkout-api");
  const [severity, setSeverity] = useState<Severity>("SEV2");
  const [title, setTitle] = useState("checkout-api degraded, customers reporting failures");
  const [logs, setLogs] = useState(DEFAULT_LOGS);
  const [compare, setCompare] = useState(true);
  const [result, setResult] = useState<TriageResponse | null>(null);
  const [memTotal, setMemTotal] = useState<number | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const call = useAsync(api.triage);
  const refreshCount = useCallback(async () => {
    try { setMemTotal((await api.memory()).total); } catch { setMemTotal(null); }
  }, []);
  useEffect(() => { void refreshCount(); }, [refreshCount, health?.memory_backend]);

  const run = async () => {
    const res = await call.run({ title, service, severity, logs, compare });
    if (res) {
      setResult(res);
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  };

  const showSource = (id: string) => {
    setFlash(id);
    document.getElementById(`mem-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => setFlash(null), 1800);
  };

  const loadSample = (i: number) => {
    const s = meta?.samples[i];
    if (!s) return;
    setService(s.service); setSeverity(s.severity); setTitle(s.title); setLogs(s.logs); setResult(null);
  };

  const mem = result?.with_memory;
  const isEmpty = memTotal === 0 && !result;

  return (
    <div className="triage">
      <aside className="card card-pad intake" aria-label="Incident intake">
        <h2>New incident</h2>
        <p className="muted small sub">Paste what the pager gave you. Recur checks it against everything it has seen before.</p>

        {meta && (
          <div className="samples" aria-label="Sample incidents">
            {meta.samples.map((s, i) => (
              <button key={i} className="chip" onClick={() => loadSample(i)}>{s.service}</button>
            ))}
          </div>
        )}

        <div className="field">
          <label className="label" htmlFor="svc">Service</label>
          <select id="svc" className="select" value={service} onChange={(e) => setService(e.target.value)}>
            {(meta?.services ?? [service]).map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="field">
          <span className="label" id="sev-l">Severity</span>
          <div className="seg" role="group" aria-labelledby="sev-l">
            {(["SEV1", "SEV2", "SEV3"] as Severity[]).map((s) => (
              <button key={s} aria-pressed={severity === s} className={s === "SEV1" ? "sev1" : ""} onClick={() => setSeverity(s)}>{s}</button>
            ))}
          </div>
        </div>
        <div className="field">
          <label className="label" htmlFor="ttl">Title</label>
          <input id="ttl" className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        </div>
        <div className="field">
          <label className="label" htmlFor="logs">Logs and alerts</label>
          <textarea id="logs" className="textarea" value={logs} onChange={(e) => setLogs(e.target.value)} spellCheck={false} />
        </div>
        <label className="check field">
          <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} />
          Also show the briefing without memory
        </label>
        {call.error && <div className="notice err" style={{ marginBottom: 12 }}>{call.error}</div>}
        <button className="btn primary block" onClick={run} disabled={call.loading || title.trim().length < 3}>
          {call.loading ? <><span className="spin" />Recalling similar incidents</> : "Get briefing"}
        </button>
      </aside>

      <section aria-live="polite">
        {call.loading && !result && (
          <div className="card card-pad skeleton" aria-label="Loading briefing">
            <div style={{ width: "40%", height: 26 }} /><div /><div style={{ width: "85%" }} /><div style={{ width: "70%" }} />
          </div>
        )}

        {isEmpty && !call.loading && (
          <div className="card empty">
            <h2>Recur has no history yet</h2>
            <p>Load a year of past incidents so the first briefing already knows how your systems fail. Or resolve a few incidents yourself and watch the next briefing change.</p>
            <div className="loop">
              <div><b>Recall</b><span>Similar incidents come back from memory</span></div>
              <div><b>Brief</b><span>Causes and fixes that worked before</span></div>
              <div><b>Learn</b><span>Your outcome is saved for next time</span></div>
            </div>
            <div style={{ maxWidth: 300, margin: "28px auto 0" }}>
              <SeedBanner onDone={refreshCount} />
            </div>
          </div>
        )}

        {result && mem && (
          <div ref={resultRef} style={{ scrollMarginTop: 84 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
              <h2 className="section-title">{result.incident_id}</h2>
              <span className="badge">{service} · {severity}</span>
            </div>
            {mem.memories.length === 0 && (
              <div className="notice info" style={{ marginBottom: 14 }}>
                Nothing relevant in memory yet, so this briefing is generic. Resolve it below and the next one will be sharper.
              </div>
            )}
            <div className="compare" style={result.without_memory ? undefined : { gridTemplateColumns: "1fr" }}>
              {result.without_memory && <BriefingCard briefing={result.without_memory} variant="base" />}
              <BriefingCard briefing={mem} variant="mem" onSource={showSource} />
            </div>

            {mem.memories.length > 0 && (
              <section className="recalled" aria-labelledby="rec-h">
                <div className="recalled-head">
                  <h2 className="section-title" id="rec-h" style={{ fontSize: 17 }}>Recalled from memory</h2>
                  <span className="small muted">{mem.memories.length} memories, most relevant first</span>
                </div>
                <div className="mem-list">
                  {mem.memories.map((m) => <MemoryCard key={m.id} hit={m} flash={flash === m.id} />)}
                </div>
              </section>
            )}

            {meta && (
              <ResolvePanel key={result.incident_id} incidentId={result.incident_id} recommended={mem} categories={meta.categories}
                            onLearned={refreshCount} onRerun={run} />
            )}
          </div>
        )}

        {!result && !isEmpty && !call.loading && (
          <div className="card empty">
            <h2>Describe the incident, get a briefing</h2>
            <p>Pick a sample on the left or paste your own alert. With memory on, the briefing cites the incidents it learned from.</p>
          </div>
        )}
      </section>
    </div>
  );
}
