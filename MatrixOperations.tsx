import React from 'react';

/**
 * MatrixOperations Component
 * 
 * Provides a UI section for common matrix algebra functions 
 * supported by nerdamer.
 */
interface MatrixOperationsProps {
  /** Function to call when an operation is selected (e.g., to update the input field) */
  onInsert: (value: string) => void;
}

const MatrixOperations = ({ onInsert }: MatrixOperationsProps) => {
  // Define the operations based on nerdamer.js capabilities
  const operations = [
    { label: 'matrix', value: 'matrix([])', title: 'Construct a matrix: matrix([1,2],[3,4])' },
    { label: 'det', value: 'determinant(matrix([1,2],[3,4]))', title: 'Determinant of a matrix' },
    { label: 'transpose', value: 'transpose(matrix([1,2],[3,4]))', title: 'Transpose of a matrix' },
    { label: 'invert', value: 'invert(matrix([1,2],[3,4]))', title: 'Inverse of a matrix' },
    { label: 'identity', value: 'imatrix(3)', title: 'Identity matrix: imatrix(size)' },
    { label: 'multiply', value: 'matrix([1,2],[3,4])*matrix([5,6],[7,8])', title: 'Matrix multiplication' },
    { label: 'dot', value: 'dot([1,2,3],[4,5,6])', title: 'Dot product of two vectors' },
    { label: 'cross', value: 'cross([1,2,3],[4,5,6])', title: 'Cross product of two vectors' },
  ];

  // Basic styling to match a calculator grid
  const sectionStyle: React.CSSProperties = {
    padding: '10px',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    width: 'fit-content'
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '6px',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '8px 12px',
    fontSize: '0.85rem',
    fontWeight: '500',
    color: '#333',
    backgroundColor: '#f5f5f5',
    border: '1px solid #d1d1d1',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    textAlign: 'center',
  };

  // Using React.MouseEvent directly to ensure types are resolved
  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    const target = e.currentTarget as HTMLButtonElement;
    target.style.backgroundColor = '#e8e8e8';
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    const target = e.currentTarget as HTMLButtonElement;
    target.style.backgroundColor = '#f5f5f5';
  };

  return (
    <div style={sectionStyle} className="matrix-ops-container">
      <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#666', textAlign: 'center' }}>
        Matrix Operations
      </h4>
      <div style={gridStyle}>
        {operations.map((op) => (
          <button
            key={op.label}
            style={buttonStyle}
            title={op.title}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={() => onInsert(op.value)}
          >
            {op.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MatrixOperations;