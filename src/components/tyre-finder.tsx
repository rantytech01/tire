import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { VEHICLES } from "@/lib/catalog";

const WIDTHS = [155, 165, 175, 185, 195, 205, 215, 225, 235, 245, 255, 265, 275, 285];
const ASPECTS = [40, 45, 50, 55, 60, 65, 70, 75, 80];
const RIMS = [13, 14, 15, 16, 17, 18, 19, 20, 22];

const selectClass =
  "w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none";

export function TyreFinder({ dark = false }: { dark?: boolean }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"size" | "vehicle">("size");
  const [width, setWidth] = useState("");
  const [aspect, setAspect] = useState("");
  const [rim, setRim] = useState("");
  const [make, setMake] = useState("");

  const submit = () => {
    if (tab === "size") {
      navigate({
        to: "/shop",
        search: {
          ...(width ? { width: Number(width) } : {}),
          ...(aspect ? { aspect: Number(aspect) } : {}),
          ...(rim ? { rim: Number(rim) } : {}),
        },
      });
    } else {
      navigate({ to: "/shop", search: make ? { q: make } : {} });
    }
  };

  return (
    <div className={dark ? "glass-panel rounded-xl p-5" : "rounded-xl border border-border bg-card p-5 shadow-card"}>
      <div className="flex gap-2">
        {(["size", "vehicle"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
              tab === t
                ? "bg-primary text-primary-foreground"
                : dark
                  ? "text-white/70 hover:text-white"
                  : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "size" ? "By tyre size" : "By vehicle"}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {tab === "size" ? (
          <>
            <select aria-label="Width" className={selectClass} value={width} onChange={(e) => setWidth(e.target.value)}>
              <option value="">Width</option>
              {WIDTHS.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
            <select aria-label="Aspect ratio" className={selectClass} value={aspect} onChange={(e) => setAspect(e.target.value)}>
              <option value="">Aspect</option>
              {ASPECTS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <select aria-label="Rim size" className={selectClass} value={rim} onChange={(e) => setRim(e.target.value)}>
              <option value="">Rim</option>
              {RIMS.map((r) => <option key={r} value={r}>R{r}</option>)}
            </select>
          </>
        ) : (
          <>
            <select aria-label="Vehicle make" className={`${selectClass} sm:col-span-2`} value={make} onChange={(e) => setMake(e.target.value)}>
              <option value="">Vehicle make</option>
              {Object.keys(VEHICLES).map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select aria-label="Vehicle model" className={selectClass} defaultValue="">
              <option value="">Model</option>
              {(VEHICLES[make] ?? []).map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </>
        )}
        <button
          type="button"
          onClick={submit}
          className="rounded-md bg-primary py-2.5 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:scale-[1.02]"
        >
          Find tyres
        </button>
      </div>
      <p className={`mt-3 text-xs ${dark ? "text-white/60" : "text-muted-foreground"}`}>
        Example sizes: 205/55R16 · 225/45R17 · 265/65R17
      </p>
    </div>
  );
}
