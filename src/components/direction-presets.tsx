"use client";
import { useRef, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDirectionPresets } from "@/hooks/use-direction-presets";
import { presetNameError, type DirectionPreset } from "@/lib/direction-presets";
import { type Direction } from "@/lib/drill";
import { cn } from "@/lib/utils";

export function DirectionPresets({ directions, onApply }: { directions: Direction[]; onApply: (directions: Direction[]) => void }) {
  const [presets, save] = useDirectionPresets();
  const [editing, setEditing] = useState(false);
  const [managing, setManaging] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [removed, setRemoved] = useState<DirectionPreset | null>(null);
  const [error, setError] = useState("");
  const addRef = useRef<HTMLButtonElement>(null);
  const persist = (next: DirectionPreset[]) => {
    if (save(next)) { setError(""); return true; }
    setError("Couldn’t save on this device. Check browser storage and try again."); return false;
  };
  return <div className="space-y-3 border-t border-neutral-200 pt-3">
    {presets.length ? <div className="space-y-2">
      <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">Your direction presets</p><Button variant="ghost" className="min-h-11 text-sm" aria-pressed={managing} onClick={() => setManaging(!managing)}>{managing ? "Done" : "Manage"}</Button></div>
      <div className="grid grid-cols-2 gap-2">
        {presets.map((preset) => {
          const selected = preset.directions.length === directions.length && preset.directions.every((direction) => directions.includes(direction));
          return <div className="flex items-center gap-1" key={preset.id}>
            <Button variant="outline" className={cn("press-feedback min-h-12 h-auto min-w-0 flex-1 justify-start gap-2 rounded-xl py-2 text-left whitespace-normal", selected && "border-primary bg-primary/8 text-primary")} aria-pressed={selected} onClick={() => { onApply([...preset.directions]); setMessage(`${preset.name} applied.`); }}>
              {selected ? <Check className="size-4 shrink-0 rounded-full bg-primary p-0.5 text-white" aria-hidden /> : null}<span className="min-w-0 break-words">{preset.name}</span>
            </Button>
            {managing ? <Button variant="ghost" className="size-11 shrink-0" aria-label={`Remove ${preset.name}`} onClick={() => {
              if (persist(presets.filter((item) => item.id !== preset.id))) { setRemoved(preset); setMessage(`${preset.name} removed.`); requestAnimationFrame(() => addRef.current?.focus()); }
            }}><X className="size-4" aria-hidden /></Button> : null}
          </div>;
        })}
      </div>
    </div> : null}
    {editing ? <form className="surface-enter space-y-2" onSubmit={(event) => {
      event.preventDefault();
      const invalid = presetNameError(name, presets);
      if (invalid || directions.length === 0) { setError(invalid ?? "Choose at least one direction."); return; }
      if (persist([...presets, { id: crypto.randomUUID(), name: name.trim(), directions: [...directions] }])) {
        setMessage(`${name.trim()} saved on this device.`); setName(""); setEditing(false); setRemoved(null); requestAnimationFrame(() => addRef.current?.focus());
      }
    }}>
      <Label htmlFor="direction-preset-name">Preset name</Label>
      <Input id="direction-preset-name" autoFocus maxLength={32} placeholder="e.g. Back court" className="min-h-12 text-base" value={name} aria-invalid={!!error} aria-describedby={error ? "direction-preset-error" : undefined} onChange={(event) => { setName(event.target.value); setError(""); }} />
      <p className="text-xs text-neutral-600">Saves your {directions.length} selected directions on this device.</p>
      <div className="flex gap-2"><Button type="submit" className="min-h-11 rounded-xl" disabled={directions.length === 0}>Save preset</Button><Button type="button" variant="ghost" className="min-h-11" onClick={() => { setEditing(false); setError(""); requestAnimationFrame(() => addRef.current?.focus()); }}>Cancel</Button></div>
    </form> : null}
    <Button ref={addRef} type="button" variant="outline" className="press-feedback min-h-11 rounded-xl" disabled={directions.length === 0 || editing} onClick={() => { setEditing(true); setError(""); setMessage(""); }}><Plus className="size-4" aria-hidden /> Save these directions</Button>
    {message ? <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-600" role="status"><span>{message}</span>{removed ? <Button variant="ghost" className="min-h-11 text-primary" onClick={() => {
      const invalid = presetNameError(removed.name, presets);
      if (invalid) { setError(invalid); return; }
      if (persist([...presets, removed])) { setMessage(`${removed.name} restored.`); setRemoved(null); requestAnimationFrame(() => addRef.current?.focus()); }
    }}>Undo removal</Button> : null}</div> : null}
    {error ? <p id="direction-preset-error" className="text-sm text-red-700" role="alert">{error}</p> : null}
  </div>;
}
