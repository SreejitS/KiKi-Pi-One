"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ALUInputs,
  computeALU,
  ALU_OPS,
  matchOpName,
  toBinary16,
  toHex16,
  toSigned16,
  toggleBit,
} from "@/lib/alu";

const CTRL_BITS = ["zx", "nx", "zy", "ny", "f", "no"] as const;
type CtrlBit = (typeof CTRL_BITS)[number];

type CtrlState = Record<CtrlBit, 0 | 1>;

const DEFAULT_CTRL: CtrlState = { zx: 0, nx: 0, zy: 0, ny: 0, f: 1, no: 0 };

export default function ALUPage() {
  const [xVal, setXVal] = useState(0);
  const [yVal, setYVal] = useState(0);
  const [ctrl, setCtrl] = useState<CtrlState>(DEFAULT_CTRL);

  const inputs: ALUInputs = { x: xVal, y: yVal, ...ctrl };
  const output = computeALU(inputs);
  const opName = matchOpName(ctrl);

  const handleSelectOp = (name: string) => {
    const op = ALU_OPS.find((o) => o.name === name);
    if (op) setCtrl({ zx: op.zx as 0|1, nx: op.nx as 0|1, zy: op.zy as 0|1, ny: op.ny as 0|1, f: op.f as 0|1, no: op.no as 0|1 });
  };

  const handleToggleCtrl = (bit: CtrlBit) => {
    setCtrl((prev) => ({ ...prev, [bit]: prev[bit] === 0 ? 1 : 0 }));
  };

  const handleReset = () => {
    setXVal(0);
    setYVal(0);
    setCtrl(DEFAULT_CTRL);
  };

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
          Arithmetic Logic Unit. Set x and y, pick an operation, see the result instantly.
        </p>
      </div>

      {/* Operation selector */}
      <div className="space-y-3">
        <Label>Operation</Label>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={opName === "custom" ? "" : opName}
            onChange={(e) => handleSelectOp(e.target.value)}
            className="bg-slate-800 text-emerald-400 font-mono text-sm px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-600 cursor-pointer"
          >
            {opName === "custom" && <option value="">custom</option>}
            <optgroup label="Constants">
              {["0","1","-1"].map(n => <option key={n} value={n}>{n}</option>)}
            </optgroup>
            <optgroup label="Pass-through">
              {["D","A","M"].map(n => <option key={n} value={n}>{n}</option>)}
            </optgroup>
            <optgroup label="NOT / Negate">
              {["!D","!A","!M","-D","-A","-M"].map(n => <option key={n} value={n}>{n}</option>)}
            </optgroup>
            <optgroup label="Increment / Decrement">
              {["D+1","A+1","M+1","D-1","A-1","M-1"].map(n => <option key={n} value={n}>{n}</option>)}
            </optgroup>
            <optgroup label="Add / Subtract">
              {["D+A","D+M","D-A","D-M","A-D","M-D"].map(n => <option key={n} value={n}>{n}</option>)}
            </optgroup>
            <optgroup label="Bitwise">
              {["D&A","D&M","D|A","D|M"].map(n => <option key={n} value={n}>{n}</option>)}
            </optgroup>
          </select>

          {/* Control bits read-out */}
          <div className="flex items-center gap-1">
            {CTRL_BITS.map((bit) => (
              <button
                key={bit}
                onClick={() => handleToggleCtrl(bit)}
                title={`Toggle ${bit}`}
                className={`flex flex-col items-center w-9 py-1 rounded text-xs font-mono transition-colors border
                  ${ctrl[bit] === 1
                    ? "bg-emerald-900/60 border-emerald-700 text-emerald-300"
                    : "bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600"
                  }`}
              >
                <span className="text-[9px] text-slate-600">{bit}</span>
                <span className="font-bold text-sm">{ctrl[bit]}</span>
              </button>
            ))}
          </div>

          <button
            onClick={handleReset}
            className="ml-auto text-xs font-mono text-slate-600 hover:text-slate-400 px-2 py-1"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Main diagram: inputs → ALU → output */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 items-center">

        {/* Inputs: X stacked above Y */}
        <div className="space-y-4">
          <InputPanel
            label="x"
            sublabel="D register"
            value={xVal}
            onChange={setXVal}
          />
          <InputPanel
            label="y"
            sublabel="A / M"
            value={yVal}
            onChange={setYVal}
          />
        </div>

        {/* Center arrow + op label */}
        <div className="hidden lg:flex flex-row items-center gap-2 px-2 whitespace-nowrap">
          <span className="text-xs font-mono text-slate-500">{opName}</span>
          <span className="text-2xl text-slate-600">→</span>
        </div>

        {/* Output */}
        <div className="border border-slate-700 rounded-xl p-4 space-y-4 bg-slate-900/40">
          <Label>out</Label>

          <div className="space-y-1">
            <BitGrid
              bits={toBinary16(output.out)}
              interactive={false}
              onToggle={() => {}}
            />
            <div className="flex gap-4 text-sm font-mono text-slate-400">
              <span>
                <span className="text-slate-600">hex: </span>
                <span className="text-slate-200 font-semibold">{toHex16(output.out)}</span>
              </span>
              <span>
                <span className="text-slate-600">dec: </span>
                <span className="text-slate-200">{toSigned16(output.out)}</span>
              </span>
            </div>
          </div>

          {/* Flags */}
          <div className="border-t border-slate-800 pt-3 flex gap-3">
            <Flag label="ZR" value={output.zr} onColor="emerald" description="out = 0" />
            <Flag label="NG" value={output.ng} onColor="red"     description="out < 0" />
          </div>
        </div>
      </div>

      {/* Computation summary */}
      <div className="bg-slate-800/40 border border-slate-800 rounded-lg px-4 py-3 font-mono text-sm">
        <span className="text-slate-500">x=</span>
        <span className="text-slate-300">{toSigned16(xVal)}</span>
        <span className="text-slate-600 mx-2">|</span>
        <span className="text-slate-500">y=</span>
        <span className="text-slate-300">{toSigned16(yVal)}</span>
        <span className="text-slate-600 mx-2">|</span>
        <span className="text-slate-500">op=</span>
        <span className="text-emerald-400">{opName}</span>
        <span className="text-slate-600 mx-2">|</span>
        <span className="text-slate-500">out=</span>
        <span className="text-slate-200 font-semibold">{toSigned16(output.out)}</span>
        <span className="text-slate-600 mx-2">|</span>
        <span className={output.zr ? "text-emerald-400" : "text-slate-600"}>ZR={output.zr}</span>
        <span className="text-slate-600 mx-1" />
        <span className={output.ng ? "text-red-400" : "text-slate-600"}>NG={output.ng}</span>
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

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{children}</p>
  );
}

