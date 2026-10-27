import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { questions } from "../../api/endpoints";
import type { QuestionStatus } from "../../api/types";
import { Page } from "../../components/Layout";
import {
  EmptyState,
  ErrorState,
  LinkButton,
  PageHeader,
  Pager,
  SelectField,
  SkeletonRows,
} from "../../components/ui";
import { QuestionRows } from "../../components/QuestionRows";
import { messageFor } from "../../lib/messages";

const PAGE = 20;

export default function MyQuestions() {
  const [status, setStatus] = useState<QuestionStatus | "">("");
  const [offset, setOffset] = useState(0);

  const query = useQuery({
    queryKey: ["questions", "mine", status, offset],
    queryFn: () => questions.list({ mine: true, status, limit: PAGE, offset }),
    placeholderData: keepPreviousData,
  });

  return (
    <Page>
      <PageHeader
        title="My questions"
        actions={<LinkButton to="/app/ask">Ask a doubt</LinkButton>}
      />
      <div className="filters">
        <SelectField
          label="Status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as QuestionStatus | "");
            setOffset(0);
          }}
        >
          <option value="">All</option>
          <option value="open">Waiting for an answer</option>
          <option value="answered">Answered</option>
          <option value="closed">Closed</option>
        </SelectField>
      </div>

      {query.isPending ? (
        <SkeletonRows />
      ) : query.isError ? (
        <ErrorState message={messageFor(query.error)} onRetry={() => query.refetch()} />
      ) : query.data.items.length === 0 ? (
        <EmptyState
          title={status ? "No questions with that status" : "You have not asked anything yet"}
          action={!status && <LinkButton to="/app/ask">Ask your first doubt</LinkButton>}
        >
          {status ? "Try another status." : "Your questions and the answers you receive will appear here."}
        </EmptyState>
      ) : (
        <>
          <QuestionRows items={query.data.items} />
          <Pager total={query.data.total} limit={query.data.limit || PAGE} offset={query.data.offset} onChange={setOffset} />
        </>
      )}
    </Page>
  );
}
