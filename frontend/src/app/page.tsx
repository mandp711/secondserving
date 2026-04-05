"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ListPlus, HandHeart, Truck, Leaf, MapPin, Building2, LayoutGrid } from "lucide-react";
import { BackgroundPaths, FloatingPaths } from "@/components/ui/background-paths";
import { Alert, AlertIcon, AlertTitle, AlertToolbar } from "@/components/ui/alert-1";
import { Button } from "@/components/ui/button-1";

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
    <div className="bg-white">
      {/* Hero */}
      <BackgroundPaths title="Food Rescue">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-4"
        >
          Connecting businesses with surplus food to households, food banks, and
          composters in your neighborhood — all in real time.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="mb-10 inline-flex items-center gap-2 rounded-full bg-aqua px-4 py-1.5 text-sm font-medium text-teal"
        >
          <Leaf className="h-4 w-4" />
          Filling plates, not landfills
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/map"
            className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-8 py-4 text-base font-medium text-white shadow-lg hover:bg-brand-700 hover:-translate-y-0.5 transition-all duration-300 hover:shadow-xl"
          >
            Find Food Near Me
            <ArrowRight className="h-5 w-5" />
          </Link>

          <Link
            href="/register/business"
            className="inline-flex items-center gap-2 rounded-2xl border border-teal bg-white/80 px-8 py-4 text-base font-medium text-teal backdrop-blur-sm hover:bg-teal/5 hover:-translate-y-0.5 transition-all duration-300 shadow-sm hover:shadow-md"
          >
            List Your Surplus
          </Link>
        </motion.div>
      </BackgroundPaths>

      {/* How It Works */}
      <section className="relative overflow-hidden py-12 md:py-20">
        <div className="mx-auto max-w-5xl space-y-8 px-6 md:space-y-16">
          <div className="relative z-10 mx-auto max-w-xl space-y-6 text-center">
            <h2 className="text-balance text-4xl font-medium lg:text-5xl text-brand-500">How It Works</h2>
            <p className="text-gray-500">Three simple steps to reduce food waste</p>
          </div>
          <div className="relative mx-auto grid max-w-2xl lg:max-w-4xl sm:grid-cols-3">
            {steps.map((step, idx) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.15 }}
                className="space-y-3 p-12"
              >
                <div className="flex items-center gap-2">
                  <step.icon className="size-4 text-teal" />
                  <h3 className="text-sm font-medium text-brand-800">{step.title}</h3>
                </div>
                <p className="text-sm text-gray-500">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-balance text-4xl font-medium lg:text-5xl text-teal">
              Ready to Make a Difference?
            </h2>
            <p className="mt-4 text-gray-500">
              Join thousands of businesses and community members already reducing
              food waste in their neighborhoods.
            </p>
            <div className="mt-10 flex flex-col gap-3 mx-auto max-w-lg text-left">
              <Alert variant="mono" className="!bg-aqua !text-teal">
                <AlertIcon><MapPin size={20} color="#5A2F25" /></AlertIcon>
                <AlertTitle>Find Food Near Me</AlertTitle>
                <AlertToolbar>
                  <Button variant="inverse" mode="link" underlined="solid" size="sm" asChild>
                    <Link href="/register">Get started <ArrowRight className="inline h-3 w-3" /></Link>
                  </Button>
                </AlertToolbar>
              </Alert>
              <Alert variant="mono" className="!bg-aqua !text-teal">
                <AlertIcon><Building2 size={20} color="#5A2F25" /></AlertIcon>
                <AlertTitle>Register Your Business</AlertTitle>
                <AlertToolbar>
                  <Button variant="inverse" mode="link" underlined="solid" size="sm" asChild>
                    <Link href="/register/business">Sign up <ArrowRight className="inline h-3 w-3" /></Link>
                  </Button>
                </AlertToolbar>
              </Alert>
              <Alert variant="mono" className="!bg-aqua !text-teal">
                <AlertIcon><LayoutGrid size={20} color="#5A2F25" /></AlertIcon>
                <AlertTitle>Browse Listings</AlertTitle>
                <AlertToolbar>
                  <Button variant="inverse" mode="link" underlined="solid" size="sm" asChild>
                    <Link href="/listings">View all <ArrowRight className="inline h-3 w-3" /></Link>
                  </Button>
                </AlertToolbar>
              </Alert>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
