const NOTEBOOKS = [
  {
    name: 'Stochastic_Vol_Model_v2.ipynb',
    meta: 'Last accessed: 2h ago • Finance Core',
    tags: ['STOCHASTIC', 'PYTHON'],
  },
  {
    name: 'PDE_Fluid_Dynamics_Sim.nb',
    meta: 'Last accessed: 14h ago • Physics Engine',
    tags: ['CALCULUS', 'SIMULATION'],
  },
];

function NotebookRow({ notebook }) {
  return (
    <div className="flex items-center justify-between p-4 glass-panel rounded hover:bg-surface-container transition-colors group cursor-pointer">
      <div className="flex items-center gap-4">
        <span className="material-symbols-outlined text-on-surface-variant">description</span>
        <div>
          <h5 className="text-sm font-semibold">{notebook.name}</h5>
          <p className="text-[10px] text-on-surface-variant">{notebook.meta}</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden md:flex gap-2">
          {notebook.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-surface-container-high rounded text-[9px] font-bold font-mono text-on-surface-variant"
            >
              {tag}
            </span>
          ))}
        </div>
        <button className="text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
          <span className="material-symbols-outlined text-sm">more_vert</span>
        </button>
      </div>
    </div>
  );
}

export default function RecentNotebooks() {
  return (
    <div className="space-y-6">
      <h3 className="text-[11px] tracking-[0.2em] font-bold font-mono text-on-surface-variant uppercase border-b border-[rgba(133,148,139,0.2)] pb-4">
        Recent Notebooks
      </h3>
      <div className="space-y-2">
        {NOTEBOOKS.map((nb) => (
          <NotebookRow key={nb.name} notebook={nb} />
        ))}
      </div>
    </div>
  );
}
