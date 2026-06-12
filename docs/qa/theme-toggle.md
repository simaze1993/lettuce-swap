# Theme Toggle — First-Load QA Checklist

Verifies the toggle icon is correct on the very first paint (no flash, no
post-hydration swap) for each stored theme, and that System mode reacts
live to OS changes.

## Setup

- Open DevTools → Application → Local Storage → site origin.
- Key under test: `sw-app:theme`.

## Cases

### 1. Stored = `dark`

1. Set `sw-app:theme = "dark"`, then hard-reload (Cmd/Ctrl+Shift+R).
2. ✅ Page background is dark immediately (no white flash).
3. ✅ Header toggle shows the **Moon** icon on first paint.
4. ✅ Opening the menu shows ✓ next to **Dark**.

### 2. Stored = `light`

1. Set `sw-app:theme = "light"`, hard-reload.
2. ✅ Page background is light immediately.
3. ✅ Toggle shows the **Sun** icon on first paint.
4. ✅ Menu shows ✓ next to **Light**.

### 3. Stored = `system` (or unset), OS = Dark

1. Set `sw-app:theme = "system"` (or remove the key), set OS to Dark, reload.
2. ✅ Page is dark immediately.
3. ✅ Toggle shows **Moon**; menu shows ✓ next to **System**.

### 4. Stored = `system`, OS = Light

1. Same as above with OS = Light.
2. ✅ Page is light, toggle shows **Sun**.

### 5. Live system change while in System mode

1. With theme set to **System**, toggle the OS appearance (macOS:
   System Settings → Appearance; or DevTools → Rendering →
   "Emulate CSS prefers-color-scheme").
2. ✅ Page theme flips without reload.
3. ✅ Header icon flips between **Sun** and **Moon** to match.

## Notes

- The inline script in `src/routes/__root.tsx` (`themeInitScript`) applies the
  `dark` class before hydration — this is what prevents the flash and what
  the synchronous `useState` initializer in `src/hooks/use-theme.tsx` reads
  from to render the correct icon on first paint.
- `ThemeToggle` derives its icon strictly from `resolvedTheme` (`"light" | "dark"`),
  never from `theme`, so `system` always resolves to the actual displayed mode.
