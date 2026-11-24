import { delay, http } from 'msw';
import { apiError, apiPath } from '../http';
import { checklistHandlers } from './checklist';
import { commentHandlers } from './comments';
import { dashboardHandlers } from './dashboard';
import { directorySyncHandlers } from './directory-sync';
import { labelHandlers } from './labels';
import { memberHandlers } from './members';
import { notificationHandlers } from './notifications';
import { orgHandlers } from './org';
import { projectHandlers } from './projects';
import { savedViewHandlers } from './saved-views';
import { taskHandlers } from './tasks';
import { timeLogHandlers } from './time-logs';
import { timesheetHandlers } from './timesheets';
import { userHandlers } from './users';

/**
 * Dev toggles for testing error states, set in the browser console:
 *   localStorage.setItem('aionos.mocks.fail', 'writes')  // every POST/PATCH/PUT/DELETE returns 500
 *   localStorage.setItem('aionos.mocks.fail', 'all')     // every request returns 500
 *   localStorage.removeItem('aionos.mocks.fail')
 */
function failureMode(): string | null {
  try {
    return localStorage.getItem('aionos.mocks.fail');
  } catch {
    return null;
  }
}

/** Adds realistic latency to every API call, optionally fails it, else falls through. */
const latencyAndFailures = http.all(apiPath('/*'), async ({ request }) => {
  await delay(150 + Math.random() * 250);
  const mode = failureMode();
  if (mode === 'all' || (mode === 'writes' && request.method !== 'GET')) {
    return apiError(request, 500, 'Simulated server error (aionos.mocks.fail)');
  }
  return undefined;
});

export const handlers = [
  latencyAndFailures,
  ...userHandlers,
  ...orgHandlers,
  ...projectHandlers,
  ...memberHandlers,
  ...labelHandlers,
  ...taskHandlers,
  ...checklistHandlers,
  ...commentHandlers,
  ...timeLogHandlers,
  ...timesheetHandlers,
  ...notificationHandlers,
  ...savedViewHandlers,
  ...dashboardHandlers,
  ...directorySyncHandlers,
];
