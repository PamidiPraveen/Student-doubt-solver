import { ApiError } from "../api/client";

/** Friendly text per error code. The server message is the fallback. */
const MESSAGES: Record<string, string> = {
  NETWORK_ERROR: "Cannot reach the server. Check your connection and try again.",
  RATE_LIMITED: "Too many attempts. Wait a minute and try again.",
  INVALID_CREDENTIALS: "The email or password is not correct.",
  EMAIL_ALREADY_REGISTERED: "An account with this email already exists.",
  QUESTION_NOT_FOUND: "That question does not exist or you cannot open it.",
  ANSWER_NOT_FOUND: "That answer does not exist.",
  QUESTION_CLOSED: "This question is closed and cannot receive answers.",
  QUESTION_HAS_NO_ANSWER: "Add a faculty answer before publishing.",
  CONTENT_REJECTED:
    "This was not posted because it contains inappropriate language. Please rephrase it respectfully.",
  NOT_QUESTION_OWNER: "Only the person who asked can manage this question.",
  NOT_ANSWER_AUTHOR: "Only the person who wrote this answer can delete it.",
  STUDENT_ONLY: "Only students can do this.",
  FACULTY_ONLY: "Only faculty can do this.",
  SERVER_ERROR: "The server had a problem. Try again shortly.",
};

export function messageFor(error: unknown): string {
  if (error instanceof ApiError) return MESSAGES[error.code] ?? error.message;
  return "Something went wrong. Try again.";
}

export function isCode(error: unknown, ...codes: string[]) {
  return error instanceof ApiError && codes.includes(error.code);
}
