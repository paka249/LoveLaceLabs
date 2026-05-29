import { useState } from 'react';
import sparkIcon from '../../assets/icon-spark.svg';
import arrowIcon from '../../assets/icon-arrow.svg';

export default function IntelligenceHub() {
  const [query, setQuery] = useState('');

  return (
    <section className="max-w-2xl w-full mx-auto space-y-8">
      <div className="text-center space-y-3">
        <h2 className="text-[52px] font-bold font-sans tracking-tight leading-[1.1] text-on-surface">
          Ada's{' '}
          <span className="text-primary">Computer</span>
        </h2>
        <p className="text-[15px] font-sans text-on-surface-variant leading-relaxed">
          Enter symbolic expressions, natural language queries, or data streams.
        </p>
      </div>

      <div
        className="glass-panel p-1 rounded-xl compute-input-focus transition-all duration-300"
        style={{ transform: query ? undefined : undefined }}
      >
        <div className="flex items-center gap-4 px-6 py-4 bg-surface-container-low rounded-lg">
          <img src={sparkIcon} alt="search" className="w-6 h-6 object-contain shrink-0" />
          <input
            className="bg-transparent border-none outline-none focus:ring-0 w-full font-mono text-[18px] text-primary placeholder:text-outline-variant"
            placeholder="integrate log(x)^2 from 0 to 1..."
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex items-center gap-2 shrink-0">
            
            <button className="bg-primary p-2 rounded-lg hover:scale-105 active:scale-95 transition-all cursor-pointer">
              <img src={arrowIcon} alt="submit" className="w-5 h-5 object-contain brightness-0" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
