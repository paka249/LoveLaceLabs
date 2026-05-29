import { useState } from 'react';

export default function IntelligenceHub() {
  const [query, setQuery] = useState('');

  return (
    <section className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-[44px] font-bold tracking-tight leading-[1.1]">
          Intelligence Hub
        </h2>
        <p className="text-[16px] text-on-surface-variant">
          Enter symbolic expressions, natural language queries, or data streams.
        </p>
      </div>

      <div
        className="glass-panel p-1 rounded-xl compute-input-focus transition-all duration-300"
        style={{ transform: query ? undefined : undefined }}
      >
        <div className="flex items-center gap-4 px-6 py-4 bg-surface-container-low rounded-lg">
          <span className="material-symbols-outlined text-primary">auto_awesome</span>
          <input
            className="bg-transparent border-none outline-none focus:ring-0 w-full font-mono text-[18px] text-primary placeholder:text-outline-variant"
            placeholder="integrate log(x)^2 from 0 to 1..."
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2 py-1 bg-surface-container-high rounded text-[10px] font-bold font-mono text-on-surface-variant border border-[rgba(133,148,139,0.2)]">
              ⌘ K
            </span>
            <button className="bg-primary p-2 rounded-lg text-on-primary hover:scale-105 active:scale-95 transition-all cursor-pointer">
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
