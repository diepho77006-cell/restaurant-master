import {
  LayoutGrid,
  UtensilsCrossed,
  ChefHat,
  Receipt,
  History,
  Users,
  LogOut,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import orderMasterLogo from "@/assets/ordermaster-logo.png";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Bàn", url: "/", icon: LayoutGrid, roles: ["admin", "staff"] },
  { title: "Thực đơn", url: "/menu", icon: UtensilsCrossed, roles: ["admin", "staff"] },
  { title: "Bếp", url: "/kitchen", icon: ChefHat, roles: ["admin", "kitchen"] },
  { title: "Thanh toán", url: "/payment", icon: Receipt, roles: ["admin", "staff"] },
  { title: "Lịch sử", url: "/history", icon: History, roles: ["admin", "staff"] },
  { title: "Tài khoản", url: "/accounts", icon: Users, roles: ["admin"] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const filteredNav = navItems.filter(
    (item) => user?.role && item.roles.includes(user.role)
  );

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">
            {!collapsed && (
              <span className="text-base font-bold tracking-tight flex items-center gap-1.5">
                <img src={orderMasterLogo} alt="OrderMaster" className="w-5 h-5 object-contain invert" />
                OrderMaster
              </span>
            )}
            {collapsed && <img src={orderMasterLogo} alt="OrderMaster" className="w-5 h-5 object-contain invert" />}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                    >
                      <item.icon className="mr-2 h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="hover:bg-sidebar-accent/50">
              <LogOut className="mr-2 h-4 w-4 shrink-0" />
              {!collapsed && <span>Đăng xuất</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
