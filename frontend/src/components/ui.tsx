import {
  forwardRef,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Link } from "react-router-dom";
import type { QuestionStatus } from "../api/types";

/* ---------- Buttons ---------- */

type Variant = "primary" | "secondary" | "quiet" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  loading = false,
  disabled,
  children,
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      className={`btn btn-${variant} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading && <span className="spinner spinner-inline" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function LinkButton({
  to,
  variant = "primary",
  children,
}: {
  to: string;
  variant?: Variant;
  children: ReactNode;
}) {
  return (
    <Link to={to} className={`btn btn-${variant}`}>
      {children}
    </Link>
  );
}

/* ---------- Form fields ---------- */

interface FieldShellProps {
  label: string;
  hint?: string;
  error?: string;
  counter?: ReactNode;
  children: (props: {
    id: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
  }) => ReactNode;
}

export function FieldShell({ label, hint, error, counter, children }: FieldShellProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : "", error ? errorId : ""].filter(Boolean).join(" ");

  return (
    <div className={`field ${error ? "field-invalid" : ""}`}>
      <div className="field-top">
        <label htmlFor={id}>{label}</label>
        {counter}
      </div>
      {hint && (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      )}
      {children({
        id,
        "aria-describedby": describedBy || undefined,
        "aria-invalid": error ? true : undefined,
      })}
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  counter?: ReactNode;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, counter, ...rest },
  ref,
) {
  return (
    <FieldShell label={label} hint={hint} error={error} counter={counter}>
      {(a11y) => <input ref={ref} {...a11y} {...rest} />}
    </FieldShell>
  );
});

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
  counter?: ReactNode;
}

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  function TextAreaField({ label, hint, error, counter, ...rest }, ref) {
    return (
      <FieldShell label={label} hint={hint} error={error} counter={counter}>
        {(a11y) => <textarea ref={ref} {...a11y} {...rest} />}
      </FieldShell>
    );
  },
);

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  function SelectField({ label, hint, error, children, ...rest }, ref) {
    return (
      <FieldShell label={label} hint={hint} error={error}>
        {(a11y) => (
          <select ref={ref} {...a11y} {...rest}>
            {children}
          </select>
        )}
      </FieldShell>
    );
  },
);

export function Counter({ value, max }: { value: number; max: number }) {
  return (
    <span className={`counter ${value > max ? "counter-over" : ""}`} aria-hidden="true">
      {value}/{max}
    </span>
  );
}

/* ---------- Feedback ---------- */

export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "success" | "warning" | "error";
  title?: string;
  children?: ReactNode;
}) {
  const live = tone === "error" ? "alert" : "status";
  return (
    <div className={`alert alert-${tone}`} role={live}>
      <span className="alert-mark" aria-hidden="true">
        {tone === "success" ? "✓" : tone === "error" ? "!" : tone === "warning" ? "!" : "i"}
      </span>
      <div>
        {title && <p className="alert-title">{title}</p>}
        {children && <div className="alert-body">{children}</div>}
      </div>
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <span role="status" className="spinner-wrap">
      <span className="spinner" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function FullPageSpinner() {
  return (
    <div className="center-fill">
      <Spinner label="Loading your session" />
    </div>
  );
}

export function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading" className="rows">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="row skeleton-row" aria-hidden="true">
          <span className="skeleton skeleton-line" />
          <span className="skeleton skeleton-line short" />
        </div>
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <h2 className="empty-title">{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="empty" role="alert">
      <h2 className="empty-title">That did not load</h2>
      <p>{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/* ---------- Status ---------- */

const QUESTION_LABEL: Record<QuestionStatus, string> = {
  open: "Waiting for an answer",
  answered: "Answered",
  closed: "Closed",
};
const QUESTION_MARK: Record<QuestionStatus, string> = {
  open: "○",
  answered: "●",
  closed: "▪",
};

export function QuestionStatusBadge({ status }: { status: QuestionStatus }) {
  return (
    <span className={`badge badge-${status}`}>
      <span aria-hidden="true">{QUESTION_MARK[status]}</span> {QUESTION_LABEL[status]}
    </span>
  );
}

export function Pager({
  total,
  limit,
  offset,
  onChange,
}: {
  total: number;
  limit: number;
  offset: number;
  onChange: (offset: number) => void;
}) {
  if (total <= limit) return null;
  const from = offset + 1;
  const to = Math.min(offset + limit, total);
  return (
    <nav className="pager" aria-label="Pages">
      <Button
        variant="secondary"
        disabled={offset === 0}
        onClick={() => onChange(Math.max(0, offset - limit))}
      >
        Previous
      </Button>
      <span aria-live="polite">
        {from}–{to} of {total}
      </span>
      <Button
        variant="secondary"
        disabled={offset + limit >= total}
        onClick={() => onChange(offset + limit)}
      >
        Next
      </Button>
    </nav>
  );
}

export function PageHeader({
  title,
  intro,
  actions,
}: {
  title: string;
  intro?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {intro && <p className="lede">{intro}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}
