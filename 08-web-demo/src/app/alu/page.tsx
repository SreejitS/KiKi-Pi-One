"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  ALUInputs,
  ALUOutput,
  computeALU,
  ALU_OPS,
  matchOpName,
  toBinary16,
  toHex16,
  toSigned16,
  toggleBit,
} from "@/lib/alu";

const MAX_HISTORY = 8;

interface HistoryRecord {
  id: number;
  op: string;
  x: number;
  y: number;
  out: number;
  zr: 0 | 1;
  ng: 0 | 1;
}

const CTRL_BITS = ["zx", "nx", "zy", "ny", "f", "no"] as const;
type CtrlBit = (typeof CTRL_BITS)[number];

export default function ALUPage() {
  const [xVal, setXVal] = useState(0);
  const [yVal, setYVal] = useState(0);
  const [ctrl, setCtrl] = useState<Record<CtrlBit, 0 | 1>>({
    zx: 0, nx: 0, zy: 0, ny: 0, f: 1, no: 0,
  });
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [captureId, setCaptureId] = useState(0);

  // Derive output live (combinational - no clock needed)
  const inputs: ALUInputs = { x: xVal, y: yVal, ...ctrl };
  const output: ALUOutput = computeALU(inputs);
  const opName = matchOpName(ctrl);

  const handleSelectOp = useCallback((name: string) => {
    const op = ALU_OPS.find((o) => o.name === name);
    if (op) {
      setCtrl({
        zx: op.zx as 0 | 1,
        nx: op.nx as 0 | 1,
        zy: op.zy as 0 | 1,
        ny: op.ny as 0 | 1,
        f:  op.f  as 0 | 1,
        no: op.no as 0 | 1,
      });
    }
  }, []);

  const handleToggleCtrl = useCallback((bit: CtrlBit) => {
    setCtrl((prev) => ({ ...prev, [bit]: prev[bit] === 0 ? 1 : 0 }));
  }, []);

  const handleCapture = useCallback(() => {
    const record: HistoryRecord = {
      id: captureId + 1,
      op: opName,
      x: xVal,
      y: yVal,
      out: output.out,
      zr: output.zr,
      ng: output.ng,
    };
    setHistory((prev) => [record, ...prev].slice(0, MAX_HISTORY));
    setCaptureId((n) => n + 1);
  }, [captureId, opName, xVal, yVal, output]);

  const handleReset = () => {
    setXVal(0);
    setYVal(0);
    setCtrl({ zx: 0, nx: 0, zy: 0, ny: 0, f: 1, no: 0 });
    setHistory([]);
    setCaptureId(0);
  };

  const xBits = toBinary16(xVal);
  const yBits = toBinary16(yVal);
  const outBits = toBinary16(output.out);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="text-sm text-slate-500 mb-1">
          <Link href="/" className="hover:text-slate-300">KiKi-Pi-One</Link>
          {" / "}
          <span className="text-slate-300">02 — ALU</span>
        </div>
        <h1 className="text-2xl font-bold text-emerald-400">ALU</h1>
        <p className="text-slate-400 text-sm mt-1">
          A 16-bit combinational ALU. Set x, y, and an operation — output updates instantly.
        </p>
        <p className="text-xs text-slate-600 mt-1 font-mono">
          always_comb: 6 control bits, 28 operations
        </p>
      </div>

      {/* Operation selector */}
      <div className="space-y-3">
        <SectionLabel>Operation</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {ALU_OPS.map((op) => (
            <button
              key={op.name}
              onClick={() => handleSelectOp(op.name)}
              className={`
                px-2.5 py-1 rounded text-xs font-mono transition-colors
                ${opName === op.name
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"}
              `}
            >
              {op.name}
            </button>
          ))}
          {opName === "custom" && (
            <span className="px-2.5 py-1 rounded text-xs font-mono bg-amber-900/50 text-amber-400 border border-amber-800">
              custom
            </span>
          )}
        </div>

        {/* Control bits */}
        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-xs text-slate-600 font-mono w-10">bits:</span>
          {CTRL_BITS.map((bit) => (
            <button
              key={bit}
              onClick={() => handleToggleCtrl(bit)}
              className={`
                flex flex-col items-center px-2 py-1 rounded text-xs font-mono transition-colors
                ${ctrl[bit] === 1
                  ? "bg-emerald-700 text-emerald-100"
                  : "bg-slate-800 text-slate-500 hover:bg-slate-700"}
              `}
            >
              <span className="text-[10px] text-slate-500">{bit}</span>
              <span className="font-bold">{ctrl[bit]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main grid: X, Y, Output */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* X input */}
        <div className="space-y-3">
          <SectionLabel>Input X (D register)</SectionLabel>
          <BitGrid
            bits={xBits}
            onToggle={(i) => setXVal((v) => toggleBit(v, i))}
            highlightMask={0}
            interactive
          />
          <ValueDisplay value={xVal} label="x" />
        </div>

        {/* Y input */}
        <div className="space-y-3">
          <SectionLabel>Input Y (A / M)</SectionLabel>
          <BitGrid
            bits={yBits}
            onToggle={(i) => setYVal((v) => toggleBit(v, i))}
            highlightMask={0}
            interactive
          />
          <ValueDisplay value={yVal} label="y" />
        </div>

        {/* Output */}
        <div className="space-y-3">
          <SectionLabel>Output</SectionLabel>
          <BitGrid
            bits={outBits}
            onToggle={() => {}}
            highlightMask={0}
            interactive={false}
          />
          <ValueDisplay value={output.out} label="out" />

          {/* Flags */}
          <div className="flex gap-3 pt-1">
            <FlagBadge label="ZR" value={output.zr} description="zero" />
            <FlagBadge label="NG" value={output.ng} description="negative" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleCapture}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-sm rounded-lg transition-colors font-semibold"
        >
          + Capture
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 font-mono text-sm rounded-lg transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Capture history */}
      {history.length > 0 && (
        <div>
          <SectionLabel>Captured States</SectionLabel>
          <div className="mt-2 border border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="text-left px-3 py-2">#</th>
                  <th className="text-left px-3 py-2">op</th>
                  <th className="text-left px-3 py-2">x</th>
                  <th className="text-left px-3 py-2">y</th>
                  <th className="text-left px-3 py-2">out</th>
                  <th className="text-left px-3 py-2">zr</th>
                  <th className="text-left px-3 py-2">ng</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r, i) => (
                  <tr
                    key={r.id}
                    className={`border-b border-slate-800/50 ${i === 0 ? "bg-slate-800/40" : ""}`}
                  >
                    <td className="px-3 py-1.5 text-slate-600">{r.id}</td>
                    <td className="px-3 py-1.5 text-emerald-400">{r.op}</td>
                    <td className="px-3 py-1.5 text-slate-300">{toHex16(r.x)}</td>
                    <td className="px-3 py-1.5 text-slate-300">{toHex16(r.y)}</td>
                    <td className="px-3 py-1.5 text-slate-200 font-semibold">{toHex16(r.out)}</td>
                    <td className={`px-3 py-1.5 ${r.zr ? "text-emerald-400" : "text-slate-600"}`}>{r.zr}</td>
                    <td className={`px-3 py-1.5 ${r.ng ? "text-red-400" : "text-slate-600"}`}>{r.ng}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Explainer */}
      <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-4 text-sm space-y-2">
        <p className="text-slate-400 font-semibold mb-2">How it works</p>
        <p className="text-slate-500">
          The 6 control bits apply successive transformations to x and y before computing.
          zx/zy zero an input. nx/ny negate it. f selects add or AND. no negates the output.
        </p>
        <p className="text-slate-500">
          <span className="text-slate-300">ZR</span> lights up when the result is exactly zero.
          {" "}
          <span className="text-slate-300">NG</span> lights up when bit 15 is 1 (negative in two&apos;s complement).
          These flags drive the conditional jump logic in the CPU.
        </p>
        <p className="text-xs text-slate-600 mt-2 font-mono">
          SystemVerilog: always_comb &#123; px = zx ? 0 : x; ... &#125;
        </p>
      </div>

      {/* Links */}
      <div className="text-sm text-slate-600 border-t border-slate-800 pt-4 flex gap-6">
        <a
          href="https://github.com/SreejitS/KiKi-Pi-One/blob/restructure/v2/02-alu/rtl/alu.sv"
          target="_blank" rel="noopener noreferrer"
          className="hover:text-slate-400"
        >
          alu.sv ↗
        </a>
        <a
          href="https://github.com/SreejitS/KiKi-Pi-One/blob/restructure/v2/02-alu/tb/tb_alu.sv"
          target="_blank" rel="noopener noreferrer"
          className="hover:text-slate-400"
        >
          tb_alu.sv ↗
        </a>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{children}</p>
  );
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
        <span className="text-slate-200">{toSigned16(value)}</span>
      </span>
    </div>
  );
}

function FlagBadge({
  label,
  value,
  description,
}: {
  label: string;
  value: 0 | 1;
  description: string;
}) {
  return (
    <div
      className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold border
        ${value === 1
          ? label === "ZR"
            ? "bg-emerald-900/40 border-emerald-700 text-emerald-400"
            : "bg-red-900/40 border-red-800 text-red-400"
          : "bg-slate-800/60 border-slate-700 text-slate-600"
        }
      `}
    >
      <span className={`w-2 h-2 rounded-full ${value === 1 ? (label === "ZR" ? "bg-emerald-400" : "bg-red-400") : "bg-slate-600"}`} />
      {label}
      <span className="font-normal text-[10px] opacity-70">= {value} ({description})</span>
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
      <div className="flex text-[9px] text-slate-700 font-mono">
        <span className="w-7 text-center">MSB</span>
        <span className="flex-1" />
        <span className="w-7 text-center">LSB</span>
      </div>
    </div>
  );
}
