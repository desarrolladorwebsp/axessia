"use client";

import { useEffect, useState } from "react";
import AlertErrorBoundary from "../../components/AlertErrorBoundary";
import StatusBadge from "../../components/StatusBadge";
import { parseActiveClientAlert, type ActiveClientAlert as ActiveClientAlertData } from "@/lib/internal-alerts/load";

export default function ActiveClientAlert({ requestId }: { requestId: string }) {
  return (
    <AlertErrorBoundary>
      <ActiveClientAlertBadge requestId={requestId} />
    </AlertErrorBoundary>
  );
}

function ActiveClientAlertBadge({ requestId }: { requestId: string }) {
  const [alert, setAlert] = useState<ActiveClientAlertData | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadAlert = async () => {
      try {
        const response = await fetch(`/api/internal-alerts/active-client?requestId=${encodeURIComponent(requestId)}`);
        if (!response.ok) return;
        const parsed = parseActiveClientAlert(await response.json());
        if (!cancelled) setAlert(parsed);
      } catch (error) {
        console.error("Alerta interna de cliente no disponible:", error);
      }
    };

    void loadAlert();
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  if (!alert?.visible) return null;

  return (
    <span title={`${alert.activeCount} solicitudes activas con este RUT`} aria-label={`Cliente con solicitudes activas. ${alert.activeCount} solicitudes activas con este RUT.`}>
      <StatusBadge label="Cliente con solicitudes activas" tone="warning" />
    </span>
  );
}
