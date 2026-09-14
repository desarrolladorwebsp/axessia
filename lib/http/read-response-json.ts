export async function readResponseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) {
    throw new Error(
      response.ok
        ? "El servidor no devolvió una respuesta."
        : "No fue posible completar la operación. Intenta nuevamente.",
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("No fue posible leer la respuesta del servidor.");
  }
}
