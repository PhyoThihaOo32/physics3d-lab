import {
  experiments,
  getLabExperiments,
  labs,
  labUrl,
} from '../../experiments/catalog';

export function LabDirectory() {
  const available = experiments.filter(
    (experiment) => experiment.status === 'available',
  ).length;
  return (
    <>
      <div className="page-heading directory-heading">
        <div>
          <div className="eyebrow">
            <span className="tiny-square" />
            YOUR PHYSICS LABORATORY
          </div>
          <h1>Choose a lab. Start exploring.</h1>
          <p>
            Choose a topic, open an experiment, and run a trial with your own
            physical parameters.
          </p>
        </div>
        <div className="catalog-count">
          <strong>{String(available).padStart(2, '0')}</strong>
          <span>
            EXPERIMENT{available === 1 ? '' : 'S'} AVAILABLE
            <span>{labs.length} labs to explore</span>
          </span>
        </div>
      </div>
      <div className="catalog-section-heading">
        <h2>The labs</h2>
        <span>
          Available experiments are ready to run. Planned experiments show what
          comes next.
        </span>
      </div>
      <div className="lab-grid">
        {labs.map((lab, index) => {
          const entries = getLabExperiments(lab.id);
          const ready = entries.filter(
            (entry) => entry.status === 'available',
          ).length;
          return (
            <article
              className={`lab-card ${ready ? 'lab-card-available' : ''}`}
              key={lab.id}
            >
              <div className="lab-card-top">
                <span className="panel-kicker">
                  LAB {String(index + 1).padStart(2, '0')} / {lab.category}
                </span>
                <span
                  className={`availability ${ready ? 'available' : 'planned'}`}
                >
                  {ready ? 'Available' : 'Planned'}
                </span>
              </div>
              <div className="lab-symbol" aria-hidden="true">
                {lab.symbol}
              </div>
              <h2>{lab.title}</h2>
              <p>{lab.description}</p>
              <ul className="lab-experiment-list">
                {entries.map((entry) => (
                  <li key={entry.id}>
                    <span>{entry.title}</span>
                    <span>
                      {entry.status === 'available' ? 'Ready' : 'Planned'}
                    </span>
                  </li>
                ))}
              </ul>
              <a className="lab-card-link" href={labUrl(lab.id)}>
                {ready
                  ? `Open ${lab.title.toLowerCase()} lab`
                  : `Explore ${lab.title.toLowerCase()} lab`}
                <span aria-hidden="true">↗</span>
              </a>
            </article>
          );
        })}
      </div>
      <section className="lab-guide" aria-labelledby="lab-guide-title">
        <div>
          <div className="section-label">HOW TO USE THE LAB</div>
          <h2 id="lab-guide-title">One topic. Many experiments.</h2>
          <p>Build understanding one trial at a time.</p>
        </div>
        <ol>
          <li>
            <span>01</span>
            <div>
              <strong>Choose a lab</strong>
              <p>A collection of experiments about one physics topic.</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>Open an experiment</strong>
              <p>A physical system with a question to investigate.</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>Run a trial</strong>
              <p>
                Choose values, start the simulation, and inspect the
                measurements.
              </p>
            </div>
          </li>
        </ol>
      </section>
    </>
  );
}
