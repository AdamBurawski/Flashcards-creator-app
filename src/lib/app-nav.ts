export interface AppNavItem {
  label: string;
  icon: string;
  href: string;
}

/** @deprecated Prefer navItemsForRole from household.ts */
export const appNavItems: AppNavItem[] = [
  { label: "Strona główna", icon: "🏠", href: "/dashboard" },
  { label: "Kalendarz", icon: "🗓️", href: "/dashboard#weekly-plan" },
  { label: "Przedmioty", icon: "📚", href: "/subjects" },
  { label: "Postępy", icon: "📊", href: "/dashboard#overall-progress" },
  { label: "Zadania", icon: "✅", href: "/dashboard#now-todo" },
  { label: "Materiały", icon: "🗂️", href: "/dashboard#materialy" },
  { label: "Biblioteka widgetów", icon: "💡", href: "/widgets" },
  { label: "Ustawienia", icon: "⚙️", href: "/settings" },
];

export function isAppNavActive(href: string, pathname: string): boolean {
  const path = href.split("#")[0] ?? href;
  if (href.includes("#")) return false;
  if (path === "/dashboard") return pathname === "/dashboard";
  return pathname === path || pathname.startsWith(`${path}/`);
}
