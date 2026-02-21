/**
 * pc.ts — TypeScript simulation of pc.sv
 *
 * Mirrors the SystemVerilog module exactly:
 *   module pc(clk, in[16], load, inc, reset, out[16])
 *   always_ff @(posedge clk)
 *     if (reset)    out <= 0
 *     else if (load) out <= in
 *     else if (inc)  out <= out + 1
 *
 * In the browser simulation, "posedge clk" = calling tickPC().
 */

export interface PCState {
  /** Current 16-bit PC value (unsigned, 0-65535) */
  out: number;
}

export interface PCInputs {
  /** 16-bit jump target (0-65535) */
  in: number;
  /** Jump enable: 1 = load `in` */
  load: 0 | 1;
  /** Increment enable: 1 = PC + 1 */
  inc: 0 | 1;
  /** Synchronous reset: 1 = set PC to 0 (highest priority) */
  reset: 0 | 1;
}

export interface PCTickRecord {
  cycle: number;
  inc: 0 | 1;
  load: 0 | 1;
  reset: 0 | 1;
  in: number;
  out: number;
  action: "reset" | "load" | "inc" | "hold";
}

/**
 * Advance the PC by one clock cycle (rising edge).
 * Priority: reset > load > inc > hold.
 * Returns the new state.
 */
export function tickPC(state: PCState, inputs: PCInputs): PCState {
  if (inputs.reset) {
    return { out: 0 };
  } else if (inputs.load) {
    return { out: inputs.in & 0xffff };
  } else if (inputs.inc) {
    return { out: (state.out + 1) & 0xffff };
  }
  return { out: state.out };
}

/**
 * Determine which action wins given the current inputs.
 */
export function pcAction(inputs: PCInputs): "reset" | "load" | "inc" | "hold" {
  if (inputs.reset) return "reset";
  if (inputs.load) return "load";
  if (inputs.inc) return "inc";
  return "hold";
}
