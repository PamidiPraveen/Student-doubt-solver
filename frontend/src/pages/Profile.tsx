import { Page } from "../components/Layout";
import { Button, PageHeader } from "../components/ui";
import { useAuth, useSignOut } from "../lib/auth";

const ROLE_LABEL = { student: "Student", faculty: "Faculty" } as const;

export default function Profile() {
  const { user } = useAuth();
  const logout = useSignOut();
  if (!user) return null;
  return (
    <Page>
      <PageHeader title="Your profile" />
      <dl className="kv">
        <dt>Name</dt>
        <dd>{user.name}</dd>
        <dt>Email</dt>
        <dd>{user.email}</dd>
        <dt>Account type</dt>
        <dd>{ROLE_LABEL[user.role]}</dd>
      </dl>
      <Button variant="secondary" onClick={logout}>
        Sign out
      </Button>
    </Page>
  );
}
