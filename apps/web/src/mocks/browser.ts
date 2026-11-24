import { setupWorker } from 'msw/browser';
import { persistDb } from './db';
import { handlers } from './handlers';

export async function startMockWorker(): Promise<void> {
  const worker = setupWorker(...handlers);
  // Save the mock database after every write, so created data survives a page reload.
  worker.events.on('response:mocked', ({ request }) => {
    if (request.method !== 'GET') persistDb();
  });
  await worker.start({
    // Anything outside the mocked API (Vite assets, fonts, MSAL) goes to the network.
    onUnhandledFrame: 'bypass',
    quiet: true,
  });
  console.warn('[mocks] MSW is intercepting API requests (VITE_USE_MOCKS=true)');
}
