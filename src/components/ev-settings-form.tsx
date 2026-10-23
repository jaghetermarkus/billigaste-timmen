"use client";

import { useState, useSyncExternalStore } from "react";

import { useEvSettings } from "@/hooks/use-ev-settings";
import {
  chargeQuarters,
  fuelDefaults,
  type EvSettings,
  type Fuel,
} from "@/lib/domain/ev";
import { evSettingsSchema } from "@/lib/domain/ev-settings";

type NumberKey = {
  [K in keyof EvSettings]: EvSettings[K] extends number ? K : never;
}[keyof EvSettings];

type FieldProps = {
  name: NumberKey;
  label: string;
  hint?: string;
  unit: string;
  value: number;
  /** Extra kontroll utöver gränserna i schemat */
  accept?: (value: number) => boolean;
  onCommit: (value: number) => void;
};

const toText = (n: number) => String(n).replace(".", ",");

/** Ett sifferfält som tar emot både 1,7 och 1.7 och bara sparar giltiga värden. */
function NumberField({
  name,
  label,
  hint,
  unit,
  value,
  accept = () => true,
  onCommit,
}: FieldProps) {
  const [text, setText] = useState(toText(value));
  const [invalid, setInvalid] = useState(false);

  function handleChange(next: string) {
    setText(next);
    const number = Number(next.replace(",", ".").trim());
    const ok =
      next.trim() !== "" &&
      evSettingsSchema.shape[name].safeParse(number).success &&
      accept(number);
    setInvalid(!ok);
    if (ok) onCommit(number);
  }

  return (
    <div className="flex min-h-14 items-center justify-between gap-3 py-1.5">
      <div className="flex flex-col">
        <label htmlFor={name}>{label}</label>
        {hint && <span className="text-muted-foreground text-xs">{hint}</span>}
      </div>
      <div className="text-muted-foreground flex items-baseline gap-1">
        <input
          id={name}
          inputMode="decimal"
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={() => !invalid && setText(toText(value))}
          aria-invalid={invalid}
          className={`text-foreground w-16 rounded-md bg-transparent px-1 text-right text-[17px] tabular-nums outline-offset-2 ${
            invalid ? "outline-destructive outline-2" : ""
          }`}
        />
        <span className="text-sm">{unit}</span>
      </div>
    </div>
  );
}

const Divider = () => <div className="border-foreground/10 border-t" />;

const sectionTitle =
  "text-muted-foreground px-1 pt-3 text-[11px] font-semibold tracking-[0.14em] uppercase";

// Sant i webbläsaren efter hydrering, falskt på servern
const subscribeNever = () => () => {};
const useHydrated = () =>
  useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );

export function EvSettingsForm() {
  const [settings, update, reset] = useEvSettings();
  const hydrated = useHydrated();
  // Nytt värde gör att formuläret byggs om från början, så att fälten visar standardvärdena efter återställning
  const [version, setVersion] = useState(0);

  if (!hydrated) return <div className="h-[760px]" aria-hidden="true" />;

  const field = (
    name: NumberKey,
    label: string,
    unit: string,
    hint?: string,
    accept?: (value: number) => boolean,
  ) => (
    <NumberField
      key={`${name}-${version}`}
      name={name}
      label={label}
      hint={hint}
      unit={unit}
      value={settings[name]}
      accept={accept}
      onCommit={(value) => update({ [name]: value })}
    />
  );

  const pickFuel = (fuel: Fuel) => {
    update({ fuel, ...fuelDefaults[fuel] });
    setVersion((v) => v + 1);
  };

  const hours = (chargeQuarters(settings) / 4).toString().replace(".", ",");

  return (
    <form className="flex flex-col gap-2" onSubmit={(e) => e.preventDefault()}>
      <h2 className={sectionTitle}>Bilen</h2>
      <div className="glass rounded-[18px] px-4">
        {field(
          "kwhPerMil",
          "Förbrukning",
          "kWh/mil",
          "Snitt enligt bilens färddator",
        )}
        <Divider />
        {field("batteryKwh", "Batteri", "kWh")}
        <Divider />
        {field(
          "fromPercent",
          "Laddar från",
          "%",
          undefined,
          (n) => n < settings.toPercent,
        )}
        <Divider />
        {field(
          "toPercent",
          "Laddar till",
          "%",
          undefined,
          (n) => n > settings.fromPercent,
        )}
        <Divider />
        {field("chargerKw", "Laddbox", "kW", `Laddningen tar ca ${hours} h`)}
        <Divider />
        <div className="flex min-h-14 items-center justify-between">
          <label htmlFor="readyBy">Klar senast</label>
          <input
            id="readyBy"
            type="time"
            step={900}
            value={settings.readyBy}
            onChange={(e) =>
              e.target.value && update({ readyBy: e.target.value.slice(0, 5) })
            }
            className="bg-transparent text-right text-[17px] tabular-nums"
          />
        </div>
      </div>

      <h2 className={sectionTitle}>Elpriset</h2>
      <div className="glass rounded-[18px] px-4">
        {field(
          "feeOrePerKwh",
          "Skatt och nätavgift",
          "öre/kWh",
          "Står på elräkningen, inkl. moms",
        )}
        <Divider />
        {field("lossPercent", "Laddförlust", "%", "Brukar vara 8–12 %")}
      </div>

      <h2 className={sectionTitle}>Jämför med</h2>
      <div className="glass rounded-[18px] px-4 pt-3">
        <div
          role="group"
          aria-label="Bränsle"
          className="bg-foreground/5 grid grid-cols-2 rounded-full border p-0.5"
        >
          {(["bensin", "diesel"] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={settings.fuel === f}
              onClick={() => pickFuel(f)}
              className={`min-h-9 rounded-full text-sm font-semibold ${
                settings.fuel === f
                  ? "bg-foreground text-background"
                  : "text-muted-foreground"
              }`}
            >
              {f === "bensin" ? "Bensinbil" : "Dieselbil"}
            </button>
          ))}
        </div>
        {field("litersPerMil", "Förbrukning", "l/mil")}
        <Divider />
        {field(
          "fuelSekPerLiter",
          "Literpris",
          "kr/l",
          "Vad det kostar på din mack",
        )}
      </div>

      <p className="text-muted-foreground px-1 pt-1 text-xs">
        Allt sparas bara i den här webbläsaren och gäller direkt.
      </p>
      <button
        type="button"
        onClick={() => {
          reset();
          setVersion((v) => v + 1);
        }}
        className="text-muted-foreground self-start px-1 py-2 text-sm underline underline-offset-4"
      >
        Återställ till standardvärden
      </button>
    </form>
  );
}
