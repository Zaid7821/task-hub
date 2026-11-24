import { HttpResponse, http } from 'msw';
import { db } from '../db';
import { apiError, apiPath, currentUser, matchesSearch, paginate, searchParam } from '../http';
import { toUserDto } from '../serializers';

export const userHandlers = [
  // Must be registered before /users/:id.
  http.get(apiPath('/users/me'), ({ request }) =>
    HttpResponse.json(toUserDto(currentUser(request))),
  ),

  http.get(apiPath('/users'), ({ request }) => {
    currentUser(request);
    const search = searchParam(request, 'search');
    const departmentId = searchParam(request, 'departmentId');
    const teamId = searchParam(request, 'teamId');
    const isActive = searchParam(request, 'isActive');

    const rows = db.users
      .filter((u) => matchesSearch(search, u.displayName, u.email, u.jobTitle))
      .filter((u) => !departmentId || u.departmentId === departmentId)
      .filter((u) => !teamId || u.teamId === teamId)
      .filter((u) => isActive === undefined || String(u.isActive) === isActive)
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    return HttpResponse.json(paginate(request, rows.map(toUserDto)));
  }),

  http.get(apiPath('/users/:id'), ({ request, params }) => {
    currentUser(request);
    const user = db.users.find((u) => u.id === params.id);
    if (!user) return apiError(request, 404, 'User not found');
    return HttpResponse.json(toUserDto(user));
  }),
];
