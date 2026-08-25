"use client";

import { motion } from "framer-motion";
import { AlertCircle, Inbox } from "lucide-react";

// Estado: Sin resultados
export function EmptyState({
  title = "Sin resultados",
  description = "No hay datos para mostrar en este momento",
  icon: Icon = Inbox,
  action,
}: {
  title?: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <Icon className="w-12 h-12 text-[var(--text-secondary)] mb-4 opacity-50" />
      <h3 className="text-lg font-semibold text-[var(--navy)] mb-2">
        {title}
      </h3>
      <p className="text-[var(--text-secondary)] text-sm mb-6">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 text-sm font-medium text-white bg-[var(--blue)] rounded-lg hover:bg-[var(--cyan)] transition-colors"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}

// Estado: Error
export function ErrorState({
  title = "Error",
  description = "Ocurrió un error al cargar los datos",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-16 px-4 bg-red-50 rounded-2xl border border-red-200"
    >
      <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold text-red-900 mb-2">
        {title}
      </h3>
      <p className="text-red-700 text-sm mb-6 text-center max-w-md">
        {description}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
        >
          Reintentar
        </button>
      )}
    </motion.div>
  );
}
