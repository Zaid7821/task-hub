import { HttpResponse, http } from 'msw';
import { db, nowIso } from '../db';
import { apiError, apiPath, currentUser, paginate, searchParam } from '../http';
import { toNotificationDto } from '../serializers';

export const notificationHandlers = [
  // Registered before /notifications/:id routes.
  http.get(apiPath('/notifications/unread-count'), ({ request }) => {
    const user = currentUser(request);
    const count = db.notifications.filter((n) => n.userId === user.id && n.readAt === null).length;
    return HttpResponse.json({ count });
  }),

  http.get(apiPath('/notifications'), ({ request }) => {
    const user = currentUser(request);
    const unreadOnly = searchParam(request, 'unreadOnly') === 'true';
    const rows = db.notifications
      .filter((n) => n.userId === user.id && (!unreadOnly || n.readAt === null))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return HttpResponse.json(paginate(request, rows.map(toNotificationDto)));
  }),

  http.post(apiPath('/notifications/read-all'), ({ request }) => {
    const user = currentUser(request);
    const now = nowIso();
    for (const n of db.notifications) {
      if (n.userId === user.id && n.readAt === null) n.readAt = now;
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.patch(apiPath('/notifications/:notificationId/read'), ({ request, params }) => {
    const user = currentUser(request);
    const row = db.notifications.find(
      (n) => n.id === params.notificationId && n.userId === user.id,
    );
    if (!row) return apiError(request, 404, 'Notification not found');
    row.readAt ??= nowIso();
    return HttpResponse.json(toNotificationDto(row));
  }),
];
