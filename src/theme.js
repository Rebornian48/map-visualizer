export function getInitialTheme() {
  if (typeof window === "undefined") return "dark";
  return localStorage.getItem("tl-theme") || "dark";
}

export function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("tl-theme", theme);
}
