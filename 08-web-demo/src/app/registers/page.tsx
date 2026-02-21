"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  RegisterState,
  TickRecord,
  tickRegister,
  toBinary16,
  toHex16,
  toggleBit,
} from "@/lib/register";

const MAX_HISTORY = 8;

export default function RegistersPage() {
  const [inputBits, setInputBits] = useState<number>(0);
  const [load, setLoad] = useState<0 | 1>(0);
  const [regState, setRegState] = useState<RegisterState>({ out: 0 });
  const [history, setHistory] = useState<TickRecord[]>([]);
  const [cycle, setCycle] = useState(0);

  const handleClockTick = useCallback(() => {
    const newState = tickRegister(regState, { in: inputBits, load });
    const record: TickRecord = {
      cycle: cycle + 1,
      load,
      in: inputBits,
      out: newState.out,
      changed: newState.out !== regState.out,
    };
    setRegState(newState);
    setHistory((prev) => [record, ...prev].slice(0, MAX_HISTORY));
    setCycle((c) => c + 1);
  }, [regState, inputBits, load, cycle]);

  const handleToggleBit = (i: number) => {
    setInputBits((v) => toggleBit(v, i));
  };

  const handleReset = () => {
    setInputBits(0);
    setLoad(0);
    setRegState({ out: 0 });
    setHistory([]);
    setCycle(0);
  };

  const inBits = toBinary16(inputBits);
  const outBits = toBinary16(regState.out);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="text-sm text-slate-500 mb-1">
          <Link href="/" className="hover:text-slate-300">KiKi-Pi-One</Link>
          {" / "}
          <span className="text-slate-300">01 — Register</span>
        </div>
        <h1 className="text-2xl font-bold text-emerald-400">Register</h1>
        <p className="text-slate-400 text-sm mt-1">
          A 16-bit synchronous register. Toggle bits, set LOAD, then click CLOCK TICK to see it
          hold or latch.
        </p>
        <p className="text-xs text-slate-600 mt-1 font-mono">
          always_ff @(posedge clk) if (load) out &lt;= in;
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input panel */}
        <div className="space-y-4">
          <SectionLabel>Input (in)</SectionLabel>
          <BitGrid
            bits={inBits}
            onToggle={handleToggleBit}
            highlightMask={regState.out ^ inputBits}
            interactive
          />
          <ValueDisplay value={inputBits} label="in" />

          {/* Load toggle */}
          <div className="flex items-center gap-4 pt-2">
            <SectionLabel>Load</SectionLabel>
            <button
              onClick={() => setLoad((l) => (l === 0 ? 1 : 0))}
              className={`
                relative w-14 h-7 rounded-full transition-colors duration-200 focus:outline-none
                ${load === 1 ? "bg-emerald-500" : "bg-slate-700"}
              `}
            >
              <span
                className={`
                  absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200
                  ${load === 1 ? "translate-x-7" : "translate-x-0"}
                `}
              />
            </button>
            <span className={`font-mono text-sm ${load === 1 ? "text-emerald-400" : "text-slate-500"}`}>
              {load === 1 ? "1 — will latch" : "0 — will hold"}
            </span>
          </div>
        </div>

        {/* Output panel */}
        <div className="space-y-4">
          <SectionLabel>Output (out) — stored value</SectionLabel>
          <BitGrid
            bits={outBits}
            onToggle={() => {}}
            highlightMask={history[0]?.changed ? regState.out ^ (history[1]?.out ?? 0) : 0}
            interactive={false}
          />
          <ValueDisplay value={regState.out} label="out" />

          {/* Status */}
          <div className="text-xs font-mono text-slate-500 pt-1">
            Cycle: {cycle}
            {history[0]?.changed && (
              <span className="ml-3 text-emerald-400">↑ latched on last tick</span>
            )}
            {history.length > 0 && !history[0]?.changed && (
              <span className="ml-3 text-slate-600">— held on last tick</span>
            )}
          </div>
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
          onClick={handleReset}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 font-mono text-sm rounded-lg transition-colors"
        >
          Reset
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
                  <th className="text-left px-3 py-2">load</th>
                  <th className="text-left px-3 py-2">in</th>
                  <th className="text-left px-3 py-2">out</th>
                  <th className="text-left px-3 py-2">result</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r, i) => (
                  <tr
                    key={r.cycle}
                    className={`border-b border-slate-800/50 ${i === 0 ? "bg-slate-800/40" : ""}`}
                  >
                    <td className="px-3 py-1.5 text-slate-500">{r.cycle}</td>
                    <td className={`px-3 py-1.5 ${r.load ? "text-emerald-400" : "text-slate-500"}`}>
                      {r.load}
                    </td>
                    <td className="px-3 py-1.5 text-slate-300">{toHex16(r.in)}</td>
                    <td className="px-3 py-1.5 text-slate-300">{toHex16(r.out)}</td>
                    <td className={`px-3 py-1.5 ${r.changed ? "text-emerald-400" : "text-slate-600"}`}>
                      {r.changed ? "latched" : "held"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mini explainer */}
      <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-4 text-sm space-y-1">
        <p className="text-slate-400 font-semibold mb-2">How it works</p>
        <p className="text-slate-500">
          <span className="text-slate-300">LOAD = 0</span> — The register ignores the input entirely.
          Whatever value was stored stays stored, forever, until load goes high.
        </p>
        <p className="text-slate-500 mt-1">
          <span className="text-slate-300">LOAD = 1</span> — On the next clock tick (↑), the
          register captures the current input value and holds it until told otherwise.
        </p>
        <p className="text-slate-500 mt-2 text-xs font-mono">
          SystemVerilog: always_ff @(posedge clk) if (load) out &lt;= in;
        </p>
      </div>

      {/* Links */}
      <div className="text-sm text-slate-600 border-t border-slate-800 pt-4 flex gap-6">
        <a
          href="https://github.com/SreejitS/KiKi-Pi-One/blob/restructure/v2/01-registers/rtl/register.sv"
          target="_blank" rel="noopener noreferrer"
          className="hover:text-slate-400"
        >
          register.sv ↗
        </a>
        <a
          href="https://github.com/SreejitS/KiKi-Pi-One/blob/restructure/v2/01-registers/tb/tb_register.sv"
          target="_blank" rel="noopener noreferrer"
          className="hover:text-slate-400"
        >
          tb_register.sv ↗
        </a>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{children}</p>;
}

