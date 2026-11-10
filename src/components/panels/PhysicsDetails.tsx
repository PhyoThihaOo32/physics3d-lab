import type { ReactNode } from 'react';
export function PhysicsDetails({ children }: { children: ReactNode }) {
  return (
    <details className="physics-details">
      <summary>Contact model & measurement accuracy</summary>
      <div>
        {children}
        <p>
          Both experiments integrate at 1/120 s, regardless of playback speed.
          Readouts update at 10 Hz; pausing publishes the exact last integrated
          step. Contact times have finite timestep and solver resolution.
          Displayed decimal places are formatting, not a claim of equivalent
          measurement accuracy.
        </p>
      </div>
    </details>
  );
}
