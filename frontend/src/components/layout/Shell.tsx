import { Outlet, Link, useLocation } from "react-router-dom";
import clsx from "clsx";
import { Shield, ListChecks, Grid2X2, BookOpen } from "lucide-react";

const nav = [
  { label: "Alerts", to: "/", icon: ListChecks },
  { label: "Detections", to: "/detections", icon: Shield },
  { label: "Playbooks", to: "/playbooks", icon: BookOpen },
  { label: "MITRE Heatmap", to: "/mitre", icon: Grid2X2 },
  { label: "Coverage", to: "/coverage", icon: Grid2X2 },
];

export function Shell() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-7xl px-4 py-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-2xl bg-neutral-900 flex items-center justify-center">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-semibold">
              SOC AI Automation Platform
            </div>
            <div className="text-sm text-neutral-400">
              Alerts → Playbooks → Evidence-Based MITRE Coverage
            </div>
          </div>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-12 gap-4">

          {/* Sidebar */}
          <aside className="col-span-12 md:col-span-3 lg:col-span-2">
            <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 p-2 space-y-1">
              {nav.map((item) => {
                const active = location.pathname === item.to;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={clsx(
                      "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition",
                      active
                        ? "bg-neutral-800 text-white"
                        : "text-neutral-300 hover:bg-neutral-800/60 hover:text-white"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </aside>

          {/* Main Content */}
          <main className="col-span-12 md:col-span-9 lg:col-span-10">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}