function ValueDisplay({ value, label }: { value: number; label: string }) {
  const signed = value >= 0x8000 ? value - 0x10000 : value;
  return (
    <div className="flex gap-4 text-sm font-mono text-slate-400">
      <span>
        <span className="text-slate-600">{label} hex: </span>
        <span className="text-slate-200">{toHex16(value)}</span>
      </span>
      <span>
        <span className="text-slate-600">dec: </span>
        <span className="text-slate-200">{signed}</span>
      </span>
    </div>
  );
}

function BitGrid({
  bits,
  onToggle,
  highlightMask,
  interactive,
}: {
  bits: string;
  onToggle: (i: number) => void;
  highlightMask: number;
  interactive: boolean;
}) {
  return (
    <div className="space-y-1">
      {/* Bit index labels */}
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
      {/* Bit buttons */}
      <div className="flex gap-0.5">
        {Array.from({ length: 16 }, (_, i) => {
          const bitIndex = 15 - i;
          const isOne = bits[i] === "1";
          const isHighlighted = !!(highlightMask & (1 << bitIndex));
          return (
            <button
              key={bitIndex}
              onClick={() => interactive && onToggle(bitIndex)}
              disabled={!interactive}
              className={`
                w-7 h-8 rounded text-sm font-mono font-bold transition-all
                ${isOne
                  ? isHighlighted
                    ? "bg-emerald-400 text-slate-900"
                    : "bg-emerald-700 text-emerald-100"
                  : isHighlighted
                    ? "bg-red-900/60 text-red-300 border border-red-700"
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
      {/* Group labels: MSB / byte boundary / LSB */}
      <div className="flex text-[9px] text-slate-700 font-mono">
        <span className="w-7 text-center">MSB</span>
        <span className="flex-1" />
        <span className="w-7 text-center">LSB</span>
      </div>
    </div>
  );
}
