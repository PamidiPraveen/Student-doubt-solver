import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Page } from "../components/Layout";
import { CollegeLogo } from "../components/Logo";
import { Alert, Button, PageHeader, TextField } from "../components/ui";
import { canVisit, homePathFor, useAuth } from "../lib/auth";
import { messageFor } from "../lib/messages";

const schema = z.object({
  email: z.string().trim().min(1, "Enter your email."),
  password: z.string().min(1, "Enter your password."),
});
type Values = z.infer<typeof schema>;

export default function Login() {
  const { login, notice, clearNotice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const user = await login(values.email, values.password);
      clearNotice();
      navigate(from && canVisit(user, from) ? from : homePathFor(user), {
        replace: true,
      });
    } catch (e) {
      setError(messageFor(e));
    }
  });

  return (
    <Page>
      <div className="auth-wrap">
        <div className="auth-logo"><CollegeLogo size={72} /></div>
        <PageHeader title="Sign in" intro="Welcome back to St. Ann’s Doubt Solver." />
        {notice && <Alert tone="info">{notice}</Alert>}
        {error && <Alert tone="error" title="Could not sign in">{error}</Alert>}
        <form className="form" onSubmit={onSubmit} noValidate>
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register("password")}
          />
          <div className="form-actions">
            <Button type="submit" loading={isSubmitting}>
              Sign in
            </Button>
          </div>
        </form>
        <p className="form-foot">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </Page>
  );
}
