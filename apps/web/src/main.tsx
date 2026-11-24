import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { envResult, mocksEnabled } from './env';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');
const root = createRoot(rootElement);

async function bootstrap(): Promise<void> {
  if (!envResult.success) {
    root.render(
      <pre className="p-6 text-sm text-destructive">
        Invalid web configuration (check apps/web/.env):{'\n'}
        {envResult.error.issues.map((i) => `- ${i.path.join('.')}: ${i.message}`).join('\n')}
      </pre>,
    );
    return;
  }

  // `import.meta.env.DEV` is false in production builds, so the mock layer is never bundled there.
  if (import.meta.env.DEV && mocksEnabled) {
    const { startMockWorker } = await import('./mocks/browser');
    await startMockWorker();
  }

  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
