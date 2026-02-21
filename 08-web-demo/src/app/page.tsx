import Link from "next/link";

const components = [
  {
    part: "00",
    name: "ISA Spec",
    href: null,
    description: "The instruction set architecture — the blueprint everything else follows.",
    status: "spec",
  },
  {
    part: "01",
    name: "Register",
    href: "/registers",
    description: "A 16-bit D flip-flop with load enable. The fundamental storage cell.",
    status: "live",
  },
  {
    part: "02",
    name: "ALU",
    href: null,
    description: "Arithmetic Logic Unit — 28 operations from 6 control bits.",
    status: "coming",
  },
  {
    part: "03",
    name: "Data Memory",
    href: null,
    description: "16K words of read/write RAM with memory-mapped I/O.",
    status: "coming",
  },
  {
    part: "04",
    name: "Program Counter",
    href: null,
    description: "Increment, load, or reset — drives instruction sequencing.",
    status: "coming",
  },
  {
    part: "05",
    name: "CPU",
    href: null,
    description: "All components wired together. Fetches, decodes, and executes instructions.",
    status: "coming",
  },
  {
    part: "06",
    name: "Computer",
    href: null,
    description: "The complete machine — CPU + ROM + RAM. Runs real programs.",
    status: "coming",
  },
  {
    part: "07",
    name: "Assembler",
    href: null,
    description: "Type assembly, get binary. The bridge from human to hardware.",
    status: "coming",
  },
];

const statusBadge: Record<string, string> = {
  spec: "bg-blue-900 text-blue-300",
  live: "bg-emerald-900 text-emerald-300",
  coming: "bg-slate-800 text-slate-500",
};

const statusLabel: Record<string, string> = {
  spec: "reference",
  live: "live demo",
  coming: "coming soon",
};

export default function Home() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-emerald-400 mb-2">KiKi-Pi-One</h1>
      <p className="text-slate-400 mb-2">
        A 16-bit CPU built from scratch — interactive hardware simulators for every component.
      </p>
      <p className="text-sm text-slate-600 mb-10">
        Each component below mirrors the SystemVerilog implementation exactly.
        Same interface, same behaviour, runs in your browser.
      </p>

      <div className="grid gap-3">
        {components.map((c) => (
          <div
            key={c.part}
            className="border border-slate-800 rounded-lg p-4 flex items-start gap-4 hover:border-slate-700 transition-colors"
          >
            <span className="text-slate-600 font-mono text-sm pt-0.5 w-8 shrink-0">{c.part}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {c.href ? (
                  <Link href={c.href} className="font-semibold text-slate-200 hover:text-emerald-400">
                    {c.name}
                  </Link>
                ) : (
                  <span className="font-semibold text-slate-400">{c.name}</span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${statusBadge[c.status]}`}>
                  {statusLabel[c.status]}
                </span>
              </div>
              <p className="text-sm text-slate-500">{c.description}</p>
            </div>
            {c.href && (
              <Link
                href={c.href}
                className="shrink-0 text-sm text-emerald-500 hover:text-emerald-400 font-mono"
              >
                Open →
              </Link>
            )}
          </div>
        ))}
      </div>

      <div className="mt-12 text-sm text-slate-600 border-t border-slate-800 pt-6">
        <p>
          Built by{" "}
          <a href="https://sreejits.com" className="text-slate-400 hover:text-slate-300">
            Sreejit
          </a>{" "}
          · Source on{" "}
          <a
            href="https://github.com/SreejitS/KiKi-Pi-One"
            className="text-slate-400 hover:text-slate-300"
          >
            GitHub
          </a>{" "}
          · Articles on{" "}
          <a
            href="https://medium.com/@iamsreejits"
            className="text-slate-400 hover:text-slate-300"
          >
            Medium
          </a>
        </p>
      </div>
    </div>
  );
}
