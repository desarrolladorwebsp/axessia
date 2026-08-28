import type { Metadata } from "next";
import Sidebar from "./components/Sidebar";
import "./layout.css";

export const metadata: Metadata = {
  title: "Sistema AXESSIA",
  description: "Sistema de gestión privado de AXESSIA",
};

type LayoutProps = {
  children: React.ReactNode;
};

export default function AppLayout({ children }: LayoutProps) {
  return (
    <div className="app-system flex min-h-screen bg-[var(--background)]">
      <Sidebar />
      <main className="app-main-content min-w-0 flex-1 flex flex-col md:ml-64">
        <div className="app-content flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
