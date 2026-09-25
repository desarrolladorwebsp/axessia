"use client";

import { Component, type ReactNode } from "react";

type AlertErrorBoundaryProps = {
  children: ReactNode;
};

type AlertErrorBoundaryState = {
  failed: boolean;
};

export default class AlertErrorBoundary extends Component<AlertErrorBoundaryProps, AlertErrorBoundaryState> {
  state: AlertErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): AlertErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Alerta interna no disponible:", error);
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}
