---
title: "Part 1: The Register - Building KiKi-Pi-One's Memory Cells"
series: "KiKi-Pi-One"
part: 1
tags: ["cpu-design", "hardware", "systemverilog", "registers", "kiki-pi-one"]
medium_url: ""
wordpress_url: ""
status: draft
---

# Part 1: The Register

*This is Part 1 of the KiKi-Pi-One series, where we build a 16-bit CPU from scratch.*
*[← Part 0: The ISA](./00-isa-spec.md) | [GitHub](https://github.com/SreejitS/KiKi-Pi-One) | [Live Demo](https://kiki-pi-one.vercel.app/registers)*

---

Every CPU needs memory. Not the gigabytes of RAM kind. I mean the tiny, fast storage sitting right inside the processor itself. The kind that holds a single value and can update it in one clock cycle.

That's a **register**.

In KiKi-Pi-One, registers are the first building block we'll implement. The CPU has two of them, the **A register** and the **D register**, and they're both instances of the same simple module we're building today.

---

## What Is a Register?

At its core, a register is a **D flip-flop** scaled to 16 bits.

A D flip-flop is a memory element with a very simple contract:

> On every rising clock edge, if the load signal is 1, capture the input. Otherwise, keep holding the current value.

That's the entire behaviour. Nothing else.

In our 16-bit version:

```
     ┌─────────────────────────┐
  in │16                       │ 16
────▶│         register        │────▶ out
     │                         │
load │                         │
────▶│                         │
     │                         │
 clk │                         │
────▶│                         │
     └─────────────────────────┘
```

- `in`: the 16-bit value we might want to store
- `load`: 1 = latch `in`, 0 = keep holding current value
- `clk`: the clock, which is what makes it *synchronous* (changes happen on the tick, not instantly)
- `out`: the currently stored value

---

## Timing Behaviour

This is where new hardware designers sometimes get surprised: the output doesn't change *when* you set `load = 1`. It changes on the **next rising clock edge**.

```
        ┌──┐  ┌──┐  ┌──┐  ┌──┐  ┌──┐
clk  ───┘  └──┘  └──┘  └──┘  └──┘  └─

load  0     0     1     1     0
         ↑ nothing ↑         ↑
         held      latches   held

in    X     X   0xABCD  X     X
out   0  ───── 0x0000 ──┤  0xABCD ───
                        ↑
                  latches on this edge
```

```json
// WaveDrom — paste at wavedrom.com to render
{ "signal": [
  { "name": "clk",  "wave": "p.....",  "period": 2 },
  { "name": "load", "wave": "0.1.0." },
  { "name": "in",   "wave": "x.=.x.", "data": ["0xABCD"] },
  { "name": "out",  "wave": "x...=.", "data": ["0xABCD"] }
]}
```

This edge-triggered behaviour is what makes digital design predictable. All registers in the system update simultaneously on the clock edge, eliminating race conditions.

---

## The Implementation

Here's the complete SystemVerilog. It's short on purpose. If you need more than a few lines to implement a register, something is wrong.

```systemverilog
// register.sv
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

    initial out = 16'h0000;
endmodule
```

### Breaking it down

**`logic [15:0]`** — SystemVerilog's `logic` type replaces Verilog's `wire`/`reg` distinction. `[15:0]` means 16 bits, indexed from 15 (MSB) down to 0 (LSB).

**`always_ff @(posedge clk)`** — This is the key. `always_ff` is a SystemVerilog construct that explicitly models a flip-flop (sequential logic). The `@(posedge clk)` means "trigger on the rising clock edge". Synthesis tools use this to infer actual flip-flop primitives.

**`if (load) out <= in`** — The non-blocking assignment `<=` (vs. blocking `=`) is critical in sequential blocks. All non-blocking assignments evaluate their right-hand sides *first*, then update their targets simultaneously. This is how hardware actually works: all flip-flops in the chip update at the same instant on the clock edge.

**`initial out = 16'h0000`** — Sets the simulation starting value to 0. In real hardware, flip-flops power up to an undefined state, but for simulation this gives us a clean baseline.

### What happens without a reset?

You might notice there's no reset signal. For simulation purposes, `initial` handles the starting state. If we were targeting an FPGA, we'd add a synchronous reset:

```systemverilog
always_ff @(posedge clk) begin
    if (reset)     out <= 16'h0000;
    else if (load) out <= in;
end
```

We'll add this when we integrate into the full CPU. For now, keep it simple.

---

## Testing It

Good hardware design is test-driven. Before you can trust a component, you need a testbench that proves it works.

Here's the full testbench (`tb_register.sv`):

```systemverilog
`timescale 1ns/1ps

module tb_register;
    logic        clk;
    logic        load;
    logic [15:0] in;
    logic [15:0] out;

    // Instantiate the device under test
    register dut (.clk(clk), .load(load), .in(in), .out(out));

    // 10ns clock (100 MHz)
    initial clk = 0;
    always #5 clk = ~clk;

    initial begin
        load = 0; in = 16'h0000;

        // Test 1: load=0 should hold initial value
        load = 0; in = 16'hDEAD;
        @(posedge clk); #1;
        assert(out === 16'h0000) else $fatal("Test 1 FAIL");
        $display("[PASS] load=0 holds initial 0x0000");

        // Test 2: load=1 latches
        load = 1; in = 16'hABCD;
        @(posedge clk); #1;
        assert(out === 16'hABCD) else $fatal("Test 2 FAIL");
        $display("[PASS] load=1 latches 0xABCD");

        // Test 3: load=0 holds the latched value
        load = 0; in = 16'hFFFF;
        @(posedge clk); #1;
        assert(out === 16'hABCD) else $fatal("Test 3 FAIL");
        $display("[PASS] load=0 holds 0xABCD");

        // Test 4: overwrite with a new value
        load = 1; in = 16'h5678;
        @(posedge clk); #1;
        assert(out === 16'h5678) else $fatal("Test 4 FAIL");
        $display("[PASS] load=1 overwrites to 0x5678");

        $display("All tests passed.");
        $finish;
    end
endmodule
```

### Running it

```bash
# From the 01-registers/ directory
iverilog -g2012 -o tb_register tb/tb_register.sv rtl/register.sv && vvp tb_register
```

Output:

```
[PASS] load=0 holds initial 0x0000
[PASS] load=1 latches 0xABCD
[PASS] load=0 holds 0xABCD
[PASS] load=1 overwrites to 0x5678
All tests passed.
```

Green across the board. The register works exactly as specified.

---

## Try It Yourself

I built an interactive web demo where you can click individual bits, toggle the load signal, and step through clock cycles to watch the register hold and latch in real time.

**→ [Open the Register Demo](https://kiki-pi-one.vercel.app/registers)**

The demo runs the same logic as the SystemVerilog implementation, just written in TypeScript so it runs in your browser:

```typescript
// register.ts — mirrors register.sv exactly
export function tickRegister(state: RegisterState, input: { in: number, load: 0 | 1 }): RegisterState {
  return {
    out: input.load ? input.in & 0xFFFF : state.out
  }
}
```

Same interface, same behaviour, two different implementations. One compiles to hardware; one runs in Chrome.

---

## Where This Is Used

In the final CPU, we'll have two register instances:

```systemverilog
// Inside cpu.sv (Part 5)
register reg_A (.clk(clk), .load(load_A), .in(a_input), .out(A));
register reg_D (.clk(clk), .load(load_D), .in(alu_out),  .out(D));
```

- **Register A** holds addresses and constants, feeds into the ALU as operand Y, and doubles as the jump target for the PC
- **Register D** is the general data register and the primary ALU operand X

The `load` signal for each is decoded from the instruction's destination bits, specifically the `ddd` field we defined in the ISA spec.

---

## What's Next

We have storage. Now we need computation.

In **Part 2**, we build the **ALU (Arithmetic Logic Unit)**, the component that does all the actual math. We'll see how 6 control bits can select between 28 different operations, and work through the trick behind the `D+1` operation that would look like magic without the explanation.

**[Part 2: The ALU →](./02-alu.md)**

---

*[← Part 0: The ISA](./00-isa-spec.md)*
*[KiKi-Pi-One on GitHub](https://github.com/SreejitS/KiKi-Pi-One)*
*[Live Demo](https://kiki-pi-one.vercel.app/registers)*
