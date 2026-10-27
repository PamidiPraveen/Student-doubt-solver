import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { questions } from "../api/endpoints";
import { Page } from "../components/Layout";
import {
  Alert,
  Button,
  Counter,
  ErrorState,
  QuestionStatusBadge,
  SkeletonRows,
  TextAreaField,
} from "../components/ui";
import { useAuth } from "../lib/auth";
import { formatDateTime } from "../lib/format";
import { LIMITS } from "../lib/limits";
import { isCode, messageFor } from "../lib/messages";

const schema = z.object({
  body: z.string().trim().min(1, "Write an answer.").max(LIMITS.body, `Use ${LIMITS.body} characters or fewer.`),
});

export default function QuestionDetail() {
  const id = Number(useParams().id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const justAsked = (location.state as { justAsked?: boolean } | null)?.justAsked;
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  /** Set when the moderation filter refuses an answer. */
  const [blocked, setBlocked] = useState<string | null>(null);

  const isFaculty = user?.role === "faculty";

  const question = useQuery({
    queryKey: ["question", id],
    queryFn: () => questions.get(id),
    enabled: Number.isInteger(id),
    retry: false,
  });
  const answers = useQuery({
    queryKey: ["answers", id],
    queryFn: () => questions.answers(id),
    enabled: question.isSuccess,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["question", id] });
    queryClient.invalidateQueries({ queryKey: ["answers", id] });
    queryClient.invalidateQueries({ queryKey: ["questions"] });
  };

  const action = useMutation({
    mutationFn: (kind: "close" | "publish" | "unpublish") => questions[kind](id),
    onSuccess: () => {
      setActionError(null);
      refresh();
    },
    onError: (e) => setActionError(messageFor(e)),
  });

  const removeQuestion = useMutation({
    mutationFn: () => questions.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      navigate("/app/questions", { replace: true });
    },
    onError: (e) => setActionError(messageFor(e)),
  });

  const removeAnswer = useMutation({
    mutationFn: (answerId: number) => questions.deleteAnswer(id, answerId),
    onSuccess: () => {
      setActionError(null);
      refresh();
    },
    onError: (e) => setActionError(messageFor(e)),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
  } = useForm<{ body: string }>({ resolver: zodResolver(schema), defaultValues: { body: "" } });

  const reply = useMutation({
    mutationFn: (body: string) => questions.answer(id, body),
    onSuccess: () => {
      reset();
      setActionError(null);
      setBlocked(null);
      refresh();
    },
    onError: (e) => {
      // A blocked answer also creates a notification, so refresh the bell.
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      if (isCode(e, "CONTENT_REJECTED")) {
        setActionError(null);
        setBlocked(messageFor(e));
        return;
      }
      setBlocked(null);
      setActionError(messageFor(e));
    },
  });

  if (!Number.isInteger(id)) return <Page><ErrorState message="That link is not valid." /></Page>;
  if (question.isPending) return <Page><SkeletonRows count={3} /></Page>;
  if (question.isError) {
    return (
      <Page>
        <ErrorState
          message={
            isCode(question.error, "QUESTION_NOT_FOUND")
              ? "That question does not exist or you cannot open it."
              : messageFor(question.error)
          }
          onRetry={() => question.refetch()}
        />
      </Page>
    );
  }

  const q = question.data;
  const isOwner = user?.id === q.student_id;
  const canClose = q.status !== "closed" && (isOwner || isFaculty);
  const answerCount = answers.data?.length ?? q.answer_count ?? 0;
  const hasFacultyAnswer = answers.data?.some((a) => a.author_role === "faculty") ?? false;

  return (
    <Page>
      <p>
        <Link to={isOwner ? "/app/questions" : "/doubts"}>← Back to {isOwner ? "my questions" : "all doubts"}</Link>
      </p>

      {justAsked && (
        <Alert tone="success" title="Question posted">
          Faculty and other students can now answer it here. You will get a notification when someone does.
        </Alert>
      )}
      {actionError && <Alert tone="error">{actionError}</Alert>}

      <article className="question-head">
        <div className="row-meta">
          <QuestionStatusBadge status={q.status} />
          <span className="chip">{q.subject}</span>
          {q.student_name && <span>Asked by {isOwner ? "you" : q.student_name}</span>}
          <span>{formatDateTime(q.created_at)}</span>
          {hasFacultyAnswer && <span className="badge badge-faculty">Faculty answered</span>}
          {q.is_published && <span>In the library (anonymous)</span>}
        </div>
        <h1>{q.title}</h1>
        <p className="reading">{q.body}</p>
      </article>

      <div className="page-actions" style={{ marginTop: "1.25rem" }}>
        {isOwner && (
          <Button
            variant="danger"
            loading={removeQuestion.isPending}
            onClick={() => {
              if (window.confirm("Delete this question and all its answers? This cannot be undone.")) {
                removeQuestion.mutate();
              }
            }}
          >
            Delete question
          </Button>
        )}
        {canClose && (
          <Button variant="secondary" loading={action.isPending && action.variables === "close"} onClick={() => action.mutate("close")}>
            {isFaculty ? "Close question" : "Mark as resolved"}
          </Button>
        )}
        {isFaculty && !q.is_published && (
          <Button
            variant="secondary"
            disabled={answerCount === 0}
            loading={action.isPending && action.variables === "publish"}
            onClick={() => action.mutate("publish")}
          >
            Publish to library
          </Button>
        )}
        {isFaculty && q.is_published && (
          <Button variant="secondary" loading={action.isPending && action.variables === "unpublish"} onClick={() => action.mutate("unpublish")}>
            Remove from library
          </Button>
        )}
      </div>
      {isFaculty && !q.is_published && answerCount === 0 && (
        <p className="field-hint">Answer the question first, then you can publish it without the student's name.</p>
      )}

      <section className="thread" aria-labelledby="answers-title">
        <h2 id="answers-title">
          {answerCount === 0 ? "No answer yet" : answerCount === 1 ? "1 answer" : `${answerCount} answers`}
        </h2>
        {answers.isPending ? (
          <SkeletonRows count={1} />
        ) : answers.isError ? (
          <ErrorState message={messageFor(answers.error)} onRetry={() => answers.refetch()} />
        ) : (
          answers.data.map((a) => (
            <div className={`answer ${a.author_role === "faculty" ? "answer-faculty" : "answer-student"}`} key={a.id}>
              <p className="answer-by">
                <strong>{a.author_id === user?.id ? "You" : (a.author_name ?? "Member")}</strong>
                <span className={a.author_role === "faculty" ? "faculty-tag" : "student-tag"}>
                  {a.author_role === "faculty" ? "Faculty" : "Student"}
                </span>
                <span>{formatDateTime(a.created_at)}</span>
              </p>
              <p className="reading">{a.body}</p>
              {a.author_id === user?.id && (
                <Button
                  variant="danger"
                  loading={removeAnswer.isPending && removeAnswer.variables === a.id}
                  disabled={removeAnswer.isPending}
                  onClick={() => {
                    if (window.confirm("Delete this answer? This cannot be undone.")) {
                      removeAnswer.mutate(a.id);
                    }
                  }}
                >
                  Delete answer
                </Button>
              )}
            </div>
          ))
        )}
        {!answers.isPending && answerCount === 0 && (
          <p className="lede">
            {isOwner
              ? "No one has replied yet. You will get a notification as soon as someone does."
              : "Be the first to help. Write your answer below."}
          </p>
        )}
      </section>

      {q.status !== "closed" && (
        <form
          className="form answer-form"
          onSubmit={handleSubmit((v) => {
            setBlocked(null);
            reply.mutate(v.body);
          })}
          noValidate
        >
          <h2 className="answer-form-title">{isOwner ? "Add a follow-up" : "Write an answer"}</h2>
          {blocked && (
            <Alert tone="error" title="Your answer was not posted">
              {blocked} We have sent you a notification.{" "}
              <Link to="/notifications">View notifications</Link>
            </Alert>
          )}
          <TextAreaField
            label={isOwner ? "Your follow-up" : "Your answer"}
            hint={
              isFaculty
                ? "Your answer is shown with a Faculty tag. Keep it clear and respectful."
                : "Explain it in your own words. Be respectful: insulting or disrespectful wording is blocked automatically."
            }
            counter={<Counter value={watch("body").length} max={LIMITS.body} />}
            error={errors.body?.message}
            {...register("body")}
          />
          <div className="form-actions">
            <Button type="submit" loading={reply.isPending}>
              Post answer
            </Button>
          </div>
        </form>
      )}
    </Page>
  );
}
