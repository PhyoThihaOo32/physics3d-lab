import type { LabDefinition } from '../../types/catalog';
import { experimentUrl, getLabExperiments } from '../../experiments/catalog';

export function LabPage({ lab }: { lab: LabDefinition }) {
  return (
    <>
      <h1 className="page-title">{lab.title} lab</h1>
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
