"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import {
  MemoryState,
  MemoryTickRecord,
  createMemoryState,
  readMemory,
  tickMemory,
  decodeRegion,
  toAddrHex,
  toHex16,
  toBinary15,
  toBinary16,
  toSigned16,
  toggleBit15,
  toggleBit16,
} from "@/lib/memory";

const MAX_HISTORY = 8;
const SCREEN_COLS = 32;
const SCREEN_ROWS = 32;
const SCREEN_WORDS = (SCREEN_COLS * SCREEN_ROWS) / 16; // 64 words

export default function MemoryPage() {
  const [memState, setMemState] = useState<MemoryState>(createMemoryState);
  const [address, setAddress] = useState(0);
  const [dataIn, setDataIn] = useState(0);
  const [load, setLoad] = useState<0 | 1>(0);
  const [history, setHistory] = useState<MemoryTickRecord[]>([]);
  const [cycle, setCycle] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const PIXEL_SCALE = 5;

  const region = decodeRegion(address);
  const currentOut = readMemory(memState, address);

  // Click a pixel on the screen preview to toggle it
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = Math.floor((e.clientX - rect.left) / PIXEL_SCALE);
    const py = Math.floor((e.clientY - rect.top) / PIXEL_SCALE);
    if (px < 0 || px >= SCREEN_COLS || py < 0 || py >= SCREEN_ROWS) return;

    const pixelIndex = py * SCREEN_COLS + px;
    const wordIndex = Math.floor(pixelIndex / 16);
    const bitIndex = pixelIndex % 16;

    const newScreen = new Uint16Array(memState.screen);
    newScreen[wordIndex] ^= (1 << bitIndex);
    const newState = { ...memState, screen: newScreen };
    setMemState(newState);

    // Jump address to this screen word so the user sees the connection
    setAddress(0x4000 + wordIndex);
    setDataIn(newScreen[wordIndex]);
  }, [memState]);

  const handleClockTick = useCallback(() => {
    const newCycle = cycle + 1;
    const newState = tickMemory(memState, { address, in: dataIn, load });
    const wrote = load === 1 && region !== "Keyboard";

    const record: MemoryTickRecord = {
      cycle: newCycle,
      address,
      region,
      load,
      dataIn,
      dataOut: readMemory(newState, address),
      wrote,
    };

    setMemState(newState);
    setHistory((prev) => [record, ...prev].slice(0, MAX_HISTORY));
    setCycle(newCycle);
  }, [memState, address, dataIn, load, cycle, region]);

  const handleReset = () => {
    setMemState(createMemoryState());
    setAddress(0);
    setDataIn(0);
    setLoad(0);
    setHistory([]);
    setCycle(0);
  };

  // Keyboard capture
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.length === 1) {
        setMemState((prev) => ({ ...prev, kbd: e.key.charCodeAt(0) }));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Render screen preview
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = PIXEL_SCALE;
    canvas.width = SCREEN_COLS * scale;
    canvas.height = SCREEN_ROWS * scale;

    ctx.fillStyle = "#0f1117";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let word = 0; word < SCREEN_WORDS; word++) {
      const value = memState.screen[word];
      for (let bit = 0; bit < 16; bit++) {
        const pixelIndex = word * 16 + bit;
        const px = pixelIndex % SCREEN_COLS;
        const py = Math.floor(pixelIndex / SCREEN_COLS);
        const isOn = (value >> bit) & 1;
        ctx.fillStyle = isOn ? "#34d399" : "#1e293b";
        ctx.fillRect(px * scale, py * scale, scale - 1, scale - 1);
      }
    }
  }, [memState.screen]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="text-sm text-slate-500 mb-1">
          <Link href="/" className="hover:text-slate-300">KiKi-Pi-One</Link>
          {" / "}
          <span className="text-slate-300">03 — Data Memory</span>
        </div>
        <h1 className="text-2xl font-bold text-emerald-400">Data Memory</h1>
        <p className="text-slate-400 text-sm mt-1">
          16K RAM + screen buffer + keyboard. Set an address, toggle LOAD,
          click CLOCK TICK to write.
        </p>
        <p className="text-xs text-slate-600 mt-1 font-mono">
          always_ff @(posedge clk) if (load) mem[address] &lt;= in;
        </p>
      </div>

      {/* Memory map — horizontal */}
      <MemoryMapBar address={address} onJump={setAddress} />

      {/* Address input */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <SectionLabel>Address (15-bit)</SectionLabel>
          <RegionBadge region={region} />
        </div>
        <BitGrid
          bits={toBinary15(address)}
          count={15}
          onToggle={(i) => setAddress(toggleBit15(address, i))}
          interactive
          decodeBits={[14, 13]}
        />
        <ValueRow label="addr" hex={toAddrHex(address)} dec={address} />
      </div>

      {/* Two-column: Data In + Load | Output */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input panel */}
        <div className="space-y-4">
          <SectionLabel>Data In</SectionLabel>
          <BitGrid
            bits={toBinary16(dataIn)}
            count={16}
            onToggle={(i) => setDataIn(toggleBit16(dataIn, i))}
            interactive
          />
          <ValueRow label="in" hex={toHex16(dataIn)} dec={toSigned16(dataIn)} />

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
              {load === 1
                ? region === "Keyboard" ? "1 — ignored (read-only)" : "1 — will write"
                : "0 — read only"}
            </span>
          </div>
        </div>

        {/* Output panel */}
        <div className="space-y-4">
          <SectionLabel>Output (out) — value at {toAddrHex(address)}</SectionLabel>
          <BitGrid
            bits={toBinary16(currentOut)}
            count={16}
            onToggle={() => {}}
            interactive={false}
          />
          <div className="flex gap-4 text-sm font-mono text-slate-400">
            <span>
              <span className="text-slate-600">hex: </span>
              <span className="text-slate-200 font-semibold">{toHex16(currentOut)}</span>
            </span>
            <span>
              <span className="text-slate-600">dec: </span>
              <span className="text-slate-200">{toSigned16(currentOut)}</span>
            </span>
            {region === "Keyboard" && currentOut > 0 && (
              <span>
                <span className="text-slate-600">char: </span>
                <span className="text-amber-300">&apos;{String.fromCharCode(currentOut)}&apos;</span>
              </span>
            )}
          </div>

          {/* Cycle status */}
          <div className="text-xs font-mono text-slate-500 pt-1">
            Cycle: {cycle}
            {history[0]?.wrote && (
              <span className="ml-3 text-emerald-400">↑ wrote on last tick</span>
            )}
            {history.length > 0 && !history[0]?.wrote && history[0]?.load === 0 && (
              <span className="ml-3 text-slate-600">— read on last tick</span>
            )}
            {history.length > 0 && history[0]?.load === 1 && !history[0]?.wrote && (
              <span className="ml-3 text-amber-400">— write ignored (read-only)</span>
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

      {/* Screen preview */}
      <div>
        <SectionLabel>Screen Preview</SectionLabel>
        <p className="text-xs text-slate-600 font-mono mb-3">
          Click pixels to draw. Each click toggles a bit in screen memory and jumps to its address.
        </p>
        <div className="inline-block border border-slate-800 rounded-lg p-3 bg-slate-900/60">
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="rounded cursor-crosshair"
            style={{ imageRendering: "pixelated" }}
          />
        </div>
        {region === "Screen" && (
          <p className="text-xs text-slate-500 font-mono mt-2">
            Pixel at {toAddrHex(address)} = {toHex16(currentOut)} ({toBinary16(currentOut)})
          </p>
        )}
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
                  <th className="text-left px-3 py-2">address</th>
                  <th className="text-left px-3 py-2">region</th>
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
                    <td className="px-3 py-1.5 text-slate-300">{toAddrHex(r.address)}</td>
                    <td className="px-3 py-1.5">
                      <span className={regionTextColor(r.region)}>{r.region}</span>
                    </td>
                    <td className={`px-3 py-1.5 ${r.load ? "text-emerald-400" : "text-slate-500"}`}>
                      {r.load}
                    </td>
                    <td className="px-3 py-1.5 text-slate-300">{toHex16(r.dataIn)}</td>
                    <td className="px-3 py-1.5 text-slate-300">{toHex16(r.dataOut)}</td>
                    <td className={`px-3 py-1.5 ${r.wrote ? "text-emerald-400" : "text-slate-600"}`}>
                      {r.wrote ? "wrote" : r.load && r.region === "Keyboard" ? "ignored" : "read"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Guided walkthrough */}
      <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-4 text-sm space-y-3">
        <p className="text-slate-300 font-semibold">Try this</p>

        <div className="space-y-2 text-slate-500">
          <p>
            <span className="text-emerald-400 font-mono font-bold mr-2">1.</span>
            <span className="text-slate-300">Write to RAM:</span>{" "}
            Address is already at 0x0000. Toggle some Data In bits to set a value.
            Turn <span className="text-emerald-300">LOAD on</span>, click
            <span className="text-emerald-300"> CLOCK TICK</span>.
            The output panel now shows your value stored at that address.
          </p>

          <p>
            <span className="text-blue-400 font-mono font-bold mr-2">2.</span>
            <span className="text-slate-300">Draw on the screen:</span>{" "}
            Click any pixel in the <span className="text-blue-300">Screen Preview</span> above.
            Notice the address jumps to the 0x4000 range and the Data In updates
            to show which bits changed. Each pixel is one bit in memory.
          </p>

          <p>
            <span className="text-amber-400 font-mono font-bold mr-2">3.</span>
            <span className="text-slate-300">Read the keyboard:</span>{" "}
            Click the <span className="text-amber-300">Keyboard</span> button in the memory map.
            Now press any key on your keyboard. The output shows its ASCII code.
            Try turning LOAD on and clicking CLOCK TICK - the write is silently ignored.
          </p>

          <p>
            <span className="text-slate-400 font-mono font-bold mr-2">4.</span>
            <span className="text-slate-300">See address decoding:</span>{" "}
            Toggle the two amber-colored address bits (14 and 13). Watch how the
            region badge and memory map change. These two bits are all the
            hardware needs to route data to RAM, Screen, or Keyboard.
          </p>
        </div>

        <p className="text-slate-600 text-xs font-mono pt-1">
          Same address bus, three devices. This is memory-mapped I/O.
        </p>
      </div>

      {/* Links */}
      <div className="text-sm text-slate-600 border-t border-slate-800 pt-4 flex gap-6">
        <a
          href="https://github.com/SreejitS/KiKi-Pi-One/blob/restructure/v2/03-memory/rtl/memory.sv"
          target="_blank" rel="noopener noreferrer"
          className="hover:text-slate-400"
        >
          memory.sv ↗
        </a>
        <a
          href="https://github.com/SreejitS/KiKi-Pi-One/blob/restructure/v2/03-memory/tb/tb_memory.sv"
          target="_blank" rel="noopener noreferrer"
          className="hover:text-slate-400"
        >
          tb_memory.sv ↗
        </a>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{children}</p>;
}

function ValueRow({ label, hex, dec }: { label: string; hex: string; dec: number }) {
  return (
    <div className="flex gap-4 text-sm font-mono text-slate-400">
      <span>
        <span className="text-slate-600">{label}: </span>
        <span className="text-slate-200">{hex}</span>
      </span>
      <span>
        <span className="text-slate-600">dec: </span>
        <span className="text-slate-200">{dec}</span>
      </span>
    </div>
  );
}

function RegionBadge({ region }: { region: string }) {
  const styles: Record<string, string> = {
    RAM: "bg-emerald-900/40 text-emerald-300 border-emerald-800",
    Screen: "bg-blue-900/40 text-blue-300 border-blue-800",
    Keyboard: "bg-amber-900/40 text-amber-300 border-amber-800",
  };
  return (
    <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${styles[region] ?? "bg-slate-800 text-slate-500 border-slate-700"}`}>
      {region}
    </span>
  );
}

function regionTextColor(region: string): string {
  if (region === "RAM") return "text-emerald-400";
  if (region === "Screen") return "text-blue-400";
  if (region === "Keyboard") return "text-amber-400";
  return "text-slate-500";
}

function MemoryMapBar({ address, onJump }: { address: number; onJump: (a: number) => void }) {
  const region = decodeRegion(address);

  const sections = [
    { name: "RAM",      range: "0x0000–0x3FFF", size: 16384, addr: 0x0000, color: "emerald" },
    { name: "Screen",   range: "0x4000–0x5FFF", size: 8192,  addr: 0x4000, color: "blue" },
    { name: "Keyboard", range: "0x6000",         size: 1,     addr: 0x6000, color: "amber" },
  ] as const;

  const bgColors = {
    emerald: { active: "bg-emerald-900/60 border-emerald-700", inactive: "bg-emerald-950/30 border-slate-800" },
    blue:    { active: "bg-blue-900/60 border-blue-700",       inactive: "bg-blue-950/30 border-slate-800" },
    amber:   { active: "bg-amber-900/60 border-amber-700",     inactive: "bg-amber-950/30 border-slate-800" },
  };

  const textColors = { emerald: "text-emerald-400", blue: "text-blue-400", amber: "text-amber-400" };

  return (
    <div className="flex gap-2">
      {sections.map((s) => {
        const isActive = s.name === region;
        const bg = bgColors[s.color][isActive ? "active" : "inactive"];
        return (
          <button
            key={s.name}
            onClick={() => onJump(s.addr)}
            className={`
              flex-1 px-3 py-2.5 rounded-lg border text-left transition-all cursor-pointer
              ${bg} ${isActive ? "opacity-100" : "opacity-40 hover:opacity-70"}
            `}
          >
            <div className={`text-xs font-mono font-bold ${textColors[s.color]}`}>{s.name}</div>
            <div className="text-[10px] text-slate-500 font-mono">{s.range}</div>
            {isActive && (
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                ← {toAddrHex(address)}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function BitGrid({
  bits,
  count,
  onToggle,
  interactive,
  decodeBits,
}: {
  bits: string;
  count: number;
  onToggle: (i: number) => void;
  interactive: boolean;
  decodeBits?: number[];
}) {
  const maxBit = count - 1;
  return (
    <div className="space-y-1">
      {/* Bit index labels */}
      <div className="flex gap-0.5">
        {Array.from({ length: count }, (_, i) => {
          const bitIndex = maxBit - i;
          return (
            <div key={bitIndex} className="w-7 text-center text-[9px] text-slate-700 font-mono">
              {bitIndex}
            </div>
          );
        })}
      </div>
      {/* Bit buttons */}
      <div className="flex gap-0.5">
        {Array.from({ length: count }, (_, i) => {
          const bitIndex = maxBit - i;
          const isOne = bits[i] === "1";
          const isDecode = decodeBits?.includes(bitIndex);
          return (
            <button
              key={bitIndex}
              onClick={() => interactive && onToggle(bitIndex)}
              disabled={!interactive}
              className={`
                w-7 h-8 rounded text-sm font-mono font-bold transition-all
                ${isOne
                  ? isDecode
                    ? "bg-amber-600 text-amber-100"
                    : "bg-emerald-700 text-emerald-100"
                  : isDecode
                    ? "bg-amber-950/60 text-amber-800"
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
      {/* MSB / LSB labels */}
      <div className="flex text-[9px] text-slate-700 font-mono">
        <span className="w-7 text-center">MSB</span>
        <span className="flex-1" />
        <span className="w-7 text-center">LSB</span>
      </div>
    </div>
  );
}
