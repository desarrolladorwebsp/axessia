"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutDashboard, FileText, Users } from "lucide-react";

interface SidebarNavProps {
  onNavigate?: () => void;
}

const navItems = [
  {
    label: "Dashboard",
    href: "/app/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Solicitudes",
    href: "/app/solicitudes",
    icon: FileText,
  },
  {
    label: "Usuarios",
    href: "/app/usuarios",
    icon: Users,
  },
];

export default function SidebarNav({ onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <div className="space-y-2">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;

        return (
          <motion.div
            key={item.href}
            whileHover={{ x: 4 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <Link
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                isActive
                  ? "bg-[var(--cyan)] text-white shadow-lg shadow-[var(--cyan)]/20"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
