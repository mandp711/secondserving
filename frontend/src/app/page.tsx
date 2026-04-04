import Link from "next/link";
import {
  ArrowRight,
  ListPlus,
  HandHeart,
  Truck,
  Leaf,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

const steps = [
  {
    icon: ListPlus,
    title: "List Surplus",
    description:
      "Restaurants, stores, and farms post surplus food with peak surplus days, quantities, and availability hours.",
  },
  {
    icon: HandHeart,
    title: "Claim in Real-Time",
    description:
      "Households, food banks, and composters browse the map and claim available food nearby.",
  },
  {
    icon: Truck,
    title: "Pick Up & Enjoy",
    description:
      "Coordinate pickup times and rescue food before it goes to waste.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-white">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-brand-200 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-brand-100 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 text-sm font-medium text-brand-700">
              <Leaf className="h-4 w-4" />
              Filling plates, not landfills
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              Rescue Food,{" "}
              <span className="text-brand-600">Feed Communities</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
              SecondServing connects businesses with surplus food to households, food
              banks, and composters in your neighborhood. See what&apos;s
              available on the map, claim it, and pick it up — all in real time.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/map">
                <Button size="lg" className="gap-2">
                  Find Food Near Me
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">How It Works</h2>
            <p className="mt-3 text-gray-600">
              Three simple steps to rescue surplus food
            </p>
          </div>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {steps.map((step, idx) => (
              <div
                key={step.title}
                className="group relative rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm transition-all hover:shadow-md"
              >
                <div className="absolute -top-5 left-1/2 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white shadow-md">
                  {idx + 1}
                </div>
                <div className="mx-auto mt-2 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-100">
                  <step.icon className="h-7 w-7" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-gray-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-brand-600 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Filling plates, not landfills
          </h2>
          <p className="mt-4 text-xl font-bold italic text-white">
            Connecting surplus food with people who need it most.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Ready to Make a Difference?
          </h2>
          <p className="mt-4 text-gray-600">
            Join thousands of businesses and community members already reducing
            food waste in their neighborhoods.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register">
              <Button size="lg">Find Food Near Me</Button>
            </Link>
            <Link href="/register/business">
              <Button variant="outline" size="lg">
                Register Your Business
              </Button>
            </Link>
            <Link href="/listings">
              <Button variant="outline" size="lg">
                Browse Listings
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
