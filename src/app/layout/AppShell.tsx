import type { ReactNode } from 'react';
import { useSimulationStore } from '../../store/simulationStore';
import { PrismCube } from './PrismCube';

export function AppShell({
  children,
  directory = false,
  labId,
  pageTitle,
}: {
  children: ReactNode;
  directory?: boolean;
  labId?: string;
  pageTitle: string;
}) {
  const running = useSimulationStore((state) => state.running);
  return (
    <div className="app-shell" data-lab={labId} data-running={running}>
      <a
        className="skip-link"
        href="#main"
        onClick={(event) => {
          // Preserve the hash router's current experiment when skipping ahead.
          event.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        Skip to main content
      </a>
      <header className="site-header">
        <a className="brand" href="#/labs" aria-label="Physics3D Lab home">
          <span className="brand-mark" aria-hidden="true">
            <PrismCube />
          </span>
          <span>Physics3D Lab</span>
        </a>
        <nav aria-label="Main navigation">
          <a
            className="directory-link"
            href="#/labs"
            aria-current={directory ? 'page' : undefined}
          >
            All labs
          </a>
        </nav>
      </header>
      <main id="main" tabIndex={-1}>
        <div className="page-content" key={pageTitle}>
          {children}
        </div>
        <footer>
          <span>Created by Phyo Thiha Oo</span>
          <a href="#/labs">Physics3D Lab</a>
        </footer>
      </main>
    </div>
  );
}
