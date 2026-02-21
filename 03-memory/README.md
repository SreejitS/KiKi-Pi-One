# 03 — Data Memory

> Part 3 of the [KiKi-Pi-One](../README.md) series.
> [Article](../articles/03-memory.md) | [Live Demo](https://kiki-pi-one.vercel.app/memory)

A 16K-word **synchronous RAM** with memory-mapped I/O for screen and keyboard. One address bus, three devices.

---

## Memory Map

```
Address         Region       Size        Description
──────────────────────────────────────────────────────────────
0x0000–0x3FFF   RAM          16,384 w    General-purpose read/write
0x4000–0x5FFF   Screen       8,192 w     Each bit = one pixel (256×512)
0x6000          Keyboard     1 w         ASCII code of last key (read-only)
```

Address decoding uses two bits:

```
address[14]  address[13]  Region
───────────────────────────────────
    0            x        RAM
    1            0        Screen
    1            1        Keyboard
```

---

## Interface

| Port      | Width | Direction | Description |
|-----------|-------|-----------|-------------|
| `clk`     | 1     | Input     | Clock — rising-edge triggered |
| `load`    | 1     | Input     | Write enable — 1 to write on next edge |
| `address` | 15    | Input     | Memory address (0x0000–0x7FFF) |
| `in`      | 16    | Input     | Data to write |
| `out`     | 16    | Output    | Data at current address (combinational) |

---

## Timing Diagram

```
         ┌──┐  ┌──┐  ┌──┐  ┌──┐  ┌──┐
clk   ───┘  └──┘  └──┘  └──┘  └──┘  └─
          ↑     ↑     ↑     ↑     ↑
load  ────────────┐     ┌────────────────
                  └─────┘
addr  ──── 0005 ──┤ 0005├───── 0005 ─────
in    ──── CAFE ──┤ CAFE├───── DEAD ─────
out   ──── 0000 ──┼─────┤CAFE ──────────
                              ↑
                         latches here
```

```json
// WaveDrom source — paste at wavedrom.com
{ "signal": [
  { "name": "clk",     "wave": "p....." },
  { "name": "load",    "wave": "0.1.0." },
  { "name": "address", "wave": "x.=...", "data": ["0x0005"] },
  { "name": "in",      "wave": "x.=...", "data": ["0xCAFE"] },
  { "name": "out",     "wave": "x...=.", "data": ["0xCAFE"] }
]}
```

---

## Behaviour

| `load` | Effect on next rising edge |
|--------|---------------------------|
| `0`    | No write — `out` reflects stored value at `address` |
| `1`    | `mem[address] ← in` — value latched, `out` updates |

Keyboard (0x6000) is read-only. Writes to 0x6000 are silently ignored regardless of `load`.

---

## Files

| File | Description |
|------|-------------|
| [`rtl/memory.sv`](rtl/memory.sv) | SystemVerilog implementation |
| [`tb/tb_memory.sv`](tb/tb_memory.sv) | Testbench (10 tests) |

## Running the Test

```bash
# From the 03-memory/ directory:
iverilog -g2012 -o tb_memory tb/tb_memory.sv rtl/memory.sv && vvp tb_memory
```

Expected output:

```
[PASS] 01: RAM write/read at 0x0000
[PASS] 02: RAM write/read at 0x3FFF (last RAM word)
[PASS] 03: RAM load=0 holds value
[PASS] 04: Screen write/read at 0x4000
[PASS] 05: Screen write/read at 0x5FFF (last screen word)
[PASS] 06: Keyboard read returns external value
[PASS] 07: Keyboard write is ignored (read-only)
[PASS] 08: Multiple RAM writes don't interfere
[PASS] 09: Boundary: RAM 0x3FFF and Screen 0x4000 are separate
[PASS] 10: RAM holds across multiple ticks with load=0
All 10 tests passed.
```

## Used In

- [`05-cpu/rtl/cpu.sv`](../05-cpu/rtl/cpu.sv) — M = RAM[A], addressed via the A register

---

*← [02-alu](../02-alu/README.md) | Next: [04-pc](../04-pc/README.md) →*
