import { Link } from "react-router-dom";
import type { Question } from "../api/types";
import { relativeTime } from "../lib/format";
import { QuestionStatusBadge } from "./ui";

export function QuestionRows({ items, showAuthor = false }: { items: Question[]; showAuthor?: boolean }) {
  return (
    <ul className="rows">
      {items.map((q) => (
        <li key={q.id} className="row">
          <Link to={`/questions/${q.id}`} className="row-link">
            <span className="row-title">{q.title}</span>
            <span className="row-meta">
              <QuestionStatusBadge status={q.status} />
              <span className="chip">{q.subject}</span>
              {showAuthor && q.student_name && <span>{q.student_name}</span>}
              <span>{relativeTime(q.created_at)}</span>
              {typeof q.answer_count === "number" && q.answer_count > 0 && (
                <span>
                  {q.answer_count} {q.answer_count === 1 ? "answer" : "answers"}
                </span>
              )}
              {q.is_published && <span>In the library</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
