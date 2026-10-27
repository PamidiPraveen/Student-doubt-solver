import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { library } from "../api/endpoints";
import { Page } from "../components/Layout";
import { ErrorState, SkeletonRows } from "../components/ui";
import { formatDate, formatDateTime } from "../lib/format";
import { messageFor } from "../lib/messages";

export default function LibraryItemPage() {
  const id = Number(useParams().id);
  const query = useQuery({
    queryKey: ["library-item", id],
    queryFn: () => library.get(id),
    enabled: Number.isInteger(id),
    retry: false,
  });

  if (query.isPending) return <Page><SkeletonRows count={3} /></Page>;
  if (query.isError) {
    return (
      <Page>
        <ErrorState message={messageFor(query.error)} onRetry={() => query.refetch()} />
      </Page>
    );
  }
  const item = query.data;
  return (
    <Page>
      <p><Link to="/library">← Back to library</Link></p>
      <article className="question-head">
        <div className="row-meta">
          <span className="chip">{item.subject}</span>
          <span>Published {formatDate(item.published_at)}</span>
        </div>
        <h1>{item.title}</h1>
        <p className="reading">{item.body}</p>
      </article>
      <section className="thread" aria-labelledby="lib-answers">
        <h2 id="lib-answers">{item.answers.length === 1 ? "Answer" : "Answers"}</h2>
        {item.answers.map((a) => (
          <div className={`answer ${a.author_role === "faculty" ? "answer-faculty" : "answer-student"}`} key={a.id}>
            <p className="answer-by">
              <strong>{a.author_name ?? (a.author_role === "faculty" ? "Faculty" : "A student")}</strong>
              <span className={a.author_role === "faculty" ? "faculty-tag" : "student-tag"}>
                {a.author_role === "faculty" ? "Faculty" : "Student"}
              </span>
              <span>{formatDateTime(a.created_at)}</span>
            </p>
            <p className="reading">{a.body}</p>
          </div>
        ))}
      </section>
    </Page>
  );
}
