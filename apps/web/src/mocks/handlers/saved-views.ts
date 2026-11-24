import type { CreateSavedViewInput } from '@aionos/shared';
import { HttpResponse, http } from 'msw';
import { db, newId, nowIso, type SavedViewRow } from '../db';
import { apiError, apiPath, currentUser, readJson } from '../http';
import { toSavedViewDto } from '../serializers';

const MAX_VIEWS = 20;
// In-app paths only (no protocol, no "//host"), so a saved view can never redirect elsewhere.
const APP_PATH = /^\/(?!\/)[A-Za-z0-9/_-]{0,199}$/;

export const savedViewHandlers = [
  http.get(apiPath('/saved-views'), ({ request }) => {
    const user = currentUser(request);
    const rows = db.savedViews
      .filter((v) => v.userId === user.id)
      .sort((a, b) => a.name.localeCompare(b.name));
    return HttpResponse.json(rows.map(toSavedViewDto));
  }),

  http.post(apiPath('/saved-views'), async ({ request }) => {
    const user = currentUser(request);
    const body = await readJson<CreateSavedViewInput>(request);
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const errors: string[] = [];
    if (name.length < 1 || name.length > 80) errors.push('name must be 1-80 characters');
    if (typeof body.path !== 'string' || !APP_PATH.test(body.path))
      errors.push('path must be an app path');
    if (typeof body.query !== 'string' || body.query.length > 1000 || body.query.startsWith('?')) {
      errors.push('query must be a URL query string without "?" (max 1000 characters)');
    }
    if (errors.length > 0) return apiError(request, 400, errors);
    const mine = db.savedViews.filter((v) => v.userId === user.id);
    if (mine.length >= MAX_VIEWS)
      return apiError(request, 409, `You can save at most ${MAX_VIEWS} views`);
    if (mine.some((v) => v.name.toLowerCase() === name.toLowerCase())) {
      return apiError(request, 409, `You already have a view named "${name}"`);
    }
    const row: SavedViewRow = {
      id: newId(),
      userId: user.id,
      name,
      path: body.path as string,
      query: body.query as string,
      createdAt: nowIso(),
    };
    db.savedViews.push(row);
    return HttpResponse.json(toSavedViewDto(row), { status: 201 });
  }),

  http.delete(apiPath('/saved-views/:viewId'), ({ request, params }) => {
    const user = currentUser(request);
    const view = db.savedViews.find((v) => v.id === params.viewId && v.userId === user.id);
    if (!view) return apiError(request, 404, 'Saved view not found');
    db.savedViews.splice(db.savedViews.indexOf(view), 1);
    return new HttpResponse(null, { status: 204 });
  }),
];
