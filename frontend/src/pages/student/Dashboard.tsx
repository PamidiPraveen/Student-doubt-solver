import { useQuery } from "@tanstack/react-query";
import { questions } from "../../api/endpoints";
import { Page } from "../../components/Layout";
import { QuestionRows } from "../../components/QuestionRows";
import {
  EmptyState,
  ErrorState,
  LinkButton,
  PageHeader,
  SkeletonRows,
} from "../../components/ui";
import { useAuth } from "../../lib/auth";
import { messageFor } from "../../lib/messages";

export default function Dashboard() {
  const { user } = useAuth();
  const recent = useQuery({
    queryKey: ["questions", "recent"],
    queryFn: () => questions.list({ mine: true, limit: 5 }),
  });
  const open = useQuery({
    queryKey: ["questions", "count", "open"],
    queryFn: () => questions.list({ mine: true, status: "open", limit: 1 }),
  });
  const answered = useQuery({
    queryKey: ["questions", "count", "answered"],
    queryFn: () => questions.list({ mine: true, status: "answered", limit: 1 }),
  });
  const help = useQuery({
    queryKey: ["questions", "help-others"],
    queryFn: () => questions.list({ status: "open", limit: 8 }),
  });
  const toHelp = help.data?.items.filter((q) => q.student_id !== user?.id).slice(0, 4) ?? [];

  return (
    <Page>
      <PageHeader
        title={`Hello, ${user?.name.split(" ")[0] ?? "there"}`}
        intro="Ask your own doubts, and help classmates with theirs."
        actions={<LinkButton to="/app/ask">Ask a doubt</LinkButton>}
      />

      <dl className="tally">
        <div className="tally-card">
          <dd>{open.data?.total ?? "–"}</dd>
          <dt>of yours waiting for an answer</dt>
        </div>
        <div className="tally-card">
          <dd>{answered.data?.total ?? "–"}</dd>
          <dt>of yours answered</dt>
        </div>
      </dl>

      <div className="section-head">
        <h2>Your recent questions</h2>
        <LinkButton to="/app/questions" variant="quiet">
          See all
        </LinkButton>
      </div>

      {recent.isPending ? (
        <SkeletonRows count={3} />
      ) : recent.isError ? (
        <ErrorState message={messageFor(recent.error)} onRetry={() => recent.refetch()} />
      ) : recent.data.items.length === 0 ? (
        <EmptyState
          title="No questions yet"
          action={<LinkButton to="/app/ask">Ask your first doubt</LinkButton>}
        >
          Stuck on something? Write it down and a teacher or classmate will answer.
        </EmptyState>
      ) : (
        <QuestionRows items={recent.data.items} />
      )}

      <div className="section-head">
        <h2>Help others</h2>
        <LinkButton to="/doubts" variant="quiet">
          All doubts
        </LinkButton>
      </div>
      {help.isPending ? (
        <SkeletonRows count={2} />
      ) : toHelp.length === 0 ? (
        <p className="lede">No one is waiting on an answer right now.</p>
      ) : (
        <QuestionRows items={toHelp} showAuthor />
      )}
    </Page>
  );
}
