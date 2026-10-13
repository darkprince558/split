"use client";

import { useRef, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDrillPresets } from "@/hooks/use-drill-presets";
import { drillPresetSummary, settingsMatch, type DrillPreset } from "@/lib/drill-presets";
import { presetNameError } from "@/lib/direction-presets";
import { startBlockReason, type Settings } from "@/lib/drill";
import { cn } from "@/lib/utils";

type Undo = { kind: "apply"; settings: Settings } | { kind: "remove"; preset: DrillPreset };

export function DrillPresets({ settings, onApply }: { settings: Settings; onApply: (settings: Settings) => void }) {
  const [presets, save] = useDrillPresets();
  const [editing, setEditing] = useState(false);
  const [managing, setManaging] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [undo, setUndo] = useState<Undo | null>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const block = startBlockReason(settings);
  const focusAdd = () => requestAnimationFrame(() => addRef.current?.focus());
  const persist = (next: DrillPreset[]) => {
    if (save(next)) { setError(""); return true; }
    setError("Couldn’t save on this device. Check browser storage and try again.");
    return false;
  };

  return <section className="setup-panel space-y-3" aria-labelledby="saved-drills-title">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 id="saved-drills-title" className="font-semibold">Saved drills</h2>
      <div className="flex items-center gap-1">
        {presets.length ? <Button variant="ghost" className="min-h-11 text-sm" aria-pressed={managing} onClick={() => setManaging(!managing)}>{managing ? "Done" : "Manage"}</Button> : null}
        <Button ref={addRef} variant="outline" className="press-feedback min-h-11 rounded-xl" aria-expanded={editing} onClick={() => { setEditing(!editing); setError(""); }}><Plus className="size-4" aria-hidden />Save current setup</Button>
      </div>
    </div>
    <p className="text-sm text-neutral-600">Save all your drill settings. Tap a saved drill to use it again on this device.</p>
    {presets.length ? <div className="grid gap-2 sm:grid-cols-2">
      {presets.map((preset) => {
        const selected = settingsMatch(settings, preset.settings);
        return <div key={preset.id} className="flex min-w-0 items-center gap-1">
          <Button variant="outline" aria-pressed={selected} className={cn("press-feedback h-auto min-h-16 min-w-0 flex-1 justify-start gap-3 rounded-xl px-3 py-3 text-left whitespace-normal", selected && "border-primary bg-primary/8 text-primary")} onClick={() => {
            setUndo({ kind: "apply", settings: structuredClone(settings) });
            onApply(structuredClone(preset.settings)); setMessage(`${preset.name} applied.`); setError("");
          }}>
            <span className="min-w-0 flex-1"><span className="block break-words font-medium">{preset.name}</span><span className="mt-1 block text-xs font-normal text-neutral-600">{drillPresetSummary(preset.settings)}</span></span>
            {selected ? <Check className="size-5 shrink-0 rounded-full bg-primary p-1 text-white" aria-hidden /> : null}
          </Button>
          {managing ? <Button variant="ghost" className="size-11 shrink-0" aria-label={`Remove saved drill ${preset.name}`} onClick={() => {
            if (persist(presets.filter((item) => item.id !== preset.id))) { setUndo({ kind: "remove", preset }); setMessage(`${preset.name} removed.`); focusAdd(); }
          }}><X className="size-4" aria-hidden /></Button> : null}
        </div>;
      })}
    </div> : null}
    {editing ? <form className="surface-enter space-y-3 border-t border-neutral-200 pt-3" onSubmit={(event) => {
      event.preventDefault();
      const invalid = presetNameError(name, presets) ?? block?.message;
      if (invalid) { setError(invalid); return; }
      if (persist([...presets, { id: crypto.randomUUID(), name: name.trim(), settings: structuredClone(settings) }])) {
        setMessage(`${name.trim()} saved on this device.`); setName(""); setEditing(false); setUndo(null); focusAdd();
      }
    }}>
      <Label htmlFor="drill-preset-name">Drill name</Label>
      <Input id="drill-preset-name" autoFocus maxLength={32} placeholder="e.g. Match warm-up" className="min-h-12 text-base" value={name} aria-invalid={!!error} aria-describedby={error ? "drill-preset-error" : "drill-preset-help"} onChange={(event) => { setName(event.target.value); setError(""); }} />
      <p id="drill-preset-help" className="text-sm text-neutral-600">Includes difficulty, timing, directions, session length, colours, sound and recording preferences.</p>
      {block ? <p className="text-sm text-red-700">{block.message}</p> : null}
      <div className="flex gap-2"><Button type="submit" className="min-h-11 rounded-xl" disabled={!!block}>Save drill</Button><Button type="button" variant="ghost" className="min-h-11" onClick={() => { setEditing(false); setError(""); focusAdd(); }}>Cancel</Button></div>
    </form> : null}
    {message ? <div role="status" className="flex flex-wrap items-center gap-2 text-sm text-neutral-600"><span>{message}</span>{undo ? <Button variant="ghost" className="min-h-11 text-primary" onClick={() => {
      if (undo.kind === "apply") { onApply(structuredClone(undo.settings)); setMessage("Previous setup restored."); }
      else {
        const invalid = presetNameError(undo.preset.name, presets);
        if (invalid) { setError(invalid); return; }
        if (!persist([...presets, undo.preset])) return;
        setMessage(`${undo.preset.name} restored.`);
      }
      setUndo(null); setError(""); focusAdd();
    }}>{undo.kind === "apply" ? "Undo setup change" : "Undo removal"}</Button> : null}</div> : null}
    {error ? <p id="drill-preset-error" role="alert" className="text-sm text-red-700">{error}</p> : null}
  </section>;
}
