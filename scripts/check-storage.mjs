import { PrismaClient } from "@prisma/client";
import fs from "fs/promises";
import path from "path";

function getStorageRoot() {
  const configured = process.env.AXESSIA_STORAGE_ROOT?.trim();
  if (configured) return path.resolve(configured);
  if (process.env.NODE_ENV === "production") return path.resolve("/home/axessia/storage/axessia");
  return path.join(process.cwd(), "storage", "axessia");
}

const prisma = new PrismaClient();

async function main() {
  const root = getStorageRoot();
  console.log("Storage root:", root);

  const prescriptions = await prisma.prescription.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      fileName: true,
      storageKey: true,
      mimeType: true,
      fileSize: true,
      createdAt: true,
      request: { select: { requestNumber: true } },
    },
  });

  console.log("\nRecent prescriptions:");
  for (const item of prescriptions) {
    const absolutePath = item.storageKey ? path.join(root, item.storageKey) : null;
    let exists = false;
    if (absolutePath) {
      try {
        await fs.access(absolutePath);
        exists = true;
      } catch {
        exists = false;
      }
    }

    console.log({
      requestNumber: item.request.requestNumber,
      fileName: item.fileName,
      storageKey: item.storageKey,
      fileOnDisk: exists,
      absolutePath,
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
