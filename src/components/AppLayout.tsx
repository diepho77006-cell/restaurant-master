import { NavLink, useLocation } from "react-router-dom";
import { LayoutGrid, UtensilsCrossed, ChefHat, Receipt, History } from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { title: "Bàn", url: "/", icon: LayoutGrid },
  { title: "Thực đơn", url: "/menu", icon: UtensilsCrossed },
  { title: "Bếp", url: "/kitchen", icon: ChefHat },
  { title: "Thanh toán", url: "/payment", icon: Receipt },
  { title: "Lịch sử", url: "/history", icon: History },
];

const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-14 flex items-center border-b bg-card px-4 gap-4 shrink-0">
        <span className="text-lg font-bold text-primary">🍽️ OrderMaster</span>
        <nav className="flex gap-1 ml-4">
          {navItems.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === "/"}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{item.title}</span>
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
    </div>
  );
};

export default AppLayout;
