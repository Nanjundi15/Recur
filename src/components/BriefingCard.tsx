import { Briefing } from "../lib/api";
import { pct } from "../lib/format";

interface Props {
  briefing: Briefing;
  variant: "mem" | "base";
  onSource?: (memoryId: string) => void;
}

export default function BriefingCard({ briefing: b, variant, onSource }: Props) {
  const isMem = variant === "mem";
  const totalPattern = b.pattern.reduce((s, p) => s + p.count, 0);
  return (
    <article className={`card brief ${variant}`} aria-label={isMem ? "Briefing with memory" : "Briefing without memory"}>
      <div className="brief-head">
        <h3>{isMem ? "With memory" : "Without memory"}</h3>
        <span className="meta">{isMem ? `${b.memories.length} recalled` : "logs only"}</span>
      </div>
      <div className="brief-body">
        <h4 className="cause" style={{ margin: "0 0 14px" }}>{b.category_label}</h4>
        <div className="conf" aria-label={`Confidence ${pct(b.confidence)}`}>
          <div className="bar"><span style={{ width: pct(b.confidence) }} /></div>
          <b>{pct(b.confidence)} sure</b>
        </div>
        <p className="summary">{b.summary}</p>

        {isMem && b.pattern.length > 0 && (
          <>
            <div className="sect">What history says about this kind of incident</div>
            <div className="pattern">
              {b.pattern.map((p) => (
                <div className="pattern-row" key={p.category}>
                  <div className="track" title={`${p.count} of ${totalPattern} recalled incidents`}>
                    <span style={{ width: `${Math.round(p.share * 100)}%` }} />
                    <em>{p.label}</em>
                  </div>
                  <b>{p.count}/{totalPattern}</b>
                </div>
              ))}
            </div>
          </>
        )}

        {isMem && b.insight && (
          <>
            <div className="sect">Memory synthesis</div>
            <div className="quote">{b.insight}</div>
          </>
        )}

        <div className="sect">Likely root cause</div>
        <p>{b.likely_root_cause}</p>

        <div className="sect">Do this</div>
        <ol className="steps">
          {b.steps.map((s, i) => (
            <li key={i}>
              <div>
                <div className="act">{s.action}</div>
                {s.rationale && <div className="why">{s.rationale}</div>}
                {s.source && onSource && (
                  <button className="src" onClick={() => onSource(s.source!)} title="Show the memory behind this step">
                    From memory
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>

        {b.warnings.map((w) => (
          <div className="notice warn" style={{ marginTop: 14 }} key={w}>{w}</div>
        ))}
      </div>
      <div className="brief-foot">
        <span>{b.engine === "llm" ? "Language model" : "Rule-based engine"}</span>
        <span>{(b.latency_ms / 1000).toFixed(1)}s</span>
      </div>
    </article>
  );
}
