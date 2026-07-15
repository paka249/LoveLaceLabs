import MathExpressionField from './MathExpressionField';
import { addMatrixRow, removeMatrixRow, addMatrixColumn, removeMatrixColumn } from '../utils/mathTree';

const resizeBtnClass =
  'w-4 h-4 flex items-center justify-center text-[10px] leading-none rounded text-on-surface-variant hover:text-primary hover:bg-surface-container-high disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-on-surface-variant cursor-pointer';

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
  onStartPower,
  size = 'sm',
}) {
  if (node.type === 'fraction') {
    return (
      <div className="inline-flex flex-col items-center align-middle mx-1">
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
          onStartPower={onStartPower}
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
          onStartPower={onStartPower}
          size={size}
        />
      </div>
    );
  }

  if (node.type === 'power') {
    return (
      <div className="inline-flex items-end gap-0.5 align-middle mx-0.5">
        <MathExpressionField
          nodes={node.base}
          onChange={(updated) => onChange({ ...node, base: updated })}
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
          onStartPower={onStartPower}
          size={size}
        />
        <div className="mb-2">
          <MathExpressionField
            nodes={node.exponent}
            onChange={(updated) => onChange({ ...node, exponent: updated })}
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
            onStartPower={onStartPower}
            size="xs"
          />
        </div>
      </div>
    );
  }

  if (node.type === 'absolute') {
    return (
      <div className="inline-flex items-center gap-0.5 align-middle mx-0.5">
        <span className="text-primary/80 text-lg font-mono select-none">|</span>
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
          onStartPower={onStartPower}
          size={size}
        />
        <span className="text-primary/80 text-lg font-mono select-none">|</span>
      </div>
    );
  }

  if (node.type === 'floor' || node.type === 'ceiling') {
    const left = node.type === 'floor' ? '⌊' : '⌈';
    const right = node.type === 'floor' ? '⌋' : '⌉';
    return (
      <div className="inline-flex items-center gap-0.5 align-middle mx-0.5">
        <span className="text-primary/80 text-lg font-mono select-none">{left}</span>
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
          onStartPower={onStartPower}
          size={size}
        />
        <span className="text-primary/80 text-lg font-mono select-none">{right}</span>
      </div>
    );
  }

  if (node.type === 'mode') {
    return (
      <div className="inline-flex items-center gap-0.5 align-middle mx-0.5">
        <span className="text-primary/80 text-sm font-mono select-none">mod(</span>
        <MathExpressionField
          nodes={node.left}
          onChange={(updated) => onChange({ ...node, left: updated })}
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
          onStartPower={onStartPower}
          size={size}
        />
        <span className="text-primary/80 text-sm font-mono select-none">,</span>
        <MathExpressionField
          nodes={node.right}
          onChange={(updated) => onChange({ ...node, right: updated })}
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
          onStartPower={onStartPower}
          size={size}
        />
        <span className="text-primary/80 text-sm font-mono select-none">)</span>
      </div>
    );
  }

  if (node.type === 'nthRoot') {
    const degreeText = (node.degree || [])
      .filter((part) => part.type === 'text')
      .map((part) => part.value)
      .join('')
      .trim();
    const showDegreeField = degreeText !== '' && degreeText !== '2';

    return (
      <div className="inline-flex items-center gap-0.5 align-middle mx-0.5">
        {showDegreeField && (
          <div className="self-start -translate-y-1">
            <MathExpressionField
              nodes={node.degree}
              onChange={(updated) => onChange({ ...node, degree: updated })}
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
              onStartPower={onStartPower}
              size="xs"
            />
          </div>
        )}
        <span className="text-primary text-xl font-mono select-none">√</span>
        <MathExpressionField
          nodes={node.value}
          onChange={(updated) => onChange({ ...node, value: updated })}
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
          onStartPower={onStartPower}
          size={size}
        />
      </div>
    );
  }

  if (node.type === 'logBase') {
    return (
      <div className="inline-flex items-center gap-0.5 align-middle mx-0.5">
        <div className="inline-flex items-start">
          <span className="text-primary/80 text-sm font-mono select-none">log</span>
          <div className="self-end -ml-0.5 translate-y-1 scale-90 origin-top-left">
            <MathExpressionField
              nodes={node.base}
              onChange={(updated) => onChange({ ...node, base: updated })}
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
              onStartPower={onStartPower}
              size="xs"
            />
          </div>
        </div>
        <span className="text-primary/80 text-sm font-mono select-none">(</span>
        <MathExpressionField
          nodes={node.value}
          onChange={(updated) => onChange({ ...node, value: updated })}
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
          onStartPower={onStartPower}
          size={size}
        />
        <span className="text-primary/80 text-sm font-mono select-none">)</span>
      </div>
    );
  }

  if (node.type === 'sigma' || node.type === 'product') {
    return (
      <div className="inline-flex items-center gap-2 align-middle mx-1">
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
            onStartPower={onStartPower}
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
              onStartPower={onStartPower}
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
      <div className="inline-flex items-center gap-1.5 align-middle mx-1">
        <div className="flex flex-col items-center gap-1">
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
          <div className="text-[30px] font-semibold leading-none text-primary select-none py-0.5">∫</div>
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
            onStartPower={onStartPower}
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
            onStartPower={onStartPower}
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
      <div className="inline-flex items-center gap-1.5 align-middle mx-1">
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

  if (node.type === 'derivativeN') {
    return (
      <div className="inline-flex items-center gap-1.5 align-middle mx-1">
        <div className="flex items-center gap-1 font-mono text-primary/80 text-sm select-none">
          <span>d</span>
          <MathExpressionField
            nodes={node.order}
            onChange={(updated) => onChange({ ...node, order: updated })}
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
          <span>/d</span>
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
          <span>^</span>
          <MathExpressionField
            nodes={node.order}
            onChange={(updated) => onChange({ ...node, order: updated })}
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

  if (node.type === 'partial') {
    return (
      <div className="inline-flex items-center gap-1.5 align-middle mx-1">
        <div className="flex items-center gap-1 font-mono text-primary/80 text-sm select-none">
          <span>∂/∂</span>
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

  if (node.type === 'partialN') {
    return (
      <div className="inline-flex items-center gap-1.5 align-middle mx-1">
        <div className="flex items-center gap-1 font-mono text-primary/80 text-sm select-none">
          <span>∂</span>
          <MathExpressionField
            nodes={node.order}
            onChange={(updated) => onChange({ ...node, order: updated })}
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
          <span>/∂</span>
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
          <span>^</span>
          <MathExpressionField
            nodes={node.order}
            onChange={(updated) => onChange({ ...node, order: updated })}
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
      <div className="inline-flex items-center gap-0.5 align-middle mx-0.5">
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

  if (node.type === 'matrix') {
    const rowCount = node.rows.length;
    const colCount = node.rows[0]?.length ?? 1;

    return (
      <div className="inline-flex items-start gap-0.5 align-middle mx-1">
        <div className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-surface-container-low/30 px-2 py-1">
          <span className="text-primary text-3xl leading-none font-mono select-none">[</span>
          <div className="flex flex-col gap-1">
            {node.rows.map((row, rowIdx) => (
              <div key={`row-${rowIdx}`} className="flex items-center gap-1">
                {row.map((cell, colIdx) => (
                  <div key={`cell-${rowIdx}-${colIdx}`} className="min-w-[2.25rem]">
                    <MathExpressionField
                      nodes={cell}
                      onChange={(updated) => {
                        const nextRows = node.rows.map((r, rIndex) =>
                          rIndex === rowIdx
                            ? r.map((c, cIndex) => (cIndex === colIdx ? updated : c))
                            : r
                        );
                        onChange({ ...node, rows: nextRows });
                      }}
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
                      onStartPower={onStartPower}
                      size="xs"
                    />
                  </div>
                ))}
              </div>
            ))}
            {!node.vector && (
              <div className="flex items-center justify-center gap-1 pt-0.5">
                <button
                  type="button"
                  onClick={() => onChange(removeMatrixRow(node))}
                  disabled={rowCount <= 1}
                  title="Remove row"
                  className={resizeBtnClass}
                >
                  −
                </button>
                <span className="text-[9px] text-on-surface-variant/60 select-none">rows</span>
                <button
                  type="button"
                  onClick={() => onChange(addMatrixRow(node))}
                  title="Add row"
                  className={resizeBtnClass}
                >
                  +
                </button>
              </div>
            )}
          </div>
          <span className="text-primary text-3xl leading-none font-mono select-none">]</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 pt-1">
          <button
            type="button"
            onClick={() => onChange(addMatrixColumn(node))}
            title="Add column"
            className={resizeBtnClass}
          >
            +
          </button>
          <span className="text-[9px] text-on-surface-variant/60 select-none [writing-mode:vertical-lr]">cols</span>
          <button
            type="button"
            onClick={() => onChange(removeMatrixColumn(node))}
            disabled={colCount <= 1}
            title="Remove column"
            className={resizeBtnClass}
          >
            −
          </button>
        </div>
      </div>
    );
  }

  if (node.type === 'matrixOp') {
    const fieldProps = {
      nodes: node.arg,
      onChange: (updated) => onChange({ ...node, arg: updated }),
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
      onStartPower,
      size,
    };

    if (node.op === 'det') {
      return (
        <div className="inline-flex items-center gap-0.5 align-middle mx-0.5">
          <span className="text-primary/80 text-2xl font-mono leading-none select-none">|</span>
          <MathExpressionField {...fieldProps} />
          <span className="text-primary/80 text-2xl font-mono leading-none select-none">|</span>
        </div>
      );
    }

    if (node.op === 'transpose' || node.op === 'invert') {
      const sup = node.op === 'transpose' ? 'ᵀ' : '⁻¹';
      return (
        <div className="inline-flex items-start gap-0 align-middle mx-0.5">
          <MathExpressionField {...fieldProps} />
          <span className="text-primary/70 text-xs font-mono select-none">{sup}</span>
        </div>
      );
    }

    const label = { rank: 'rank', trace: 'tr' }[node.op] ?? node.op;
    return (
      <div className="inline-flex items-center gap-0.5 align-middle mx-0.5">
        <span className="text-primary/80 text-sm font-mono select-none">{label}(</span>
        <MathExpressionField {...fieldProps} />
        <span className="text-primary/80 text-sm font-mono select-none">)</span>
      </div>
    );
  }

  if (node.type === 'matrixOp2') {
    const fieldPropsA = {
      nodes: node.a,
      onChange: (updated) => onChange({ ...node, a: updated }),
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
      onStartPower,
      size,
    };
    const fieldPropsB = {
      nodes: node.b,
      onChange: (updated) => onChange({ ...node, b: updated }),
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
      onStartPower,
      size,
    };

    return (
      <div className="inline-flex items-center gap-0.5 align-middle mx-0.5">
        <span className="text-primary/80 text-sm font-mono select-none">{node.op}(</span>
        <MathExpressionField {...fieldPropsA} />
        <span className="text-primary/80 text-sm font-mono select-none">,</span>
        <MathExpressionField {...fieldPropsB} />
        <span className="text-primary/80 text-sm font-mono select-none">)</span>
      </div>
    );
  }

  return null;
}
