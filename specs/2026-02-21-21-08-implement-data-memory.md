---
task: "Implement the data memory component (Part 3): SystemVerilog RTL + testbench, article draft, web demo, CI integration"
created: "2026-02-21 21:08"
status: implemented
---

## Problem

The CPU has registers and an ALU but nowhere to store more than two values. We need data memory: a 16K-word synchronous RAM with memory-mapped I/O regions for screen and keyboard, addressable through the A register.

## Hard constraints

- **ISA spec (Section 2)** defines the memory map exactly:
  - `0x0000–0x3FFF` → 16,384 words of general-purpose RAM
  - `0x4000–0x5FFF` → 8,192 words of screen buffer (each bit = one pixel)
  - `0x6000` → keyboard register (read-only, single word)
- **15-bit address** — the CPU uses `address[14:0]` to reach all three regions
- **M = RAM[A]** — reading M reads `RAM[A]`, writing M writes `RAM[A]`
- **Synchronous write, combinational read** — writes happen on clock edge when `load=1`; reads are asynchronous (output reflects current address immediately)
- **Keyboard is read-only** — writes to `0x6000` are silently ignored
- **Pattern convention** — must follow the per-article pattern from CLAUDE.md (rtl, tb, README, article, lib TS, app page, CI step, home page update)

## Design

### Address decoding (hand-traced)

The 15-bit address naturally partitions using bits [14] and [13]:

```
address[14]  address[13]  Region         Index bits
─────────────────────────────────────────────────────
    0            x        RAM (16K)      address[13:0]
    1            0        Screen (8K)    address[12:0]
    1            1        Keyboard       (single word)
```

Verification:
- `0x3FFF` = `0b011_1111_1111_1111` → [14]=0 → RAM ✓
- `0x4000` = `0b100_0000_0000_0000` → [14]=1, [13]=0 → Screen ✓
- `0x5FFF` = `0b101_1111_1111_1111` → [14]=1, [13]=0 → Screen ✓
- `0x6000` = `0b110_0000_0000_0000` → [14]=1, [13]=1 → Keyboard ✓

### SystemVerilog module

Interface:

| Port      | Width | Direction | Description                     |
|-----------|-------|-----------|---------------------------------|
| `clk`     | 1     | input     | Clock (rising-edge triggered)   |
| `load`    | 1     | input     | Write enable                    |
| `address` | 15    | input     | Memory address (0x0000–0x7FFF)  |
| `in`      | 16    | input     | Data to write                   |
| `out`     | 16    | output    | Data at current address         |

Internal structure:
- `ram[0:16383]` — 16-bit array for general-purpose RAM
- `screen[0:8191]` — 16-bit array for screen buffer
- `kbd` — single 16-bit register (driven externally in CPU, hard-wired in module for testability)
- Address decoder uses `address[14]` and `address[13]` as above
- Synchronous write: `always_ff @(posedge clk)` with load enable
- Asynchronous read: `always_comb` selects output based on address region

No alternatives considered — this is the standard HACK memory architecture. Deviation would break ISA compliance.

### Testbench

10–12 tests covering:
1. Write and read from RAM address 0x0000
2. Write and read from RAM address 0x3FFF (last RAM word)
3. Write without `load=1` — value should NOT change
4. Write and read from screen address 0x4000 (first screen word)
5. Write and read from screen address 0x5FFF (last screen word)
6. Read keyboard register 0x6000 (from externally set value)
7. Write to keyboard 0x6000 then read — write should be ignored
8. Multiple writes to different RAM addresses don't interfere
9. Boundary test: RAM at 0x3FFF, then Screen at 0x4000 — different regions
10. Hold test: value persists across multiple clock cycles with load=0

### Web demo — `memory` page

**Core teaching goal:** Make memory-mapped I/O tangible. The user writes to addresses and sees different things happen depending on where they write — same address bus, different devices.

**Layout (3 sections):**

1. **Address + Data controls** (top)
   - 15-bit address input using the familiar bit-toggle grid
   - A region indicator badge that updates live: "RAM", "Screen", or "Keyboard" — changes color as you change address
   - 16-bit data input using bit-toggle grid (reuse pattern from register demo)
   - Load toggle + Clock tick button (same as register demo)
   - Output display: shows the 16-bit value currently at the selected address

2. **Memory map sidebar** (right or below on mobile)
   - Visual bar showing the three address regions with proportional sizing
   - Current address highlighted with a marker
   - Labels: RAM 0x0000–0x3FFF | Screen 0x4000–0x5FFF | KBD 0x6000
   - Color-coded (e.g., emerald for RAM, blue for screen, amber for keyboard)

3. **Activity and visualization** (bottom)
   - **Left: Recent operations table** — last 8 read/write operations (same pattern as register clock history)
   - **Right: Screen mini-preview** — a small pixel grid (~64x32 or similar) that renders the first few screen memory words as actual pixels. When the user writes to a screen address, pixels light up. This is the "aha!" moment for memory-mapped I/O.
   - Keyboard capture: when the demo is focused, keypresses update address 0x6000 and the output display reflects this

**Simplifications:** The full screen is 256×512 pixels (8K words). The mini-preview only renders a portion (first ~128 words = a small section). This is enough to demonstrate the concept without performance concerns.

