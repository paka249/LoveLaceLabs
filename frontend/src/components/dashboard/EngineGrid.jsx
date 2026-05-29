import calcImg from '../../assets/calc.png';
import linearImg from '../../assets/linear.png';
import statsImg from '../../assets/stats.png';
import arrowIcon from '../../assets/icon-arrow.svg';
import filterIcon from '../../assets/icon-filter.svg';
import gridIcon from '../../assets/icon-grid.svg';

const ENGINES = [
  {
    img: calcImg,
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
    img: linearImg,
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
    img: statsImg,
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
          className={`w-10 h-10 rounded ${engine.bgColor} flex items-center justify-center border ${engine.borderColor} overflow-hidden`}
        >
          <img src={engine.img} alt={engine.label} className="w-full h-full object-cover" />
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
        <img src={arrowIcon} alt="open" className="w-5 h-5 object-contain opacity-60 group-hover:translate-x-1 transition-transform" />
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
          <button className="p-2 border border-[rgba(133,148,139,0.2)] rounded-sm text-on-surface-variant hover:text-primary transition-colors cursor-pointer" title="Filter">
            <img src={filterIcon} alt="filter" className="w-5 h-5 object-contain opacity-80" />
          </button>
          <button className="p-2 border border-[rgba(133,148,139,0.2)] rounded-sm text-on-surface-variant hover:text-primary transition-colors cursor-pointer" title="Grid view">
            <img src={gridIcon} alt="grid" className="w-5 h-5 object-contain opacity-80" />
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
