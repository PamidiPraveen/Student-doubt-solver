import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { library, subjects } from "../api/endpoints";
import { Page } from "../components/Layout";
import {
  EmptyState,
  ErrorState,
  PageHeader,
  Pager,
  SelectField,
  SkeletonRows,
  TextField,
} from "../components/ui";
import { formatDate } from "../lib/format";
import { messageFor } from "../lib/messages";
import { useDebounced } from "../lib/useDebounced";

const PAGE = 20;

export default function LibraryPage() {
  const [subject, setSubject] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const q = useDebounced(search.trim(), 400);

  const subjectList = useQuery({ queryKey: ["subjects"], queryFn: subjects.list, staleTime: Infinity });
  const query = useQuery({
    queryKey: ["library", subject, q, offset],
    queryFn: () => library.list({ subject, q, limit: PAGE, offset }),
    placeholderData: keepPreviousData,
  });

  return (
    <Page>
      <PageHeader
        title="Library"
        intro="Questions faculty have answered and published. Names are removed."
      />
      <div className="filters">
        <SelectField label="Subject" value={subject} onChange={(e) => { setSubject(e.target.value); setOffset(0); }}>
          <option value="">All subjects</option>
          {subjectList.data?.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </SelectField>
        <TextField label="Search" type="search" value={search} onChange={(e) => { setSearch(e.target.value); setOffset(0); }} />
      </div>

      {query.isPending ? (
        <SkeletonRows />
      ) : query.isError ? (
        <ErrorState message={messageFor(query.error)} onRetry={() => query.refetch()} />
      ) : query.data.items.length === 0 ? (
        <EmptyState title={subject || q ? "No library questions match" : "The library is empty"}>
          {subject || q
            ? "Try a different subject or search."
            : "Faculty publish answered questions here. Check back soon."}
        </EmptyState>
      ) : (
        <>
          <ul className="rows">
            {query.data.items.map((item) => (
              <li key={item.id} className="row">
                <Link to={`/library/${item.id}`} className="row-link">
                  <span className="row-title">{item.title}</span>
                  <span className="row-meta">
                    <span className="chip">{item.subject}</span>
                    <span>{formatDate(item.published_at)}</span>
                  </span>
                  <span className="row-excerpt">{item.body}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Pager total={query.data.total} limit={query.data.limit || PAGE} offset={query.data.offset} onChange={setOffset} />
        </>
      )}
    </Page>
  );
}
