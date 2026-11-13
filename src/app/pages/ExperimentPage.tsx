import {
  Component,
  lazy,
  Suspense,
  type ReactNode,
  type ComponentType,
  type LazyExoticComponent,
} from 'react';
import { Breadcrumbs } from '../../components/panels/Breadcrumbs';
import { experiments, getLab, labUrl } from '../../experiments/catalog';
import type { ExperimentRegistration } from '../../types/catalog';

// Stable component identities preserve experiment state across ordinary rerenders.
const pages: Record<string, LazyExoticComponent<ComponentType> | undefined> =
  {};
for (const experiment of experiments) {
  if (experiment.status === 'available')
    pages[experiment.id] = lazy(experiment.load);
}

class ExperimentBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="route-message" role="alert">
        <h1>The experiment could not load.</h1>
        <p>Reload the page to try again, or return to the lab directory.</p>
        <a href="#/labs">Return to all labs</a>
      </div>
    ) : (
      this.props.children
    );
  }
}

export function ExperimentPage({
  experiment,
}: {
  experiment: ExperimentRegistration;
}) {
  const Page = pages[experiment.id];
  const lab = getLab(experiment.labId)!;
  return (
    <>
      <Breadcrumbs
        items={[{ label: `${lab.title} lab`, href: labUrl(lab.id) }]}
      />
      {Page ? (
        <ExperimentBoundary key={experiment.id}>
          <Suspense
            fallback={
              <div className="route-message" role="status">
                Loading {experiment.title.toLowerCase()}…
              </div>
            }
          >
            <Page />
          </Suspense>
        </ExperimentBoundary>
      ) : (
        <div className="route-message">
          <h1>{experiment.title}</h1>
          <p>Planned · {experiment.description}</p>
        </div>
      )}
    </>
  );
}
