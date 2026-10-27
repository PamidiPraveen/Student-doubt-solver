import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { auth as authApi } from "../api/endpoints";
import { ApiError } from "../api/client";
import { Page } from "../components/Layout";
import { CollegeLogo } from "../components/Logo";
import type { Role } from "../api/types";
import { Alert, Button, PageHeader, TextField } from "../components/ui";
import { homePathFor, useAuth } from "../lib/auth";
import { LIMITS } from "../lib/limits";
import { messageFor } from "../lib/messages";

const schema = z
  .object({
    role: z.enum(["student", "faculty"]),
    name: z.string().trim().min(1, "Enter your name.").max(LIMITS.name, `Use ${LIMITS.name} characters or fewer.`),
    email: z.string().trim().email("Enter a valid email address.").max(LIMITS.email),
    password: z
      .string()
      .min(LIMITS.passwordMin, `Use at least ${LIMITS.passwordMin} characters.`)
      .max(LIMITS.passwordMax, `Use ${LIMITS.passwordMax} characters or fewer.`),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "The passwords do not match.",
  });
type Values = z.infer<typeof schema>;

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { role: "student" } });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await authApi.register({
        name: values.name,
        email: values.email,
        password: values.password,
        role: values.role as Role,
      });
      const user = await login(values.email, values.password);
      navigate(homePathFor(user), { replace: true });
    } catch (e) {
      if (e instanceof ApiError && e.details) {
        for (const [field, message] of Object.entries(e.details)) {
          if (field === "name" || field === "email" || field === "password" || field === "role") {
            setFieldError(field, { message });
          }
        }
        return;
      }
      setError(messageFor(e));
    }
  });

  return (
    <Page>
      <div className="auth-wrap">
        <div className="auth-logo"><CollegeLogo size={72} /></div>
        <PageHeader
          title="Create your account"
          intro="Choose how you will use Doubt Solver. You can start as soon as you sign up."
        />
        {error && <Alert tone="error" title="Could not create the account">{error}</Alert>}
        <form className="form" onSubmit={onSubmit} noValidate>
          <fieldset className="choice-group" aria-describedby="role-hint">
            <legend>I am a</legend>
            <label className="choice">
              <input type="radio" value="student" {...register("role")} />
              <span>
                <strong>Student</strong>
                <small>Ask your doubts, and help classmates by answering theirs.</small>
              </span>
            </label>
            <label className="choice">
              <input type="radio" value="faculty" {...register("role")} />
              <span>
                <strong>Faculty</strong>
                <small>Answer students' doubts (marked with a Faculty tag) and publish good answers to the library.</small>
              </span>
            </label>
            <p id="role-hint" className="field-hint">
              Faculty accounts can answer questions, so choose faculty only if you teach.
            </p>
            {errors.role && <p className="field-error">{errors.role.message}</p>}
          </fieldset>
          <TextField label="Full name" autoComplete="name" error={errors.name?.message} {...register("name")} />
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
            autoComplete="new-password"
            hint={`At least ${LIMITS.passwordMin} characters.`}
            error={errors.password?.message}
            {...register("password")}
          />
          <TextField
            label="Repeat password"
            type="password"
            autoComplete="new-password"
            error={errors.confirm?.message}
            {...register("confirm")}
          />
          <div className="form-actions">
            <Button type="submit" loading={isSubmitting}>
              Create account
            </Button>
          </div>
        </form>
        <p className="form-foot">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </Page>
  );
}
