"use client"

import { AlertTriangle } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          alignItems: "center",
          display: "flex",
          flexDirection: "column",
          fontFamily: "system-ui, sans-serif",
          gap: "1.5rem",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "1.5rem",
          textAlign: "center",
        }}
      >
        <AlertTriangle aria-hidden="true" size={40} />
        <h1 style={{ fontSize: "1.5rem", margin: 0 }}>plan1 could not load</h1>
        <p style={{ margin: 0, maxWidth: "28rem" }}>
          A fatal error stopped the app from starting. Reload the page to try again.
        </p>
        {error.digest ? <p style={{ fontSize: "0.75rem" }}>Reference: {error.digest}</p> : null}
        <button
          type="button"
          onClick={reset}
          style={{
            borderRadius: "0.5rem",
            cursor: "pointer",
            fontWeight: 600,
            padding: "0.6rem 1.2rem",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
