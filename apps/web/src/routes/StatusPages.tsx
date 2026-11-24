import { FileQuestionIcon, LockIcon, TriangleAlertIcon } from 'lucide-react';
import { Link, isRouteErrorResponse, useRouteError } from 'react-router';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';

const HomeButton = () => (
  <Button asChild variant="outline">
    <Link to="/">Go to My Work</Link>
  </Button>
);

export function NotFoundPage() {
  return (
    <EmptyState
      icon={FileQuestionIcon}
      title="Page not found"
      description="The page you are looking for doesn't exist or was moved."
      action={<HomeButton />}
      className="mt-10"
    />
  );
}

export function NoAccessPage() {
  return (
    <EmptyState
      icon={LockIcon}
      title="You don't have access"
      description="Your role doesn't allow viewing this page. Ask your manager or an administrator if you need access."
      action={<HomeButton />}
      className="mt-10"
    />
  );
}

/** Router-level error boundary for unexpected render or lazy-load failures. */
export function RouteErrorPage() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Unknown error';
  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <EmptyState
        icon={TriangleAlertIcon}
        title="Something went wrong"
        description={message}
        action={<Button onClick={() => window.location.reload()}>Reload</Button>}
      />
    </div>
  );
}
