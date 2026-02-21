// memory.sv
// KiKi-Pi-One — Data Memory (16K RAM + Screen Buffer + Keyboard)
//
// Synchronous write (rising edge of clk when load=1).
// Combinational read (out reflects the current address immediately).
//
// Address decoding uses the top two bits of the 15-bit address:
//
//   address[14]  address[13]  Region
//   ──────────────────────────────────
//       0            x        RAM      (0x0000–0x3FFF, 16,384 words)
//       1            0        Screen   (0x4000–0x5FFF,  8,192 words)
//       1            1        Keyboard (0x6000, single word, read-only)
//
// Interface:
//   clk     : clock (rising-edge triggered)
//   load    : write enable (active high)
//   address : 15-bit memory address
//   in      : 16-bit data input
//   out     : 16-bit data output (combinational)

`timescale 1ns/1ps

module memory (
    input  logic        clk,
    input  logic        load,
    input  logic [14:0] address,
    input  logic [15:0] in,
    output logic [15:0] out
);

    // ── Sub-memories ─────────────────────────────────────────────────────────
    logic [15:0] ram    [0:16383];   // 16K words of general-purpose RAM
    logic [15:0] screen [0:8191];    // 8K words of screen buffer
    logic [15:0] kbd;                // Keyboard register (active key, externally driven)

    // ── Address decoding ─────────────────────────────────────────────────────
    wire ram_sel    = ~address[14];                 // 0x0000–0x3FFF
    wire screen_sel =  address[14] & ~address[13];  // 0x4000–0x5FFF
    wire kbd_sel    =  address[14] &  address[13];   // 0x6000+

    // ── Synchronous write ────────────────────────────────────────────────────
    always_ff @(posedge clk) begin
        if (load) begin
            if (ram_sel)
                ram[address[13:0]] <= in;
            else if (screen_sel)
                screen[address[12:0]] <= in;
            // Keyboard is read-only — writes are silently ignored
        end
    end

    // ── Combinational read ───────────────────────────────────────────────────
    always_comb begin
        if (ram_sel)
            out = ram[address[13:0]];
        else if (screen_sel)
            out = screen[address[12:0]];
        else if (kbd_sel)
            out = kbd;
        else
            out = 16'h0000;
    end

    // ── Simulation initialisation ────────────────────────────────────────────
    initial begin
        for (int i = 0; i < 16384; i++) ram[i] = 16'h0000;
        for (int i = 0; i < 8192;  i++) screen[i] = 16'h0000;
        kbd = 16'h0000;
    end

endmodule
