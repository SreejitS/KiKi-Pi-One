/**
 * register.ts — TypeScript simulation of register.sv
 *
 * Mirrors the SystemVerilog module exactly:
 *   module register(clk, load, in[16], out[16])
 *   always_ff @(posedge clk) if (load) out <= in;
 *
 * In the browser simulation, "posedge clk" = calling tickRegister().
 */

export interface RegisterState {
  /** Currently stored 16-bit value (unsigned, 0–65535) */
  out: number;
}

export interface RegisterInputs {
  /** 16-bit input value (0–65535) */
  in: number;
  /** Load enable: 1 = latch `in` on this clock edge, 0 = hold */
  load: 0 | 1;
}

export interface TickRecord {
  cycle: number;
  load: 0 | 1;
  in: number;
  out: number;
  changed: boolean;
}

/**
 * Advance the register by one clock cycle (rising edge).
 * Returns the new state.
 */
export function tickRegister(state: RegisterState, inputs: RegisterInputs): RegisterState {
  const newOut = inputs.load ? inputs.in & 0xffff : state.out;
  return { out: newOut };
}

/** Format a 16-bit value as a 16-character binary string */
export function toBinary16(value: number): string {
  return (value >>> 0).toString(2).padStart(16, "0");
}

/** Format a 16-bit value as a 4-digit hex string */
export function toHex16(value: number): string {
  return "0x" + (value & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

/** Parse a 16-bit binary string to a number */
export function fromBinary16(bits: string): number {
  return parseInt(bits, 2) & 0xffff;
}

/** Toggle a specific bit in a 16-bit value */
export function toggleBit(value: number, bitIndex: number): number {
  return (value ^ (1 << bitIndex)) & 0xffff;
}
