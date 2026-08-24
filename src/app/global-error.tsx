"use client";
// Last-resort boundary: catches errors thrown by the ROOT layout itself, which
// error.tsx cannot (it renders inside that layout). Because the layout failed,
// this must supply its own <html>/<body>, and it can't rely on the app's fonts
// or Tailwind tokens loading — so the styling here is deliberately inline and
// self-contained.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="he" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#faf7f2",
          color: "#2b2320",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.5rem", margin: "0 0 .5rem" }}>משהו השתבש</h1>
          <p style={{ opacity: 0.7, margin: "0 0 1.25rem" }}>
            אירעה שגיאה בטעינת האתר. נסו לרענן את הדף.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "0.75rem",
              border: "none",
              background: "#8a6a4f",
              color: "#fff",
              fontWeight: 600,
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            נסו שוב
          </button>
          {error.digest && (
            <p style={{ fontSize: ".75rem", opacity: 0.4, marginTop: "1rem" }}>
              קוד שגיאה: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
