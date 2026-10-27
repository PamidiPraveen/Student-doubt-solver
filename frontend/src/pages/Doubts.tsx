import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { questions, subjects } from "../api/endpoints";
import type { QuestionStatus } from "../api/types";
import { Page } from "../components/Layout";
import { QuestionRows } from "../components/QuestionRows";
import {
  EmptyState,
  ErrorState,
  PageHeader,
  Pager,
  SelectField,
  SkeletonRows,
  TextField,
} from "../components/ui";
import { messageFor } from "../lib/messages";
import { useDebounced } from "../lib/useDebounced";

const PAGE = 20;

/** Every doubt on the platform. Students and faculty can open any of them and answer. */
export default function Doubts() {
  const [status, setStatus] = useState<QuestionStatus | "">("open");
  const [subject, setSubject] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const q = useDebounced(search.trim(), 400);

  const subjectList = useQuery({ queryKey: ["subjects"], queryFn: subjects.list, staleTime: Infinity });
  const query = useQuery({
    queryKey: ["questions", "all", status, subject, q, offset],
    queryFn: () => questions.list({ status, subject, q, limit: PAGE, offset }),
    placeholderData: keepPreviousData,
  });

  const reset = () => setOffset(0);
  const untouched = status === "open" && !subject && !q;

  return (
    <Page>
      <PageHeader
        title="All doubts"
        intro="Open any doubt and help out. Students and faculty can both answer, and faculty answers are marked."
      />
      <div className="filters">
        <SelectField
          label="Status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as QuestionStatus | "");
            reset();
          }}
        >
          <option value="open">Waiting for an answer</option>
          <option value="answered">Answered</option>
          <option value="closed">Closed</option>
          <option value="">All</option>
        </SelectField>
        <SelectField
          label="Subject"
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            reset();
          }}
        >
          <option value="">All subjects</option>
          {subjectList.data?.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Search"
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            reset();
          }}
        />
      </div>

      {query.isPending ? (
        <SkeletonRows />
      ) : query.isError ? (
        <ErrorState message={messageFor(query.error)} onRetry={() => query.refetch()} />
      ) : query.data.items.length === 0 ? (
        <EmptyState title={untouched ? "Nothing waiting" : "No doubts match"}>
          {untouched ? "Every open doubt has an answer. Check back later." : "Change the filters to see more."}
        </EmptyState>
      ) : (
        <>
          <QuestionRows items={query.data.items} showAuthor />
          <Pager total={query.data.total} limit={query.data.limit || PAGE} offset={query.data.offset} onChange={setOffset} />
        </>
      )}
    </Page>
  );
}
