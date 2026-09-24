"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, MessageCircle, Send } from "lucide-react";

const MAX_LENGTH = 2000;
type ChatMessage = { id: string; message: string; senderLabel: string; imageUrl: string | null; imageFileName: string | null; createdAt: string };

export function ChatPanel({ requestId }: { requestId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try { const response = await fetch(`/api/chat/${requestId}`, { cache: "no-store" }); const result = await response.json() as { messages?: ChatMessage[]; error?: string }; if (!response.ok) throw new Error(result.error || "No fue posible cargar el chat."); setMessages(result.messages ?? []); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : "No fue posible cargar el chat."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [requestId]);

  const send = async (event: FormEvent) => {
    event.preventDefault(); if ((!text.trim() && !image) || sending) return;
    setSending(true); setError("");
    try { const form = new FormData(); form.set("message", text.trim()); if (image) form.set("image", image); const response = await fetch(`/api/chat/${requestId}`, { method: "POST", body: form }); const result = await response.json() as ChatMessage & { error?: string }; if (!response.ok) throw new Error(result.error || "No fue posible enviar el mensaje."); setMessages((current) => [...current, result]); setText(""); setImage(null); if (fileRef.current) fileRef.current.value = ""; }
    catch (sendError) { setError(sendError instanceof Error ? sendError.message : "No fue posible enviar el mensaje."); }
    finally { setSending(false); }
  };

  return <section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[0_10px_28px_rgba(7,30,65,0.04)] sm:p-6">
    <div className="mb-5 flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--blue)]/10 text-[var(--blue)]"><MessageCircle className="h-4 w-4" /></div><div><h2 className="font-display text-base font-extrabold text-[var(--navy)]">Chat con Team AXESSIA</h2><p className="mt-0.5 text-xs text-[var(--text-secondary)]">Escribe tus consultas sobre esta solicitud.</p></div></div>
    <div className="max-h-80 space-y-3 overflow-y-auto rounded-xl bg-[var(--background)] p-3" aria-live="polite">{loading ? <p className="py-6 text-center text-xs text-[var(--text-secondary)]">Cargando conversación...</p> : messages.length === 0 ? <p className="py-6 text-center text-xs text-[var(--text-secondary)]">Aún no hay mensajes. Puedes iniciar la conversación.</p> : messages.map((item) => <article key={item.id} className={`max-w-[90%] rounded-2xl px-4 py-3 ${item.senderLabel === "Tú" ? "ml-auto bg-[var(--navy)] text-white" : "bg-white text-[var(--navy)] shadow-sm"}`}><div className="flex items-center justify-between gap-3"><p className="text-[10px] font-extrabold uppercase tracking-wide opacity-75">{item.senderLabel}</p><time className="text-[10px] opacity-60">{new Date(item.createdAt).toLocaleString("es-CL")}</time></div>{item.message ? <p className="mt-1 whitespace-pre-wrap break-words text-sm">{item.message}</p> : null}{item.imageUrl ? <a href={item.imageUrl} target="_blank" rel="noreferrer" className="mt-2 block text-xs font-bold underline">Ver imagen adjunta</a> : null}</article>)}</div>
    <form onSubmit={send} className="mt-4 space-y-3"><textarea value={text} maxLength={MAX_LENGTH} onChange={(event) => setText(event.target.value)} rows={3} placeholder="Escribe un mensaje..." className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm outline-none focus:border-[var(--blue)]" /><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[10px] text-[var(--text-secondary)]">{text.length}/{MAX_LENGTH} caracteres</span><div className="flex items-center gap-2"><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => setImage(event.target.files?.[0] ?? null)} /><button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-bold text-[var(--navy)]"><ImagePlus className="h-4 w-4" />{image ? image.name.slice(0, 22) : "Imagen"}</button><button type="submit" disabled={sending || (!text.trim() && !image)} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--navy)] px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Enviar</button></div></div>{error ? <p role="alert" className="text-xs font-semibold text-rose-600">{error}</p> : null}</form>
  </section>;
}
