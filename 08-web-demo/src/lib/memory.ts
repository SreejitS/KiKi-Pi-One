/**
 * memory.ts — TypeScript simulation of memory.sv
 *
 * Mirrors the SystemVerilog module exactly:
 *   module memory(clk, load, address[15], in[16], out[16])
 *
 * Address decoding:
 *   0x0000–0x3FFF → RAM (16,384 words)
 *   0x4000–0x5FFF → Screen buffer (8,192 words)
 *   0x6000        → Keyboard register (read-only)
 *
 * Synchronous write (tickMemory = posedge clk).
 * Combinational read (readMemory = always_comb).
 */

export const RAM_SIZE = 16384;
export const SCREEN_SIZE = 8192;
export const RAM_START = 0x0000;
export const RAM_END = 0x3fff;
export const SCREEN_START = 0x4000;
export const SCREEN_END = 0x5fff;
export const KBD_ADDR = 0x6000;

export interface MemoryState {
  ram: Uint16Array; // 16,384 words
  screen: Uint16Array; // 8,192 words
  kbd: number; // single 16-bit value
}

export interface MemoryInputs {
  address: number; // 15-bit address (0–32767)
  in: number; // 16-bit data
  load: 0 | 1;
}

export interface MemoryTickRecord {
  cycle: number;
  address: number;
  region: "RAM" | "Screen" | "Keyboard";
  load: 0 | 1;
  dataIn: number;
  dataOut: number;
  wrote: boolean;
}

/** Create a fresh zeroed memory state */
export function createMemoryState(): MemoryState {
  return {
    ram: new Uint16Array(RAM_SIZE),
    screen: new Uint16Array(SCREEN_SIZE),
    kbd: 0,
  };
}

/** Decode a 15-bit address into its region */
export function decodeRegion(
  address: number
): "RAM" | "Screen" | "Keyboard" {
  const addr = address & 0x7fff;
  if (!(addr & 0x4000)) return "RAM"; // bit 14 = 0
  if (!(addr & 0x2000)) return "Screen"; // bit 14 = 1, bit 13 = 0
  return "Keyboard"; // bit 14 = 1, bit 13 = 1
}

/**
 * Read the value at the given address (combinational, no clock).
 * Mirrors the always_comb block in memory.sv.
 */
export function readMemory(state: MemoryState, address: number): number {
  const addr = address & 0x7fff;
  const region = decodeRegion(addr);

  if (region === "RAM") return state.ram[addr & 0x3fff];
  if (region === "Screen") return state.screen[addr & 0x1fff];
  if (region === "Keyboard") return state.kbd;
  return 0;
}

/**
 * Advance memory by one clock cycle (rising edge).
 * If load=1, writes `inputs.in` to the addressed location.
 * Returns a new state (immutable update for React).
 */
export function tickMemory(
  state: MemoryState,
  inputs: MemoryInputs
): MemoryState {
  if (!inputs.load) return state;

  const addr = inputs.address & 0x7fff;
  const region = decodeRegion(addr);
  const value = inputs.in & 0xffff;

  if (region === "RAM") {
    const newRam = new Uint16Array(state.ram);
    newRam[addr & 0x3fff] = value;
    return { ...state, ram: newRam };
  }

  if (region === "Screen") {
    const newScreen = new Uint16Array(state.screen);
    newScreen[addr & 0x1fff] = value;
    return { ...state, screen: newScreen };
  }

  // Keyboard is read-only — writes are silently ignored
  return state;
}

// ── Formatting helpers ─────────────────────────────────────────────────────

/** Format a 15-bit address as a 4-digit hex string */
export function toAddrHex(address: number): string {
  return "0x" + (address & 0x7fff).toString(16).toUpperCase().padStart(4, "0");
}

/** Format a 16-bit value as a 4-digit hex string */
export function toHex16(value: number): string {
  return "0x" + (value & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

/** Format a 16-bit value as a 16-character binary string */
export function toBinary16(value: number): string {
  return (value >>> 0).toString(2).padStart(16, "0");
}

/** Format a 15-bit value as a 15-character binary string */
export function toBinary15(value: number): string {
  return (value & 0x7fff).toString(2).padStart(15, "0");
}

/** Interpret a 16-bit unsigned value as a signed integer */
export function toSigned16(value: number): number {
  return value >= 0x8000 ? value - 0x10000 : value;
}

/** Toggle a specific bit in a 15-bit value */
export function toggleBit15(value: number, bitIndex: number): number {
  return (value ^ (1 << bitIndex)) & 0x7fff;
}

/** Toggle a specific bit in a 16-bit value */
export function toggleBit16(value: number, bitIndex: number): number {
  return (value ^ (1 << bitIndex)) & 0xffff;
}
