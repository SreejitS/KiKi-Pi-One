// tb_register.sv
// KiKi-Pi-One — Testbench for register.sv
//
// Run with:
//   iverilog -g2012 -o tb_register tb_register.sv ../rtl/register.sv && vvp tb_register
//
// Expected output:
//   [PASS] load=0: holds initial value 0x0000
//   [PASS] load=1: latches 0xABCD
//   [PASS] load=0: holds 0xABCD after clock
//   [PASS] load=1: latches 0x1234
//   [PASS] load=1: immediately overwrites to 0x5678
//   [PASS] load=0: holds 0x5678 across multiple ticks
//   All 6 tests passed.

`timescale 1ns/1ps

module tb_register;

    // DUT signals
    logic        clk;
    logic        load;
    logic [15:0] in;
    logic [15:0] out;

    // Instantiate the device under test
    register dut (
        .clk  (clk),
        .load (load),
        .in   (in),
        .out  (out)
    );

    // 10ns clock period (100 MHz)
    initial clk = 0;
    always #5 clk = ~clk;

    // Convenience task: advance one full clock cycle and check output
    task tick;
        input [15:0] expected;
        input [63:0] test_num;
        input [127:0] description;
        begin
            @(posedge clk);
            #1; // small delay to let output settle after clock edge
            if (out === expected)
                $display("[PASS] Test %0d: %s → out=0x%04X", test_num, description, out);
            else begin
                $display("[FAIL] Test %0d: %s → expected=0x%04X, got=0x%04X",
                         test_num, description, expected, out);
                $finish(1);
            end
        end
    endtask

    integer pass_count;

    initial begin
        pass_count = 0;
        load = 0;
        in   = 16'h0000;

        // ── Test 1: load=0 should hold initial value (0x0000) ──────────────
        load = 0;
        in   = 16'hDEAD;   // tempting value, should NOT latch
        tick(16'h0000, 1, "load=0: holds initial 0x0000");
        pass_count++;

        // ── Test 2: load=1 latches the input ────────────────────────────────
        load = 1;
        in   = 16'hABCD;
        tick(16'hABCD, 2, "load=1: latches 0xABCD");
        pass_count++;

        // ── Test 3: load=0 holds the previously latched value ───────────────
        load = 0;
        in   = 16'hFFFF;   // should be ignored
        tick(16'hABCD, 3, "load=0: holds 0xABCD");
        pass_count++;

        // ── Test 4: load=1 overwrites with new value ─────────────────────────
        load = 1;
        in   = 16'h1234;
        tick(16'h1234, 4, "load=1: latches 0x1234");
        pass_count++;

        // ── Test 5: immediate consecutive load ───────────────────────────────
        load = 1;
        in   = 16'h5678;
        tick(16'h5678, 5, "load=1: overwrites to 0x5678");
        pass_count++;

        // ── Test 6: load=0 holds across multiple ticks ───────────────────────
        load = 0;
        in   = 16'hBEEF;
        @(posedge clk); #1;
        @(posedge clk); #1;
        @(posedge clk); #1;
        if (out === 16'h5678)
            $display("[PASS] Test 6: load=0: holds 0x5678 across 3 ticks");
        else begin
            $display("[FAIL] Test 6: expected 0x5678, got 0x%04X", out);
            $finish(1);
        end
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
