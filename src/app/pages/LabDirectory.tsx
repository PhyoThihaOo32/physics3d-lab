import { getLabExperiments, labs, labUrl } from '../../experiments/catalog';
import { PrismCube } from '../layout/PrismCube';

function LabIllustration({ labId }: { labId: string }) {
  return (
    <div className="lab-preview" aria-hidden="true">
      {labId === 'motion' && (
        <div className="lab-diagram motion-diagram">
          <span className="motion-arc" />
          <span className="motion-point" />
        </div>
      )}
      {labId === 'vectors' && (
        <div className="lab-diagram vector-diagram">
          <span className="diagram-vector diagram-vector-a" />
          <span className="diagram-vector diagram-vector-b" />
          <span className="diagram-vector diagram-vector-sum" />
        </div>
      )}
      {labId === 'rotation' && (
        <div className="lab-diagram rotation-diagram">
          <span className="rotation-axis" />
          <span className="rotation-ring" />
          <span className="rotation-point" />
        </div>
      )}
    </div>
  );
}

export function LabDirectory() {
  return (
    <>
      <section className="directory-hero" aria-labelledby="directory-title">
        <div className="directory-intro">
          <h1 id="directory-title">Explore physics in 3D.</h1>
          <p>
            Change the setup, run a trial, and see what the measurements reveal.
          </p>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="hero-orbits">
            <span className="hero-orbit" />
            <span className="hero-orbit hero-orbit-cross" />
            <span className="hero-orbit-point" />
          </div>
          <div className="hero-prism">
            <PrismCube />
          </div>
        </div>
      </section>
      <section
        className="directory-labs"
        aria-labelledby="directory-labs-title"
      >
        <div className="catalog-section-heading">
          <h2 id="directory-labs-title">Labs</h2>
        </div>
        <div className="lab-grid">
          {labs.map((lab) => {
            const entries = getLabExperiments(lab.id);
            const ready = entries.filter(
              (entry) => entry.status === 'available',
            ).length;
            return (
              <article className="lab-card" data-lab={lab.id} key={lab.id}>
                <LabIllustration labId={lab.id} />
                <div className="lab-card-body">
                  <div className="lab-card-top">
                    <h3>{lab.title}</h3>
                    <span className="lab-count">
                      {ready
                        ? `${ready} ${ready === 1 ? 'experiment' : 'experiments'}`
                        : 'Planned'}
                    </span>
                  </div>
                  <p>{lab.description}</p>
                  <a className="lab-card-link" href={labUrl(lab.id)}>
                    {ready
                      ? `Open ${lab.title.toLowerCase()} lab`
                      : `Explore ${lab.title.toLowerCase()} lab`}
                    <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
