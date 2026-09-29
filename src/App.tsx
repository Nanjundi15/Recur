import { useCallback, useEffect, useState } from "react";
import { api, Health, Meta } from "./lib/api";
import TriageView from "./views/TriageView";
import LearningView from "./views/LearningView";
import MemoryView from "./views/MemoryView";

type Tab = "triage" | "learning" | "memory";
const TABS: { id: Tab; label: string }[] = [
  { id: "triage", label: "Triage" },
  { id: "learning", label: "Learning curve" },
  { id: "memory", label: "Memory" },
];

function tabFromHash(): Tab {
  const h = window.location.hash.replace("#", "");
  return (TABS.find((t) => t.id === h)?.id ?? "triage") as Tab;
}

export default function App() {
  const [tab, setTab] = useState<Tab>(tabFromHash);
  const [health, setHealth] = useState<Health | null>(null);
  const [offline, setOffline] = useState(false);
  const [meta, setMeta] = useState<Meta | null>(null);

  const refreshHealth = useCallback(async () => {
    try {
      setHealth(await api.health());
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, []);

  useEffect(() => {
    void refreshHealth();
    api.meta().then(setMeta).catch(() => undefined);
    const onHash = () => setTab(tabFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [refreshHealth]);

  const go = (t: Tab) => { window.location.hash = t; setTab(t); };

  const status = offline
    ? { cls: "bad", text: "API offline" }
    : !health
      ? { cls: "warn", text: "Connecting" }
      : health.memory_backend === "hindsight"
        ? health.memory_ok ? { cls: "", text: "Hindsight connected" } : { cls: "bad", text: "Hindsight unreachable" }
        : { cls: "warn", text: "Local memory (dev mode)" };

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="#7f9cf5" />
            <path d="M9 22a8 8 0 1 1 14 0M13 22a4 4 0 1 1 6 0" fill="none" stroke="#13212b" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
          Recur
        </div>
        <nav className="tabs" role="tablist" aria-label="Views">
          {TABS.map((t) => (
            <button key={t.id} role="tab" className="tab" aria-selected={tab === t.id} onClick={() => go(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="spacer" />
        {health && !health.llm_enabled && <span className="pill warn" title="Set GROQ_API_KEY to enable the language model"><i /><span>Rule-based engine</span></span>}
        <span className={`pill ${status.cls}`} title={health ? `Bank: ${health.bank_id}` : undefined}><i /><span>{status.text}</span></span>
      </header>
      <main className="main">
        {offline && <div className="notice err" style={{ marginBottom: 16 }}>Can't reach the Recur API. Start the backend with <code>make backend</code> and reload.</div>}
        {tab === "triage" && <TriageView meta={meta} health={health} />}
        {tab === "learning" && <LearningView />}
        {tab === "memory" && <MemoryView />}
      </main>
    </div>
  );
}
