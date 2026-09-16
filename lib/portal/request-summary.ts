import { isMedicalDevice, productTypeLabel } from "@/lib/product-type";

export function summarizeRequestProducts(input: {
  productType: string;
  medications: Array<{ commercialName: string }>;
  medicalDevices: Array<{ name: string }>;
}) {
  const names = isMedicalDevice(input.productType)
    ? input.medicalDevices.map((item) => item.name).filter(Boolean)
    : input.medications.map((item) => item.commercialName).filter(Boolean);

  if (names.length === 0) return productTypeLabel(input.productType);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} y ${names[1]}`;
  return `${names[0]} y ${names.length - 1} más`;
}
