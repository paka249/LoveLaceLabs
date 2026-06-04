import MathTemplateInput from './MathTemplateInput';
import MathTemplateWidget from './MathTemplateWidget';

/**
 * MathExpressionField
 *
 * Renders a list of math nodes (text nodes and recursive template widgets).
 * Represents a single expression field.
 */
export default function MathExpressionField({
  nodes = [],
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
  size = 'md',
  isRoot = false,
}) {
  function handleTextChange(nodeId, value) {
    const updated = nodes.map((node) =>
      node.id === nodeId ? { ...node, value } : node
    );
    onChange(updated);
  }

  function handleWidgetChange(nodeId, updatedWidget) {
    const updated = nodes.map((node) =>
      node.id === nodeId ? updatedWidget : node
    );
    onChange(updated);
  }

  return (
    <div
      className={`flex items-center flex-wrap gap-y-2 ${
        isRoot ? 'w-full min-h-[50px] p-2' : 'inline-flex align-middle'
      }`}
    >
      {nodes.map((node) => {
        if (node.type === 'text') {
          return (
            <MathTemplateInput
              key={node.id}
              id={`math-node-${node.id}`}
              size={size}
              isActive={activeNodeId === node.id}
              activeCaret={activeNodeId === node.id ? activeCaret : null}
              value={node.value}
              onChange={(e) => handleTextChange(node.id, e.target.value)}
              onFocus={(e) => onFocusNode(node.id, e.target.selectionStart)}
              onKeyDown={(e) => {
                const caret = e.currentTarget.selectionStart ?? 0;
                const selEnd = e.currentTarget.selectionEnd ?? caret;
                const length = e.currentTarget.value.length;

                if (e.key === 'ArrowLeft' && caret === 0 && selEnd === 0) {
                  e.preventDefault();
                  onNavigateLeft?.(node.id);
                } else if (e.key === 'ArrowRight' && caret === length && selEnd === length) {
                  e.preventDefault();
                  onNavigateRight?.(node.id);
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  onNavigateUp?.(node.id, caret);
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  onNavigateDown?.(node.id, caret);
                } else if (e.key === 'Backspace' && caret === 0 && selEnd === 0) {
                  e.preventDefault();
                  onBackspaceAtStart?.(node.id);
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  onSubmit?.();
                } else if (e.key === '/' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
                  e.preventDefault();
                  onStartFraction?.(node.id, caret);
                } else if (e.key === '^' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                  e.preventDefault();
                  onStartPower?.(node.id, caret);
                }
              }}
              style={{
                width: `${Math.max(size === 'xs' ? 1.5 : 2, node.value.length) + 1.2}ch`,
                minWidth: size === 'xs' ? '1.5rem' : '2.5rem',
              }}
              className="mx-0.5"
              placeholder={isRoot && nodes.length === 1 && node.value === '' ? 'Enter math expression...' : ''}
            />
          );
        }

        return (
          <MathTemplateWidget
            key={node.id}
            node={node}
            onChange={(updated) => handleWidgetChange(node.id, updated)}
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
            size={size === 'md' ? 'sm' : 'xs'}
          />
        );
      })}
    </div>
  );
}
