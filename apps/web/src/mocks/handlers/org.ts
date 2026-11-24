import { HttpResponse, http } from 'msw';
import { db } from '../db';
import { apiPath, currentUser, matchesSearch, paginate, searchParam } from '../http';
import { toDepartmentDto, toTeamDto } from '../serializers';

export const orgHandlers = [
  http.get(apiPath('/departments'), ({ request }) => {
    currentUser(request);
    const search = searchParam(request, 'search');
    const rows = db.departments
      .filter((d) => matchesSearch(search, d.name))
      .sort((a, b) => a.name.localeCompare(b.name));
    return HttpResponse.json(paginate(request, rows.map(toDepartmentDto)));
  }),

  http.get(apiPath('/teams'), ({ request }) => {
    currentUser(request);
    const search = searchParam(request, 'search');
    const departmentId = searchParam(request, 'departmentId');
    const rows = db.teams
      .filter((t) => matchesSearch(search, t.name))
      .filter((t) => !departmentId || t.departmentId === departmentId)
      .sort((a, b) => a.name.localeCompare(b.name));
    return HttpResponse.json(paginate(request, rows.map(toTeamDto)));
  }),
];
