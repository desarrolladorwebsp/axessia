type SectionPlaceholderProps = {
  title: string;
};

export default function SectionPlaceholder({ title }: SectionPlaceholderProps) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-92px)] max-w-[960px] items-center justify-center px-5 py-16 sm:px-6 lg:px-8">
      <section className="w-full rounded-[24px] border border-[var(--border)] bg-white px-6 py-16 text-center shadow-[0_16px_40px_rgba(7,30,65,0.05)] sm:px-10">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--blue)]">AXESSIA</p>
        <h1 className="mt-4 font-display text-3xl font-bold text-[var(--navy)] sm:text-4xl">{title}</h1>
        <p className="mt-4 text-base text-[var(--text-secondary)]">Estamos trabajando en esta sección.</p>
      </section>
    </main>
  );
}