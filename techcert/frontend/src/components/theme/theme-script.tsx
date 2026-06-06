export function ThemeScript() {
  const script = `
    (function () {
      try {
        var stored = localStorage.getItem("signalforge-theme") || localStorage.getItem("techcert-theme");
        var theme = stored === "dark" ? "dark" : "light";
        var root = document.documentElement;
        root.setAttribute("data-theme", theme);
        if (theme === "dark") root.classList.add("dark");
      } catch (e) {}
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