### TypeScript lib — `memory.ts`

Mirrors `memory.sv`:
- `MemoryState`: contains `ram: Uint16Array(16384)`, `screen: Uint16Array(8192)`, `kbd: number`
- `tickMemory(state, inputs)` → new state (synchronous write)
- `readMemory(state, address)` → value (combinational read)
- Address decoding logic identical to SV

### Article — `03-memory.md`

Following the exact article structure from CLAUDE.md:

1. **Series header** with links to Part 2 and GitHub
2. **Hook:** "We can compute, but we only have two registers. Real programs need thousands of variables. Even a simple loop counter needs somewhere to live."
3. **Interface table** + ASCII block diagram showing address bus splitting to RAM/Screen/Keyboard
4. **Timing diagram** (WaveDrom JSON) — show write-then-read, and load=0 hold
5. **The big insight: Memory-mapped I/O** — explain that screen and keyboard aren't separate "peripherals" — they're just addresses. Write to 0x4000 and pixels appear. Read 0x6000 and you get the last key pressed. One address bus, three devices.
6. **Address decoding walkthrough** — trace bit [14] and [13] like we traced D+1 in the ALU article
7. **Implementation** — full SystemVerilog with line-by-line explanation
8. **Testbench** — show key tests and output
9. **Try it yourself** — link to demo, mention the screen pixel preview
10. **Where this is used** — show how the CPU connects `M = RAM[A]`
11. **What's next** — bridge to Part 4: Program Counter

## Correctness argument

Address decoding hand-trace (exhaustive on boundaries):

```
addr = 0x0000 (0b000_0000_0000_0000):  [14]=0          → RAM, index=0x0000     ✓
addr = 0x3FFF (0b011_1111_1111_1111):  [14]=0          → RAM, index=0x3FFF     ✓
addr = 0x4000 (0b100_0000_0000_0000):  [14]=1, [13]=0  → Screen, index=0x0000  ✓
addr = 0x5FFF (0b101_1111_1111_1111):  [14]=1, [13]=0  → Screen, index=0x1FFF  ✓
addr = 0x6000 (0b110_0000_0000_0000):  [14]=1, [13]=1  → Keyboard              ✓
```

Write-then-read correctness:
- Cycle N: `load=1, address=A, in=V` → on posedge, `ram[A] <= V`
- Same cycle N (after posedge): `out` reflects `ram[A]` via `always_comb` → `out = V`
- Cycle N+1: `load=0, address=A` → no write, `out` still `V` ✓

Keyboard read-only:
- `load=1, address=0x6000, in=V` → `always_ff` block has no case for keyboard → `kbd` unchanged ✓

## Highest-risk assumption

The screen mini-preview in the web demo is the riskiest piece. Rendering even a subset of 8K words as individual pixels in React could cause performance issues if done naively (thousands of DOM elements). Mitigation: use a `<canvas>` element to render the pixel grid, not individual divs. If canvas is too complex, fall back to rendering only the first 16 words (256 pixels) as a 16×16 grid of small divs.

## Files to create or modify

| File | Action | Reason |
|------|--------|--------|
| `03-memory/rtl/memory.sv` | create | SystemVerilog implementation |
| `03-memory/tb/tb_memory.sv` | create | Testbench with ~10 tests |
| `03-memory/README.md` | modify | Replace placeholder with interface table + WaveDrom |
| `articles/03-memory.md` | create | Full article draft |
| `08-web-demo/src/lib/memory.ts` | create | TypeScript mirror of memory.sv |
| `08-web-demo/src/app/memory/page.tsx` | create | Interactive demo page |
| `08-web-demo/src/app/page.tsx` | modify | Update Data Memory entry: add href="/memory", status="live" |
| `08-web-demo/src/app/layout.tsx` | modify | Add "Memory" nav link |
| `.github/workflows/test.yml` | modify | Add memory testbench step |

## Steps

1. **Create `03-memory/rtl/memory.sv`** — implement the module with address decoding, synchronous write, combinational read
2. **Create `03-memory/tb/tb_memory.sv`** — 10+ tests covering RAM, screen, keyboard, boundaries, hold, write-ignore
3. **Update `03-memory/README.md`** — interface table, WaveDrom timing, address map diagram
4. **Create `08-web-demo/src/lib/memory.ts`** — TypeScript mirror with `MemoryState`, `tickMemory()`, `readMemory()`
5. **Create `08-web-demo/src/app/memory/page.tsx`** — interactive demo with address controls, memory map visualization, screen preview, keyboard capture
6. **Update `08-web-demo/src/app/page.tsx`** — set Data Memory href="/memory" and status="live"
7. **Update `08-web-demo/src/app/layout.tsx`** — add Memory nav link
8. **Create `articles/03-memory.md`** — full article draft following CLAUDE.md structure
9. **Update `.github/workflows/test.yml`** — add memory testbench step

## Out of scope

- Full 256×512 screen rendering (that's a Part 6/Computer concern)
- Instruction ROM (separate from data memory per ISA — covered in Part 5/CPU)
- Stack pointer logic (software convention, not hardware)
- Performance optimization of the web demo beyond basic canvas usage
