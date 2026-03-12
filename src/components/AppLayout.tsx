import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const { user } = useAuth();

  const roleLabel: Record<string, string> = {
    admin: "Admin",
    staff: "Nhân viên",
    kitchen: "Đầu bếp",
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b bg-card px-4 gap-3 shrink-0">
            <SidebarTrigger />
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{user?.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold capitalize">
                {user?.role ? roleLabel[user.role] || user.role : "—"}
              </span>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
