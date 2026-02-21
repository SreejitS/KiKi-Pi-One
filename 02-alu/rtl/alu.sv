// alu.sv
// KiKi-Pi-One — 16-bit Arithmetic Logic Unit
//
// A purely combinational circuit. No clock. Output updates immediately
// whenever any input changes.
//
// The six control bits (zx, nx, zy, ny, f, no) apply successive
// transformations to produce one of 28 operations from the ISA.
//
// Algorithm (applied in order):
//   1. if zx: x = 0
//   2. if nx: x = ~x
//   3. if zy: y = 0
//   4. if ny: y = ~y
//   5. if  f: out = x + y   (else: out = x & y)
//   6. if no: out = ~out
//
// Interface:
//   x    : 16-bit input, always from the D register
//   y    : 16-bit input, from A register (a=0) or RAM[A] (a=1) - muxed by CPU
//   zx   : zero x
//   nx   : bitwise NOT x (after zx)
//   zy   : zero y
//   ny   : bitwise NOT y (after zy)
//   f    : 1 = add (x+y), 0 = AND (x&y)
//   no   : bitwise NOT the output
//   out  : 16-bit result
//   zr   : 1 if out == 0
//   ng   : 1 if out < 0 (MSB == 1, two's complement)

`timescale 1ns/1ps

module alu (
    input  logic [15:0] x,
    input  logic [15:0] y,
    input  logic        zx,
    input  logic        nx,
    input  logic        zy,
    input  logic        ny,
    input  logic        f,
    input  logic        no,
    output logic [15:0] out,
    output logic        zr,
    output logic        ng
);
    logic [15:0] px, py, result;

    always_comb begin
        // Step 1 & 2: pre-process x
        px = zx ? 16'h0000 : x;
        px = nx ? ~px : px;

        // Step 3 & 4: pre-process y
        py = zy ? 16'h0000 : y;
        py = ny ? ~py : py;

        // Step 5: compute
        result = f ? (px + py) : (px & py);

        // Step 6: post-process output
        out = no ? ~result : result;

        // Status flags
        zr = (out == 16'h0000);
        ng = (out & 16'h8000) ? 1'b1 : 1'b0;
    end

endmodule
