

/* ── Tab definitions ── */
const TABS = [
  { id: 'basic', label: 'Basic' },
  { id: 'greek', label: 'αβγ' },
  { id: 'trig',  label: 'Trig' },
  { id: 'calc',  label: 'Σ ∫ Π' },
  { id: 'rel',   label: '≥ ÷ →' },
];

const LIMIT_DISPLAY = (
  <span className="inline-flex flex-col items-center leading-none gap-0.5">
    <span className="text-[10px]">lim</span>
    <span className="text-[9px] text-on-surface-variant">x→a</span>
  </span>
);

const SIGMA_DISPLAY = (
  <span className="inline-flex flex-col items-center leading-none gap-0.5">
    <span className="text-[8px] text-on-surface-variant">n</span>
    <span className="text-[14px]">Σ</span>
    <span className="text-[8px] text-on-surface-variant">i=1</span>
  </span>
);

const PRODUCT_DISPLAY = (
  <span className="inline-flex flex-col items-center leading-none gap-0.5">
    <span className="text-[8px] text-on-surface-variant">n</span>
    <span className="text-[14px]">Π</span>
    <span className="text-[8px] text-on-surface-variant">i=1</span>
  </span>
);

/* ── Symbol sets per tab ── */
const SYMBOLS = {
  basic: [
    { display: 'x²',  insert: '²' },
    { display: 'xⁿ',  insert: '()^()', cursorOffset: -4 },
    { display: '√x',  insert: '√(' },
    { display: '∛x',  insert: '∛(' },
    { display: 'ⁿ√x', insert: '3√()', cursorOffset: -4 },
    { display: 'x/y', insert: '__FRACTION_TEMPLATE__' },
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
    { display: '÷',   insert: '__FRACTION_TEMPLATE__' },
    { display: '±',   insert: '±' },
    { display: ',',   insert: ',' },
  ],
  greek: [
    'α','β','γ','δ','ε','ζ','η','θ','ι','κ','λ','μ',
    'ν','ξ','ρ','σ','τ','φ','χ','ψ','ω',
    'Α','Β','Γ','Δ','Ε','Ζ','Η','Θ','Λ','Μ','Ξ','Π','Σ','Φ','Ψ','Ω',
  ].map((c) => ({ display: c, insert: c })),
  trig: [
    { display: 'sin',   insert: '__TRIG_TEMPLATE__:sin' },
    { display: 'cos',   insert: '__TRIG_TEMPLATE__:cos' },
    { display: 'tan',   insert: '__TRIG_TEMPLATE__:tan' },
    { display: 'cot',   insert: '__TRIG_TEMPLATE__:cot' },
    { display: 'sec',   insert: '__TRIG_TEMPLATE__:sec' },
    { display: 'csc',   insert: '__TRIG_TEMPLATE__:csc' },
    { display: 'sin⁻¹', insert: '__TRIG_TEMPLATE__:sin⁻¹' },
    { display: 'cos⁻¹', insert: '__TRIG_TEMPLATE__:cos⁻¹' },
    { display: 'tan⁻¹', insert: '__TRIG_TEMPLATE__:tan⁻¹' },
    { display: 'sinh',  insert: '__TRIG_TEMPLATE__:sinh' },
    { display: 'cosh',  insert: '__TRIG_TEMPLATE__:cosh' },
    { display: 'tanh',  insert: '__TRIG_TEMPLATE__:tanh' },
  ],
  calc: [
    { display: '∫',      insert: '__INTEGRAL_TEMPLATE__' },
    { display: 'd/dx',   insert: '__DERIVATIVE_TEMPLATE__' },
    { display: 'dⁿ/dxⁿ', insert: '__DERIVATIVE_N_TEMPLATE__' },
    { display: '∂/∂x',   insert: '__PARTIAL_TEMPLATE__' },
    { display: '∂ⁿ/∂xⁿ', insert: '__PARTIAL_N_TEMPLATE__' },
    { display: LIMIT_DISPLAY,   insert: 'limₓ→ₐ()', cursorOffset: -1 },
    { display: SIGMA_DISPLAY,   insert: '__SIGMA_TEMPLATE__' },
    { display: PRODUCT_DISPLAY, insert: '__PRODUCT_TEMPLATE__' },
    { display: 'x',      insert: 'x' },
    { display: 'y',      insert: 'y' },
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

/**
 * Inline math keyboard panel — no modal, renders in the page flow.
 * Props:
 *   activeTab / setActiveTab  — tab state lifted to parent
 *   onInsert(text)            — called when a symbol is clicked
 *   onAction(action)          — called when an action pill is clicked
 */
export default function Calculator({ activeTab, setActiveTab, onInsert, angleMode, setAngleMode }) {
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
        
        {/* Angle mode selector - only show below trig buttons */}
        {activeTab === 'trig' && (
          <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-outline/10">
            <span className="text-xs text-on-surface/60 font-sans">Angle Mode:</span>
            <div className="flex gap-1">
              {['rad', 'deg', 'grad'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setAngleMode(mode)}
                  className={`px-3 py-1 text-xs font-mono rounded transition-all ${
                    angleMode === mode
                      ? 'bg-primary text-surface-container-lowest'
                      : 'bg-surface-container text-on-surface/70 hover:bg-surface-container-high hover:text-primary'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
