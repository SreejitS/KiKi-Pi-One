// pc.sv
// KiKi-Pi-One — 16-bit Program Counter
//
// Tracks the address of the next instruction in ROM.
// Three control signals with priority encoding: reset > load > inc.
//
// On every rising clock edge:
//   - If reset = 1 → out = 0           (restart)
//   - If load  = 1 → out = in          (jump)
//   - If inc   = 1 → out = out + 1     (next instruction)
//   - Otherwise    → out holds         (stall)
//
// Overflow wraps: 0xFFFF + 1 = 0x0000.
//
// Interface:
//   clk   : clock (rising-edge triggered)
//   in    : 16-bit jump target (from A register)
//   load  : jump enable (active high)
//   inc   : increment enable (active high)
//   reset : synchronous reset (active high, highest priority)
//   out   : 16-bit current PC value (registered)

`timescale 1ns/1ps

module pc (
    input  logic        clk,
    input  logic [15:0] in,
    input  logic        load,
    input  logic        inc,
    input  logic        reset,
    output logic [15:0] out
);
    always_ff @(posedge clk) begin
        if (reset)
            out <= 16'h0000;
        else if (load)
            out <= in;
        else if (inc)
            out <= out + 16'h0001;
    end

    // Initialise to 0 for simulation (not synthesisable on all targets)
    initial out = 16'h0000;

endmodule
