"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { GoogleSignInButton } from "@/components/dashboard/google-sign-in-button";

interface AuthFormProps {
  onSuccess: () => void;
}

type AuthMode = "login" | "register";

export function AuthForm({ onSuccess }: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "register") {
        await api.register(name, email, password);
      } else {
        await api.login(email, password);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next: AuthMode) {
    setMode(next);
    setError("");
  }

  const handleGoogleCredential = useCallback(async (credential: string) => {
    setError("");
    setLoading(true);

    try {
      await api.loginWithGoogle(credential);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  }, [onSuccess]);

  const handleGoogleUnavailable = useCallback(() => {
    setError(
      "Google sign-in is not available. Ensure GOOGLE_CLIENT_ID is set in backend/.env, the backend is running, and you restarted the app after changing env files.",
    );
  }, []);

  return (
    <Card className="w-full border-gray-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2">
          <LogoMark size="lg" className="mx-auto" />
        </div>
        <CardTitle className="text-gray-900 dark:text-white">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </CardTitle>
        <CardDescription className="text-gray-500 dark:text-slate-400">
          {mode === "login"
            ? "Sign in to manage your trading agents"
            : "Register to run agents, backtests, and trade logs"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex rounded-lg border border-gray-200 p-1 dark:border-slate-600">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={cn(
              "flex-1 cursor-pointer rounded-md py-2 text-sm font-medium transition-colors",
              mode === "login"
                ? "bg-amber-500 text-white"
                : "text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white"
            )}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => switchMode("register")}
            className={cn(
              "flex-1 cursor-pointer rounded-md py-2 text-sm font-medium transition-colors",
              mode === "register"
                ? "bg-amber-500 text-white"
                : "text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white"
            )}
          >
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="motion-safe:animate-fade-in-up rounded-lg bg-red-900/50 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {mode === "register" && (
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="mt-1"
              />
            </div>
          )}

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder={mode === "register" ? "At least 6 characters" : "Your password"}
              className="mt-1"
              toggleClassName="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
            />
          </div>

          <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {mode === "login" ? "Signing in..." : "Creating account..."}
              </span>
            ) : mode === "login" ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </Button>
        </form>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-200 dark:border-slate-600" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500 dark:bg-slate-800 dark:text-slate-400">
              Or continue with
            </span>
          </div>
        </div>

        <GoogleSignInButton
          disabled={loading}
          onCredential={handleGoogleCredential}
          onUnavailable={handleGoogleUnavailable}
        />

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-slate-400">
          <Link href="/" className="text-amber-600 hover:underline dark:text-amber-400">
            ← Back to website
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
