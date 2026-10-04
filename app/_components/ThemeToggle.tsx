"use client";

import { useSyncExternalStore } from "react";
import { DesktopIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  THEME_STORAGE_KEY,
  isDarkTheme,
  nextPreference,
  parsePreference,
  type ThemePreference,
} from "@/lib/theme";

const LABELS: Record<ThemePreference, string> = { system: "システム設定", light: "ライト", dark: "ダーク" };
const ICONS = { system: DesktopIcon, light: SunIcon, dark: MoonIcon };
const DARK_QUERY = "(prefers-color-scheme: dark)";
const CHANGE_EVENT = "theme-change";

function readPreference(): ThemePreference {
  try {
    return parsePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

function applyTheme(preference: ThemePreference) {
  const prefersDark = window.matchMedia(DARK_QUERY).matches;
  document.documentElement.classList.toggle("dark", isDarkTheme(preference, prefersDark));
}

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(DARK_QUERY);
  const handleSystemChange = () => {
    applyTheme(readPreference());
    onChange();
  };
  media.addEventListener("change", handleSystemChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", handleSystemChange);
  return () => {
    media.removeEventListener("change", handleSystemChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", handleSystemChange);
  };
}

export function ThemeToggle() {
  // サーバーでは保存値が読めないので "system" として描画し、ブラウザで実際の値に差し替える
  const preference = useSyncExternalStore(subscribe, readPreference, () => "system" as const);
  const next = nextPreference(preference);
  const Icon = ICONS[preference];

  const handleClick = () => {
    try {
      if (next === "system") localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // プライベートモードなどで保存できなくても、表示の切り替えだけは行う
    }
    applyTheme(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleClick}
          aria-label={`テーマ: ${LABELS[preference]}（クリックで${LABELS[next]}に切り替え）`}
        >
          <Icon />
        </Button>
      </TooltipTrigger>
      <TooltipContent>テーマ: {LABELS[preference]}</TooltipContent>
    </Tooltip>
  );
}
