import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { ApiError } from "../../api/client";
import { questions, subjects } from "../../api/endpoints";
import { SimilarQuestions, SubjectSuggestions } from "../../components/AiSuggestions";
import { Page } from "../../components/Layout";
import {
  Alert,
  Button,
  Counter,
  PageHeader,
  SelectField,
  TextAreaField,
  TextField,
} from "../../components/ui";
import { LIMITS } from "../../lib/limits";
import { isCode, messageFor } from "../../lib/messages";

const schema = z.object({
  subject: z.string().min(1, "Choose a subject."),
  title: z.string().trim().min(1, "Write a short title.").max(LIMITS.title, `Use ${LIMITS.title} characters or fewer.`),
  body: z.string().trim().min(1, "Describe your doubt.").max(LIMITS.body, `Use ${LIMITS.body} characters or fewer.`),
});
type Values = z.infer<typeof schema>;

export default function Ask() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<{ title: string; link: string } | null>(null);
  const subjectList = useQuery({ queryKey: ["subjects"], queryFn: subjects.list, staleTime: Infinity });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError: setFieldError,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { subject: "", title: "", body: "" } });

  const title = watch("title");
  const body = watch("body");
  const subject = watch("subject");

  const create = useMutation({
    mutationFn: questions.create,
    onSuccess: (q) => {
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      navigate(`/questions/${q.id}`, { replace: true, state: { justAsked: true } });
    },
    onError: (e) => {
      // A blocked question also creates a notification, so refresh the bell.
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      if (isCode(e, "QUESTION_DUPLICATE") && e instanceof ApiError) {
        setError(null);
        setBlocked(null);
        setDuplicate({
          title: e.details?.question_title ?? "the existing question",
          link: e.details?.link ?? "/notifications",
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (isCode(e, "CONTENT_REJECTED")) {
        setError(null);
        setDuplicate(null);
        setBlocked(messageFor(e));
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (e instanceof ApiError && e.details) {
        for (const [field, message] of Object.entries(e.details)) {
          if (field === "subject" || field === "title" || field === "body") {
            setFieldError(field, { message });
          }
        }
        return;
      }
      setError(messageFor(e));
    },
  });

  const onSubmit = handleSubmit((values) => {
    setError(null);
    setBlocked(null);
    setDuplicate(null);
    create.mutate(values);
  });

  return (
    <Page>
      <div className="page-narrow">
        <PageHeader title="Ask a doubt" intro="Faculty and classmates can read it and answer in writing." />
        {blocked && (
          <Alert tone="error" title="Your question was not posted">
            {blocked} We have sent you a notification. <Link to="/notifications">View notifications</Link>
          </Alert>
        )}
        {duplicate && (
          <Alert tone="error" title="Your question was not posted">
            A similar question already exists.{" "}
            <Link to={duplicate.link}>Open “{duplicate.title}”</Link> or{" "}
            <Link to="/notifications">view the notification</Link>.
          </Alert>
        )}
        {error && <Alert tone="error" title="Your question was not sent">{error}</Alert>}

        <form className="form" onSubmit={onSubmit} noValidate>
          <TextField
            label="Title"
            hint="One line that names the problem."
            counter={<Counter value={title.length} max={LIMITS.title} />}
            error={errors.title?.message}
            {...register("title")}
          />

          <div>
            <SelectField label="Subject" error={errors.subject?.message} {...register("subject")}>
              <option value="">Choose a subject</option>
              {subjectList.data?.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </SelectField>
            <SubjectSuggestions
              title={title}
              body={body}
              current={subject}
              onPick={(s) => setValue("subject", s, { shouldValidate: true })}
            />
          </div>

          <TextAreaField
            label="Your doubt"
            hint="Say what you tried and where you got stuck."
            counter={<Counter value={body.length} max={LIMITS.body} />}
            error={errors.body?.message}
            {...register("body")}
          />

          <SimilarQuestions title={title} body={body} />

          <Alert tone="info">
            Signed-in students and faculty can see and answer this question. Faculty may publish it to
            the library after it is answered, without your name. Abusive, insulting or disrespectful
            wording is blocked automatically.
          </Alert>

          <div className="form-actions">
            <Button type="submit" loading={create.isPending}>
              Send question
            </Button>
          </div>
        </form>
      </div>
    </Page>
  );
}
