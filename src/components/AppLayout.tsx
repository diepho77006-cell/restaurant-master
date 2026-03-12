import { NavLink, useNavigate } from "react-router-dom";
import { LayoutGrid, UtensilsCrossed, ChefHat, Receipt, History, Users, LogOut, Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

interface AppLayoutProps {
  children: React.ReactNode;
}

const allNavItems = [
  { title: "Bàn", url: "/", icon: LayoutGrid, roles: ["admin", "staff"] },
  { title: "Thực đơn", url: "/menu", icon: UtensilsCrossed, roles: ["admin", "staff"] },
  { title: "Bếp", url: "/kitchen", icon: ChefHat, roles: ["admin", "kitchen"] },
  { title: "Thanh toán", url: "/payment", icon: Receipt, roles: ["admin", "staff"] },
  { title: "Lịch sử", url: "/history", icon: History, roles: ["admin", "staff"] },
  { title: "Tài khoản", url: "/accounts", icon: Users, roles: ["admin"] },
];

const roleLabels: Record<string, string> = {
  admin: "Admin",
  staff: "Nhân viên",
  kitchen: "Đầu bếp",
};

/**
 * Main application layout with responsive navigation
 */
const AppLayout = ({ children }: AppLayoutProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = allNavItems.filter(item => user?.role && item.roles.includes(user.role));

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      {navItems.map((item) => (
        <NavLink
          key={item.url}
          to={item.url}
          end={item.url === "/"}
          onClick={onClick}
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`
          }
        >
          <item.icon className="h-4 w-4" />
          <span>{item.title}</span>
        </NavLink>
      ))}
    </>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 flex items-center border-b bg-card/80 backdrop-blur-sm px-4 gap-3 shrink-0 sticky top-0 z-50">
        {/* Mobile menu trigger */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-4">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                <UtensilsCrossed className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-lg">OrderMaster</span>
            </div>
            <nav className="flex flex-col gap-1">
              <NavLinks onClick={() => setMobileOpen(false)} />
            </nav>
            <div className="mt-auto pt-6 border-t">
              <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" /> Đăng xuất
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
            <UtensilsCrossed className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-bold text-lg hidden sm:inline bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
            OrderMaster
          </span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 ml-4">
          <NavLinks />
        </nav>

        <div className="flex-1" />

        {/* User info */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium leading-none">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.role ? roleLabels[user.role] || user.role : "Chưa gán quyền"}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="hidden md:flex" title="Đăng xuất">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
    </div>
  );
};

export default AppLayout;
