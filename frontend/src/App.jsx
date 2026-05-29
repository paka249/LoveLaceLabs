import './index.css';
import Sidebar from './components/layout/Sidebar';
import TopAppBar from './components/layout/TopAppBar';
import IntelligenceHub from './components/dashboard/IntelligenceHub';
import EngineGrid from './components/dashboard/EngineGrid';
import RecentNotebooks from './components/dashboard/RecentNotebooks';

export default function App() {
  return (
    <div className="min-h-screen bg-background text-on-surface">
      <Sidebar />

      <main className="ml-[208px] min-h-screen blueprint-grid">
        <TopAppBar />

        <div className="pt-[96px] pb-20 px-6 max-w-[1024px] mx-auto space-y-12">
          <IntelligenceHub />

          <section className="space-y-12">
            <EngineGrid />
            <RecentNotebooks />
          </section>
        </div>
      </main>
    </div>
  );
}
