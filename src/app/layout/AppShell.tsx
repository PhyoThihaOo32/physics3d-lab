import type { ReactNode } from 'react';

export function AppShell({
  children,
  directory = false,
}: {
  children: ReactNode;
  directory?: boolean;
}) {
  return (
    <div className="app-shell">
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
            ◈
          </span>
          <span>
            Physics<span className="brand-3d">3D</span>
            <span className="brand-lab">Lab</span>
          </span>
        </a>
        <div className="header-context">AN INTERACTIVE PHYSICS LABORATORY</div>
        <nav aria-label="Main navigation">
          <a
            className="directory-link"
            href="#/labs"
            aria-current={directory ? 'page' : undefined}
          >
            All labs
          </a>
        </nav>
        <span className="version">
          <span />
          Physics3D · v0.4
        </span>
      </header>
      <main id="main" tabIndex={-1}>
        {children}
        <footer>
          <span>PHYSICS, MADE VISIBLE.</span>
          <span>
            Explore<span className="footer-divider">/</span>Experiment
            <span className="footer-divider">/</span>Understand
          </span>
        </footer>
      </main>
    </div>
  );
}
