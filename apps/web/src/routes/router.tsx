import type { ComponentType } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { LoginPage } from '@/auth/LoginPage';
import { RequireAuth } from '@/auth/RequireAuth';
import { RequirePermission } from '@/auth/RequirePermission';
import { AppLayout } from '@/layouts/AppLayout';
import { canAccessAdmin, canApproveTimesheets, canLogTime } from '@/lib/permissions';
import { NoAccessPage, NotFoundPage, RouteErrorPage } from './StatusPages';

/** Code-split a feature page: `lazyPage(() => import('...'), (m) => m.Page)`. */
function lazyPage<M>(load: () => Promise<M>, pick: (module: M) => ComponentType) {
  return async () => ({ Component: pick(await load()) });
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage />, errorElement: <RouteErrorPage /> },
  {
    element: <RequireAuth />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/my-work" replace /> },
          {
            path: 'my-work',
            lazy: lazyPage(
              () => import('@/features/my-work/MyWorkPage'),
              (m) => m.MyWorkPage,
            ),
          },
          {
            path: 'projects',
            lazy: lazyPage(
              () => import('@/features/projects/ProjectsPage'),
              (m) => m.ProjectsPage,
            ),
          },
          {
            path: 'projects/:projectKey',
            lazy: lazyPage(
              () => import('@/features/projects/detail/ProjectDetailLayout'),
              (m) => m.ProjectDetailLayout,
            ),
            children: [
              { index: true, element: <Navigate to="board" replace /> },
              {
                path: 'board',
                lazy: lazyPage(
                  () => import('@/features/projects/detail/BoardTab'),
                  (m) => m.BoardTab,
                ),
              },
              {
                path: 'list',
                lazy: lazyPage(
                  () => import('@/features/projects/detail/ListTab'),
                  (m) => m.ListTab,
                ),
              },
              {
                path: 'members',
                lazy: lazyPage(
                  () => import('@/features/projects/detail/MembersTab'),
                  (m) => m.MembersTab,
                ),
              },
              {
                path: 'tasks/:taskKey',
                lazy: lazyPage(
                  () => import('@/features/tasks/TaskDrawerRoute'),
                  (m) => m.TaskDrawerRoute,
                ),
              },
            ],
          },
          {
            path: 'timesheet',
            element: <RequirePermission check={canLogTime} />,
            children: [
              {
                lazy: lazyPage(
                  () => import('@/features/timesheet/TimesheetLayout'),
                  (m) => m.TimesheetLayout,
                ),
                children: [
                  {
                    index: true,
                    lazy: lazyPage(
                      () => import('@/features/timesheet/MyTimesheetPage'),
                      (m) => m.MyTimesheetPage,
                    ),
                  },
                  {
                    path: 'approvals',
                    element: <RequirePermission check={canApproveTimesheets} />,
                    children: [
                      {
                        index: true,
                        lazy: lazyPage(
                          () => import('@/features/timesheet/ApprovalsPage'),
                          (m) => m.ApprovalsPage,
                        ),
                      },
                      {
                        path: ':sheetId',
                        lazy: lazyPage(
                          () => import('@/features/timesheet/ApprovalDetailPage'),
                          (m) => m.ApprovalDetailPage,
                        ),
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            path: 'dashboard',
            lazy: lazyPage(
              () => import('@/features/dashboard/DashboardPage'),
              (m) => m.DashboardPage,
            ),
          },
          {
            path: 'admin',
            element: <RequirePermission check={canAccessAdmin} />,
            children: [
              {
                lazy: lazyPage(
                  () => import('@/features/admin/AdminLayout'),
                  (m) => m.AdminLayout,
                ),
                children: [
                  { index: true, element: <Navigate to="departments" replace /> },
                  {
                    path: 'departments',
                    lazy: lazyPage(
                      () => import('@/features/admin/pages'),
                      (m) => m.DepartmentsPage,
                    ),
                  },
                  {
                    path: 'teams',
                    lazy: lazyPage(
                      () => import('@/features/admin/pages'),
                      (m) => m.TeamsPage,
                    ),
                  },
                  {
                    path: 'users',
                    lazy: lazyPage(
                      () => import('@/features/admin/pages'),
                      (m) => m.UsersPage,
                    ),
                  },
                  {
                    path: 'sync',
                    lazy: lazyPage(
                      () => import('@/features/admin/DirectorySyncPage'),
                      (m) => m.DirectorySyncPage,
                    ),
                  },
                ],
              },
            ],
          },
          { path: 'no-access', element: <NoAccessPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
