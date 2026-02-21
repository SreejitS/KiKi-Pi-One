// tb_alu.sv
// KiKi-Pi-One — Testbench for alu.sv
//
// Covers all 28 operations defined in the ISA, plus flag edge cases.
// The ALU is combinational, so we set inputs and check outputs after
// a short propagation delay (#1) — no clock needed.
//
// Run with:
//   iverilog -g2012 -o tb_alu tb_alu.sv ../rtl/alu.sv && vvp tb_alu
//
// Expected output:
//   [PASS] 01: 0      → 0x0000 (zr=1 ng=0)
//   [PASS] 02: 1      → 0x0001 (zr=0 ng=0)
//   ...
//   All 32 tests passed.

`timescale 1ns/1ps

module tb_alu;

    // DUT signals
    logic [15:0] x, y;
    logic        zx, nx, zy, ny, f, no;
    logic [15:0] out;
    logic        zr, ng;

    // Instantiate device under test
    alu dut (
        .x  (x),  .y  (y),
        .zx (zx), .nx (nx),
        .zy (zy), .ny (ny),
        .f  (f),  .no (no),
        .out(out), .zr(zr), .ng(ng)
    );

    integer pass_count = 0;
    integer test_num   = 0;

    // Task: apply control bits, wait for propagation, check result and flags
    task check;
        input [15:0] exp_out;
        input        exp_zr;
        input        exp_ng;
        input [127:0] label;
        begin
            #1; // combinational propagation delay
            test_num = test_num + 1;
            if (out === exp_out && zr === exp_zr && ng === exp_ng) begin
                $display("[PASS] %02d: %-6s → 0x%04X (zr=%0b ng=%0b)",
                         test_num, label, out, zr, ng);
                pass_count = pass_count + 1;
            end else begin
                $display("[FAIL] %02d: %-6s → got 0x%04X zr=%0b ng=%0b  expected 0x%04X zr=%0b ng=%0b",
                         test_num, label, out, zr, ng, exp_out, exp_zr, exp_ng);
                $finish(1);
            end
        end
    endtask

    initial begin
        // ── Baseline inputs: x=5, y=3 ─────────────────────────────────────
        x = 16'h0005; y = 16'h0003;

        // ── Constants ──────────────────────────────────────────────────────
        // 0   →  a=0, zx=1 nx=0 zy=1 ny=0 f=1 no=0
        {zx,nx,zy,ny,f,no} = 6'b101010; check(16'h0000, 1, 0, "0");
        // 1   →  a=0, zx=1 nx=1 zy=1 ny=1 f=1 no=1
        {zx,nx,zy,ny,f,no} = 6'b111111; check(16'h0001, 0, 0, "1");
        // -1  →  a=0, zx=1 nx=1 zy=1 ny=0 f=1 no=0
        {zx,nx,zy,ny,f,no} = 6'b111010; check(16'hFFFF, 0, 1, "-1");

        // ── Pass-through ───────────────────────────────────────────────────
        // D   →  a=0, zx=0 nx=0 zy=1 ny=1 f=0 no=0  →  x&0xFFFF = 5
        {zx,nx,zy,ny,f,no} = 6'b001100; check(16'h0005, 0, 0, "D");
        // A   →  a=0, zx=1 nx=1 zy=0 ny=0 f=0 no=0  →  0xFFFF&y = 3
        {zx,nx,zy,ny,f,no} = 6'b110000; check(16'h0003, 0, 0, "A");

        // ── NOT ────────────────────────────────────────────────────────────
        // !D  →  a=0, zx=0 nx=0 zy=1 ny=1 f=0 no=1  →  ~5 = 0xFFFA
        {zx,nx,zy,ny,f,no} = 6'b001101; check(16'hFFFA, 0, 1, "!D");
        // !A  →  a=0, zx=1 nx=1 zy=0 ny=0 f=0 no=1  →  ~3 = 0xFFFC
        {zx,nx,zy,ny,f,no} = 6'b110001; check(16'hFFFC, 0, 1, "!A");

        // ── Negate ────────────────────────────────────────────────────────
        // -D  →  a=0, zx=0 nx=0 zy=1 ny=1 f=1 no=1  →  -5 = 0xFFFB
        {zx,nx,zy,ny,f,no} = 6'b001111; check(16'hFFFB, 0, 1, "-D");
        // -A  →  a=0, zx=1 nx=1 zy=0 ny=0 f=1 no=1  →  -3 = 0xFFFD
        {zx,nx,zy,ny,f,no} = 6'b110011; check(16'hFFFD, 0, 1, "-A");

        // ── Increment ─────────────────────────────────────────────────────
        // D+1 →  a=0, zx=0 nx=1 zy=1 ny=1 f=1 no=1  →  6
        {zx,nx,zy,ny,f,no} = 6'b011111; check(16'h0006, 0, 0, "D+1");
        // A+1 →  a=0, zx=1 nx=1 zy=0 ny=1 f=1 no=1  →  4
        {zx,nx,zy,ny,f,no} = 6'b110111; check(16'h0004, 0, 0, "A+1");

        // ── Decrement ─────────────────────────────────────────────────────
        // D-1 →  a=0, zx=0 nx=0 zy=1 ny=1 f=1 no=0  →  4
        {zx,nx,zy,ny,f,no} = 6'b001110; check(16'h0004, 0, 0, "D-1");
        // A-1 →  a=0, zx=1 nx=1 zy=0 ny=0 f=1 no=0  →  2
        {zx,nx,zy,ny,f,no} = 6'b110010; check(16'h0002, 0, 0, "A-1");

        // ── Add ───────────────────────────────────────────────────────────
        // D+A →  a=0, zx=0 nx=0 zy=0 ny=0 f=1 no=0  →  8
        {zx,nx,zy,ny,f,no} = 6'b000010; check(16'h0008, 0, 0, "D+A");

        // ── Subtract ──────────────────────────────────────────────────────
        // D-A →  a=0, zx=0 nx=1 zy=0 ny=0 f=1 no=1  →  2
        {zx,nx,zy,ny,f,no} = 6'b010011; check(16'h0002, 0, 0, "D-A");
        // A-D →  a=0, zx=0 nx=0 zy=0 ny=1 f=1 no=1  →  -2 = 0xFFFE
        {zx,nx,zy,ny,f,no} = 6'b000111; check(16'hFFFE, 0, 1, "A-D");

        // ── Bitwise AND / OR ───────────────────────────────────────────────
        // D&A →  a=0, zx=0 nx=0 zy=0 ny=0 f=0 no=0  →  5&3=1
        {zx,nx,zy,ny,f,no} = 6'b000000; check(16'h0001, 0, 0, "D&A");
        // D|A →  a=0, zx=0 nx=1 zy=0 ny=1 f=0 no=1  →  5|3=7
        {zx,nx,zy,ny,f,no} = 6'b010101; check(16'h0007, 0, 0, "D|A");

        // ── M-variants: same control bits, different y (y=7 simulates M) ──
        y = 16'h0007;

        // M   →  same bits as A  →  0xFFFF & 7 = 7
        {zx,nx,zy,ny,f,no} = 6'b110000; check(16'h0007, 0, 0, "M");
        // !M  →  same bits as !A →  ~7 = 0xFFF8
        {zx,nx,zy,ny,f,no} = 6'b110001; check(16'hFFF8, 0, 1, "!M");
        // -M  →  same bits as -A →  -7 = 0xFFF9
        {zx,nx,zy,ny,f,no} = 6'b110011; check(16'hFFF9, 0, 1, "-M");
        // M+1 →  same bits as A+1 → 8
        {zx,nx,zy,ny,f,no} = 6'b110111; check(16'h0008, 0, 0, "M+1");
        // M-1 →  same bits as A-1 → 6
        {zx,nx,zy,ny,f,no} = 6'b110010; check(16'h0006, 0, 0, "M-1");
        // D+M →  same bits as D+A → 5+7=12
        {zx,nx,zy,ny,f,no} = 6'b000010; check(16'h000C, 0, 0, "D+M");
        // D-M →  same bits as D-A → 5-7=-2=0xFFFE
        {zx,nx,zy,ny,f,no} = 6'b010011; check(16'hFFFE, 0, 1, "D-M");
        // M-D →  same bits as A-D → 7-5=2
        {zx,nx,zy,ny,f,no} = 6'b000111; check(16'h0002, 0, 0, "M-D");
        // D&M →  same bits as D&A → 5&7=5
        {zx,nx,zy,ny,f,no} = 6'b000000; check(16'h0005, 0, 0, "D&M");
        // D|M →  same bits as D|A → 5|7=7
        {zx,nx,zy,ny,f,no} = 6'b010101; check(16'h0007, 0, 0, "D|M");

        // ── Flag edge cases ────────────────────────────────────────────────
        // zr: D=0 passthrough should set zr=1
        x = 16'h0000; y = 16'h0000;
        {zx,nx,zy,ny,f,no} = 6'b001100; check(16'h0000, 1, 0, "zr");

        // ng: 0x8000 passthrough should set ng=1
        x = 16'h8000; y = 16'h0000;
        {zx,nx,zy,ny,f,no} = 6'b001100; check(16'h8000, 0, 1, "ng");

        $display("All %0d tests passed.", pass_count);
        $finish;
    end

    // Timeout watchdog
    initial begin
        #500;
        $display("[ERROR] Simulation timeout");
        $finish(1);
    end

endmodule
