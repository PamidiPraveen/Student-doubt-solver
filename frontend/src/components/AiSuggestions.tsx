import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ai } from "../api/endpoints";
import type { AiMeta } from "../api/types";
import { useDebounced } from "../lib/useDebounced";
import { Button } from "./ui";

type Feature = "similar_questions" | "subject_suggestion";

/** The thumbs buttons. One answer per panel, then a thank-you. */
function Feedback({ feature, targetKey }: { feature: Feature; targetKey: string }) {
  const [sent, setSent] = useState<{ key: string; helpful: boolean } | null>(null);
  const mutation = useMutation({
    mutationFn: (helpful: boolean) => ai.feedback({ feature, helpful }),
    onSuccess: (_d, helpful) => setSent({ key: targetKey, helpful }),
  });

  if (sent?.key === targetKey) {
    return (
      <p className="ai-feedback" role="status">
        Thanks. Your answer was saved.
      </p>
    );
  }
  return (
    <div className="ai-feedback">
      <span id={`fb-${feature}`}>Was this useful?</span>
      <Button variant="secondary" aria-describedby={`fb-${feature}`} onClick={() => mutation.mutate(true)} disabled={mutation.isPending}>
        Yes
      </Button>
      <Button variant="secondary" aria-describedby={`fb-${feature}`} onClick={() => mutation.mutate(false)} disabled={mutation.isPending}>
        No
      </Button>
    </div>
  );
}

function Tag({ meta }: { meta: AiMeta }) {
  return (
    <>
      <p className="ai-tag">{meta.label}</p>
      <p className="ai-note">{meta.note}</p>
    </>
  );
}

/** Library questions that look like the draft. Links only; never an answer. */
export function SimilarQuestions({ title, body }: { title: string; body: string }) {
  const debTitle = useDebounced(title.trim(), 700);
  const debBody = useDebounced(body.trim(), 700);
  const enabled = debTitle.length >= 8;

  const query = useQuery({
    queryKey: ["ai-similar", debTitle, debBody],
    queryFn: () => ai.similar(debTitle, debBody),
    enabled,
    staleTime: 60_000,
    retry: false,
  });

  if (!enabled || !query.data || !query.data.meta?.enabled) return null;
  const { suggestions, meta } = query.data;
  if (suggestions.length === 0) return null;

  return (
    <section className="ai-panel" aria-label="Similar answered questions">
      <Tag meta={meta} />
      <p>
        <strong>Questions faculty have already answered that look like yours:</strong>
      </p>
      <ul className="ai-list">
        {suggestions.map((s) => (
          <li key={s.id} className="ai-item">
            <Link to={`/library/${s.id}`} target="_blank" rel="noreferrer">
              {s.title}
            </Link>
            <p>{s.subject}</p>
          </li>
        ))}
      </ul>
      <Feedback feature="similar_questions" targetKey={`${debTitle}|${suggestions.map((s) => s.id).join(",")}`} />
    </section>
  );
}

/** Subject chips. Choosing one only fills the form field. */
export function SubjectSuggestions({
  title,
  body,
  current,
  onPick,
}: {
  title: string;
  body: string;
  current: string;
  onPick: (subject: string) => void;
}) {
  const debTitle = useDebounced(title.trim(), 700);
  const debBody = useDebounced(body.trim(), 700);
  const enabled = debTitle.length >= 8;

  const query = useQuery({
    queryKey: ["ai-subject", debTitle, debBody],
    queryFn: () => ai.suggestSubject(debTitle, debBody),
    enabled,
    staleTime: 60_000,
    retry: false,
  });

  if (!enabled || !query.data?.meta?.enabled) return null;
  const options = query.data.suggestions.filter((s) => s.subject !== current);
  if (options.length === 0) return null;

  return (
    <div className="ai-panel" aria-label="Suggested subject">
      <p className="ai-tag">{query.data.meta.label}: subject</p>
      <div className="subject-suggest">
        <span>Looks like:</span>
        {options.slice(0, 3).map((s) => (
          <button key={s.subject} type="button" className="btn" onClick={() => onPick(s.subject)}>
            {s.subject}
          </button>
        ))}
      </div>
      <Feedback feature="subject_suggestion" targetKey={`${debTitle}|${options.map((o) => o.subject).join(",")}`} />
    </div>
  );
}
