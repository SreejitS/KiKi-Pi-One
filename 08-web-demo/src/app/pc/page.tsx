"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { PCState, PCInputs, PCTickRecord, tickPC, pcAction } from "@/lib/pc";
import { toBinary16, toHex16 } from "@/lib/register";

const MAX_HISTORY = 12;

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  reset: { label: "reset wins", color: "text-red-400" },
  load:  { label: "load (jump)", color: "text-amber-400" },
  inc:   { label: "inc (+1)", color: "text-emerald-400" },
  hold:  { label: "hold", color: "text-slate-500" },
};

export default function PCPage() {
  const [pcState, setPcState] = useState<PCState>({ out: 0 });
  const [inc, setInc] = useState<0 | 1>(1); // defaults ON per plan
  const [load, setLoad] = useState<0 | 1>(0);
  const [reset, setReset] = useState<0 | 1>(0);
  const [jumpTarget, setJumpTarget] = useState<number>(0);
  const [history, setHistory] = useState<PCTickRecord[]>([]);
  const [cycle, setCycle] = useState(0);

  const inputs: PCInputs = { in: jumpTarget, load, inc, reset };
  const currentAction = pcAction(inputs);

  const handleClockTick = useCallback(() => {
    const newState = tickPC(pcState, inputs);
    const record: PCTickRecord = {
      cycle: cycle + 1,
      inc: inputs.inc,
      load: inputs.load,
      reset: inputs.reset,
      in: inputs.in,
      out: newState.out,
      action: pcAction(inputs),
    };
    setPcState(newState);
    setHistory((prev) => [record, ...prev].slice(0, MAX_HISTORY));
    setCycle((c) => c + 1);
  }, [pcState, inputs, cycle]);

  const handleFullReset = () => {
    setPcState({ out: 0 });
    setInc(1);
    setLoad(0);
    setReset(0);
    setJumpTarget(0);
    setHistory([]);
    setCycle(0);
  };

  const handleToggleJumpBit = (bitIndex: number) => {
    setJumpTarget((v) => (v ^ (1 << bitIndex)) & 0xffff);
  };

  const outBits = toBinary16(pcState.out);
  const jumpBits = toBinary16(jumpTarget);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="text-sm text-slate-500 mb-1">
          <Link href="/" className="hover:text-slate-300">KiKi-Pi-One</Link>
          {" / "}
          <span className="text-slate-300">04 - Program Counter</span>
        </div>
        <h1 className="text-2xl font-bold text-emerald-400">Program Counter</h1>
        <p className="text-slate-400 text-sm mt-1">
          Tracks which instruction to execute next. Normally counts up by 1, but can jump to
          any address or reset to zero. Priority: reset &gt; load &gt; inc.
        </p>
        <p className="text-xs text-slate-600 mt-1 font-mono">
          always_ff @(posedge clk) if (reset) out &lt;= 0; else if (load) out &lt;= in; else if (inc) out &lt;= out + 1;
        </p>
      </div>

      {/* PC value display */}
      <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-5">
        <SectionLabel>PC Output (out) - next instruction address</SectionLabel>
        <div className="mt-3 flex items-baseline gap-4">
          <span className="text-4xl font-mono font-bold text-emerald-400">
            {toHex16(pcState.out)}
          </span>
          <span className="text-lg font-mono text-slate-400">
            {pcState.out}
          </span>
        </div>
        <div className="mt-3">
          <BitGrid bits={outBits} interactive={false} />
        </div>
        <div className="mt-2 text-xs font-mono text-slate-500">
          Cycle: {cycle}
          {history.length > 0 && (
            <span className={`ml-3 ${ACTION_LABELS[history[0].action].color}`}>
              {ACTION_LABELS[history[0].action].label} on last tick
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Control signals */}
        <div className="space-y-4">
          <SectionLabel>Control Signals</SectionLabel>

          {/* Three toggle switches */}
          <div className="space-y-3">
            <ControlToggle
              label="inc"
              value={inc}
              onToggle={() => setInc((v) => (v === 0 ? 1 : 0))}
              description={inc ? "PC + 1 each tick" : "no increment"}
              active={currentAction === "inc"}
              overridden={inc === 1 && currentAction !== "inc" && currentAction !== "hold"}
              color="emerald"
            />
            <ControlToggle
              label="load"
              value={load}
              onToggle={() => setLoad((v) => (v === 0 ? 1 : 0))}
              description={load ? `jump to ${toHex16(jumpTarget)}` : "no jump"}
              active={currentAction === "load"}
              overridden={load === 1 && currentAction !== "load"}
              color="amber"
            />
            <ControlToggle
              label="reset"
              value={reset}
              onToggle={() => setReset((v) => (v === 0 ? 1 : 0))}
              description={reset ? "PC = 0" : "no reset"}
              active={currentAction === "reset"}
              overridden={false}
              color="red"
            />
          </div>

          {/* Priority badge */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-slate-600 uppercase tracking-wider">Next action:</span>
            <span className={`text-sm font-mono font-semibold ${ACTION_LABELS[currentAction].color}`}>
              {ACTION_LABELS[currentAction].label}
            </span>
          </div>
        </div>

        {/* Jump target input */}
        <div className={`space-y-4 transition-opacity ${load ? "opacity-100" : "opacity-40"}`}>
          <SectionLabel>Jump Target (in) {!load && <span className="text-slate-700 normal-case">- enable load to use</span>}</SectionLabel>
          <BitGrid
            bits={jumpBits}
            interactive={true}
            onToggle={handleToggleJumpBit}
          />
          <ValueDisplay value={jumpTarget} label="in" />
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleClockTick}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-sm rounded-lg transition-colors font-semibold"
        >
          ↑ CLOCK TICK
        </button>
        <button
          onClick={handleFullReset}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 font-mono text-sm rounded-lg transition-colors"
        >
          Reset Demo
        </button>
      </div>

      {/* Clock history */}
      {history.length > 0 && (
        <div>
          <SectionLabel>Clock History</SectionLabel>
          <div className="mt-2 border border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="text-left px-3 py-2">cycle</th>
                  <th className="text-left px-3 py-2">inc</th>
                  <th className="text-left px-3 py-2">load</th>
                  <th className="text-left px-3 py-2">reset</th>
                  <th className="text-left px-3 py-2">in</th>
                  <th className="text-left px-3 py-2">out</th>
                  <th className="text-left px-3 py-2">action</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r, i) => (
                  <tr
                    key={r.cycle}
                    className={`border-b border-slate-800/50 ${i === 0 ? "bg-slate-800/40" : ""}`}
                  >
                    <td className="px-3 py-1.5 text-slate-500">{r.cycle}</td>
                    <td className={`px-3 py-1.5 ${r.inc ? "text-emerald-400" : "text-slate-600"}`}>{r.inc}</td>
                    <td className={`px-3 py-1.5 ${r.load ? "text-amber-400" : "text-slate-600"}`}>{r.load}</td>
                    <td className={`px-3 py-1.5 ${r.reset ? "text-red-400" : "text-slate-600"}`}>{r.reset}</td>
                    <td className="px-3 py-1.5 text-slate-300">{toHex16(r.in)}</td>
                    <td className="px-3 py-1.5 text-slate-300">{toHex16(r.out)}</td>
                    <td className={`px-3 py-1.5 ${ACTION_LABELS[r.action].color}`}>
                      {ACTION_LABELS[r.action].label}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Try this walkthrough */}
      <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-4 text-sm space-y-3">
        <p className="text-slate-400 font-semibold">Try this</p>
        <ol className="list-decimal list-inside space-y-2 text-slate-500">
          <li>
            <span className="text-slate-300">Watch it count.</span> Inc is already ON. Click CLOCK TICK
            a few times - the PC counts 0, 1, 2, 3... This is normal execution: fetch instruction 0,
            then 1, then 2.
          </li>
          <li>
            <span className="text-slate-300">Jump somewhere.</span> Toggle LOAD on and set the jump
            target to some address (try toggling bit 5 and bit 0 = 0x0021 = 33). Click CLOCK TICK -
            the PC jumps straight to 33. Toggle load off, tick again - it resumes counting from 34.
          </li>
          <li>
            <span className="text-slate-300">See priority in action.</span> Turn on both INC and LOAD.
            Notice the &quot;Next action&quot; says &quot;load (jump)&quot; - load wins over inc.
            Now also turn on RESET - it says &quot;reset wins&quot;. Reset always has the highest priority.
          </li>
          <li>
            <span className="text-slate-300">Overflow.</span> Set the jump target to 0xFFFF (toggle all 16 bits on),
            turn on LOAD, tick to jump there. Then turn off LOAD and tick once more -
            the PC wraps from 0xFFFF back to 0x0000.
          </li>
        </ol>
      </div>

      {/* Links */}
      <div className="text-sm text-slate-600 border-t border-slate-800 pt-4 flex gap-6">
        <a
          href="https://github.com/SreejitS/KiKi-Pi-One/blob/restructure/v2/04-pc/rtl/pc.sv"
          target="_blank" rel="noopener noreferrer"
          className="hover:text-slate-400"
        >
          pc.sv ↗
        </a>
        <a
          href="https://github.com/SreejitS/KiKi-Pi-One/blob/restructure/v2/04-pc/tb/tb_pc.sv"
          target="_blank" rel="noopener noreferrer"
          className="hover:text-slate-400"
        >
          tb_pc.sv ↗
        </a>
      </div>
    </div>
  );
}

// -- Sub-components -----------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{children}</p>;
}

