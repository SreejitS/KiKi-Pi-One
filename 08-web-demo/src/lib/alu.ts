/**
 * alu.ts — TypeScript simulation of alu.sv
 *
 * Mirrors the SystemVerilog module exactly:
 *   module alu(x, y, zx, nx, zy, ny, f, no, out, zr, ng)
 *   always_comb: 6-stage transformation pipeline
 *
 * Purely combinational — no state, no clock.
 * Call computeALU() with inputs, get outputs immediately.
 */

export interface ALUInputs {
  /** 16-bit first operand (unsigned, 0-65535) */
  x: number;
  /** 16-bit second operand (unsigned, 0-65535) */
  y: number;
  /** Zero x: if 1, replace x with 0 */
  zx: 0 | 1;
  /** NOT x: if 1, bitwise NOT x (after zx) */
  nx: 0 | 1;
  /** Zero y: if 1, replace y with 0 */
  zy: 0 | 1;
  /** NOT y: if 1, bitwise NOT y (after zy) */
  ny: 0 | 1;
  /** Function: 1 = add (x+y), 0 = AND (x&y) */
  f: 0 | 1;
  /** NOT output: if 1, bitwise NOT the result */
  no: 0 | 1;
}

export interface ALUOutput {
  /** 16-bit result (unsigned, 0-65535) */
  out: number;
  /** Zero flag: 1 if out == 0 */
  zr: 0 | 1;
  /** Negative flag: 1 if out[15] == 1 */
  ng: 0 | 1;
}

/**
 * Compute one ALU operation. Mirrors alu.sv always_comb block exactly.
 * Returns output and flags immediately (no clock, no state).
 */
export function computeALU(inputs: ALUInputs): ALUOutput {
  // Step 1 & 2: pre-process x
  let px = inputs.zx ? 0 : inputs.x;
  px = inputs.nx ? (~px & 0xffff) : px;

  // Step 3 & 4: pre-process y
  let py = inputs.zy ? 0 : inputs.y;
  py = inputs.ny ? (~py & 0xffff) : py;

  // Step 5: compute
  const result = inputs.f ? (px + py) & 0xffff : px & py;

  // Step 6: post-process
  const out = inputs.no ? (~result & 0xffff) : result;

  return {
    out,
    zr: out === 0 ? 1 : 0,
    ng: ((out >> 15) & 1) as 0 | 1,
  };
}

/** All 28 named ALU operations from the ISA, ordered as in the spec */
export const ALU_OPS = [
  { name: "0",    zx: 1, nx: 0, zy: 1, ny: 0, f: 1, no: 0 },
  { name: "1",    zx: 1, nx: 1, zy: 1, ny: 1, f: 1, no: 1 },
  { name: "-1",   zx: 1, nx: 1, zy: 1, ny: 0, f: 1, no: 0 },
  { name: "D",    zx: 0, nx: 0, zy: 1, ny: 1, f: 0, no: 0 },
  { name: "A",    zx: 1, nx: 1, zy: 0, ny: 0, f: 0, no: 0 },
  { name: "M",    zx: 1, nx: 1, zy: 0, ny: 0, f: 0, no: 0 },
  { name: "!D",   zx: 0, nx: 0, zy: 1, ny: 1, f: 0, no: 1 },
  { name: "!A",   zx: 1, nx: 1, zy: 0, ny: 0, f: 0, no: 1 },
  { name: "!M",   zx: 1, nx: 1, zy: 0, ny: 0, f: 0, no: 1 },
  { name: "-D",   zx: 0, nx: 0, zy: 1, ny: 1, f: 1, no: 1 },
  { name: "-A",   zx: 1, nx: 1, zy: 0, ny: 0, f: 1, no: 1 },
  { name: "-M",   zx: 1, nx: 1, zy: 0, ny: 0, f: 1, no: 1 },
  { name: "D+1",  zx: 0, nx: 1, zy: 1, ny: 1, f: 1, no: 1 },
  { name: "A+1",  zx: 1, nx: 1, zy: 0, ny: 1, f: 1, no: 1 },
  { name: "M+1",  zx: 1, nx: 1, zy: 0, ny: 1, f: 1, no: 1 },
  { name: "D-1",  zx: 0, nx: 0, zy: 1, ny: 1, f: 1, no: 0 },
  { name: "A-1",  zx: 1, nx: 1, zy: 0, ny: 0, f: 1, no: 0 },
  { name: "M-1",  zx: 1, nx: 1, zy: 0, ny: 0, f: 1, no: 0 },
  { name: "D+A",  zx: 0, nx: 0, zy: 0, ny: 0, f: 1, no: 0 },
  { name: "D+M",  zx: 0, nx: 0, zy: 0, ny: 0, f: 1, no: 0 },
  { name: "D-A",  zx: 0, nx: 1, zy: 0, ny: 0, f: 1, no: 1 },
  { name: "D-M",  zx: 0, nx: 1, zy: 0, ny: 0, f: 1, no: 1 },
  { name: "A-D",  zx: 0, nx: 0, zy: 0, ny: 1, f: 1, no: 1 },
  { name: "M-D",  zx: 0, nx: 0, zy: 0, ny: 1, f: 1, no: 1 },
  { name: "D&A",  zx: 0, nx: 0, zy: 0, ny: 0, f: 0, no: 0 },
  { name: "D&M",  zx: 0, nx: 0, zy: 0, ny: 0, f: 0, no: 0 },
  { name: "D|A",  zx: 0, nx: 1, zy: 0, ny: 1, f: 0, no: 1 },
  { name: "D|M",  zx: 0, nx: 1, zy: 0, ny: 1, f: 0, no: 1 },
] as const;

export type ALUOpName = (typeof ALU_OPS)[number]["name"];

/** Find a named op's control bits, or null if not found */
export function findOp(name: string) {
  return ALU_OPS.find((op) => op.name === name) ?? null;
}

/** Match control bits to a named op, or return "custom" */
export function matchOpName(bits: { zx: number; nx: number; zy: number; ny: number; f: number; no: number }): string {
  const match = ALU_OPS.find(
    (op) =>
      op.zx === bits.zx &&
      op.nx === bits.nx &&
      op.zy === bits.zy &&
      op.ny === bits.ny &&
      op.f  === bits.f  &&
      op.no === bits.no
  );
  return match ? match.name : "custom";
}

// ── Shared formatting helpers (same as register.ts) ──────────────────────────

/** Format a 16-bit value as a 16-character binary string */
export function toBinary16(value: number): string {
  return (value >>> 0).toString(2).padStart(16, "0");
}

/** Format a 16-bit value as a 4-digit hex string */
export function toHex16(value: number): string {
  return "0x" + (value & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

/** Interpret a 16-bit unsigned value as a signed integer */
export function toSigned16(value: number): number {
  return value >= 0x8000 ? value - 0x10000 : value;
}

/** Toggle a specific bit in a 16-bit value */
export function toggleBit(value: number, bitIndex: number): number {
  return (value ^ (1 << bitIndex)) & 0xffff;
}
