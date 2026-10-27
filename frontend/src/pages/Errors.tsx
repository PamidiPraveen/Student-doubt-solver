import { Page } from "../components/Layout";
import { EmptyState, LinkButton } from "../components/ui";
import { homePathFor, useAuth } from "../lib/auth";

export function NotFound() {
  const { user } = useAuth();
  return (
    <Page>
      <EmptyState
        title="This page does not exist"
        action={<LinkButton to={user ? homePathFor(user) : "/"}>Go to your home page</LinkButton>}
      >
        The address may be mistyped, or the page was moved.
      </EmptyState>
    </Page>
  );
}

export function Forbidden() {
  const { user } = useAuth();
  return (
    <Page>
      <EmptyState
        title="Your account cannot open that page"
        action={<LinkButton to={user ? homePathFor(user) : "/"}>Go to your home page</LinkButton>}
      >
        This page is for a different kind of account.
      </EmptyState>
    </Page>
  );
}