function InputPanel({
  label,
  sublabel,
  value,
  onChange,
}: {
  label: string;
  sublabel: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="border border-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        <span className="text-xs text-slate-700 font-mono">{sublabel}</span>
      </div>
      <BitGrid
        bits={toBinary16(value)}
        interactive
        onToggle={(i) => onChange(toggleBit(value, i))}
      />
      <div className="flex gap-4 text-sm font-mono text-slate-400">
        <span>
          <span className="text-slate-600">hex: </span>
          <span className="text-slate-200">{toHex16(value)}</span>
        </span>
        <span>
          <span className="text-slate-600">dec: </span>
          <span className="text-slate-200">{toSigned16(value)}</span>
        </span>
      </div>
    </div>
  );
}

function Flag({
  label,
  value,
  onColor,
  description,
}: {
  label: string;
  value: 0 | 1;
  onColor: "emerald" | "red";
  description: string;
}) {
  const active = value === 1;
  const colors = {
    emerald: active
      ? "bg-emerald-900/40 border-emerald-700 text-emerald-300"
      : "bg-slate-800/60 border-slate-700 text-slate-600",
    red: active
      ? "bg-red-900/40 border-red-800 text-red-400"
      : "bg-slate-800/60 border-slate-700 text-slate-600",
  };
  const dotColor = {
    emerald: active ? "bg-emerald-400" : "bg-slate-700",
    red:     active ? "bg-red-400"     : "bg-slate-700",
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-mono font-bold flex-1 ${colors[onColor]}`}>
      <span className={`w-2 h-2 rounded-full ${dotColor[onColor]}`} />
      <span>{label}</span>
      <span className="font-normal opacity-60 ml-auto">{description}</span>
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
  onToggle: (i: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex gap-0.5">
        {Array.from({ length: 16 }, (_, i) => {
          const bitIndex = 15 - i;
          return (
            <div key={bitIndex} className="w-6 text-center text-[8px] text-slate-700 font-mono">
              {bitIndex % 4 === 0 || bitIndex === 0 ? bitIndex : ""}
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
              onClick={() => interactive && onToggle(bitIndex)}
              disabled={!interactive}
              className={`
                w-6 h-7 rounded text-xs font-mono font-bold transition-all
                ${isOne
                  ? "bg-emerald-700 text-emerald-100"
                  : "bg-slate-800 text-slate-600"
                }
                ${interactive ? "cursor-pointer hover:opacity-80 active:scale-95" : "cursor-default"}
              `}
            >
              {bits[i]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
