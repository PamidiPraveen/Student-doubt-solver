import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SimilarQuestions } from "../components/AiSuggestions";
import { Alert, Pager } from "../components/ui";
import { AuthProvider } from "../lib/auth";
import Register from "../pages/Register";

function wrap(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AuthProvider>{ui}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("Register form", () => {
  it("shows field errors without calling the server", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    wrap(<Register />);
    await userEvent.type(screen.getByLabelText("Password"), "short");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Enter your name.")).toBeInTheDocument();
    expect(screen.getByText(/at least 12 characters\.$/i, { selector: ".field-error" })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("Register role choice", () => {
  it("defaults to student and lets the person choose faculty", async () => {
    vi.stubGlobal("fetch", vi.fn());
    wrap(<Register />);
    const student = screen.getByRole("radio", { name: /Student/ });
    const faculty = screen.getByRole("radio", { name: /Faculty/ });
    expect(student).toBeChecked();
    await userEvent.click(faculty);
    expect(faculty).toBeChecked();
    expect(student).not.toBeChecked();
  });
});

describe("AI similar-question panel", () => {
  it("labels suggestions as AI and links to the library", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { suggestions: [{ id: 7, title: "Limit of sin x over x", subject: "Mathematics", snippet: "", answer_count: 1, score: 0.6 }] },
          ai: { label: "AI suggestion", engine: "tfidf", note: "Found by word overlap.", enabled: true },
        }),
      }),
    );
    wrap(<SimilarQuestions title="limit of sin x over x at zero" body="" />);
    expect(await screen.findByText("AI suggestion")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Limit of sin x over x" })).toHaveAttribute("href", "/library/7");
  });

  it("renders nothing for a short title or when AI is disabled", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { container } = wrap(<SimilarQuestions title="short" body="" />);
    expect(container.querySelector(".ai-panel")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("shared components", () => {
  it("announces errors with role=alert", () => {
    render(<Alert tone="error" title="Broke" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Broke");
  });
  it("pages through results", async () => {
    const onChange = vi.fn();
    render(<Pager total={45} limit={20} offset={20} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(40));
    await userEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(onChange).toHaveBeenCalledWith(0);
  });
});
