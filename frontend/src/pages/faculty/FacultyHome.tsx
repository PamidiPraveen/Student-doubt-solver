import { useQuery } from "@tanstack/react-query";
import { questions } from "../../api/endpoints";
import { Page } from "../../components/Layout";
import { QuestionRows } from "../../components/QuestionRows";
import { EmptyState, ErrorState, LinkButton, PageHeader, SkeletonRows } from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { messageFor } from "../../lib/messages";

/** Faculty landing: the doubts still waiting, oldest need first. */
export default function FacultyHome() {
  const { user } = useAuth();
  const waiting = useQuery({
    queryKey: ["questions", "faculty-waiting"],
    queryFn: () => questions.list({ status: "open", limit: 10 }),
  });
  const answered = useQuery({
    queryKey: ["questions", "count", "answered-all"],
    queryFn: () => questions.list({ status: "answered", limit: 1 }),
  });

  return (
    <Page>
      <PageHeader
        title={`Welcome, ${user?.name.split(" ")[0] ?? "faculty"}`}
        intro="Doubts from students are waiting for a clear, kind answer."
        actions={<LinkButton to="/doubts">Browse all doubts</LinkButton>}
      />

      <dl className="tally">
        <div className="tally-card">
          <dd>{waiting.data?.total ?? "–"}</dd>
          <dt>waiting for an answer</dt>
        </div>
        <div className="tally-card">
          <dd>{answered.data?.total ?? "–"}</dd>
          <dt>answered so far</dt>
        </div>
      </dl>

      <div className="section-head">
        <h2>Waiting for an answer</h2>
        <LinkButton to="/doubts" variant="quiet">
          See all
        </LinkButton>
      </div>

      {waiting.isPending ? (
        <SkeletonRows count={3} />
      ) : waiting.isError ? (
        <ErrorState message={messageFor(waiting.error)} onRetry={() => waiting.refetch()} />
      ) : waiting.data.items.length === 0 ? (
        <EmptyState title="Nothing waiting">Every open doubt has an answer. Check back later.</EmptyState>
      ) : (
        <QuestionRows items={waiting.data.items} showAuthor />
      )}
    </Page>
  );
}
