"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Eye, EyeOff, ShieldCheck, UserPlus } from "lucide-react";
import { isValidRut, normalizeRut } from "@/lib/customer-validation";

type RegisterForm = {
  name: string;
  lastName: string;
  phone: string;
  email: string;
  rut: string;
  city: string;
  password: string;
  confirmPassword: string;
  hasPendingRequest: boolean;
  promotionsConsent: boolean;
  acceptsDataTreatment: boolean;
};

const initialForm: RegisterForm = {
  name: "", lastName: "", phone: "", email: "", rut: "", city: "", password: "", confirmPassword: "",
  hasPendingRequest: false, promotionsConsent: false, acceptsDataTreatment: false,
};

export default function RegisterView() {
  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredCustomer, setRegisteredCustomer] = useState<{ name: string; email: string } | null>(null);

  const rutPreview = useMemo(() => normalizeRut(form.rut), [form.rut]);

  const update = (field: keyof RegisterForm, value: string | boolean) => setForm((current) => ({ ...current, [field]: value }));

  const validateLocalForm = () => {
    if (!form.name.trim() || !form.lastName.trim() || !form.phone.trim() || !form.email.trim() || !form.rut.trim() || !form.city.trim() || !form.password.trim() || !form.confirmPassword.trim()) {
      return "Completa todos los campos obligatorios.";
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      return "Revisa el formato del correo.";
    }
    if (!isValidRut(form.rut)) {
      return "El RUT ingresado no es válido. Verifica el dígito verificador.";
    }
    if (form.password !== form.confirmPassword) {
      return "Las contraseñas no coinciden.";
    }
    if (form.password.length < 8 || !/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/\d/.test(form.password)) {
      return "Usa al menos 8 caracteres, una mayúscula, una minúscula y un número.";
    }
    if (!form.acceptsDataTreatment) {
      return "Debes aceptar el tratamiento de tus datos personales.";
    }
    return "";
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validateLocalForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setShowConfirmation(true);
  };

  const confirmRegistration = async () => {
    setShowConfirmation(false);
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = (await response.json()) as { error?: string; name?: string; email?: string };
      if (!response.ok) throw new Error(result.error ?? "No fue posible crear tu cuenta.");

      setRegisteredCustomer({
        name: result.name ?? form.name,
        email: result.email ?? form.email,
      });
      setSuccess("Registro completado con éxito.");
      setForm(initialForm);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "No fue posible crear tu cuenta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (registeredCustomer) {
    return (
      <main className="register-page">
        <section className="register-surface register-success-surface" aria-live="polite">
          <div className="register-success-icon"><ShieldCheck size={34} aria-hidden="true" /></div>
          <p className="eyebrow">Registro completado</p>
          <h1 className="register-success-title">¡Bienvenido a AXESSIA, {registeredCustomer.name}!</h1>
          <p className="register-success-copy">Desde tu cuenta podrás consultar tus solicitudes, cotizaciones, documentos y seguimiento disponibles.</p>
          <div className="register-success-panel">
            <p><strong>Correo:</strong> {registeredCustomer.email}</p>
            <p>Tu cuenta está lista para comenzar a gestionar tu experiencia AXESSIA.</p>
          </div>
          <div className="register-success-actions">
            <Link href="/ingresar" className="login-submit register-submit">Entrar a mi cuenta <ArrowRight size={18} aria-hidden="true" /></Link>
            <Link href="/" className="register-back">Volver al inicio</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="register-page">
      <section className="register-surface" aria-labelledby="register-title">
        <div className="register-header"><p className="eyebrow">Registro de cliente</p><h1 id="register-title">Crea tu cuenta AXESSIA.</h1><p>Guarda tus datos y consulta tus solicitudes con mayor facilidad.</p></div>
        <form className="register-form" onSubmit={handleSubmit} noValidate>
          <div className="register-fields">
            <Field label="Nombre" placeholder="Ej: Ana" value={form.name} onChange={(value) => update("name", value)} />
            <Field label="Apellido" placeholder="Ej: Pérez" value={form.lastName} onChange={(value) => update("lastName", value)} />
            <Field label="Número de teléfono" placeholder="Ej: +56 9 1234 5678" type="tel" value={form.phone} onChange={(value) => update("phone", value)} />
            <Field label="Correo electrónico" placeholder="Ej: ana@correo.cl" type="email" value={form.email} onChange={(value) => update("email", value)} />
            <Field label="RUT" placeholder="Ej: 12.345.678-9" value={form.rut} onChange={(value) => update("rut", value)} />
            <Field label="Ciudad" placeholder="Ej: Santiago" value={form.city} onChange={(value) => update("city", value)} />
          </div>
          <div className="register-passwords">
            <PasswordField label="Contraseña" placeholder="Mínimo 8 caracteres" value={form.password} visible={showPassword} onToggle={() => setShowPassword((visible) => !visible)} onChange={(value) => update("password", value)} />
            <PasswordField label="Repite tu contraseña" placeholder="Confirma tu contraseña" value={form.confirmPassword} visible={showConfirm} onToggle={() => setShowConfirm((visible) => !visible)} onChange={(value) => update("confirmPassword", value)} />
          </div>
          <p className="register-password-help">Usa una mayúscula, una minúscula y un número.</p>
          <label className="register-check"><input type="checkbox" checked={form.hasPendingRequest} onChange={(event) => update("hasPendingRequest", event.target.checked)} /><span>¿Tienes una solicitud pendiente o activa?</span></label>
          <label className="register-check"><input type="checkbox" checked={form.promotionsConsent} onChange={(event) => update("promotionsConsent", event.target.checked)} /><span>Acepto recibir promociones y novedades de AXESSIA. <small>(Opcional)</small></span></label>
          <label className="register-check"><input type="checkbox" checked={form.acceptsDataTreatment} onChange={(event) => update("acceptsDataTreatment", event.target.checked)} required /><span>Acepto el tratamiento de mis datos personales conforme a la normativa chilena vigente. <strong>Obligatorio</strong></span></label>
          {rutPreview && <p className="register-rut-preview">RUT listo para registrar: <strong>{rutPreview}</strong></p>}
          {error && <p className="register-message register-message-error">{error}</p>}
          {success && <p className="register-message register-message-success"><Check size={16} aria-hidden="true" />{success}</p>}
          <button className="login-submit register-submit" type="submit" disabled={isSubmitting}><UserPlus size={18} aria-hidden="true" />{isSubmitting ? "Creando cuenta..." : "Registrarme como cliente"}<ArrowRight size={18} aria-hidden="true" /></button>
        </form>
        <Link href="/ingresar" className="register-back">¿Ya tienes una cuenta? Ingresar</Link>
      </section>

      {showConfirmation && (
        <div className="register-confirmation-overlay" role="dialog" aria-modal="true" aria-labelledby="register-confirm-title">
          <div className="register-confirmation-modal">
            <p className="eyebrow">Confirmación</p>
            <h2 id="register-confirm-title">¿Deseas registrar esta cuenta?</h2>
            <p>Se creará tu cuenta con los datos ingresados y se vinculará cualquier solicitud previa asociada a tu RUT o correo.</p>
            <div className="register-confirmation-summary">
              <span>{`${form.name} ${form.lastName}`.trim()}</span>
              <span>{rutPreview || form.rut}</span>
              <span>{form.email}</span>
            </div>
            <div className="register-confirmation-actions">
              <button type="button" className="register-confirm-button register-confirm-button-primary" onClick={confirmRegistration} disabled={isSubmitting}>
                {isSubmitting ? "Creando cuenta..." : "Confirmar registro"}
              </button>
              <button type="button" className="register-confirm-button register-confirm-button-secondary" onClick={() => setShowConfirmation(false)}>
                Volver
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Field({ label, placeholder, value, onChange, type = "text" }: { label: string; placeholder: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="register-field"><span>{label}</span><input type={type} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} required /></label>;
}

function PasswordField({ label, placeholder, value, visible, onToggle, onChange }: { label: string; placeholder: string; value: string; visible: boolean; onToggle: () => void; onChange: (value: string) => void }) {
  return <label className="register-field"><span>{label}</span><span className="register-password-input"><input type={visible ? "text" : "password"} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} required /><button type="button" onClick={onToggle} aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}>{visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}</button></span></label>;
}
