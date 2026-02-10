"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/transcripts");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await signIn("password", { email, password, flow: "signIn" });
      router.push("/transcripts");
    } catch (err) {
      setError("Invalid email or password");
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ backgroundColor: "#FBF5EE", height: "100dvh" }}
      >
        <div
          className="animate-pulse"
          style={{ fontSize: 14, color: "#B5A99A" }}
        >
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center"
      style={{
        backgroundColor: "#FBF5EE",
        minHeight: "100dvh",
        padding: "0 24px",
      }}
    >
      {/* Top spacer */}
      <div style={{ height: 140 }} />

      {/* Brand Section */}
      <div
        className="flex flex-col items-center"
        style={{ gap: 16, width: "100%" }}
      >
        {/* Icon */}
        <div
          className="flex items-center justify-center"
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: "#FFF0E6",
          }}
        >
          <svg
            style={{ width: 36, height: 36 }}
            fill="none"
            stroke="#D4622B"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 10v2a7 7 0 01-14 0v-2"
            />
            <line x1="12" y1="19" x2="12" y2="23" strokeLinecap="round" />
            <line x1="8" y1="23" x2="16" y2="23" strokeLinecap="round" />
          </svg>
        </div>

        {/* Title */}
        <div className="flex flex-col items-center" style={{ gap: 4 }}>
          <h1
            className="font-serif"
            style={{
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: -0.5,
              color: "#1A1A1A",
              margin: 0,
            }}
          >
            Transcripts
          </h1>
          <p style={{ fontSize: 14, color: "#8B7E74", margin: 0 }}>
            Sign in to your account
          </p>
        </div>
      </div>

      {/* Spacer */}
      <div style={{ height: 28 }} />

      {/* Form Card */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col w-full"
        style={{
          gap: 20,
          padding: 24,
          borderRadius: 16,
          backgroundColor: "#FFFFFF",
          border: "1px solid #EDE6DD",
        }}
      >
        {/* Email Field */}
        <div className="flex flex-col" style={{ gap: 6 }}>
          <label
            htmlFor="email"
            style={{ fontSize: 13, fontWeight: 500, color: "#8B7E74" }}
          >
            Email
          </label>
          <div
            className="flex items-center"
            style={{
              gap: 10,
              padding: 14,
              borderRadius: 12,
              backgroundColor: "#FBF5EE",
              border: "1px solid #EDE6DD",
            }}
          >
            <svg
              className="shrink-0"
              style={{ width: 18, height: 18 }}
              fill="none"
              stroke="#B5A99A"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="flex-1 outline-none bg-transparent"
              style={{ fontSize: 15, color: "#1A1A1A" }}
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="flex flex-col" style={{ gap: 6 }}>
          <label
            htmlFor="password"
            style={{ fontSize: 13, fontWeight: 500, color: "#8B7E74" }}
          >
            Password
          </label>
          <div
            className="flex items-center"
            style={{
              gap: 10,
              padding: 14,
              borderRadius: 12,
              backgroundColor: "#FBF5EE",
              border: "1px solid #EDE6DD",
            }}
          >
            <svg
              className="shrink-0"
              style={{ width: 18, height: 18 }}
              fill="none"
              stroke="#B5A99A"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              className="flex-1 outline-none bg-transparent"
              style={{ fontSize: 15, color: "#1A1A1A" }}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              fontSize: 13,
              color: "#E53E3E",
              backgroundColor: "#FFF0E6",
              padding: "10px 14px",
              borderRadius: 12,
            }}
          >
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center justify-center w-full"
          style={{
            padding: "14px 0",
            borderRadius: 12,
            backgroundColor: "#D4622B",
            boxShadow: "0 4px 16px #D4622B4D",
            fontSize: 15,
            fontWeight: 600,
            color: "#FFFFFF",
            opacity: isSubmitting ? 0.6 : 1,
            cursor: isSubmitting ? "not-allowed" : "pointer",
          }}
        >
          {isSubmitting ? "Signing in..." : "Sign In"}
        </button>
      </form>

      {/* Spacer */}
      <div style={{ height: 24 }} />

      {/* Footer */}
      <div
        className="flex items-center justify-center"
        style={{ gap: 4 }}
      >
        <span style={{ fontSize: 14, color: "#8B7E74" }}>
          Don&apos;t have an account?
        </span>
        <Link
          href="/signup"
          style={{ fontSize: 14, fontWeight: 600, color: "#D4622B" }}
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
