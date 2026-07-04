"use client";

import { usePathname, useRouter } from "next/navigation";
import { FiHome, FiClock, FiUser, FiGrid } from "react-icons/fi";

const TABS = [
  { href: "/", label: "Home", Icon: FiHome, match: (p: string) => p === "/" },
  { href: "/history", label: "History", Icon: FiClock, match: (p: string) => p === "/history" },
  { href: "/driver", label: "Driver", Icon: FiGrid, match: (p: string) => p === "/driver" },
  { href: "/profile", label: "Profile", Icon: FiUser, match: (p: string) => p === "/profile" },
] as const;

export function BottomNav() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  return (
    <nav className="bottom-nav">
      <div className="bottom-nav__list">
        {TABS.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <button
              key={href}
              type="button"
              className={`bottom-nav__tab${active ? " bottom-nav__tab--active" : ""}`}
              onClick={() => router.push(href)}
            >
              <span className="bottom-nav__tab__bubble">
                <Icon />
              </span>
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
