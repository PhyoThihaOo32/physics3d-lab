import { useEffect } from 'react';
import { AppShell } from './layout/AppShell';
import { LabDirectory } from './pages/LabDirectory';
import { LabPage } from './pages/LabPage';
import { ExperimentPage } from './pages/ExperimentPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { useRoute } from './routes';
import { getExperiment, getLab } from '../experiments/catalog';

export function App() {
  const route = useRoute();
  let page;
  let title = 'Physics3D Lab · Labs';
  switch (route.kind) {
    case 'directory':
      page = <LabDirectory />;
      break;
    case 'lab': {
      const lab = getLab(route.id);
      title = lab
        ? `${lab.title} lab · Physics3D Lab`
        : 'Page not found · Physics3D Lab';
      page = lab ? <LabPage lab={lab} /> : <NotFoundPage />;
      break;
    }
    case 'experiment': {
      const experiment = getExperiment(route.id);
      title = experiment
        ? `${experiment.title} · Physics3D Lab`
        : 'Page not found · Physics3D Lab';
      page = experiment ? (
        <ExperimentPage key={experiment.id} experiment={experiment} />
      ) : (
        <NotFoundPage />
      );
      break;
    }
    default:
      title = 'Page not found · Physics3D Lab';
      page = <NotFoundPage />;
  }
  useEffect(() => {
    document.title = title;
  }, [title]);
  return <AppShell directory={route.kind === 'directory'}>{page}</AppShell>;
}
