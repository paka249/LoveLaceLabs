

/* ── Tab definitions ── */
const TABS = [
  { id: 'basic', label: 'Basic' },
  { id: 'greek', label: 'αβγ' },
  { id: 'trig',  label: 'Trig' },
  { id: 'calc',  label: 'Σ ∫ Π' },
  { id: 'rel',   label: '≥ ÷ →' },
];

/* ── Symbol sets per tab ── */
const SYMBOLS = {
  basic: [
    { display: 'x²',  insert: '²' },
    { display: 'xⁿ',  insert: '^()', cursorOffset: -1 },
    { display: '√x',  insert: '√(' },
    { display: '∛x',  insert: '∛(' },
    { display: 'ⁿ√x', insert: '^(1/)', cursorOffset: -1 },
    { display: 'x/y', insert: '/' },
    { display: 'log', insert: 'log₁₀(' },
    { display: 'ln',  insert: 'ln(' },
    { display: 'mod', insert: ' % ' },
    { display: '⌊x⌋', insert: '⌊⌋', cursorOffset: -1 },
    { display: '⌈x⌉', insert: '⌈⌉', cursorOffset: -1 },
    { display: 'π',   insert: 'π' },
    { display: 'e',   insert: 'e' },
    { display: '∞',   insert: '∞' },
    { display: '|x|', insert: '||', cursorOffset: -1 },
    { display: 'e^x', insert: 'e^' },
    { display: '(',   insert: '(' },
    { display: ')',   insert: ')' },
    { display: '×',   insert: '×' },
    { display: '÷',   insert: '÷' },
    { display: '±',   insert: '±' },
    { display: ',',   insert: ',' },
  ],
  greek: [
    'α','β','γ','δ','ε','ζ','η','θ','ι','κ','λ','μ',
    'ν','ξ','ρ','σ','τ','φ','χ','ψ','ω',
    'Α','Β','Γ','Δ','Ε','Ζ','Η','Θ','Λ','Μ','Ξ','Π','Σ','Φ','Ψ','Ω',
  ].map((c) => ({ display: c, insert: c })),
  trig: [
    { display: 'sin',   insert: 'sin(' },
    { display: 'cos',   insert: 'cos(' },
    { display: 'tan',   insert: 'tan(' },
    { display: 'cot',   insert: 'cot(' },
    { display: 'sec',   insert: 'sec(' },
    { display: 'csc',   insert: 'csc(' },
    { display: 'sin⁻¹', insert: 'sin⁻¹(' },
    { display: 'cos⁻¹', insert: 'cos⁻¹(' },
    { display: 'tan⁻¹', insert: 'tan⁻¹(' },
    { display: 'sinh',  insert: 'sinh(' },
    { display: 'cosh',  insert: 'cosh(' },
    { display: 'tanh',  insert: 'tanh(' },
  ],
  calc: [
    { display: '∫',      insert: '∫(' },
    { display: 'd/dx',   insert: 'd/dx(' },
    { display: '∂/∂x',   insert: '∂/∂x(' },
    { display: 'lim',    insert: 'lim(' },
    { display: 'Σ',      insert: 'Σ(' },
    { display: 'Π',      insert: 'Π(' },
    { display: '∫∫',     insert: '∫∫(' },
    { display: 'f\'',    insert: "'" },
    { display: 'f\'\'',  insert: "''" },
  ],
  rel: [
    { display: '≥', insert: '>=' },
    { display: '≤', insert: '<=' },
    { display: '≠', insert: '!=' },
    { display: '≈', insert: '≈' },
    { display: '→', insert: '->' },
    { display: '∈', insert: 'in' },
    { display: '∉', insert: 'notin' },
    { display: '⊂', insert: 'subset' },
    { display: '∪', insert: 'union' },
    { display: '∩', insert: 'intersection' },
    { display: '∀', insert: 'forall' },
    { display: '∃', insert: 'exists' },
  ],
};

const ACTIONS = ['Simplify', 'Solve for', 'Derivative', 'Integral', 'Limit', 'Factor'];

/**
 * Inline math keyboard panel — no modal, renders in the page flow.
 * Props:
 *   activeTab / setActiveTab  — tab state lifted to parent
 *   onInsert(text)            — called when a symbol is clicked
 *   onAction(action)          — called when an action pill is clicked
 */
export default function Calculator({ activeTab, setActiveTab, onInsert, onAction }) {
  return (
    <div className="glass-panel rounded-xl overflow-hidden w-full">
      {/* ── Tabs ── */}
      <div className="flex gap-0 border-b border-outline/20">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-[12px] font-mono font-bold transition-colors cursor-pointer border-b-2 -mb-px
              ${activeTab === tab.id
                ? 'border-primary text-primary bg-surface-container-low'
                : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Symbol grid ── */}
      <div className="p-3">
        <div className="grid grid-cols-9 gap-1.5">
          {SYMBOLS[activeTab].map((sym, i) => (
            <button
              key={i}
              onClick={() => onInsert(sym.insert, sym.cursorOffset || 0)}
              className="flex items-center justify-center h-10 rounded-lg bg-surface-container text-on-surface text-[13px] font-mono hover:bg-surface-container-high hover:text-primary border border-outline/10 hover:border-primary/30 transition-all active:scale-95 cursor-pointer"
              title={sym.insert}
            >
              {sym.display}
            </button>
          ))}
        </div>
      </div>

      {/* ── Action pills ── */}
      <div className="flex flex-wrap gap-2 px-3 pb-3">
        {ACTIONS.map((action) => (
          <button
            key={action}
            onClick={() => onAction(action)}
            className="px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-wide border border-outline/20 text-on-surface-variant hover:border-primary hover:text-primary transition-colors cursor-pointer"
          >
            {action}
          </button>
        ))}
      </div>
    </div>
  );
}
