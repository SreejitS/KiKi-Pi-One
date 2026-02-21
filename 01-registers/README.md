# 01 — Register

A **register** is a single-bit memory cell scaled to 16 bits. It stores one 16-bit value and holds it indefinitely until told to load a new one.

## Interface

| Port  | Width | Direction | Description |
|-------|-------|-----------|-------------|
| `clk` | 1     | Input     | Clock — rising-edge triggered |
| `load`| 1     | Input     | Write enable — 1 to latch `in`, 0 to hold |
| `in`  | 16    | Input     | Data to store |
| `out` | 16    | Output    | Currently stored value |

## Timing Diagram

```
        ┌──┐  ┌──┐  ┌──┐  ┌──┐  ┌──┐
clk  ───┘  └──┘  └──┘  └──┘  └──┘  └─
         ↑     ↑     ↑     ↑     ↑
load ──────────────┐     ┌────────────
                   └─────┘
in   ──── DEAD ────┤ABCD ├───── FFFF ─
out  ──── 0000 ────┼─────┤ABCD ───────
                               ↑
                          latches here
```

```json
// WaveDrom source
{ "signal": [
  { "name": "clk",  "wave": "p....." },
  { "name": "load", "wave": "0.1.0." },
  { "name": "in",   "wave": "x.=.x.", "data": ["0xABCD"] },
  { "name": "out",  "wave": "x...=.", "data": ["0xABCD"] }
]}
```

## Behaviour

| `load` | Effect on next rising edge |
|--------|---------------------------|
| `0`    | `out` unchanged            |
| `1`    | `out ← in`                 |

## Files

| File | Description |
|---|---|
| [`rtl/register.sv`](rtl/register.sv) | SystemVerilog implementation |
| [`tb/tb_register.sv`](tb/tb_register.sv) | Testbench (6 tests) |

## Running the Test

```bash
# From the 01-registers/ directory:
iverilog -g2012 -o tb_register tb/tb_register.sv rtl/register.sv && vvp tb_register
```

Expected output:

```
[PASS] Test 1: load=0: holds initial 0x0000 → out=0x0000
[PASS] Test 2: load=1: latches 0xABCD → out=0xABCD
[PASS] Test 3: load=0: holds 0xABCD → out=0xABCD
[PASS] Test 4: load=1: latches 0x1234 → out=0x1234
[PASS] Test 5: load=1: overwrites to 0x5678 → out=0x5678
[PASS] Test 6: load=0: holds 0x5678 across 3 ticks
All 6 tests passed.
```

## Used In

- [`05-cpu/rtl/cpu.sv`](../05-cpu/rtl/cpu.sv) — instantiated as Register_A and Register_D

---

*← [00-spec/ISA.md](../00-spec/ISA.md) | Next: [02-alu](../02-alu/README.md) →*
