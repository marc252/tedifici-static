import SearchAddress from "@/components/SearchAddress";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center w-full">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Tedifici
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            Dades oficials, històriques i urbanístiques de qualsevol edifici.
          </p>
        </div>

        <SearchAddress />

      </main>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center text-gray-500 text-sm">
        <p>&copy; {new Date().getFullYear()} Tedifici. Tits els drets reservats.</p>
      </footer>
    </div>
  );
}
