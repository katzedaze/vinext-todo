export type ThemePreference = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "theme";
const ORDER: ThemePreference[] = ["system", "light", "dark"];

export function parsePreference(value: string | null | undefined): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

/** system → light → dark → system の順に切り替える */
export function nextPreference(current: ThemePreference): ThemePreference {
  return ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
}

export function isDarkTheme(preference: ThemePreference, systemPrefersDark: boolean): boolean {
  return preference === "dark" || (preference === "system" && systemPrefersDark);
}

/**
 * 描画前に <html> へ dark クラスを付ける。React の読み込みを待つと一瞬ライトで表示されるため、
 * <head> にインラインで埋め込む（中身は固定文字列で、ユーザー入力は含まない）
 */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var d=p==="dark"||(p!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;
