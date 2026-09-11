// 主题管理器：默认清爽亮色模式（微信小游戏质感），支持随时切换极客暗夜模式
export type AppTheme = "light" | "dark";

const THEME_KEY = "ai_party_theme";

class ThemeManager {
  private currentTheme: AppTheme = "light";
  private listeners: Array<(theme: AppTheme) => void> = [];

  constructor() {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark") {
        this.currentTheme = saved;
      } else {
        // 默认按用户喜好设定为清爽亮色模式
        this.currentTheme = "light";
      }
    } catch {
      this.currentTheme = "light";
    }
    this.applyTheme(this.currentTheme);
  }

  public getTheme(): AppTheme {
    return this.currentTheme;
  }

  public setTheme(theme: AppTheme) {
    this.currentTheme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {}
    this.applyTheme(theme);
    this.notify();
  }

  public toggleTheme() {
    this.setTheme(this.currentTheme === "light" ? "dark" : "light");
  }

  public subscribe(fn: (theme: AppTheme) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this.currentTheme));
  }

  private applyTheme(theme: AppTheme) {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }
}

export const themeManager = new ThemeManager();
