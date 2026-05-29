const ENGINES = [
  {
    icon: 'function',
    iconColor: 'text-primary',
    borderColor: 'border-primary/20',
    bgColor: 'bg-[rgba(90,240,179,0.1)]',
    label: 'Calculus Lab',
    tagColor: 'text-primary',
    tag: 'Core Engine Module',
    description:
      'A comprehensive environment for symbolic integration, series expansion, and multivariable differentiation. Designed for precision engineering and advanced mathematical modeling.',
    version: null,
  },
  {
    icon: 'layers',
    iconColor: 'text-secondary',
    borderColor: 'border-secondary/20',
    bgColor: 'bg-[rgba(190,198,224,0.1)]',
    label: 'Matrix Engine',
    tagColor: 'text-secondary',
    tag: 'Algebraic',
    description:
      'High-performance linear algebra and eigenspace decomposition solvers.',
    version: 'v3.8.0',
  },
  {
    icon: 'bar_chart',
    iconColor: 'text-primary-container',
    borderColor: 'border-primary-container/20',
    bgColor: 'bg-[rgba(52,211,153,0.1)]',
    label: 'Stats Forge',
    tagColor: 'text-primary-container',
    tag: 'Analytic',
    description:
      'Bayesian inference, stochastic modeling, and regression analysis.',
    version: 'v2.1.4',
  },
];

function EngineCard({ engine }) {
  return (
    <div className="glass-panel p-6 rounded-xl flex flex-col group cursor-pointer">
      <div className="flex justify-between items-start mb-6">
        <div
          className={`w-10 h-10 rounded ${engine.bgColor} flex items-center justify-center border ${engine.borderColor}`}
        >
          <span className={`material-symbols-outlined ${engine.iconColor}`}>
            {engine.icon}
          </span>
        </div>
        {engine.version && (
          <span className="text-[10px] font-bold font-mono text-on-surface-variant opacity-40">
            {engine.version}
          </span>
        )}
      </div>

      <h4 className="text-[20px] font-bold leading-tight mb-2">{engine.label}</h4>
      <p className="text-[11px] text-on-surface-variant mb-6 leading-relaxed line-clamp-3">
        {engine.description}
      </p>

      <div className="mt-auto flex items-center justify-between">
        <span className={`text-[9px] font-bold font-mono tracking-widest uppercase ${engine.tagColor}`}>
          {engine.tag}
        </span>
        <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">
          arrow_forward
        </span>
      </div>
    </div>
  );
}

export default function EngineGrid() {
  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex justify-between items-end border-b border-[rgba(133,148,139,0.2)] pb-4">
        <div>
          <h3 className="text-[11px] tracking-[0.2em] font-bold font-mono text-on-surface-variant uppercase">
            Launch Engines
          </h3>
          <p className="text-[10px] text-primary mt-1 font-mono font-bold">
            AVAILABLE SYSTEMS: 03
          </p>
        </div>
        <div className="flex gap-2">
          <button className="p-2 border border-[rgba(133,148,139,0.2)] rounded-sm text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-sm">filter_list</span>
          </button>
          <button className="p-2 border border-[rgba(133,148,139,0.2)] rounded-sm text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-sm">grid_view</span>
          </button>
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {ENGINES.map((engine) => (
          <EngineCard key={engine.label} engine={engine} />
        ))}
      </div>
    </div>
  );
}
