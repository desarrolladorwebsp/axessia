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
import Link from "next/link";
import { ArrowLeft, ArrowRight, FileCheck2, FileUp, LoaderCircle, Minus, Plus, X } from "lucide-react";

import { isValidRut } from "@/lib/customer-validation";
import { buildQuoteRequestFormData } from "@/lib/quote-request-form-data";
import { readResponseJson } from "@/lib/http/read-response-json";
import { PORTAL_PROFILE_PATH } from "@/lib/portal/paths";
import { PRODUCT_TYPE_LABELS, PRODUCT_TYPE_PLURAL_LABELS, isMedicalDevice, type ProductType } from "@/lib/product-type";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function formatPrescriptionSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type MedicationProduct = {
  id: number;
  name: string;
  activeIngredient: string;
  concentration: string;
  quantity: string;
  notes: string;
};

type DeviceProduct = {
  id: number;
  name: string;
  brand: string;
  model: string;
  quantity: string;
  description: string;
};

export type QuoteAccountContact = {
  name: string;
  phone: string;
  email: string;
  rut: string;
  city: string;
};

type FormValues = QuoteAccountContact & {
  file: File | null;
  patientName: string;
  patientRut: string;
};

type QuoteModalContextValue = {
  openQuoteModal: () => void;
};

const QuoteModalContext = createContext<QuoteModalContextValue | null>(null);

const emptyMedication = (id: number): MedicationProduct => ({
  id,
  name: "",
  activeIngredient: "",
  concentration: "",
  quantity: "",
  notes: "",
});