function ValueDisplay({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex gap-4 text-sm font-mono text-slate-400">
      <span>
        <span className="text-slate-600">{label} hex: </span>
        <span className="text-slate-200">{toHex16(value)}</span>
      </span>
      <span>
        <span className="text-slate-600">dec: </span>
        <span className="text-slate-200">{value}</span>
      </span>
    </div>
  );
}

function BitGrid({
  bits,
  interactive,
  onToggle,
}: {
  bits: string;
  interactive: boolean;
  onToggle?: (bitIndex: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex gap-0.5">
        {Array.from({ length: 16 }, (_, i) => {
          const bitIndex = 15 - i;
          return (
            <div key={bitIndex} className="w-7 text-center text-[9px] text-slate-700 font-mono">
              {bitIndex}
            </div>
          );
        })}
      </div>
      <div className="flex gap-0.5">
        {Array.from({ length: 16 }, (_, i) => {
          const bitIndex = 15 - i;
          const isOne = bits[i] === "1";
          return (
            <button
              key={bitIndex}
              onClick={() => interactive && onToggle?.(bitIndex)}
              disabled={!interactive}
              className={`
                w-7 h-8 rounded text-sm font-mono font-bold transition-all
                ${isOne
                  ? "bg-emerald-700 text-emerald-100"
                  : "bg-slate-800 text-slate-500"
                }
                ${interactive ? "cursor-pointer hover:opacity-80 active:scale-95" : "cursor-default"}
              `}
            >
              {bits[i]}
            </button>
          );
        })}
      </div>
      <div className="flex text-[9px] text-slate-700 font-mono">
        <span className="w-7 text-center">MSB</span>
        <span className="flex-1" />
        <span className="w-7 text-center">LSB</span>
      </div>
    </div>
  );
}

function ControlToggle({
  label,
  value,
  onToggle,
  description,
  active,
  overridden,
  color,
}: {
  label: string;
  value: 0 | 1;
  onToggle: () => void;
  description: string;
  active: boolean;
  overridden: boolean;
  color: "emerald" | "amber" | "red";
}) {
  const bgColors = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };
  const textColors = {
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    red: "text-red-400",
  };

  return (
    <div className={`flex items-center gap-3 ${overridden ? "opacity-50" : ""}`}>
      <button
        onClick={onToggle}
        className={`
          relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none
          ${value === 1 ? bgColors[color] : "bg-slate-700"}
        `}
      >
        <span
          className={`
            absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200
            ${value === 1 ? "translate-x-6" : "translate-x-0"}
          `}
        />
      </button>
      <span className={`font-mono text-sm font-semibold w-12 ${value === 1 ? textColors[color] : "text-slate-500"}`}>
        {label}
      </span>
      <span className="text-xs text-slate-500 font-mono">{description}</span>
      {overridden && value === 1 && (
        <span className="text-[10px] text-slate-600 font-mono">(overridden)</span>
      )}
    </div>
  );
}
