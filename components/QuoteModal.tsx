"use client";

import {
  createContext,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, FileCheck2, FileUp, LoaderCircle, Minus, Plus, X } from "lucide-react";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

type Product = {
  id: number;
  name: string;
  activeIngredient: string;
  concentration: string;
  quantity: string;
};

type FormValues = {
  name: string;
  phone: string;
  email: string;
  rut: string;
  city: string;
  file: File | null;
  patientName: string;
  patientRut: string;
};

type QuoteModalContextValue = {
  openQuoteModal: () => void;
};

const QuoteModalContext = createContext<QuoteModalContextValue | null>(null);

const emptyProduct = (id: number): Product => ({
  id,
  name: "",
  activeIngredient: "",
  concentration: "",
  quantity: "",
});

const initialValues: FormValues = {
  name: "",
  phone: "",
  email: "",
  rut: "",
  city: "",
  file: null,
  patientName: "",
  patientRut: "",
};

export function QuoteModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [values, setValues] = useState<FormValues>(initialValues);
  const [products, setProducts] = useState<Product[]>([emptyProduct(1)]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fileError, setFileError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [consents, setConsents] = useState({ policies: false, data: false });
  const [generatedRequestNumber, setGeneratedRequestNumber] = useState("");
  const [differentPatient, setDifferentPatient] = useState(false);
  const [submissionError, setSubmissionError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const openQuoteModal = () => {
    setIsOpen(true);
    setIsSubmitted(false);
    setCurrentStep(1);
    setSubmissionError("");
    setGeneratedRequestNumber("");
  };

  const closeQuoteModal = () => {
    if (!isSubmitting) setIsOpen(false);
  };

  const updateValue = (field: keyof FormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const updateProduct = (id: number, field: keyof Omit<Product, "id">, value: string) => {
    setProducts((current) => current.map((product) => (product.id === id ? { ...product, [field]: value } : product)));
    setErrors((current) => ({ ...current, [`product-${id}-${field}`]: "" }));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setFileError("");
    if (!file) return;

    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setFileError("Adjunta un PDF o una imagen válida.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError("El archivo no puede superar los 10 MB.");
      event.target.value = "";
      return;
    }
    setValues((current) => ({ ...current, file }));
    setErrors((current) => ({ ...current, file: "" }));
  };

  const validateContact = () => {
    const nextErrors: Record<string, string> = {};
    const requiredFields: Array<[keyof Omit<FormValues, "file">, string]> = [
      ["name", "Ingresa tu nombre."],
      ["phone", "Ingresa tu teléfono."],
      ["email", "Ingresa tu correo."],
      ["rut", "Ingresa tu RUT."],
      ["city", "Ingresa tu ciudad."],
    ];

    requiredFields.forEach(([field, message]) => {
      if (!values[field].trim()) nextErrors[field] = message;
    });
    if (values.email && !/^\S+@\S+\.\S+$/.test(values.email)) nextErrors.email = "Revisa el formato del correo.";
    if (differentPatient && !values.patientName.trim()) nextErrors.patientName = "Ingresa el nombre del paciente.";
    if (differentPatient && !values.patientRut.trim()) nextErrors.patientRut = "Ingresa el RUT del paciente.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateDetails = () => {
    const nextErrors: Record<string, string> = {};
    if (!values.file) nextErrors.file = "Adjunta tu receta médica.";

    products.forEach((product) => {
      (Object.keys(emptyProduct(product.id)).filter((field) => field !== "id") as Array<keyof Omit<Product, "id">>).forEach((field) => {
        if (!product[field].trim()) nextErrors[`product-${product.id}-${field}`] = "Obligatorio";
      });
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validate = () => validateContact() && validateDetails();

  const validateConsents = () => {
    const nextErrors: Record<string, string> = {};
    if (!consents.policies) nextErrors.policies = "Acepta las políticas de la empresa.";
    if (!consents.data) nextErrors.data = "Autoriza el tratamiento y contacto.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const goToNextStep = () => {
    const isValid = currentStep === 1 ? validateContact() : validateDetails();
    if (isValid) setCurrentStep((step) => Math.min(step + 1, 3));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate() || !validateConsents()) return;

    setIsSubmitting(true);
    setSubmissionError("");
    try {
      const response = await fetch("/api/quote-requests", {
        body: JSON.stringify({
          customer: { name: values.name, phone: values.phone, email: values.email, rut: values.rut, city: values.city },
          patient: differentPatient ? { name: values.patientName, rut: values.patientRut } : undefined,
          prescription: values.file ? { fileName: values.file.name, mimeType: values.file.type, fileSize: values.file.size } : undefined,
          medications: products.map((product) => ({
            commercialName: product.name,
            activeIngredient: product.activeIngredient,
            concentration: product.concentration,
            tabletQuantity: Number(product.quantity),
          })),
          acceptsPolicies: consents.policies,
          acceptsDataTreatment: consents.data,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (!response.ok) throw new Error("No fue posible guardar la solicitud.");
      const result = (await response.json()) as { requestNumber?: string };
      setGeneratedRequestNumber(result.requestNumber ?? "");
      setIsSubmitted(true);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "No fue posible guardar la solicitud.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addProduct = () => setProducts((current) => [...current, emptyProduct(Date.now())]);
  const removeProduct = (id: number) => setProducts((current) => current.filter((product) => product.id !== id));

  return (
    <QuoteModalContext.Provider value={{ openQuoteModal }}>
      {children}
      <AnimatePresence>
        {isOpen && (
          <motion.div className="quote-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={closeQuoteModal}>
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="quote-modal-title"
              className="quote-modal"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="quote-modal-header">
                <div>
                  <p className="eyebrow">Solicitud de cotización</p>
                  <h2 id="quote-modal-title">Cuéntanos qué necesitas.</h2>
                  <p>Completa tus datos y te acompañaremos en cada etapa.</p>
                </div>
                <button type="button" className="quote-close" onClick={closeQuoteModal} aria-label="Cerrar modal">
                  <X size={20} aria-hidden="true" />
                </button>
              </div>

              {!isSubmitted && (
                <div className="quote-progress" aria-label={`Paso ${currentStep} de 3`}>
                  {["Tus datos", "Receta y productos", "Confirmación"].map((label, index) => {
                    const step = index + 1;
                    return (
                      <div className={`quote-progress-step ${step <= currentStep ? "is-active" : ""}`} key={label}>
                        <span>{step}</span>
                        <small>{label}</small>
                      </div>
                    );
                  })}
                </div>
              )}

              {isSubmitted ? (
                <motion.div className="quote-success" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                  <FileCheck2 size={38} aria-hidden="true" />
                  <h3>Recibimos tu solicitud</h3>
                  {generatedRequestNumber && <strong className="quote-request-number">ID de solicitud: {generatedRequestNumber}</strong>}
                  <p>Tu información quedó preparada para ser revisada por nuestro equipo.</p>
                  <button type="button" className="quote-primary-button" onClick={closeQuoteModal}>Cerrar</button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} noValidate>
                  <AnimatePresence mode="wait" initial={false}>
                    {currentStep === 1 && <motion.div key="contact-step" className="quote-step" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.2 }}>
                    <legend>Datos de contacto</legend>
                    <div className="quote-fields-grid">
                      <Field label="Nombre" placeholder="Ej: Ana Pérez" id="quote-name" value={values.name} error={errors.name} onChange={(value) => updateValue("name", value)} />
                      <Field label="Número de teléfono" placeholder="Ej: +56 9 1234 5678" id="quote-phone" type="tel" value={values.phone} error={errors.phone} onChange={(value) => updateValue("phone", value)} />
                      <Field label="Correo electrónico" placeholder="Ej: ana@correo.cl" id="quote-email" type="email" value={values.email} error={errors.email} onChange={(value) => updateValue("email", value)} />
                      <Field label="RUT" placeholder="Ej: 12.345.678-9" id="quote-rut" value={values.rut} error={errors.rut} onChange={(value) => updateValue("rut", value)} />
                      <Field label="Ciudad" placeholder="Ej: Santiago" id="quote-city" value={values.city} error={errors.city} onChange={(value) => updateValue("city", value)} />
                    </div>
                    <label className="quote-patient-toggle" htmlFor="different-patient">
                      <input id="different-patient" type="checkbox" checked={differentPatient} onChange={(event) => setDifferentPatient(event.target.checked)} />
                      <span>La receta es para otra persona</span>
                    </label>
                    {differentPatient && <div className="quote-fields-grid quote-patient-fields">
                      <Field label="Nombre del paciente" placeholder="Ej: Pedro Pérez" id="quote-patient-name" value={values.patientName} error={errors.patientName} onChange={(value) => updateValue("patientName", value)} />
                      <Field label="RUT del paciente" placeholder="Ej: 12.345.678-9" id="quote-patient-rut" value={values.patientRut} error={errors.patientRut} onChange={(value) => updateValue("patientRut", value)} />
                    </div>}
                    <StepButton onClick={goToNextStep}>Continuar <ArrowRight size={17} aria-hidden="true" /></StepButton>
                  </motion.div>}

                  {currentStep === 2 && <motion.div key="details-step" className="quote-step" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.2 }}>
                  <fieldset>
                    <legend>Receta médica</legend>
                    <label className={`quote-upload ${fileError || errors.file ? "has-error" : ""}`} htmlFor="quote-file">
                      <FileUp size={23} aria-hidden="true" />
                      <span>{values.file ? values.file.name : "Adjunta tu receta"}</span>
                      <small>PDF, JPG, PNG o HEIC · Máximo 10 MB</small>
                      <input id="quote-file" type="file" accept="application/pdf,image/*" onChange={handleFileChange} />
                    </label>
                    {(fileError || errors.file) && <p className="quote-error">{fileError || errors.file}</p>}
                  </fieldset>

                  <fieldset>
                    <legend>Medicamentos</legend>
                    <div className="quote-products">
                      <AnimatePresence initial={false}>
                        {products.map((product, index) => (
                          <motion.div className="quote-product" key={product.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                            <div className="quote-product-heading">
                              <h3>Producto {index + 1}</h3>
                              {products.length > 1 && <button type="button" className="quote-remove" onClick={() => removeProduct(product.id)}><Minus size={15} aria-hidden="true" /> Eliminar</button>}
                            </div>
                            <div className="quote-fields-grid">
                              <ProductField label="Nombre comercial" placeholder="Ej: Producto indicado" field="name" product={product} errors={errors} onChange={updateProduct} />
                              <ProductField label="Principio activo" placeholder="Ej: Principio activo" field="activeIngredient" product={product} errors={errors} onChange={updateProduct} />
                              <ProductField label="Concentración" placeholder="Ej: 500 mg" field="concentration" product={product} errors={errors} onChange={updateProduct} />
                              <ProductField label="Cantidad de comprimidos" placeholder="Ej: 30" field="quantity" product={product} errors={errors} onChange={updateProduct} />
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                    <button type="button" className="quote-add-product" onClick={addProduct}><Plus size={17} aria-hidden="true" /> Agregar otro producto</button>
                  </fieldset>
                  <div className="quote-step-actions"><StepButton variant="secondary" onClick={() => setCurrentStep(1)}><ArrowLeft size={17} aria-hidden="true" /> Atrás</StepButton><StepButton onClick={goToNextStep}>Revisar solicitud <ArrowRight size={17} aria-hidden="true" /></StepButton></div>
                  </motion.div>}

                  {currentStep === 3 && <motion.div key="confirmation-step" className="quote-step" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.2 }}>
                    <div className="quote-review">
                      <div className="quote-review-heading"><div><p className="eyebrow">Paso final</p><h3>Revisa tu solicitud</h3></div><FileCheck2 size={28} aria-hidden="true" /></div>
                      <ReviewRow label="Cliente" value={values.name} onEdit={() => setCurrentStep(1)} />
                      <ReviewRow label="Contacto" value={`${values.email} · ${values.phone}`} onEdit={() => setCurrentStep(1)} />
                      <ReviewRow label="Ubicación" value={`${values.city} · ${values.rut}`} onEdit={() => setCurrentStep(1)} />
                      {differentPatient && <ReviewRow label="Paciente" value={`${values.patientName} · ${values.patientRut}`} onEdit={() => setCurrentStep(1)} />}
                      <ReviewRow label="Receta" value={values.file?.name ?? "Sin archivo"} onEdit={() => setCurrentStep(2)} />
                      <ReviewRow label="Productos" value={`${products.length} ${products.length === 1 ? "producto" : "productos"}`} onEdit={() => setCurrentStep(2)} />
                    </div>
                    <div className="quote-consents">
                      <Consent
                        id="quote-policies"
                        checked={consents.policies}
                        error={errors.policies}
                        onChange={(checked) => { setConsents((current) => ({ ...current, policies: checked })); setErrors((current) => ({ ...current, policies: "" })); }}
                      >
                        Acepto las <a href="/politicas" target="_blank" rel="noreferrer">políticas de la empresa</a>.
                      </Consent>
                      <Consent
                        id="quote-data-consent"
                        checked={consents.data}
                        error={errors.data}
                        onChange={(checked) => { setConsents((current) => ({ ...current, data: checked })); setErrors((current) => ({ ...current, data: "" })); }}
                      >
                        Autorizo el tratamiento de mis datos personales conforme a la normativa chilena vigente y acepto ser contactado por los medios informados.
                      </Consent>
                    </div>
                    <div className="quote-step-hint">Al enviar, tu información quedará preparada para revisión de nuestro equipo. No se realiza ningún cobro en este paso.</div>
                    {submissionError && <p className="quote-submit-error">{submissionError}</p>}
                    <div className="quote-step-actions"><StepButton variant="secondary" onClick={() => setCurrentStep(2)}><ArrowLeft size={17} aria-hidden="true" /> Atrás</StepButton><button type="submit" className="quote-primary-button" disabled={isSubmitting}>{isSubmitting ? <><LoaderCircle className="quote-spinner" size={17} aria-hidden="true" /> Preparando...</> : <>Enviar solicitud <ArrowRight size={17} aria-hidden="true" /></>}</button></div>
                  </motion.div>}

                  </AnimatePresence>

                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </QuoteModalContext.Provider>
  );
}

export function QuoteTrigger({ children, className }: { children: ReactNode; className?: string }) {
  const context = useContext(QuoteModalContext);
  if (!context) throw new Error("QuoteTrigger debe estar dentro de QuoteModalProvider");
  return <button type="button" className={className} onClick={context.openQuoteModal}>{children}</button>;
}

function Consent({ id, checked, error, onChange, children }: { id: string; checked: boolean; error?: string; onChange: (checked: boolean) => void; children: ReactNode }) {
  return (
    <div className="quote-consent-item">
      <label className="quote-consent-label" htmlFor={id}>
        <input id={id} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} aria-invalid={Boolean(error)} />
        <span>{children}</span>
      </label>
      {error && <small className="quote-error">{error}</small>}
    </div>
  );
}

function StepButton({ children, onClick, variant = "primary" }: { children: ReactNode; onClick: () => void; variant?: "primary" | "secondary" }) {
  return <button type="button" className={`quote-step-button quote-step-button-${variant}`} onClick={onClick}>{children}</button>;
}

function ReviewRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="quote-review-row">
      <div><span>{label}</span><strong>{value}</strong></div>
      <button type="button" onClick={onEdit}>Editar</button>
    </div>
  );
}

function Field({ label, id, value, error, type = "text", placeholder, onChange }: { label: string; id: string; value: string; error?: string; type?: string; placeholder?: string; onChange: (value: string) => void }) {
  return (
    <label className="quote-field" htmlFor={id}>
      <span>{label}</span>
      <input id={id} type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} />
      {error && <small className="quote-error">{error}</small>}
    </label>
  );
}

function ProductField({ label, field, product, errors, placeholder, onChange }: { label: string; field: keyof Omit<Product, "id">; product: Product; errors: Record<string, string>; placeholder?: string; onChange: (id: number, field: keyof Omit<Product, "id">, value: string) => void }) {
  const error = errors[`product-${product.id}-${field}`];
  return <Field label={label} id={`product-${product.id}-${field}`} value={product[field]} error={error} placeholder={placeholder} onChange={(value) => onChange(product.id, field, value)} />;
}
