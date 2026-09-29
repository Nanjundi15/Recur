import { useState } from "react";
import { api, Briefing, Meta } from "../lib/api";
import { useAsync } from "../lib/hooks";

interface Props {
  incidentId: string;
  recommended: Briefing;
  categories: Meta["categories"];
  onLearned: () => void;
  onRerun: () => void;
}

export default function ResolvePanel({ incidentId, recommended, categories, onLearned, onRerun }: Props) {
  const [category, setCategory] = useState(recommended.category);
  const [rootCause, setRootCause] = useState("");
  const [fix, setFix] = useState(recommended.steps[1]?.action ?? recommended.steps[0]?.action ?? "");
  const [minutes, setMinutes] = useState(30);
  const [done, setDone] = useState<null | boolean>(null);
  const call = useAsync((body: Parameters<typeof api.resolve>[1]) => api.resolve(incidentId, body));

  const submit = async () => {
    const res = await call.run({ category, root_cause: rootCause, fix, minutes_to_resolve: minutes, recommendation_worked: null });
    if (res) { setDone(res.recommendation_worked); onLearned(); }
  };
  const valid = rootCause.trim().length >= 3 && fix.trim().length >= 3 && minutes > 0;

  if (done !== null || call.error === "Incident already resolved") {
    return (
      <div className="card card-pad resolve">
        <div className="notice ok">
          Saved to memory. Recur will recall this the next time {recommended.category_label.toLowerCase()} looks likely
          {done === true ? " and it now knows its recommendation was right." : done === false ? " and it now knows its recommendation missed." : "."}
        </div>
        <button className="btn" style={{ marginTop: 12 }} onClick={onRerun}>Run triage again on this incident</button>
      </div>
    );
  }

  return (
    <section className="card card-pad resolve" aria-labelledby="resolve-h">
      <h2 className="section-title" id="resolve-h" style={{ fontSize: 17 }}>Close the loop</h2>
      <p className="muted small" style={{ marginBottom: 14 }}>
        Recorded outcomes are what make the next briefing better. Recur suggested <b>{recommended.category_label}</b>.
      </p>
      <div className="grid">
        <div className="field">
          <label className="label" htmlFor="rc-cat">Actual root cause category</label>
          <select id="rc-cat" className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="rc-min">Minutes to resolve</label>
          <input id="rc-min" className="input" type="number" min={1} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
        </div>
        <div className="field full">
          <label className="label" htmlFor="rc-cause">What went wrong</label>
          <textarea id="rc-cause" className="textarea" value={rootCause} onChange={(e) => setRootCause(e.target.value)} placeholder="A slow report query held connections open and starved the pool." />
        </div>
        <div className="field full">
          <label className="label" htmlFor="rc-fix">Fix that worked</label>
          <textarea id="rc-fix" className="textarea" value={fix} onChange={(e) => setFix(e.target.value)} />
        </div>
      </div>
      {call.error && <div className="notice err" style={{ marginBottom: 12 }}>{call.error}</div>}
      <button className="btn primary" onClick={submit} disabled={!valid || call.loading}>
        {call.loading ? <><span className="spin" />Saving to memory</> : "Resolve and save to memory"}
      </button>
    </section>
  );
}
