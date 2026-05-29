export default function TopAppBar() {
  return (
    <header className="fixed top-0 right-0 w-[calc(100%-208px)] h-[64px] z-40 bg-[rgba(13,28,45,0.4)] border-b border-[rgba(133,148,139,0.2)] backdrop-blur-xl flex justify-between items-center px-6">
      {/* Left: node indicator */}
      <div className="flex items-center gap-4">
        <div className="w-2 h-2 rounded-full bg-primary glow-accent" />
        <span className="text-[11px] tracking-[0.05em] font-bold font-mono text-on-surface-variant uppercase">
          Node: US-East-Intel-01
        </span>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4 text-on-surface-variant">
          <span className="material-symbols-outlined hover:text-primary cursor-pointer transition-all active:scale-90">
            memory
          </span>
          <span className="material-symbols-outlined hover:text-primary cursor-pointer transition-all active:scale-90">
            cloud_done
          </span>
          <span className="material-symbols-outlined hover:text-primary cursor-pointer transition-all active:scale-90">
            notifications
          </span>
        </div>

        <button className="px-4 py-1.5 bg-primary-container text-on-primary text-[10px] tracking-[0.05em] font-bold font-mono rounded-sm hover:scale-95 duration-100 active:scale-90 cursor-pointer">
          RUN COMPUTE
        </button>

        <div className="w-8 h-8 rounded-full border border-[rgba(133,148,139,0.2)] overflow-hidden">
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBRop6-bmiXTEonFPf9g7EQN4NNAPqcx4--h_UU2ElO0Bf8qJsYKIH2h_dY_SctLGjU-eAk3z27vw0Yj_nuJm4dJ8AD5KfXcY038t88oaba6X6Eu9uJ1UQ8MfkcOIvqLKVjG3P8Z7EmUg3_f5k05ALFXfjRa2-Wtq2S74hjqZRhGoihZ08PVDzEyQm86h-jJP8Mcf-QUizC_npiqkK6CBK5lTp4ypdx6Ld9E4jvKU__5n4jlgbwfiMmQIkxOnmK5wZKRdGYfzqSlq8"
            alt="Researcher Profile"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </header>
  );
}
