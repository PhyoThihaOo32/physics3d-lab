import { getLabExperiments, labs, labUrl } from '../../experiments/catalog';

export function LabDirectory() {
  return (
    <>
      <h1 className="page-title">Labs</h1>
      <div className="lab-grid">
        {labs.map((lab) => (
          <article className="lab-card" key={lab.id}>
            <h2>
              <a
                href={labUrl(lab.id)}
                aria-label={`Open ${lab.title.toLowerCase()} lab`}
              >
                {lab.title} <span aria-hidden="true">↗</span>
              </a>
            </h2>
            <ul className="lab-experiment-list">
              {getLabExperiments(lab.id).map((entry) => (
                <li key={entry.id}>{entry.title}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </>
  );
}
