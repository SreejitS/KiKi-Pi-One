// tb_memory.sv
// KiKi-Pi-One — Testbench for memory.sv
//
// Tests RAM, screen buffer, and keyboard register regions,
// including boundary addresses, hold behaviour, and write-ignore.
//
// Run with:
//   iverilog -g2012 -o tb_memory tb_memory.sv ../rtl/memory.sv && vvp tb_memory
//
// Expected output:
//   [PASS] 01: RAM write/read at 0x0000
//   [PASS] 02: RAM write/read at 0x3FFF (last RAM word)
//   [PASS] 03: RAM load=0 holds value
//   [PASS] 04: Screen write/read at 0x4000
//   [PASS] 05: Screen write/read at 0x5FFF (last screen word)
//   [PASS] 06: Keyboard read returns external value
//   [PASS] 07: Keyboard write is ignored (read-only)
//   [PASS] 08: Multiple RAM writes don't interfere
//   [PASS] 09: Boundary: RAM 0x3FFF and Screen 0x4000 are separate
//   [PASS] 10: RAM holds across multiple ticks with load=0
//   All 10 tests passed.

`timescale 1ns/1ps

module tb_memory;

    // DUT signals
    logic        clk;
    logic        load;
    logic [14:0] address;
    logic [15:0] in;
    logic [15:0] out;

    // Instantiate device under test
    memory dut (
        .clk     (clk),
        .load    (load),
        .address (address),
        .in      (in),
        .out     (out)
    );

    // 10ns clock period (100 MHz)
    initial clk = 0;
    always #5 clk = ~clk;

    integer pass_count = 0;
    integer test_num   = 0;

    // Task: apply inputs, advance one clock, check output
    task check;
        input [15:0] exp_out;
        input [255:0] label;
        begin
            @(posedge clk);
            #1; // let output settle
            test_num = test_num + 1;
            if (out === exp_out) begin
                $display("[PASS] %02d: %s", test_num, label);
                pass_count = pass_count + 1;
            end else begin
                $display("[FAIL] %02d: %s → expected 0x%04X, got 0x%04X",
                         test_num, label, exp_out, out);
                $finish(1);
            end
        end
    endtask

    initial begin
        load    = 0;
        address = 15'h0000;
        in      = 16'h0000;

        // ── Test 1: RAM write/read at 0x0000 ────────────────────────────────
        load    = 1;
        address = 15'h0000;
        in      = 16'hCAFE;
        check(16'hCAFE, "RAM write/read at 0x0000");

        // ── Test 2: RAM write/read at 0x3FFF (last RAM word) ────────────────
        load    = 1;
        address = 15'h3FFF;
        in      = 16'hBEEF;
        check(16'hBEEF, "RAM write/read at 0x3FFF (last RAM word)");

        // ── Test 3: RAM load=0 holds value ──────────────────────────────────
        load    = 0;
        address = 15'h3FFF;
        in      = 16'hDEAD;  // should be ignored
        check(16'hBEEF, "RAM load=0 holds value");

        // ── Test 4: Screen write/read at 0x4000 ────────────────────────────
        load    = 1;
        address = 15'h4000;
        in      = 16'hF00D;
        check(16'hF00D, "Screen write/read at 0x4000");

        // ── Test 5: Screen write/read at 0x5FFF (last screen word) ──────────
        load    = 1;
        address = 15'h5FFF;
        in      = 16'h1234;
        check(16'h1234, "Screen write/read at 0x5FFF (last screen word)");

        // ── Test 6: Keyboard read returns external value ────────────────────
        // Directly set the keyboard register inside the DUT
        dut.kbd = 16'h0041;  // ASCII 'A'
        load    = 0;
        address = 15'h6000;
        in      = 16'h0000;
        check(16'h0041, "Keyboard read returns external value");

        // ── Test 7: Write to keyboard is ignored (read-only) ────────────────
        load    = 1;
        address = 15'h6000;
        in      = 16'hFFFF;
        check(16'h0041, "Keyboard write is ignored (read-only)");

        // ── Test 8: Multiple RAM writes don't interfere ─────────────────────
        // Write 0xAAAA to address 0x0010, then check 0x0000 still has 0xCAFE
        load    = 1;
        address = 15'h0010;
        in      = 16'hAAAA;
        @(posedge clk); #1;
        // Now read 0x0000
        load    = 0;
        address = 15'h0000;
        in      = 16'h0000;
        check(16'hCAFE, "Multiple RAM writes don't interfere");

        // ── Test 9: Boundary: RAM 0x3FFF and Screen 0x4000 are separate ─────
        // 0x3FFF already has 0xBEEF, 0x4000 already has 0xF00D
        load    = 0;
        address = 15'h3FFF;
        @(posedge clk); #1;
        test_num = test_num + 1;
        if (out === 16'hBEEF) begin
            // Now check 0x4000
            address = 15'h4000;
            #1; // combinational read settles immediately
            if (out === 16'hF00D) begin
                $display("[PASS] %02d: Boundary: RAM 0x3FFF and Screen 0x4000 are separate", test_num);
                pass_count = pass_count + 1;
            end else begin
                $display("[FAIL] %02d: Screen at 0x4000 → expected 0xF00D, got 0x%04X", test_num, out);
                $finish(1);
            end
        end else begin
            $display("[FAIL] %02d: RAM at 0x3FFF → expected 0xBEEF, got 0x%04X", test_num, out);
            $finish(1);
        end

        // ── Test 10: RAM holds across multiple ticks with load=0 ────────────
        load    = 0;
        address = 15'h0010;
        @(posedge clk); #1;
        @(posedge clk); #1;
        @(posedge clk); #1;
        test_num = test_num + 1;
        if (out === 16'hAAAA) begin
            $display("[PASS] %02d: RAM holds across multiple ticks with load=0", test_num);
            pass_count = pass_count + 1;
        end else begin
            $display("[FAIL] %02d: Hold test → expected 0xAAAA, got 0x%04X", test_num, out);
            $finish(1);
        end

        $display("All %0d tests passed.", pass_count);
        $finish;
    end

    // Timeout watchdog
    initial begin
        #5000;
        $display("[ERROR] Simulation timeout");
        $finish(1);
    end

endmodule
