# 02 - ALU

> Part 2 of the [KiKi-Pi-One](../README.md) series.
> [Article](../articles/02-alu.md) | [Live Demo](https://kiki-pi-one.vercel.app/alu)

A purely **combinational** 16-bit ALU. No clock. Output updates immediately when inputs change.

---

## Interface

| Port | Direction | Width | Description |
|------|-----------|-------|-------------|
| `x`  | input  | 16 | First operand (always from D register in the CPU) |
| `y`  | input  | 16 | Second operand (A register or RAM[A], muxed by CPU) |
| `zx` | input  |  1 | Zero x before processing |
| `nx` | input  |  1 | Bitwise NOT x (after zx) |
| `zy` | input  |  1 | Zero y before processing |
| `ny` | input  |  1 | Bitwise NOT y (after zy) |
| `f`  | input  |  1 | 1 = add (x+y), 0 = AND (x&y) |
| `no` | input  |  1 | Bitwise NOT the output |
| `out`| output | 16 | Result |
| `zr` | output |  1 | 1 if out == 0 |
| `ng` | output |  1 | 1 if out < 0 (out[15] == 1) |

---

## Control Bits Truth Table (all 28 ISA operations)

| Mnemonic | zx | nx | zy | ny |  f | no | Result |
|----------|----|----|----|----|----|----|--------|
| `0`      |  1 |  0 |  1 |  0 |  1 |  0 | Constant 0 |
| `1`      |  1 |  1 |  1 |  1 |  1 |  1 | Constant 1 |
| `-1`     |  1 |  1 |  1 |  0 |  1 |  0 | Constant -1 |
| `D`      |  0 |  0 |  1 |  1 |  0 |  0 | D |
| `A`/`M`  |  1 |  1 |  0 |  0 |  0 |  0 | A or M |
| `!D`     |  0 |  0 |  1 |  1 |  0 |  1 | NOT D |
| `!A`/`!M`|  1 |  1 |  0 |  0 |  0 |  1 | NOT A or M |
| `-D`     |  0 |  0 |  1 |  1 |  1 |  1 | Negate D |
| `-A`/`-M`|  1 |  1 |  0 |  0 |  1 |  1 | Negate A or M |
| `D+1`    |  0 |  1 |  1 |  1 |  1 |  1 | D + 1 |
| `A+1`/`M+1`| 1| 1 |  0 |  1 |  1 |  1 | A/M + 1 |
| `D-1`    |  0 |  0 |  1 |  1 |  1 |  0 | D - 1 |
| `A-1`/`M-1`| 1| 1 |  0 |  0 |  1 |  0 | A/M - 1 |
| `D+A`/`D+M`| 0| 0 |  0 |  0 |  1 |  0 | D + A or M |
| `D-A`/`D-M`| 0| 1 |  0 |  0 |  1 |  1 | D - A or M |
| `A-D`/`M-D`| 0| 0 |  0 |  1 |  1 |  1 | A/M - D |
| `D&A`/`D&M`| 0| 0 |  0 |  0 |  0 |  0 | D AND A/M |
| `D\|A`/`D\|M`| 0| 1| 0 |  1 |  0 |  1 | D OR A/M |

The `a` bit (which selects A vs M as the y input) is decoded in the CPU and used to mux between A register and RAM[A] before driving the `y` port of this module.

---

## Timing

The ALU is purely combinational — output changes within the same time step as inputs. No clock edge required.

```json
// WaveDrom — paste at wavedrom.com
{ "signal": [
  { "name": "x",   "wave": "x=.=.", "data": ["5", "5", "5"] },
  { "name": "y",   "wave": "x=.=.", "data": ["3", "3", "3"] },
  { "name": "ctrl","wave": "x=.=.", "data": ["D+A", "D-A", "D&A"] },
  { "name": "out", "wave": "x=.=.", "data": ["8",  "2",  "1"] },
  { "name": "zr",  "wave": "x0..." },
  { "name": "ng",  "wave": "x0.0." }
]}
```

---

## Running the Testbench

```bash
# From the repo root
iverilog -g2012 -o tb_alu \
  02-alu/tb/tb_alu.sv \
  02-alu/rtl/alu.sv \
&& vvp tb_alu
```
