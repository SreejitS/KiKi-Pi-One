# KiKi-Pi-One ISA Specification

> **Version:** 1.0
> **Architecture:** 16-bit, Harvard-adjacent
> **Inspiration:** Nand2Tetris HACK computer

This document is the canonical reference for the KiKi-Pi-One instruction set architecture (ISA).
All hardware components, the assembler, and the web simulator are derived from this specification.

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Memory Model](#2-memory-model)
3. [Registers](#3-registers)
4. [Instruction Format](#4-instruction-format)
   - [A-Instruction](#41-a-instruction)
   - [C-Instruction](#42-c-instruction)
5. [ALU Operations](#5-alu-operations)
6. [Destination Bits](#6-destination-bits)
7. [Jump Conditions](#7-jump-conditions)
8. [Predefined Symbols](#8-predefined-symbols)
9. [Example Programs](#9-example-programs)

---

## 1. Design Philosophy

KiKi-Pi-One is designed around three constraints:

1. **Simplicity**  -  Every component must be explainable from first principles. No black boxes.
2. **Completeness**  -  The architecture must be Turing-complete and capable of running real programs.
3. **Teachability**  -  The ISA must be small enough to memorise but expressive enough to be interesting.

The result is a 16-bit von Neumann-inspired machine with:
- **Two instructions** (A and C)
- **Two general-purpose registers** (A and D)
- **One implicit memory operand** (M = RAM[A])
- **No floating point, no privilege levels, no interrupts**  -  just load, compute, jump

---

## 2. Memory Model

The address space is **16-bit** (65,536 locations), split into three regions:

```
Address Range       Region          Description
─────────────────────────────────────────────────────
0x0000 – 0x3FFF    Data RAM        16,384 words of general-purpose read/write memory
0x4000 – 0x5FFF    Screen Buffer   8,192 words  -  each bit maps to one pixel (256×512 px)
0x6000             Keyboard        Single word  -  holds the ASCII code of the last key pressed
```

All memory locations hold **16-bit signed integers** (two's complement).

> **Note:** Instructions live in separate ROM (instruction memory) and share no address space with RAM. The program counter (PC) addresses ROM; the A register addresses RAM.

---

## 3. Registers

| Register | Width | Description |
|---|---|---|
| **A** | 16-bit | Address register. Used to address RAM (`M = RAM[A]`) and hold 15-bit constants. Also feeds the ALU as a second operand. |
| **D** | 16-bit | Data register. General-purpose compute register. Primary ALU input. |
| **M** | implicit | Not a physical register  -  shorthand for `RAM[A]`. Reading M reads `RAM[A]`; writing M writes `RAM[A]`. |
| **PC** | 16-bit | Program counter. Holds the address of the next instruction in ROM. Normally increments; conditionally loads on jump. |

---

## 4. Instruction Format

Every instruction is exactly **16 bits** wide. The most significant bit (bit 15) distinguishes the two instruction types.

### 4.1 A-Instruction

```
Bit:  15  14  13  12  11  10   9   8   7   6   5   4   3   2   1   0
       0   v   v   v   v   v   v   v   v   v   v   v   v   v   v   v
       └───────────────────── 15-bit value ──────────────────────────┘
```

- **Bit 15 = 0** → A-instruction
- **Bits 14–0** = a 15-bit non-negative integer value

**Effect:** `A ← value`

The value is zero-extended to 16 bits and loaded into the A register. The MSB is always 0, so A always holds a value in the range `[0, 32767]` after an A-instruction.

**Assembly syntax:** `@value` or `@symbol`

```asm
@5       // A = 5      → binary: 0 000 000 000 000 101
@100     // A = 100    → binary: 0 000 000 001 100 100
@SCREEN  // A = 16384  → binary: 0 100 000 000 000 000
```

---

### 4.2 C-Instruction

```
Bit:  15  14  13  12  11  10   9   8   7   6   5   4   3   2   1   0
       1   1   1   a   c1  c2  c3  c4  c5  c6  d1  d2  d3  j1  j2  j3
       └──┘  └─────────── comp ──────────────┘ └── dest ──┘ └── jump ──┘
     (always
      1 1 1)
```

- **Bit 15 = 1** → C-instruction
- **Bits 14–13 = 1 1** → unused, always set to 1
- **Bit 12 = a** → selects ALU second input: `0` → use A register, `1` → use M (RAM[A])
- **Bits 11–6 = cccccc** → ALU operation selector (6 control bits)
- **Bits 5–3 = ddd** → destination (where to write the result)
- **Bits 2–0 = jjj** → jump condition

**Assembly syntax:** `dest=comp;jump` (dest and jump are optional)

```asm
D=A         // D ← A         (no jump)
D=D+A       // D ← D + A     (no jump)
M=D         // RAM[A] ← D    (no jump)
D;JGT       // if D > 0 jump to ROM[A]
0;JMP       // unconditional jump to ROM[A]
AMD=D+1     // A, M, D ← D + 1
```

---

## 5. ALU Operations

The ALU takes two 16-bit inputs (`x` = D register, `y` = A or M depending on the `a` bit) and produces a 16-bit output plus two flags:

| Flag | Meaning |
|---|---|
| `zr` | Output is zero |
| `ng` | Output is negative (bit 15 = 1) |

The 6 control bits (`zx nx zy ny f no`) configure the operation:

| `a` | `c1` | `c2` | `c3` | `c4` | `c5` | `c6` | Expression | Result |
|-----|------|------|------|------|------|------|------------|--------|
| 0   |  1   |  0   |  1   |  0   |  1   |  0   | `0`        | Constant 0 |
| 0   |  1   |  1   |  1   |  1   |  1   |  1   | `1`        | Constant 1 |
| 0   |  1   |  1   |  1   |  0   |  1   |  0   | `-1`       | Constant -1 |
| 0   |  0   |  0   |  1   |  1   |  0   |  0   | `D`        | D register |
| 0   |  1   |  1   |  0   |  0   |  0   |  0   | `A`        | A register |
| 1   |  1   |  1   |  0   |  0   |  0   |  0   | `M`        | RAM[A] |
| 0   |  0   |  0   |  1   |  1   |  0   |  1   | `!D`       | Bitwise NOT D |
| 0   |  1   |  1   |  0   |  0   |  0   |  1   | `!A`       | Bitwise NOT A |
| 1   |  1   |  1   |  0   |  0   |  0   |  1   | `!M`       | Bitwise NOT M |
| 0   |  0   |  0   |  1   |  1   |  1   |  1   | `-D`       | Two's complement negation of D |
| 0   |  1   |  1   |  0   |  0   |  1   |  1   | `-A`       | Two's complement negation of A |
| 1   |  1   |  1   |  0   |  0   |  1   |  1   | `-M`       | Two's complement negation of M |
| 0   |  0   |  1   |  1   |  1   |  1   |  1   | `D+1`      | D plus 1 |
| 0   |  1   |  1   |  0   |  1   |  1   |  1   | `A+1`      | A plus 1 |
| 1   |  1   |  1   |  0   |  1   |  1   |  1   | `M+1`      | M plus 1 |
| 0   |  0   |  0   |  1   |  1   |  1   |  0   | `D-1`      | D minus 1 |
| 0   |  1   |  1   |  0   |  0   |  1   |  0   | `A-1`      | A minus 1 |
| 1   |  1   |  1   |  0   |  0   |  1   |  0   | `M-1`      | M minus 1 |
| 0   |  0   |  0   |  0   |  0   |  1   |  0   | `D+A`      | D plus A |
| 1   |  0   |  0   |  0   |  0   |  1   |  0   | `D+M`      | D plus M |
| 0   |  0   |  1   |  0   |  0   |  1   |  1   | `D-A`      | D minus A |
| 1   |  0   |  1   |  0   |  0   |  1   |  1   | `D-M`      | D minus M |
| 0   |  0   |  0   |  0   |  1   |  1   |  1   | `A-D`      | A minus D |
| 1   |  0   |  0   |  0   |  1   |  1   |  1   | `M-D`      | M minus D |
| 0   |  0   |  0   |  0   |  0   |  0   |  0   | `D&A`      | Bitwise AND |
| 1   |  0   |  0   |  0   |  0   |  0   |  0   | `D&M`      | Bitwise AND with M |
| 0   |  0   |  1   |  0   |  1   |  0   |  1   | `D\|A`     | Bitwise OR |
| 1   |  0   |  1   |  0   |  1   |  0   |  1   | `D\|M`     | Bitwise OR with M |

### How the ALU works internally

The 6 control bits apply transformations in sequence:

```
1. zx   -  if 1, zero out x (x = 0)
2. nx   -  if 1, bitwise NOT x
3. zy   -  if 1, zero out y (y = 0)
4. ny   -  if 1, bitwise NOT y
5. f    -  if 1, output = x + y (ADD); if 0, output = x & y (AND)
6. no   -  if 1, bitwise NOT the output
```

Example: computing `D+1` (control bits `011111`):
```
zx=0: x = D (unchanged)
nx=1: x = ~D
zy=1: y = 0
ny=1: y = ~0 = 0xFFFF = -1
f=1:  out = ~D + (-1) = ~D - 1
no=1: out = ~(~D - 1) = D + 1   ✓   (by two's complement identity)
```

---

## 6. Destination Bits

The 3-bit `ddd` field controls where the ALU result is written. Multiple destinations can be active simultaneously.

| `d1` | `d2` | `d3` | Mnemonic | Destination |
|------|------|------|----------|-------------|
|  0   |  0   |  0   | `null`   | Result discarded |
|  0   |  0   |  1   | `M`      | RAM[A] |
|  0   |  1   |  0   | `D`      | D register |
|  0   |  1   |  1   | `MD`     | RAM[A] and D |
|  1   |  0   |  0   | `A`      | A register |
|  1   |  0   |  1   | `AM`     | A register and RAM[A] |
|  1   |  1   |  0   | `AD`     | A register and D |
|  1   |  1   |  1   | `AMD`    | A register, RAM[A], and D |

---

## 7. Jump Conditions

The 3-bit `jjj` field controls conditional branching. If the condition is true, the PC is loaded with the current value of the A register (jumping to ROM[A]); otherwise PC increments normally.

The condition is evaluated against the **ALU output** of the current instruction (not a previously stored value).

| `j1` | `j2` | `j3` | Mnemonic | Condition |
|------|------|------|----------|-----------|
|  0   |  0   |  0   | `null`   | No jump |
|  0   |  0   |  1   | `JGT`    | Jump if out > 0 |
|  0   |  1   |  0   | `JEQ`    | Jump if out = 0 |
|  0   |  1   |  1   | `JGE`    | Jump if out ≥ 0 |
|  1   |  0   |  0   | `JLT`    | Jump if out < 0 |
|  1   |  0   |  1   | `JNE`    | Jump if out ≠ 0 |
|  1   |  1   |  0   | `JLE`    | Jump if out ≤ 0 |
|  1   |  1   |  1   | `JMP`    | Unconditional jump |

**Evaluating jump flags:**

```
out > 0  ↔  (zr = 0) AND (ng = 0)
out = 0  ↔  (zr = 1)
out < 0  ↔  (ng = 1)
```

---

## 8. Predefined Symbols

The assembler recognises these symbols without explicit definition:

### Virtual Registers

| Symbol | RAM Address | Use |
|---|---|---|
| `R0` – `R15` | 0 – 15 | General-purpose; `R0`–`R2` used by calling convention |
| `SP`  | 0 | Stack pointer |
| `LCL` | 1 | Local variable base |
| `ARG` | 2 | Argument base |
| `THIS` | 3 | Object base pointer |
| `THAT` | 4 | Array/string base pointer |

### I/O Memory Maps

| Symbol | Address | Description |
|---|---|---|
| `SCREEN` | 16384 (0x4000) | Base address of the screen buffer |
| `KBD`    | 24576 (0x6000) | Keyboard register |

---

## 9. Example Programs

### 9.1 Add two numbers: `R2 = R0 + R1`

```asm
// R2 = R0 + R1
@R0      // A = 0        → 0 000 000 000 000 000
D=M      // D = RAM[0]   → 1 111 110 000 010 000
@R1      // A = 1        → 0 000 000 000 000 001
D=D+M    // D = D + RAM[1] → 1 111 000 010 010 000
@R2      // A = 2        → 0 000 000 000 000 010
M=D      // RAM[2] = D   → 1 111 001 100 001 000

// Infinite loop (halt)
@6       // A = 6 (this instruction's address)
0;JMP    // jump to self → 1 110 101 010 000 111
```

### 9.2 Compute max: `R2 = max(R0, R1)`

```asm
// R2 = max(R0, R1)
@R0
D=M         // D = R0
@R1
D=D-M       // D = R0 - R1
@THEN
D;JGT       // if R0 > R1 jump to THEN
@R1
D=M         // D = R1 (R1 is larger or equal)
@END
0;JMP
(THEN)
@R0
D=M         // D = R0 (R0 is larger)
(END)
@R2
M=D         // R2 = max

// Halt
@END
0;JMP
```

### 9.3 Fill screen black

```asm
// Fill all screen pixels black (bit = 1)
(LOOP)
  @SCREEN    // A = 16384
  D=A
  @8192      // number of 16-bit words in screen buffer
  D=D+A      // D = SCREEN + 8192 (one past end)
  @end
  D=A
// ... (full implementation in 07-assembler/programs/fill.asm)
```

---

*Next: [01-registers  -  The Register](../01-registers/README.md)*
