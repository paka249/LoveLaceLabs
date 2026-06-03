import MathExpressionField from './MathExpressionField';

/**
 * MathTemplateWidget
 *
 * Renders a single 2D template node (fraction, sigma, product, integral, derivative, trig)
 * and its nested expression fields.
 */
export default function MathTemplateWidget({
  node,
  onChange,
  activeNodeId,
  activeCaret,
  onFocusNode,
  onNavigateLeft,
  onNavigateRight,
  onNavigateUp,
  onNavigateDown,
  onBackspaceAtStart,
  onSubmit,
  onStartFraction,
  size = 'sm',
}) {
  if (node.type === 'fraction') {
    return (
      <div className="inline-flex flex-col items-center align-middle mx-1 p-1 bg-surface-container-low/30 rounded-lg border border-primary/15 shadow-sm">
        {/* Numerator */}
        <MathExpressionField
          nodes={node.numerator}
          onChange={(updated) => onChange({ ...node, numerator: updated })}
          activeNodeId={activeNodeId}
          activeCaret={activeCaret}
          onFocusNode={onFocusNode}
          onNavigateLeft={onNavigateLeft}
          onNavigateRight={onNavigateRight}
          onNavigateUp={onNavigateUp}
          onNavigateDown={onNavigateDown}
          onBackspaceAtStart={onBackspaceAtStart}
          onSubmit={onSubmit}
          onStartFraction={onStartFraction}
          size={size}
        />
        {/* Fraction Line */}
        <div className="h-[2px] w-full bg-primary/80 rounded-full my-1 min-w-[3.5rem]" />
        {/* Denominator */}
        <MathExpressionField
          nodes={node.denominator}
          onChange={(updated) => onChange({ ...node, denominator: updated })}
          activeNodeId={activeNodeId}
          activeCaret={activeCaret}
          onFocusNode={onFocusNode}
          onNavigateLeft={onNavigateLeft}
          onNavigateRight={onNavigateRight}
          onNavigateUp={onNavigateUp}
          onNavigateDown={onNavigateDown}
          onBackspaceAtStart={onBackspaceAtStart}
          onSubmit={onSubmit}
          onStartFraction={onStartFraction}
          size={size}
        />
      </div>
    );
  }

  if (node.type === 'sigma' || node.type === 'product') {
    return (
      <div className="inline-flex items-center gap-2 align-middle mx-1 p-1.5 bg-surface-container-low/30 rounded-lg border border-primary/15 shadow-sm">
        {/* Bounds & symbol stack */}
        <div className="flex flex-col items-center gap-0.5">
          {/* Upper bound */}
          <MathExpressionField
            nodes={node.upper}
            onChange={(updated) => onChange({ ...node, upper: updated })}
            activeNodeId={activeNodeId}
            activeCaret={activeCaret}
            onFocusNode={onFocusNode}
            onNavigateLeft={onNavigateLeft}
            onNavigateRight={onNavigateRight}
            onNavigateUp={onNavigateUp}
            onNavigateDown={onNavigateDown}
            onBackspaceAtStart={onBackspaceAtStart}
            onSubmit={onSubmit}
            onStartFraction={onStartFraction}
            size="xs"
          />
          {/* Math Symbol */}
          <div className="text-[28px] font-semibold leading-none text-primary select-none py-0.5 font-mono">
            {node.type === 'sigma' ? 'Σ' : 'Π'}
          </div>
          {/* Lower bound & Index (i = 1) */}
          <div className="flex items-center gap-0.5">
            <MathExpressionField
              nodes={node.index}
              onChange={(updated) => onChange({ ...node, index: updated })}
              activeNodeId={activeNodeId}
              activeCaret={activeCaret}
              onFocusNode={onFocusNode}
              onNavigateLeft={onNavigateLeft}
              onNavigateRight={onNavigateRight}
              onNavigateUp={onNavigateUp}
              onNavigateDown={onNavigateDown}
              onBackspaceAtStart={onBackspaceAtStart}
              onSubmit={onSubmit}
              onStartFraction={onStartFraction}
              size="xs"
            />
            <span className="text-primary/75 text-xs font-mono select-none">=</span>
            <MathExpressionField
              nodes={node.lower}
              onChange={(updated) => onChange({ ...node, lower: updated })}
              activeNodeId={activeNodeId}
              activeCaret={activeCaret}
              onFocusNode={onFocusNode}
              onNavigateLeft={onNavigateLeft}
              onNavigateRight={onNavigateRight}
              onNavigateUp={onNavigateUp}
              onNavigateDown={onNavigateDown}
              onBackspaceAtStart={onBackspaceAtStart}
              onSubmit={onSubmit}
              onStartFraction={onStartFraction}
              size="xs"
            />
          </div>
        </div>
        {/* Vertically centred expression box */}
        <div className="flex items-center border-l border-primary/20 pl-2 min-h-[50px]">
          <MathExpressionField
            nodes={node.expr}
            onChange={(updated) => onChange({ ...node, expr: updated })}
            activeNodeId={activeNodeId}
            activeCaret={activeCaret}
            onFocusNode={onFocusNode}
            onNavigateLeft={onNavigateLeft}
            onNavigateRight={onNavigateRight}
            onNavigateUp={onNavigateUp}
            onNavigateDown={onNavigateDown}
            onBackspaceAtStart={onBackspaceAtStart}
            onSubmit={onSubmit}
            onStartFraction={onStartFraction}
            size={size}
          />
        </div>
      </div>
    );
  }

  if (node.type === 'integral') {
    return (
      <div className="inline-flex items-center gap-2 align-middle mx-1 p-1.5 bg-surface-container-low/30 rounded-lg border border-primary/15 shadow-sm">
        <div className="flex flex-col items-center gap-0.5">
          <MathExpressionField
            nodes={node.upper}
            onChange={(updated) => onChange({ ...node, upper: updated })}
            activeNodeId={activeNodeId}
            activeCaret={activeCaret}
            onFocusNode={onFocusNode}
            onNavigateLeft={onNavigateLeft}
            onNavigateRight={onNavigateRight}
            onNavigateUp={onNavigateUp}
            onNavigateDown={onNavigateDown}
            onBackspaceAtStart={onBackspaceAtStart}
            onSubmit={onSubmit}
            onStartFraction={onStartFraction}
            size="xs"
          />
          <div className="text-[30px] font-semibold leading-none text-primary select-none">∫</div>
          <MathExpressionField
            nodes={node.lower}
            onChange={(updated) => onChange({ ...node, lower: updated })}
            activeNodeId={activeNodeId}
            activeCaret={activeCaret}
            onFocusNode={onFocusNode}
            onNavigateLeft={onNavigateLeft}
            onNavigateRight={onNavigateRight}
            onNavigateUp={onNavigateUp}
            onNavigateDown={onNavigateDown}
            onBackspaceAtStart={onBackspaceAtStart}
            onSubmit={onSubmit}
            onStartFraction={onStartFraction}
            size="xs"
          />
        </div>
        <div className="flex items-center border-l border-primary/20 pl-2 min-h-[44px]">
          <MathExpressionField
            nodes={node.expr}
            onChange={(updated) => onChange({ ...node, expr: updated })}
            activeNodeId={activeNodeId}
            activeCaret={activeCaret}
            onFocusNode={onFocusNode}
            onNavigateLeft={onNavigateLeft}
            onNavigateRight={onNavigateRight}
            onNavigateUp={onNavigateUp}
            onNavigateDown={onNavigateDown}
            onBackspaceAtStart={onBackspaceAtStart}
            onSubmit={onSubmit}
            onStartFraction={onStartFraction}
            size={size}
          />
        </div>
        <span className="text-primary/80 text-sm font-mono select-none">d</span>
        <MathExpressionField
          nodes={node.variable}
          onChange={(updated) => onChange({ ...node, variable: updated })}
          activeNodeId={activeNodeId}
          activeCaret={activeCaret}
          onFocusNode={onFocusNode}
          onNavigateLeft={onNavigateLeft}
          onNavigateRight={onNavigateRight}
          onNavigateUp={onNavigateUp}
          onNavigateDown={onNavigateDown}
          onBackspaceAtStart={onBackspaceAtStart}
          onSubmit={onSubmit}
          onStartFraction={onStartFraction}
          size="xs"
        />
      </div>
    );
  }

  if (node.type === 'derivative') {
    return (
      <div className="inline-flex items-center gap-2 align-middle mx-1 p-1.5 bg-surface-container-low/30 rounded-lg border border-primary/15 shadow-sm">
        <div className="flex items-center gap-1 font-mono text-primary/80 text-sm select-none">
          <span>d/d</span>
          <MathExpressionField
            nodes={node.variable}
            onChange={(updated) => onChange({ ...node, variable: updated })}
            activeNodeId={activeNodeId}
            activeCaret={activeCaret}
            onFocusNode={onFocusNode}
            onNavigateLeft={onNavigateLeft}
            onNavigateRight={onNavigateRight}
            onNavigateUp={onNavigateUp}
            onNavigateDown={onNavigateDown}
            onBackspaceAtStart={onBackspaceAtStart}
            onSubmit={onSubmit}
            onStartFraction={onStartFraction}
            size="xs"
          />
        </div>
        <div className="flex items-center border-l border-primary/20 pl-2 min-h-[44px]">
          <MathExpressionField
            nodes={node.expr}
            onChange={(updated) => onChange({ ...node, expr: updated })}
            activeNodeId={activeNodeId}
            activeCaret={activeCaret}
            onFocusNode={onFocusNode}
            onNavigateLeft={onNavigateLeft}
            onNavigateRight={onNavigateRight}
            onNavigateUp={onNavigateUp}
            onNavigateDown={onNavigateDown}
            onBackspaceAtStart={onBackspaceAtStart}
            onSubmit={onSubmit}
            onStartFraction={onStartFraction}
            size={size}
          />
        </div>
      </div>
    );
  }

  if (node.type === 'trigFunction') {
    return (
      <div className="inline-flex items-center gap-1.5 align-middle mx-1 p-1.5 bg-surface-container-low/30 rounded-lg border border-primary/15 shadow-sm">
        <span className="text-primary/80 text-sm font-mono select-none">{node.func}(</span>
        <MathExpressionField
          nodes={node.arg}
          onChange={(updated) => onChange({ ...node, arg: updated })}
          activeNodeId={activeNodeId}
          activeCaret={activeCaret}
          onFocusNode={onFocusNode}
          onNavigateLeft={onNavigateLeft}
          onNavigateRight={onNavigateRight}
          onNavigateUp={onNavigateUp}
          onNavigateDown={onNavigateDown}
          onBackspaceAtStart={onBackspaceAtStart}
          onSubmit={onSubmit}
          onStartFraction={onStartFraction}
          size={size}
        />
        <span className="text-primary/80 text-sm font-mono select-none">)</span>
      </div>
    );
  }

  return null;
}
