# CLAUDE.md - KiKi-Pi-One Project Guide

## Project Overview

KiKi-Pi-One is a 16-bit CPU built from scratch. Each component is documented in a numbered
folder, implemented in SystemVerilog, and accompanied by a full article published to Medium
and WordPress (sreejits.com).

## Repository Structure

```
00-spec/        - ISA specification (canonical reference, not an article)
01-registers/   - Article 1: Registers
02-alu/         - Article 2: ALU
03-memory/      - Article 3: Data Memory
04-pc/          - Article 4: Program Counter
05-cpu/         - Article 5: CPU
06-computer/    - Article 6: The Computer
07-assembler/   - Article 7: The Assembler
08-web-demo/    - Next.js interactive simulator (one page per article)
articles/       - Markdown drafts for each article
logisim/        - Original Logisim Evolution files (preserved, not edited)
tools/          - publish.py script
```

Each numbered folder contains:
```
XX-component/
├── rtl/component.sv       - SystemVerilog implementation
├── tb/tb_component.sv     - Testbench
└── README.md              - Interface reference + WaveDrom timing diagram
```

---

## Writing an Article

### File location
`articles/NN-component-name.md`

### Frontmatter (required at top of every article)

```markdown
---
title: "Part N: Title Here"
series: "KiKi-Pi-One"
part: N
tags: ["kiki-pi-one", "cpu-design", "hardware", "systemverilog"]
medium_url: ""
wordpress_url: ""
status: draft
---
```

Status values: `draft` -> `ready` -> `published`

### Article Structure

Every article must follow this exact structure in order:

1. **Series header** (2 lines, italic)
   ```
   *This is Part N of the KiKi-Pi-One series - building a 16-bit CPU from scratch.*
   *[← Part N-1: Name](./NN-1-name.md) | [GitHub](https://github.com/SreejitS/KiKi-Pi-One) | [Live Demo](https://kiki-pi-one.vercel.app/component)*
   ```

2. **Hook** - one paragraph answering "what problem does this solve?"

3. **Interface first** - show inputs/outputs table and timing diagram BEFORE implementation

4. **Timing diagram** - include WaveDrom JSON in a code block so readers can paste at wavedrom.com

5. **Implementation** - walk through the SystemVerilog code with explanations

6. **Test** - show the testbench running with expected output

7. **Interactive demo link** - link to the web demo page

8. **Where this is used** - show how this component plugs into the CPU

9. **What's next** - bridge to next article with a link

### Writing Style Rules

- No m-dashes (—). Use ` - ` (space-hyphen-space) instead
- No jargon without explanation - every hardware term gets defined when first used
- Show the "why" before the "how" - explain the problem before showing the solution
- Keep sentences short
- Code blocks use triple backticks with language tag: ```systemverilog, ```typescript, ```asm
- Tables use standard markdown pipe format

### ASCII Art Diagrams

ASCII diagrams in code blocks must be **column-aligned** so every vertical relationship is visually obvious in a monospace font. Rules:

1. **Use `|` pipes as vertical tracers** from a value down to its label - never rely on position alone
2. **Use `+---+` brackets** to span a range of columns, with `+` directly under the first and last column
3. **Count characters** - every column is a fixed width (typically 3 chars per bit). Verify alignment by counting positions, not eyeballing
4. **Avoid `^` carets for alignment** - they are ambiguous. Use `|` pipes instead
5. **Test in a monospace font** before committing - paste into a terminal or code editor and confirm vertical lines are straight

Good example:
```
  1  1  1  0  0  0  0  0  1  0  0  1  0  0  0  0
  |  |  |  |  |           |  |     |  |        |
  C  1  1  a  +--- comp --+  +dest-+  +-jump --+
```

Bad example (carets don't clearly trace to bits):
```
  1  1  1  0  0  0  0  0  1  0  0  1  0  0  0  0
  ^  ^  ^  ^  +----------+  +------+  +------+
  C  1  1  a    c1-c6 (D+A)   dest=D    jump=null
```

### What NOT to include

- Do not repeat the article title as an H1 in the body - WordPress/Medium show the title from frontmatter
- Do not use m-dashes (—) anywhere
- Do not leave placeholder links - either link properly or remove the link entirely

---

## Publishing an Article

### Step 1: Run the publish script

```bash
# Both platforms at once
python tools/publish.py articles/NN-name.md --target both

# Single platform
python tools/publish.py articles/NN-name.md --target medium
python tools/publish.py articles/NN-name.md --target wordpress
```

The script will:
- Convert Markdown to HTML (stripping the H1 automatically)
- Copy HTML to clipboard
- Open the editor URL in your browser

### Step 2: Paste into Medium

1. Medium editor opens at medium.com/new-story
2. Click title area, type the title
3. Click body, Cmd+V to paste
4. Add tags from frontmatter manually (max 5)
5. Publish

### Step 3: Paste into WordPress

1. WordPress editor opens at sreejits.com/wp-admin/post-new.php
2. Type the title in the title field
3. In body: press Ctrl+Shift+Alt+M to switch to Code Editor view
4. Cmd+V to paste HTML
5. Press Ctrl+Shift+Alt+M again to return to visual view
6. Add tags in right sidebar
7. Publish

### Step 4: Update frontmatter

After publishing, update the article file:
```markdown
medium_url: "https://medium.com/@iamsreejits/..."
wordpress_url: "https://sreejits.com/..."
status: published
```

---

## Adding a New Component (per article workflow)

When starting a new article (e.g. Part 2: ALU):

```bash
# 1. Hardware
touch 02-alu/rtl/alu.sv
touch 02-alu/tb/tb_alu.sv

# 2. Article draft
cp articles/template.md articles/02-alu.md

# 3. Web demo
touch 08-web-demo/src/lib/alu.ts
mkdir -p 08-web-demo/src/app/alu
touch 08-web-demo/src/app/alu/page.tsx

# 4. Enable CI - uncomment the ALU testbench step in:
#    .github/workflows/test.yml

# 5. Update component list in:
#    08-web-demo/src/app/page.tsx
```

---

## Running Tests Locally

```bash
# Install Icarus Verilog (first time only)
brew install icarus-verilog

# Run a testbench
iverilog -g2012 -o tb_register \
  01-registers/tb/tb_register.sv \
  01-registers/rtl/register.sv \
&& vvp tb_register
```

## Running the Web Demo Locally

```bash
cd 08-web-demo
npm install
npm run dev
# Open http://localhost:3000
```

---

## Key Design Decisions

- **ISA**: `00-spec/ISA.md` is the canonical reference. All hardware and software derives from it.
- **HDL**: SystemVerilog (`-g2012` flag for Icarus Verilog)
- **Web demo**: Next.js 14, TypeScript, Tailwind. Each component gets `lib/X.ts` + `app/X/page.tsx`
- **Articles**: Markdown with frontmatter, published via clipboard to Medium and WordPress
- **CI**: GitHub Actions runs all testbenches on every push to any branch
