---
title: "Part 2: The ALU - Building KiKi-Pi-One's Arithmetic Logic Unit"
series: "KiKi-Pi-One"
part: 2
tags: ["cpu-design", "hardware", "systemverilog", "alu", "kiki-pi-one"]
medium_url: ""
wordpress_url: ""
status: draft
---

# Part 2: The ALU

*This is Part 2 of the KiKi-Pi-One series, where we build a 16-bit CPU from scratch.*
*[← Part 1: The Register](./01-registers.md) | [GitHub](https://github.com/SreejitS/KiKi-Pi-One) | [Live Demo](https://kiki-pi-one.vercel.app/alu)*

---

We have storage. Now we need computation.

The **ALU (Arithmetic Logic Unit)** is the part of the CPU that does all the actual math: addition, subtraction, bitwise AND and OR, and logical negation. In KiKi-Pi-One, there is exactly one ALU, and every computation in every program passes through it.

The interesting part: a single ALU with just **6 control bits** can produce **28 distinct operations**. That sounds like too much, until you understand the trick.

---

## The Interface

Unlike the register from Part 1, the ALU has no clock. It is purely **combinational**: the output updates immediately whenever any input changes. No rising edge, no wait.

```
     ┌──────────────────────────────────────┐
  x  │16                                    │ 16
────▶│                                      │────▶ out
  y  │16             ALU                    │
────▶│                                      │────▶ zr
     │                                      │
  zx │  zy │  f  │                          │────▶ ng
  nx │  ny │  no │                          │
─────┴──────┴─────┴──────────────────────────┘
```

| Port | Width | Description |
|------|-------|-------------|
| `x`  | 16 | First operand (always from D register) |
| `y`  | 16 | Second operand (from A register or RAM[A], selected by the CPU) |
| `zx` |  1 | Zero x |
| `nx` |  1 | Bitwise NOT x |
| `zy` |  1 | Zero y |
| `ny` |  1 | Bitwise NOT y |
| `f`  |  1 | 1 = add, 0 = AND |
| `no` |  1 | Bitwise NOT the output |
| `out`| 16 | Result |
| `zr` |  1 | 1 if out == 0 |
| `ng` |  1 | 1 if out < 0 (signed) |

The two output flags, `zr` and `ng`, feed directly into the jump logic in the CPU. They let the program test conditions without needing a separate comparison instruction.

---

## The Big Insight: 6 Bits, 28 Operations

How does 6 bits give you 28 operations?

The control bits apply **successive transformations** in a fixed pipeline:

```
x ──[zx]──[nx]──┐
                 ├──[f]──[no]──▶ out
y ──[zy]──[ny]──┘
```

Each stage either passes its input unchanged or transforms it:

1. **zx**: replace x with 0 (or keep x)
2. **nx**: bitwise NOT x (or keep x)
3. **zy**: replace y with 0 (or keep y)
4. **ny**: bitwise NOT y (or keep y)
5. **f**: output = x + y (add) or x & y (AND)
6. **no**: bitwise NOT the output (or keep it)

By composing these simple transformations, you can synthesise any of the 28 ISA operations. The table below shows the control bits for every one:

| Operation | zx | nx | zy | ny | f | no | Result |
|-----------|----|----|----|----|---|----|--------|
| `0`       |  1 |  0 |  1 |  0 | 1 |  0 | Constant 0 |
| `1`       |  1 |  1 |  1 |  1 | 1 |  1 | Constant 1 |
| `-1`      |  1 |  1 |  1 |  0 | 1 |  0 | Constant -1 |
| `D`       |  0 |  0 |  1 |  1 | 0 |  0 | D |
| `A`       |  1 |  1 |  0 |  0 | 0 |  0 | A |
| `!D`      |  0 |  0 |  1 |  1 | 0 |  1 | NOT D |
| `!A`      |  1 |  1 |  0 |  0 | 0 |  1 | NOT A |
| `-D`      |  0 |  0 |  1 |  1 | 1 |  1 | Negate D |
| `-A`      |  1 |  1 |  0 |  0 | 1 |  1 | Negate A |
| `D+1`     |  0 |  1 |  1 |  1 | 1 |  1 | D + 1 |
| `A+1`     |  1 |  1 |  0 |  1 | 1 |  1 | A + 1 |
| `D-1`     |  0 |  0 |  1 |  1 | 1 |  0 | D - 1 |
| `A-1`     |  1 |  1 |  0 |  0 | 1 |  0 | A - 1 |
| `D+A`     |  0 |  0 |  0 |  0 | 1 |  0 | D + A |
| `D-A`     |  0 |  1 |  0 |  0 | 1 |  1 | D - A |
| `A-D`     |  0 |  0 |  0 |  1 | 1 |  1 | A - D |
| `D&A`     |  0 |  0 |  0 |  0 | 0 |  0 | D AND A |
| `D\|A`    |  0 |  1 |  0 |  1 | 0 |  1 | D OR A |

Each row with an `A` has a corresponding `M` variant (e.g. `D+M`, `!M`) that uses the same control bits but with `y = RAM[A]` instead of `y = A`. The CPU handles that mux before calling the ALU, so the ALU itself never sees the `a` bit.

---

## The D+1 Trick

In Part 1, I promised to explain why `D+1` needs these specific bits: `zx=0, nx=1, zy=1, ny=1, f=1, no=1`. Let's trace through it step by step with D = 5.

**Step 1 - zx=0:** x stays as D = 5

**Step 2 - nx=1:** x = ~5 = 0xFFFA (bitwise NOT, all bits flipped)

**Step 3 - zy=1:** y = 0

**Step 4 - ny=1:** y = ~0 = 0xFFFF

In two's complement, 0xFFFF represents -1.

**Step 5 - f=1 (add):** result = 0xFFFA + 0xFFFF = 0x1FFF9

16-bit arithmetic discards the carry bit, so result = 0xFFF9.

**Step 6 - no=1:** out = ~0xFFF9 = 0x0006 = 6

And 5 + 1 = 6. It works.

Why? There is a two's complement identity at work here:

```
~(~D + (-1)) = ~(-D - 1 - 1) = ~(-D - 2) = (D + 2) - 1 = D + 1
```

The six control bits are not magic. They exploit the relationship between bitwise NOT and two's complement arithmetic to produce any of the 28 operations from two primitive gates (adder and AND) plus a few pre/post inversions.

---

## The Implementation

Here is the complete SystemVerilog. Like the register, it fits in a handful of lines.

```systemverilog
// alu.sv
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
        // Pre-process x
        px = zx ? 16'h0000 : x;
        px = nx ? ~px : px;

        // Pre-process y
        py = zy ? 16'h0000 : y;
        py = ny ? ~py : py;

        // Compute
        result = f ? (px + py) : (px & py);

        // Post-process
        out = no ? ~result : result;

        // Flags
        zr = (out == 16'h0000);
        ng = out[15];
    end

endmodule
```

### Breaking it down

**`always_comb`** tells the synthesis tool this is combinational logic. No clock, no flip-flops. The block re-evaluates whenever any signal in its sensitivity list changes. Compare this to Part 1's `always_ff @(posedge clk)`, which only triggers on clock edges.

**Intermediate signals `px` and `py`** hold the pre-processed versions of x and y. SystemVerilog allows multiple assignments to the same variable inside `always_comb`, with each one replacing the previous. This is perfectly valid for combinational logic (unlike `always_ff` where you'd need to be careful).

**`result`** is 16 bits. When two 16-bit values are added and overflow, the carry bit is silently discarded. That is exactly the two's complement wraparound behaviour we rely on for subtraction.

**`zr = (out == 16'h0000)`** computes the zero flag as a comparator, not a NOR gate. The synthesis tool will optimise this appropriately.

**`ng = out[15]`** is the sign bit of the 16-bit output in two's complement representation.

---

## Testing It

The testbench runs all 28 ISA operations and two flag edge cases. Since the ALU is combinational, there is no clock: we set inputs, wait one nanosecond for propagation, and check.

```systemverilog
// Excerpt from tb_alu.sv

// x=5, y=3 for all A-variant operations

{zx,nx,zy,ny,f,no} = 6'b000010; check(16'h0008, 0, 0, "D+A");  // 5+3=8
{zx,nx,zy,ny,f,no} = 6'b010011; check(16'h0002, 0, 0, "D-A");  // 5-3=2
{zx,nx,zy,ny,f,no} = 6'b000111; check(16'hFFFE, 0, 1, "A-D");  // 3-5=-2
{zx,nx,zy,ny,f,no} = 6'b011111; check(16'h0006, 0, 0, "D+1");  // 5+1=6
{zx,nx,zy,ny,f,no} = 6'b000000; check(16'h0001, 0, 0, "D&A");  // 5&3=1
{zx,nx,zy,ny,f,no} = 6'b010101; check(16'h0007, 0, 0, "D|A");  // 5|3=7
```

### Running it

```bash
# From the 02-alu/ directory
iverilog -g2012 -o tb_alu tb/tb_alu.sv rtl/alu.sv && vvp tb_alu
```

Output:

```
[PASS] 01: 0      → 0x0000 (zr=1 ng=0)
[PASS] 02: 1      → 0x0001 (zr=0 ng=0)
[PASS] 03: -1     → 0xFFFF (zr=0 ng=1)
[PASS] 04: D      → 0x0005 (zr=0 ng=0)
[PASS] 05: A      → 0x0003 (zr=0 ng=0)
[PASS] 06: !D     → 0xFFFA (zr=0 ng=1)
[PASS] 07: !A     → 0xFFFC (zr=0 ng=1)
[PASS] 08: -D     → 0xFFFB (zr=0 ng=1)
[PASS] 09: -A     → 0xFFFD (zr=0 ng=1)
[PASS] 10: D+1    → 0x0006 (zr=0 ng=0)
[PASS] 11: A+1    → 0x0004 (zr=0 ng=0)
[PASS] 12: D-1    → 0x0004 (zr=0 ng=0)
[PASS] 13: A-1    → 0x0002 (zr=0 ng=0)
[PASS] 14: D+A    → 0x0008 (zr=0 ng=0)
[PASS] 15: D-A    → 0x0002 (zr=0 ng=0)
[PASS] 16: A-D    → 0xFFFE (zr=0 ng=1)
[PASS] 17: D&A    → 0x0001 (zr=0 ng=0)
[PASS] 18: D|A    → 0x0007 (zr=0 ng=0)
[PASS] 19: M      → 0x0007 (zr=0 ng=0)
[PASS] 20: !M     → 0xFFF8 (zr=0 ng=1)
[PASS] 21: -M     → 0xFFF9 (zr=0 ng=1)
[PASS] 22: M+1    → 0x0008 (zr=0 ng=0)
[PASS] 23: M-1    → 0x0006 (zr=0 ng=0)
[PASS] 24: D+M    → 0x000C (zr=0 ng=0)
[PASS] 25: D-M    → 0xFFFE (zr=0 ng=1)
[PASS] 26: M-D    → 0x0002 (zr=0 ng=0)
[PASS] 27: D&M    → 0x0005 (zr=0 ng=0)
[PASS] 28: D|M    → 0x0007 (zr=0 ng=0)
[PASS] 29: zr     → 0x0000 (zr=1 ng=0)
[PASS] 30: ng     → 0x8000 (zr=0 ng=1)
All 30 tests passed.
```

Every operation verified, including the flag edge cases.

---

## Try It Yourself

The interactive demo lets you set x and y as 16-bit values, select any of the 28 operations from a dropdown, and watch the output and flags update instantly. You can also toggle the 6 control bits manually to explore what each one does.

**[Open the ALU Demo](https://kiki-pi-one.vercel.app/alu)**

The TypeScript implementation that drives the demo mirrors the SystemVerilog exactly:

```typescript
// alu.ts
export function computeALU(inputs: ALUInputs): ALUOutput {
  let px = inputs.zx ? 0 : inputs.x;
  px = inputs.nx ? (~px & 0xFFFF) : px;
  let py = inputs.zy ? 0 : inputs.y;
  py = inputs.ny ? (~py & 0xFFFF) : py;
  const result = inputs.f ? ((px + py) & 0xFFFF) : (px & py);
  const out    = inputs.no ? (~result & 0xFFFF) : result;
  return {
    out,
    zr: out === 0 ? 1 : 0,
    ng: (out >> 15) & 1 ? 1 : 0,
  };
}
```

Same algorithm, same output. One compiles to silicon; one runs in Chrome.

---

## Where This Is Used

In the final CPU, the ALU sits at the centre of every computation:

```systemverilog
// Inside cpu.sv (Part 5)
alu alu_unit (
    .x  (D),
    .y  (alu_y),      // mux: A when a=0, M when a=1
    .zx (inst[11]),
    .nx (inst[10]),
    .zy (inst[9]),
    .ny (inst[8]),
    .f  (inst[7]),
    .no (inst[6]),
    .out(alu_out),
    .zr (zr),
    .ng (ng)
);
```

The six `inst` bits come directly from the `cccccc` field of the C-instruction. No decoder needed. The instruction format and the ALU ports are designed to match exactly.

---

## What's Next

We can now compute. But computation is useless without somewhere to store results beyond the two registers we have.

In **Part 3**, we build **Data Memory**: 16,384 words of read/write RAM with memory-mapped I/O for the screen and keyboard. We'll see how a single memory address space handles both RAM and peripherals.

**[Part 3: Data Memory →](./03-memory.md)**

---

*[← Part 1: The Register](./01-registers.md)*
*[KiKi-Pi-One on GitHub](https://github.com/SreejitS/KiKi-Pi-One)*
*[Live Demo](https://kiki-pi-one.vercel.app/alu)*
