import { useLocation } from 'react-router';

/** Where to go after login: the page that sent the user to /login, else home. */
export function usePostLoginRedirect(): string {
  const location = useLocation();
  const state = location.state as { from?: { pathname: string; search?: string } } | null;
  const from = state?.from;
  return from && from.pathname !== '/login' ? `${from.pathname}${from.search ?? ''}` : '/';
}
