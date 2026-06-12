export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>This page didn't load</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <style>
      :root {
        --background: oklch(1 0 0);
        --foreground: oklch(0.18 0.01 150);
        --muted-foreground: oklch(0.5 0.01 150);
        --primary: oklch(0.42 0.07 160 / 0.95);
        --primary-foreground: oklch(0.99 0 0);
        --secondary: oklch(0.97 0.005 150);
        --border: oklch(0.93 0.005 150);
        --ring: oklch(0.42 0.07 160);
        --radius: 0.75rem;
      }
      * { box-sizing: border-box; }
      body {
        font-family: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        font-size: 15px;
        line-height: 1.5;
        background: var(--background);
        color: var(--foreground);
        display: grid;
        place-items: center;
        min-height: 100vh;
        margin: 0;
        padding: 1.5rem;
        -webkit-font-smoothing: antialiased;
      }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 {
        font-family: "Playfair Display", ui-serif, Georgia, serif;
        font-size: 1.75rem;
        font-weight: 700;
        letter-spacing: -0.015em;
        margin: 0 0 0.5rem;
      }
      p { color: var(--muted-foreground); margin: 0 0 1.75rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button {
        padding: 0.625rem 1.25rem;
        border-radius: 9999px;
        font: inherit;
        font-weight: 600;
        font-size: 0.875rem;
        cursor: pointer;
        text-decoration: none;
        border: 1px solid transparent;
        transition: opacity 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
      }
      a:focus-visible, button:focus-visible {
        outline: none;
        box-shadow: 0 0 0 3px color-mix(in oklab, var(--ring) 35%, transparent);
      }
      .primary { background: var(--primary); color: var(--primary-foreground); }
      .primary:hover { opacity: 0.9; }
      .secondary { background: var(--secondary); color: var(--foreground); border-color: var(--border); }
      .secondary:hover { background: color-mix(in oklab, var(--primary) 8%, var(--secondary)); }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>This page didn't load</h1>
      <p>Something went wrong on our end. You can try refreshing or head back home.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Go home</a>
      </div>
    </div>
  </body>
</html>`;
}
