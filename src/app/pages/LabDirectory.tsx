import {
  experimentUrl,
  getLabExperiments,
  labs,
  labUrl,
} from '../../experiments/catalog';

export function LabDirectory() {
  return (
    <>
      <header className="page-intro">
        <h1>Labs</h1>
        <p>Choose an experiment to explore physics in 3D.</p>
      </header>
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
            <p>{lab.description}</p>
            <ul className="lab-experiment-list">
              {getLabExperiments(lab.id).map((entry) => (
                <li key={entry.id}>
                  <a href={experimentUrl(entry.id)}>{entry.title}</a>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </>
  );
}
