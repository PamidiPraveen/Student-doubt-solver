import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource/dm-serif-display";
import "@fontsource-variable/source-serif-4";
import "./styles/app.css";
import "./styles/brand.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ApiError } from "./api/client";
import App from "./App";
import { AuthProvider } from "./lib/auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: false,
      retry: (count, error) =>
        // Retrying a 4xx never helps; a dropped connection or 5xx might.
        !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
