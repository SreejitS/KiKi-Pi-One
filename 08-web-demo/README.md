# KiKi-Pi-One Web Demo

Interactive browser-based simulator for each CPU component. Each page mirrors the corresponding SystemVerilog implementation in `../01-registers/`, `../02-alu/`, etc.

## Running Locally

```bash
cd 08-web-demo
npm install
npm run dev
# Open http://localhost:3000
```

## Pages

| Route        | Component | Status |
|---|---|---|
| `/`          | Home / project overview | Live |
| `/registers` | Register demo (Part 1)   | Live |
| `/alu`       | ALU demo (Part 2)        | Coming |
| `/pc`        | Program Counter (Part 4) | Coming |
| `/cpu`       | CPU stepper (Part 5)     | Coming |
| `/assembler` | Assembler (Part 7)       | Coming |

## Adding a New Demo (per article)

1. Add `src/lib/<component>.ts` — TypeScript simulation logic (mirrors the `.sv` file)
2. Add `src/app/<component>/page.tsx` — Interactive UI
3. Update the `components` array in `src/app/page.tsx`

## Deployment

Connect the GitHub repo to [Vercel](https://vercel.com). Set the root directory to `08-web-demo/`.
Vercel will auto-deploy on every push to `main`.
