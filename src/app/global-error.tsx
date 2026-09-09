"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <h1 style={{ fontSize: "1.1rem" }}>Something went wrong</h1>
          <p style={{ color: "#666", fontSize: "0.9rem" }}>Your information is safe. Please reload.</p>
          <button
            onClick={reset}
            style={{ marginTop: "1rem", padding: "0.5rem 1rem", borderRadius: 8, border: "1px solid #ccc", cursor: "pointer" }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
