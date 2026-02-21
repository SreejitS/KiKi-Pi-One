// register.sv
// KiKi-Pi-One — 16-bit General-Purpose Register
//
// A synchronous D flip-flop with a load enable.
// On every rising clock edge:
//   - If load = 1 → out latches the value of in
//   - If load = 0 → out holds its current value
//
// This is the fundamental storage primitive. Both the A register and D register
// in the CPU are instances of this module.
//
// Interface:
//   clk   : clock (rising-edge triggered)
//   load  : write enable (active high)
//   in    : 16-bit data input
//   out   : 16-bit data output (registered)

`timescale 1ns/1ps

module register (
    input  logic        clk,
    input  logic        load,
    input  logic [15:0] in,
    output logic [15:0] out
);
    always_ff @(posedge clk) begin
        if (load)
            out <= in;
    end

    // Initialise to 0 for simulation (not synthesisable on all targets)
    initial out = 16'h0000;

endmodule
