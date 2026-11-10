import type { LabDefinition } from '../../types/catalog';
import { experimentUrl, getLabExperiments } from '../../experiments/catalog';
import { Breadcrumbs } from '../../components/panels/Breadcrumbs';

export function LabPage({ lab }: { lab: LabDefinition }) {
  const entries = getLabExperiments(lab.id);
  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'All labs', href: '#/labs' },
          { label: `${lab.title} lab` },
        ]}
      />
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="tiny-square" />
            {lab.category}
          </div>
          <h1>{lab.title} lab</h1>
          <p>{lab.description}</p>
        </div>
        <div className="lab-page-symbol" aria-hidden="true">
          {lab.symbol}
        </div>
      </div>
      <div className="catalog-section-heading">
        <h2>Experiments</h2>
        <span>
          {entries.filter((entry) => entry.status === 'available').length}{' '}
          available ·{' '}
          {entries.filter((entry) => entry.status === 'planned').length} planned
        </span>
      </div>
      <div className="experiment-grid">
        {entries.map((experiment, index) => (
          <article className="experiment-card" key={experiment.id}>
            <div className="lab-card-top">
              <span className="panel-kicker">
                {String(index + 1).padStart(2, '0')} /{' '}
                {experiment.topic.toUpperCase()}
              </span>
              <span className={`availability ${experiment.status}`}>
                {experiment.status === 'available' ? 'Available' : 'Planned'}
              </span>
            </div>
            <h2>{experiment.title}</h2>
            <p>{experiment.description}</p>
            <div className="section-label">WHAT YOU WILL MEASURE</div>
            <ul className="measurement-tags">
              {experiment.measurements.map((measurement) => (
                <li key={measurement}>{measurement}</li>
              ))}
            </ul>
            <a className="lab-card-link" href={experimentUrl(experiment.id)}>
              {experiment.status === 'available'
                ? `Open ${experiment.title.toLowerCase()}`
                : `View ${experiment.title.toLowerCase()} plan`}
              <span aria-hidden="true">↗</span>
            </a>
          </article>
        ))}
      </div>
      <section className="lab-objectives">
        <div className="section-label">LEARNING OBJECTIVES</div>
        <ul>
          {lab.objectives.map((objective) => (
            <li key={objective}>{objective}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
