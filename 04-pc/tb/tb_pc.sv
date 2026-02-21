// tb_pc.sv
// KiKi-Pi-One — Testbench for pc.sv
//
// Run with:
//   iverilog -g2012 -o tb_pc tb_pc.sv ../rtl/pc.sv && vvp tb_pc
//
// Expected output:
//   [PASS] Test 1: inc: 0→1
//   [PASS] Test 2: inc: 1→2
//   [PASS] Test 3: load: jump to 0x00C8
//   [PASS] Test 4: load beats inc: jump to 0x0200
//   [PASS] Test 5: reset beats load+inc: back to 0
//   [PASS] Test 6: hold: no signals, stays at 0
//   [PASS] Test 7: wrap: 0xFFFF+1 → 0x0000
//   [PASS] Test 8: reset at zero stays zero
//   All 8 tests passed.

`timescale 1ns/1ps

module tb_pc;

    // DUT signals
    logic        clk;
    logic [15:0] in;
    logic        load;
    logic        inc;
    logic        reset;
    logic [15:0] out;

    // Instantiate the device under test
    pc dut (
        .clk   (clk),
        .in    (in),
        .load  (load),
        .inc   (inc),
        .reset (reset),
        .out   (out)
    );

    // 10ns clock period (100 MHz)
    initial clk = 0;
    always #5 clk = ~clk;

    // Convenience task: set inputs, advance one clock edge, check output
    task tick;
        input [15:0] expected;
        input [63:0] test_num;
        input [255:0] description;
        begin
            @(posedge clk);
            #1; // small delay to let output settle after clock edge
            if (out === expected)
                $display("[PASS] Test %0d: %s", test_num, description);
            else begin
                $display("[FAIL] Test %0d: %s — expected=0x%04X, got=0x%04X",
                         test_num, description, expected, out);
                $finish(1);
            end
        end
    endtask

    integer pass_count;

    initial begin
        pass_count = 0;
        in    = 16'h0000;
        load  = 0;
        inc   = 0;
        reset = 0;

        // ── Test 1: inc from 0 → 1 ──────────────────────────────────────────
        inc = 1;
        tick(16'h0001, 1, "inc: 0->1");
        pass_count++;

        // ── Test 2: inc from 1 → 2 ──────────────────────────────────────────
        tick(16'h0002, 2, "inc: 1->2");
        pass_count++;

        // ── Test 3: load jumps to target ─────────────────────────────────────
        inc  = 0;
        load = 1;
        in   = 16'h00C8; // 200
        tick(16'h00C8, 3, "load: jump to 0x00C8");
        pass_count++;

        // ── Test 4: load beats inc (priority: load > inc) ────────────────────
        inc  = 1;
        load = 1;
        in   = 16'h0200; // 512
        tick(16'h0200, 4, "load beats inc: jump to 0x0200");
        pass_count++;

        // ── Test 5: reset beats load+inc (priority: reset > load > inc) ──────
        inc   = 1;
        load  = 1;
        in    = 16'hBEEF;
        reset = 1;
        tick(16'h0000, 5, "reset beats load+inc: back to 0");
        pass_count++;

        // ── Test 6: hold — no signals asserted, PC stays put ─────────────────
        inc   = 0;
        load  = 0;
        reset = 0;
        in    = 16'hDEAD;
        tick(16'h0000, 6, "hold: no signals, stays at 0");
        pass_count++;

        // ── Test 7: overflow wrap — 0xFFFF + 1 = 0x0000 ─────────────────────
        // First load 0xFFFF, then increment
        load = 1;
        in   = 16'hFFFF;
        @(posedge clk); #1; // now out = 0xFFFF
        load = 0;
        inc  = 1;
        tick(16'h0000, 7, "wrap: 0xFFFF+1 -> 0x0000");
        pass_count++;

        // ── Test 8: reset at zero stays zero ─────────────────────────────────
        inc   = 0;
        reset = 1;
        tick(16'h0000, 8, "reset at zero stays zero");
        pass_count++;

        $display("All %0d tests passed.", pass_count);
        $finish;
    end

    // Timeout watchdog: kill simulation if it hangs for more than 1us
    initial begin
        #1000;
        $display("[ERROR] Simulation timeout");
        $finish(1);
    end

endmodule