const emptyDevice = (id: number): DeviceProduct => ({
  id,
  name: "",
  brand: "",
  model: "",
  quantity: "",
  description: "",
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

export function QuoteModalProvider({
  children,
  accountContact = null,
}: {
  children: ReactNode;
  accountContact?: QuoteAccountContact | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [values, setValues] = useState<FormValues>(initialValues);
  const contactLocked = Boolean(accountContact);
  const [productType, setProductType] = useState<ProductType>("MEDICATION");
  const [products, setProducts] = useState<MedicationProduct[]>([emptyMedication(1)]);
  const [devices, setDevices] = useState<DeviceProduct[]>([emptyDevice(1)]);
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

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const openQuoteModal = () => {
    if (accountContact) {
      setValues((current) => ({
        ...current,
        name: accountContact.name,
        phone: accountContact.phone,
        email: accountContact.email,
        rut: accountContact.rut,
        city: accountContact.city,
      }));
    }
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
    if (contactLocked && (field === "name" || field === "phone" || field === "email" || field === "rut" || field === "city")) {
      return;
    }
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const updateProduct = (id: number, field: keyof Omit<MedicationProduct, "id">, value: string) => {
    setProducts((current) => current.map((product) => (product.id === id ? { ...product, [field]: value } : product)));
    setErrors((current) => ({ ...current, [`product-${id}-${field}`]: "" }));
  };

  const updateDevice = (id: number, field: keyof Omit<DeviceProduct, "id">, value: string) => {
    setDevices((current) => current.map((device) => (device.id === id ? { ...device, [field]: value } : device)));
    setErrors((current) => ({ ...current, [`device-${id}-${field}`]: "" }));
  };

  const changeProductType = (nextType: ProductType) => {
    setProductType(nextType);
    setFileError("");
    setErrors((current) => ({ ...current, file: "" }));
  };

  const applyPrescriptionFile = (file: File | null, input?: HTMLInputElement | null) => {
    setFileError("");
    if (!file) return;

    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setFileError("Adjunta un PDF o una imagen válida.");
      if (input) input.value = "";
      return;
    }
    if (file.size <= 0) {
      setFileError("El archivo está vacío.");
      if (input) input.value = "";
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError("El archivo no puede superar los 10 MB.");
      if (input) input.value = "";
      return;
    }
    setValues((current) => ({ ...current, file }));
    setErrors((current) => ({ ...current, file: "" }));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    applyPrescriptionFile(event.target.files?.[0] ?? null, event.target);
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
    if (values.rut.trim() && !isValidRut(values.rut)) nextErrors.rut = "RUT incorrecto.";
    if (differentPatient && !values.patientName.trim()) nextErrors.patientName = "Ingresa el nombre del paciente.";
    if (differentPatient && !values.patientRut.trim()) nextErrors.patientRut = "Ingresa el RUT del paciente.";
    if (differentPatient && values.patientRut.trim() && !isValidRut(values.patientRut)) {
      nextErrors.patientRut = "RUT incorrecto.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateDetails = () => {
    const nextErrors: Record<string, string> = {};
    if (!isMedicalDevice(productType) && !values.file) nextErrors.file = "Adjunta tu receta médica.";

    if (isMedicalDevice(productType)) {
      devices.forEach((device) => {
        if (!device.name.trim()) nextErrors[`device-${device.id}-name`] = "Obligatorio";
      });
    } else {
      products.forEach((product) => {
        (["name", "activeIngredient", "concentration"] as const).forEach((field) => {
          if (!product[field].trim()) nextErrors[`product-${product.id}-${field}`] = "Obligatorio";
        });
        if (product.quantity.trim()) {
          const quantity = Number(product.quantity);
          if (!Number.isInteger(quantity) || quantity <= 0) {
            nextErrors[`product-${product.id}-quantity`] = "Ingresa un número entero mayor a 0.";
          }
        }
      });
    }

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

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  const submitRequest = async () => {
    if (isSubmitting || currentStep !== 3) return;
    if (!validate() || !validateConsents()) return;

    setIsSubmitting(true);
    setSubmissionError("");
    try {
      const response = await fetch("/api/quote-requests", {
        method: "POST",
        body: buildQuoteRequestFormData({
          customer: accountContact ?? { name: values.name, phone: values.phone, email: values.email, rut: values.rut, city: values.city },
          patient: differentPatient ? { name: values.patientName, rut: values.patientRut } : undefined,
          productType,
          medications: isMedicalDevice(productType) ? [] : products.map((product) => ({
            commercialName: product.name,
            activeIngredient: product.activeIngredient,
            concentration: product.concentration,
            tabletQuantity: product.quantity.trim() ? Number(product.quantity) : null,
            notes: product.notes.trim() || null,
          })),
          medicalDevices: isMedicalDevice(productType) ? devices.map((device) => ({
            name: device.name,
            brand: device.brand || null,
            model: device.model || null,
            quantity: device.quantity.trim() ? Number(device.quantity) : null,
            description: device.description || null,
          })) : [],
          acceptsPolicies: consents.policies,
          acceptsDataTreatment: consents.data,
        }, values.file),
      });
      const result = await readResponseJson<{ requestNumber?: string; error?: string }>(response);
      if (!response.ok) throw new Error(result.error || "No fue posible guardar la solicitud.");
      setGeneratedRequestNumber(result.requestNumber ?? "");
      setIsSubmitted(true);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "No fue posible guardar la solicitud.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addProduct = () => setProducts((current) => [...current, emptyMedication(Date.now())]);
  const removeProduct = (id: number) => setProducts((current) => current.filter((product) => product.id !== id));
  const addDevice = () => setDevices((current) => [...current, emptyDevice(Date.now())]);
  const removeDevice = (id: number) => setDevices((current) => current.filter((device) => device.id !== id));
  const selectedCount = isMedicalDevice(productType) ? devices.length : products.length;

  return (
    <QuoteModalContext.Provider value={{ openQuoteModal }}>
      {children}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="quote-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => event.preventDefault()}
          >
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
              onClick={(event) => event.stopPropagation()}
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
                <form onSubmit={handleFormSubmit} noValidate>
                  <AnimatePresence mode="wait" initial={false}>
                    {currentStep === 1 && <motion.div key="contact-step" className="quote-step" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.2 }}>
                    <legend>Datos de contacto</legend>
                    {contactLocked && (
                      <p className="quote-account-hint">
                        Usamos los datos de tu cuenta y no se pueden editar en esta solicitud. Si necesitas actualizarlos, ve a{" "}
                        <Link href={PORTAL_PROFILE_PATH}>tu perfil</Link>.
                      </p>
                    )}
                    <div className="quote-fields-grid">
                      <Field label="Nombre" placeholder="Ej: Ana Pérez" id="quote-name" value={values.name} error={errors.name} readOnly={contactLocked} autoComplete="name" onChange={(value) => updateValue("name", value)} />
                      <Field label="Número de teléfono" placeholder="Ej: +56 9 1234 5678" id="quote-phone" type="tel" value={values.phone} error={errors.phone} readOnly={contactLocked} autoComplete="tel" onChange={(value) => updateValue("phone", value)} />
                      <Field label="Correo electrónico" placeholder="Ej: ana@correo.cl" id="quote-email" type="email" value={values.email} error={errors.email} readOnly={contactLocked} autoComplete="email" onChange={(value) => updateValue("email", value)} />
                      <Field label="RUT" placeholder="Ej: 12.345.678-9" id="quote-rut" value={values.rut} error={errors.rut} readOnly={contactLocked} autoComplete="off" onChange={(value) => updateValue("rut", value)} />
                      <Field label="Ciudad" placeholder="Ej: Santiago" id="quote-city" value={values.city} error={errors.city} readOnly={contactLocked} autoComplete="address-level2" onChange={(value) => updateValue("city", value)} />
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
                    <legend>¿Qué necesitas?</legend>
                    <div className="quote-type-picker" role="radiogroup" aria-label="Tipo de producto">
                      {(["MEDICATION", "MEDICAL_DEVICE"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          role="radio"
                          aria-checked={productType === type}
                          className={`quote-type-option ${productType === type ? "is-selected" : ""}`}
                          onClick={() => changeProductType(type)}
                        >
                          <strong>{PRODUCT_TYPE_LABELS[type]}</strong>
                          <small>{type === "MEDICATION" ? "Con receta y datos del medicamento" : "Solo la información que conozcas"}</small>
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset>
                    <legend>{isMedicalDevice(productType) ? "Documento de respaldo" : "Receta médica"}</legend>
                    <label className={`quote-upload ${values.file ? "is-loaded" : ""} ${fileError || errors.file ? "has-error" : ""}`} htmlFor="quote-file">
                      {values.file ? <FileCheck2 size={23} aria-hidden="true" /> : <FileUp size={23} aria-hidden="true" />}
                      <span>{values.file ? values.file.name : isMedicalDevice(productType) ? "Adjunta un documento, si lo tienes" : "Adjunta tu receta"}</span>
                      <small>
                        {values.file
                          ? `Cargada correctamente · ${formatPrescriptionSize(values.file.size)}`
                          : isMedicalDevice(productType)
                            ? "Opcional · PDF, JPG, PNG o HEIC · Máximo 10 MB"
                            : "PDF, JPG, PNG o HEIC · Máximo 10 MB"}
                      </small>
                      <input id="quote-file" type="file" accept="application/pdf,image/*" onChange={handleFileChange} />
                    </label>
                    {(fileError || errors.file) && <p className="quote-error">{fileError || errors.file}</p>}
                  </fieldset>

                  <fieldset>
                    <legend>{PRODUCT_TYPE_PLURAL_LABELS[productType]}</legend>
                    {isMedicalDevice(productType) ? (
                      <>
                        <div className="quote-products">
                          <AnimatePresence initial={false}>
                            {devices.map((device, index) => (
                              <motion.div className="quote-product" key={device.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                                <div className="quote-product-heading">
                                  <h3>Dispositivo {index + 1}</h3>
                                  {devices.length > 1 && <button type="button" className="quote-remove" onClick={() => removeDevice(device.id)}><Minus size={15} aria-hidden="true" /> Eliminar</button>}
                                </div>
                                <div className="quote-fields-grid">
                                  <DeviceField label="Nombre del dispositivo" placeholder="Ej: Bomba de infusión" field="name" device={device} errors={errors} onChange={updateDevice} />
                                  <DeviceField label="Marca, si la conoces" placeholder="Opcional" field="brand" device={device} errors={errors} onChange={updateDevice} />
                                  <DeviceField label="Modelo o referencia" placeholder="Opcional" field="model" device={device} errors={errors} onChange={updateDevice} />
                                  <DeviceField label="Cantidad solicitada" placeholder="Opcional" field="quantity" device={device} errors={errors} onChange={updateDevice} />
                                </div>
                                <label className="quote-field quote-field-full" htmlFor={`device-${device.id}-description`}>
                                  <span>Descripción o características necesarias</span>
                                  <textarea id={`device-${device.id}-description`} value={device.description} placeholder="Opcional. Cuéntanos lo que sepas o lo que necesitas." onChange={(event) => updateDevice(device.id, "description", event.target.value)} rows={3} />
                                </label>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                        <button type="button" className="quote-add-product" onClick={addDevice}><Plus size={17} aria-hidden="true" /> Agregar otro dispositivo</button>
                      </>
                    ) : (
                      <>
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
                                  <ProductField label="Cantidad de comprimidos (opcional)" placeholder="Ej: 30" field="quantity" product={product} errors={errors} onChange={updateProduct} />
                                </div>
                                <label className="quote-field quote-field-full" htmlFor={`product-${product.id}-notes`}>
                                  <span>Observaciones del medicamento</span>
                                  <input id={`product-${product.id}-notes`} value={product.notes} placeholder="Opcional" maxLength={500} onChange={(event) => updateProduct(product.id, "notes", event.target.value)} />
                                </label>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                        <button type="button" className="quote-add-product" onClick={addProduct}><Plus size={17} aria-hidden="true" /> Agregar otro producto</button>
                      </>
                    )}
                  </fieldset>
                  <div className="quote-step-actions"><StepButton variant="secondary" onClick={() => setCurrentStep(1)}><ArrowLeft size={17} aria-hidden="true" /> Atrás</StepButton><StepButton onClick={goToNextStep}>Revisar solicitud <ArrowRight size={17} aria-hidden="true" /></StepButton></div>
                  </motion.div>}

                  {currentStep === 3 && <motion.div key="confirmation-step" className="quote-step" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.2 }}>
                    <div className="quote-review">
                      <div className="quote-review-heading"><div><p className="eyebrow">Paso final</p><h3>Revisa tu solicitud</h3></div><FileCheck2 size={28} aria-hidden="true" /></div>
                      <ReviewRow label="Cliente" value={values.name} editable={!contactLocked} onEdit={() => setCurrentStep(1)} />
                      <ReviewRow label="Contacto" value={`${values.email} · ${values.phone}`} editable={!contactLocked} onEdit={() => setCurrentStep(1)} />
                      <ReviewRow label="Ubicación" value={`${values.city} · ${values.rut}`} editable={!contactLocked} onEdit={() => setCurrentStep(1)} />
                      {differentPatient && <ReviewRow label="Paciente" value={`${values.patientName} · ${values.patientRut}`} onEdit={() => setCurrentStep(1)} />}
                      <ReviewRow label="Tipo" value={PRODUCT_TYPE_LABELS[productType]} onEdit={() => setCurrentStep(2)} />
                      <ReviewRow label={isMedicalDevice(productType) ? "Documento" : "Receta"} value={values.file?.name ?? (isMedicalDevice(productType) ? "Sin archivo" : "Sin archivo")} onEdit={() => setCurrentStep(2)} />
                      <ReviewRow label="Productos" value={`${selectedCount} ${selectedCount === 1 ? (isMedicalDevice(productType) ? "dispositivo" : "medicamento") : (isMedicalDevice(productType) ? "dispositivos" : "medicamentos")}`} onEdit={() => setCurrentStep(2)} />
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
                    <div className="quote-step-actions"><StepButton variant="secondary" onClick={() => setCurrentStep(2)}><ArrowLeft size={17} aria-hidden="true" /> Atrás</StepButton><button type="button" className="quote-primary-button" onClick={submitRequest} disabled={isSubmitting}>{isSubmitting ? <><LoaderCircle className="quote-spinner" size={17} aria-hidden="true" /> Preparando...</> : <>Enviar solicitud <ArrowRight size={17} aria-hidden="true" /></>}</button></div>
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

function ReviewRow({ label, value, onEdit, editable = true }: { label: string; value: string; onEdit: () => void; editable?: boolean }) {
  return (
    <div className="quote-review-row">
      <div><span>{label}</span><strong>{value}</strong></div>
      {editable ? <button type="button" onClick={onEdit}>Editar</button> : <span className="quote-review-locked">Cuenta</span>}
    </div>
  );
}

function Field({
  label,
  id,
  value,
  error,
  type = "text",
  placeholder,
  readOnly = false,
  autoComplete,
  onChange,
}: {
  label: string;
  id: string;
  value: string;
  error?: string;
  type?: string;
  placeholder?: string;
  readOnly?: boolean;
  autoComplete?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className={`quote-field${readOnly ? " is-locked" : ""}`} htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        readOnly={readOnly}
        autoComplete={readOnly ? "off" : autoComplete}
        onChange={readOnly ? undefined : (event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-readonly={readOnly || undefined}
      />
      {error && <small className="quote-error">{error}</small>}
    </label>
  );
}

function ProductField({ label, field, product, errors, placeholder, onChange }: { label: string; field: keyof Omit<MedicationProduct, "id">; product: MedicationProduct; errors: Record<string, string>; placeholder?: string; onChange: (id: number, field: keyof Omit<MedicationProduct, "id">, value: string) => void }) {
  const error = errors[`product-${product.id}-${field}`];
  return <Field label={label} id={`product-${product.id}-${field}`} value={product[field]} error={error} placeholder={placeholder} onChange={(value) => onChange(product.id, field, value)} />;
}

function DeviceField({ label, field, device, errors, placeholder, onChange }: { label: string; field: keyof Omit<DeviceProduct, "id">; device: DeviceProduct; errors: Record<string, string>; placeholder?: string; onChange: (id: number, field: keyof Omit<DeviceProduct, "id">, value: string) => void }) {
  const error = errors[`device-${device.id}-${field}`];
  return <Field label={label} id={`device-${device.id}-${field}`} value={device[field]} error={error} placeholder={placeholder} onChange={(value) => onChange(device.id, field, value)} />;
}
