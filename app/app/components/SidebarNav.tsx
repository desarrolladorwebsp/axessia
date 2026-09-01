"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutDashboard, FileText, Users, UserRound, Settings2, ReceiptText } from "lucide-react";

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
    label: "Clientes",
    href: "/app/clientes",
    icon: UserRound,
  },
  {
    label: "Cotizaciones",
    href: "/app/quotes",
    icon: ReceiptText,
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
    <div>
      <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">Operación</p>
      <div className="space-y-1">
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
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all ${
                isActive
                  ? "bg-white text-[var(--navy)] shadow-[0_10px_24px_rgba(0,0,0,0.12)]"
                  : "text-white/60 hover:bg-white/8 hover:text-white"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" />
              <span className="flex-1">{item.label}</span>
            </Link>
          </motion.div>
        );
      })}
      </div>
      <p className="mb-3 mt-9 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">Configuración</p>
      <Link href="#" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-white/60 hover:bg-white/8 hover:text-white">
        <Settings2 className="h-[18px] w-[18px]" />
        <span>Preferencias</span>
      </Link>
    </div>
  );
}
