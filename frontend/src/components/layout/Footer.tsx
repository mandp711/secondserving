import { Leaf } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600">
              <Leaf className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-900">SecondServing</span>
          </div>
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} SecondServing. Filling plates, not landfills.
          </p>
        </div>
      </div>
    </footer>
  );
}
