import type { ReactNode } from "react";

interface ShellProps {
  children: ReactNode;
  sidebar?: ReactNode;
  dock?: ReactNode;
}

export function Shell({ children, sidebar, dock }: ShellProps) {
  return (
    <>
      <div className="hidden md:flex h-screen">
        <aside
          className="flex flex-col border-r h-full shrink-0"
          style={{
            width: "17rem",
            borderColor: "var(--line)",
            background: "var(--panel)",
          }}
        >
          <div className="p-6 font-bold text-lg" style={{ fontFamily: "Fraunces, serif" }}>
            APPNAME
          </div>
          {sidebar ?? (
            <nav className="flex-1 px-4">
            </nav>
          )}
          <div className="p-4 text-xs" style={{ color: "var(--muted)" }}>
            <a
              href="https://freegamestore.online"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
              style={{ color: "var(--muted)" }}
            >
              Part of FreeGameStore
            </a>
          </div>
        </aside>
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>

      <div className="flex flex-col h-screen md:hidden">
        <header
          className="flex items-center justify-between px-4 h-14 border-b shrink-0"
          style={{ borderColor: "var(--line)", background: "var(--panel)" }}
        >
          <span className="font-bold" style={{ fontFamily: "Fraunces, serif" }}>
            APPNAME
          </span>
          {dock && <div className="flex items-center gap-3">{dock}</div>}
        </header>
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </>
  );
}
