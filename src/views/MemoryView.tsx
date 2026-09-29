import { useCallback, useEffect, useState } from "react";
import { api, MemoryHit } from "../lib/api";
import { useAsync } from "../lib/hooks";
import MemoryCard from "../components/MemoryCard";
import SeedBanner from "../components/SeedBanner";

const QUESTIONS = [
  "What usually breaks checkout-api, and what fixes it?",
  "Which fixes have worked for cache problems?",
  "What should I check first when auth-service pages?",
];

export default function MemoryView() {
  const [items, setItems] = useState<MemoryHit[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<"list" | "recall">("list");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);

  const search = useAsync(api.memory);
  const ask = useAsync(api.ask);

  const load = useCallback(async (query = "") => {
    const r = await search.run(query);
    if (r) { setItems(r.items); setTotal(r.total); setMode(r.mode); }
  }, [search.run]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void load(); }, [load]);

  const submitAsk = async (text: string) => {
    setQuestion(text);
    const r = await ask.run(text);
    if (r) setAnswer(r.answer);
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>What Recur remembers</h1>
          <p>Every postmortem and every verdict on a recommendation is stored in a Hindsight memory bank. Search it, or ask it a question.</p>
        </div>
        {total !== null && <span className="badge memory">{total} {mode === "recall" ? "matches" : "memories"}</span>}
      </div>

      <div className="memview">
        <section aria-label="Stored memories">
          <form className="searchbar" onSubmit={(e) => { e.preventDefault(); void load(q.trim()); }}>
            <input className="input" placeholder="Search by service, symptom or fix" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search memories" />
            <button className="btn" type="submit" disabled={search.loading}>Search</button>
            {mode === "recall" && <button className="btn" type="button" onClick={() => { setQ(""); void load(""); }}>Clear</button>}
          </form>
          {search.error && <div className="notice err" style={{ marginBottom: 12 }}>{search.error}</div>}

          {total === 0 && (
            <div className="card empty">
              <h2>Memory is empty</h2>
              <p>Load the sample history, or resolve incidents from the Triage tab.</p>
              <div style={{ maxWidth: 300, margin: "24px auto 0" }}><SeedBanner onDone={() => void load()} /></div>
            </div>
          )}
          <div className="mem-list">
            {items.map((m) => <MemoryCard key={m.id} hit={{ ...m, used: false }} />)}
          </div>
        </section>

        <aside className="card ask" aria-label="Ask memory">
          <h2 className="section-title" style={{ fontSize: 17 }}>Ask memory</h2>
          <p className="muted small">Hindsight reasons across everything stored and answers with what it has seen.</p>
          <div className="ask-suggest">
            {QUESTIONS.map((s) => <button className="chip" key={s} onClick={() => void submitAsk(s)}>{s}</button>)}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (question.trim().length >= 3) void submitAsk(question.trim()); }}>
            <label className="label" htmlFor="ask-q">Your question</label>
            <input id="ask-q" className="input" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Why does search-service keep paging at the top of the hour?" />
            <button className="btn primary block" style={{ marginTop: 12 }} disabled={ask.loading || question.trim().length < 3}>
              {ask.loading ? <><span className="spin" />Reasoning over memory</> : "Ask"}
            </button>
          </form>
          {ask.error && <div className="notice err" style={{ marginTop: 12 }}>{ask.error}</div>}
          {answer && <div className="answer quote">{answer}</div>}
        </aside>
      </div>
    </div>
  );
}
