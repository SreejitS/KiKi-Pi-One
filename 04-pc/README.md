# 04 — Program Counter

> Part 4 of the [KiKi-Pi-One](../README.md) series.
> [Article](../articles/04-pc.md) | [Live Demo](https://kiki-pi-one.vercel.app/pc)

A 16-bit **program counter** that tracks which instruction to execute next. Normally increments by 1; can jump to any address or reset to zero. Three control signals with priority encoding: reset > load > inc.

---

## Interface

| Port    | Width | Direction | Description |
|---------|-------|-----------|-------------|
| `clk`   | 1     | Input     | Clock - rising-edge triggered |
| `in`    | 16    | Input     | Jump target (from A register in CPU) |
| `load`  | 1     | Input     | Jump enable - 1 to load `in` |
| `inc`   | 1     | Input     | Increment enable - 1 to advance by 1 |
| `reset` | 1     | Input     | Synchronous reset - 1 to set PC to 0 |
| `out`   | 16    | Output    | Current PC value (registered) |

---

## Priority Truth Table

```
reset  load  inc  │ Next PC
─────────────────┼──────────
  1      x    x   │ 0
  0      1    x   │ in
  0      0    1   │ PC + 1
  0      0    0   │ PC (hold)
```

When multiple signals are asserted, the highest-priority one wins.

---

## Timing Diagram

```
         ┌──┐  ┌──┐  ┌──┐  ┌──┐  ┌──┐  ┌──┐
clk   ───┘  └──┘  └──┘  └──┘  └──┘  └──┘  └─
          ↑     ↑     ↑     ↑     ↑     ↑
inc   ────────────────────────┐     ┌─────────
                              └─────┘
load  ──────────────────────────────────┐
                                        └─────
reset ─────┐
           └──────────────────────────────────
in    ──────────────────────────── 0x00C8 ────
out   ── 0000 ─── 0000 ── 0001 ── 0002 ─ 00C8
              ↑        ↑       ↑       ↑
           reset    hold    inc    load
```

```json
// WaveDrom source - paste at wavedrom.com
{ "signal": [
  { "name": "clk",   "wave": "p......" },
  { "name": "reset", "wave": "1.0...." },
  { "name": "inc",   "wave": "0...1.0" },
  { "name": "load",  "wave": "0.....1" },
  { "name": "in",    "wave": "x....=.", "data": ["0x00C8"] },
  { "name": "out",   "wave": "=.=.=.=", "data": ["0x0000", "0x0000", "0x0001", "0x00C8"] }
]}
```

---

## Behaviour

| Condition (highest first) | Effect on next rising edge |
|---------------------------|---------------------------|
| `reset = 1`              | `out ← 0`                 |
| `load = 1`               | `out ← in`                |
| `inc = 1`                | `out ← out + 1`           |
| none                     | `out` unchanged (hold)     |

Overflow wraps: 0xFFFF + 1 = 0x0000.

---

## Files

| File | Description |
|------|-------------|
| [`rtl/pc.sv`](rtl/pc.sv) | SystemVerilog implementation |
| [`tb/tb_pc.sv`](tb/tb_pc.sv) | Testbench (8 tests) |

## Running the Test

```bash
# From the 04-pc/ directory:
iverilog -g2012 -o tb_pc tb/tb_pc.sv rtl/pc.sv && vvp tb_pc
```

Expected output:

```
[PASS] Test 1: inc: 0->1
[PASS] Test 2: inc: 1->2
[PASS] Test 3: load: jump to 0x00C8
[PASS] Test 4: load beats inc: jump to 0x0200
[PASS] Test 5: reset beats load+inc: back to 0
[PASS] Test 6: hold: no signals, stays at 0
[PASS] Test 7: wrap: 0xFFFF+1 -> 0x0000
[PASS] Test 8: reset at zero stays zero
All 8 tests passed.
```

## Used In

- [`05-cpu/rtl/cpu.sv`](../05-cpu/rtl/cpu.sv) - addresses the instruction ROM; updated each cycle based on CPU jump logic

---

*← [03-memory](../03-memory/README.md) | Next: [05-cpu](../05-cpu/README.md) →*
