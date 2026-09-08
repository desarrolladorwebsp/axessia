import { Suspense } from "react";
import ResetPasswordView from "@/components/ResetPasswordView";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="login-page">
          <section className="login-surface" aria-live="polite">
            <div className="login-header">
              <p className="eyebrow">Recuperación de acceso</p>
              <h1>Cargando...</h1>
            </div>
          </section>
        </main>
      }
    >
      <ResetPasswordView />
    </Suspense>
  );
}
