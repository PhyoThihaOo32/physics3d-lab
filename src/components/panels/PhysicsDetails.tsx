import type { ReactNode } from 'react';

export function PhysicsDetails({ children }: { children: ReactNode }) {
  return (
    <details className="physics-details">
      <summary>Model</summary>
      <div>
        {children}
        <p>Step size: 1/120 s. Readouts: 10 Hz.</p>
      </div>
    </details>
  );
}
