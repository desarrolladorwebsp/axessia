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
    <div className="app-system flex h-screen overflow-hidden bg-[var(--background)]">
      <Sidebar />
      <main className="app-main-content flex-1 flex flex-col overflow-hidden md:mt-0 mt-[92px]">
        <div className="app-content flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
