import { useState } from "react";
import { MemoryHit } from "../lib/api";
import { shortDate } from "../lib/format";

export default function MemoryCard({ hit, flash }: { hit: MemoryHit; flash?: boolean }) {
  const [open, setOpen] = useState(false);
  const date = shortDate(hit.occurred_at);
  const long = hit.text.length > 260;
  return (
    <div id={`mem-${hit.id}`} className={`mem${hit.used ? " used" : ""}${flash ? " flash" : ""}`}>
      <div className="top">
        <span className="badge memory">{hit.type}</span>
        {hit.used && <span className="badge ok">Used in briefing</span>}
        {date && <span className="small muted">{date}</span>}
      </div>
      <p className={open ? "" : "clamp"}>{hit.text}</p>
      {long && <button className="link" onClick={() => setOpen(!open)}>{open ? "Show less" : "Show more"}</button>}
    </div>
  );
}
