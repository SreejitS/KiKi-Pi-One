---
medium_url: ''
part: 0
series: KiKi-Pi-One
status: ready
tags:
- cpu-design
- computer-architecture
- hardware
- isa
- kiki-pi-one
title: 'Part 0: The Instruction Set Architecture - Designing KiKi-Pi-One''s ISA'
wordpress_url: ''
---

# Part 0: The Instruction Set Architecture

*This is Part 0 of the KiKi-Pi-One series, where we build a 16-bit CPU from scratch.*
*[GitHub](https://github.com/SreejitS/KiKi-Pi-One)*

---

Before writing a single line of hardware code, we need to answer one fundamental question:

> **What instructions should our CPU understand?**

This document is the answer. The Instruction Set Architecture (ISA) is the contract between the hardware and software sides of a computer. Every component we build (the ALU, the registers, the CPU, and the assembler) is derived from this spec. Get the ISA wrong, and everything downstream is wrong.

Let's design it carefully.

---

## Why Design Your Own ISA?

When most people think "CPU", they think x86 or ARM: architectures with hundreds of instructions, dozens of addressing modes, and 40 years of backwards compatibility baggage.

We're not doing that.

KiKi-Pi-One uses a deliberately minimal ISA with exactly **two instruction types**. This isn't a limitation; it's a design choice. With just two instruction types, we can:

- Understand every bit of every instruction
- Build the hardware without a lookup table
- Write programs without a manual
- Implement a complete assembler in under 200 lines of Python

The architecture is inspired by the Nand2Tetris HACK computer, which is one of the most elegant minimal ISAs I've encountered. I've kept its core structure and made it my own.

---

## The Big Picture

Every program our CPU runs is a sequence of 16-bit binary words stored in ROM (instruction memory). The CPU fetches one word per clock cycle and executes it.

There are two kinds of words our CPU will encounter:

```
0 vvvvvvvvvvvvvvv   ← A-instruction (bit 15 = 0)
111accccccdddjjj    ← C-instruction (bit 15 = 1)
```

That's it. Let's look at each.

---

## The A-Instruction: Loading a Value

The A-instruction is the simpler of the two. It loads a 15-bit constant directly into the **A register**.

```
Bit:  15  14 13 12 11 10  9  8  7  6  5  4  3  2  1  0
       0   v  v  v  v  v  v  v  v  v  v  v  v  v  v  v
       └──────────────── 15-bit value ─────────────────┘
```

Bit 15 is always 0. The remaining 15 bits hold any value from 0 to 32,767.

In assembly, you write it with an `@` prefix:

```asm
@5       // loads 5 into A
@100     // loads 100 into A
@SCREEN  // loads 16384 into A (predefined symbol)
```

The A register is the workhorse of our architecture. It serves double duty:
1. **As a data register**: holds a value that can be used by the ALU
2. **As an address register**: its value tells the CPU where in RAM to read/write (`M = RAM[A]`)

Any time you want to work with a memory address or a large constant, you first load it into A.

---

## The C-Instruction: Compute, Store, Jump

The C-instruction is where all the interesting work happens. It tells the CPU to:

1. **Compute** something (using the ALU)
2. **Store** the result somewhere (register, memory, or nowhere)
3. **Maybe jump** to a different instruction

```
Bit:  15  14  13  12  11  10   9   8   7   6   5   4   3   2   1   0
       1   1   1   a   c1  c2  c3  c4  c5  c6  d1  d2  d3  j1  j2  j3
       └──┘       └─────────── comp ──────────────┘ └─ dest ─┘ └─ jump ─┘
```

Bits 14–13 are always 1 (reserved). The remaining bits split into three fields:

### The `comp` field (bits 12–6): what to compute

Seven bits control the ALU. Bit 12 (`a`) selects whether the second ALU input comes from the **A register** or **M (RAM[A])**. The other six bits select the operation.

Here's the full operation table:

| Mnemonic | Bits (a cccccc) | Result |
|---|---|---|
| `0`    | `0 101010` | Constant 0 |
| `1`    | `0 111111` | Constant 1 |
| `-1`   | `0 111010` | Constant -1 |
| `D`    | `0 001100` | D register |
| `A`    | `0 110000` | A register |
| `M`    | `1 110000` | RAM[A] |
| `!D`   | `0 001101` | NOT D |
| `!A`   | `0 110001` | NOT A |
| `!M`   | `1 110001` | NOT M |
| `-D`   | `0 001111` | Negate D |
| `-A`   | `0 110011` | Negate A |
| `-M`   | `1 110011` | Negate M |
| `D+1`  | `0 011111` | D plus 1 |
| `A+1`  | `0 110111` | A plus 1 |
| `M+1`  | `1 110111` | M plus 1 |
| `D-1`  | `0 001110` | D minus 1 |
| `A-1`  | `0 110010` | A minus 1 |
| `M-1`  | `1 110010` | M minus 1 |
| `D+A`  | `0 000010` | D plus A |
| `D+M`  | `1 000010` | D plus M |
| `D-A`  | `0 010011` | D minus A |
| `D-M`  | `1 010011` | D minus M |
| `A-D`  | `0 000111` | A minus D |
| `M-D`  | `1 000111` | M minus D |
| `D&A`  | `0 000000` | D AND A |
| `D&M`  | `1 000000` | D AND M |
| `D\|A` | `0 010101` | D OR A |
| `D\|M` | `1 010101` | D OR M |

28 operations from 6 bits. The trick is that the 6 control bits apply successive transformations to the inputs (zero it, negate it, add or AND, negate the output) and different combinations give you all 28 useful operations. We'll explore this in detail in Part 2 (the ALU article).

### The `dest` field (bits 5–3): where to store the result

Three bits, eight possible destinations. Multiple can be active at once:

| Mnemonic | Bits | Writes to |
|---|---|---|
| `null` | `000` | Nowhere (result discarded) |
| `M`    | `001` | RAM[A] |
| `D`    | `010` | D register |
| `MD`   | `011` | RAM[A] and D |
| `A`    | `100` | A register |
| `AM`   | `101` | A register and RAM[A] |
| `AD`   | `110` | A register and D |
| `AMD`  | `111` | A register, RAM[A], and D |

### The `jump` field (bits 2–0): when to jump

After the ALU computes its result, the CPU checks the jump condition. If true, the program counter (PC) jumps to `ROM[A]`. If false, it just increments.

| Mnemonic | Bits | Condition |
|---|---|---|
| `null` | `000` | Never jump |
| `JGT`  | `001` | Jump if result > 0 |
| `JEQ`  | `010` | Jump if result = 0 |
| `JGE`  | `011` | Jump if result ≥ 0 |
| `JLT`  | `100` | Jump if result < 0 |
| `JNE`  | `101` | Jump if result ≠ 0 |
| `JLE`  | `110` | Jump if result ≤ 0 |
| `JMP`  | `111` | Always jump |

### Putting it together: reading a C-instruction

Let's decode `D=D+A` by hand:

```
Assembly:  D=D+A
           └─┬─┘└┬┘
           dest  comp (no jump)

dest = D  → d1=0, d2=1, d3=0 → 010
comp = D+A → a=0, cccccc=000010
jump = null → 000

Full instruction:
  1  1  1  0  0  0  0  0  1  0  0  1  0  0  0  0
  ↑  ↑  ↑  ↑  └────────────┘  └──────┘  └──────┘
  C  1  1  a    c1-c6 (D+A)   dest=D    jump=null
```

Binary: `1110000010010000` = `0xE090`

---

## Memory Map

```
┌─────────────────────────────────────┐
│ 0x0000 – 0x3FFF │  Data RAM (16K)   │
├─────────────────────────────────────┤
│ 0x4000 – 0x5FFF │  Screen Buffer    │  ← each bit = 1 pixel
├─────────────────────────────────────┤
│       0x6000    │  Keyboard         │  ← ASCII code of last key
└─────────────────────────────────────┘
```

The screen buffer is 8,192 16-bit words = 131,072 bits = 256 rows × 512 pixels. Writing a 1 to a bit turns the corresponding pixel black.

---

## Predefined Symbols

The assembler recognises these names without you defining them:

```
R0–R15    → RAM addresses 0–15   (virtual registers)
SP        → 0   (stack pointer)
LCL       → 1   (local variable base)
ARG       → 2   (argument base)
THIS      → 3   (object pointer)
THAT      → 4   (array/string pointer)
SCREEN    → 16384
KBD       → 24576
```

---

## A Real Program: Adding Two Numbers

Let's write a program that computes `R2 = R0 + R1` and annotate every bit:

```asm
@R0       // 0 000 000 000 000 000   → A = 0 (address of R0)
D=M       // 1 111 110 000 010 000   → D = RAM[0]
@R1       // 0 000 000 000 000 001   → A = 1
D=D+M     // 1 111 000 010 010 000   → D = D + RAM[1]
@R2       // 0 000 000 000 000 010   → A = 2
M=D       // 1 110 001 100 001 000   → RAM[2] = D

// Halt: infinite loop
@6        // 0 000 000 000 000 110   → A = 6 (this line's ROM address)
0;JMP     // 1 110 101 010 000 111   → jump to ROM[6] forever
```

Eight instructions. No ambiguity. Every bit has a purpose.

---

## What the ISA Gives Us

With just two instruction types, we can:
- Load any 15-bit constant into A
- Compute any of 28 arithmetic/logic operations
- Write to A, D, or RAM[A] (or all three simultaneously)
- Jump conditionally or unconditionally
- Access any of 65,536 memory addresses
- Read the keyboard and write to the screen

That's enough to implement a full assembler, a VM translator, and eventually compile a high-level object-oriented language.

The rest of the series is building the hardware that executes this spec.

---

## What's Next

In **Part 1**, we build the most fundamental storage element: the **register**. It's a 16-bit memory cell with one job: hold a value until told to update it.

**[Part 1: The Register →](./01-registers.md)**

---

*[KiKi-Pi-One on GitHub](https://github.com/SreejitS/KiKi-Pi-One)*
*[Full ISA Reference](../00-spec/ISA.md)*