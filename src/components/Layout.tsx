import { NavLink } from "react-router-dom";
import { UtensilsCrossed, LayoutGrid, ClipboardList, ChefHat } from "lucide-react";

const navItems = [
  { to: "/", icon: LayoutGrid, label: "Tổng quan" },
  { to: "/tables", icon: UtensilsCrossed, label: "Bàn" },
  { to: "/menu", icon: ChefHat, label: "Thực đơn" },
  { to: "/orders", icon: ClipboardList, label: "Đơn hàng" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 border-r border-border bg-card p-6 flex flex-col gap-2">
        <div className="flex items-center gap-2 mb-8">
          <ChefHat className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Nhà Hàng</h1>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
