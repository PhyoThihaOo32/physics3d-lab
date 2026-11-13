import type { LabDefinition } from '../../types/catalog';
import { experimentUrl, getLabExperiments } from '../../experiments/catalog';

export function LabPage({ lab }: { lab: LabDefinition }) {
  return (
    <>
      <header className="page-intro">
        <h1>{lab.title} lab</h1>
        <p>{lab.description}</p>
      </header>
      <div className="experiment-grid">
        {getLabExperiments(lab.id).map((experiment) => (
          <article className="experiment-card" key={experiment.id}>
            <h2>
              <a
                href={experimentUrl(experiment.id)}
                aria-label={
                  experiment.status === 'available'
                    ? `Open ${experiment.title.toLowerCase()}`
                    : `View ${experiment.title.toLowerCase()} plan`
                }
              >
                {experiment.title} <span aria-hidden="true">↗</span>
              </a>
            </h2>
            <p>{experiment.description}</p>
          </article>
        ))}
      </div>
    </>
  );
}
