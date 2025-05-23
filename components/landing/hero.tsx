/*
<ai_context>
This client component provides the hero section for the landing page.
</ai_context>
*/

"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import {
  ArrowRight,
  Sparkles,
  Target,
  TrendingUp,
  Play,
  Users,
  Star,
  Check
} from "lucide-react"
import Link from "next/link"
import posthog from "posthog-js"
import AnimatedGradientText from "../magicui/animated-gradient-text"
import HeroVideoDialog from "../magicui/hero-video-dialog"

export const HeroSection = () => {
  const handleGetStartedClick = () => {
    posthog.capture("clicked_get_started")
  }

  return (
    <section className="section-padding bg-dots relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      {/* Enhanced Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/4 top-1/4 size-96 animate-pulse rounded-full bg-blue-500/20 blur-3xl" />
        <div
          className="absolute bottom-1/4 right-1/4 size-96 animate-pulse rounded-full bg-purple-500/20 blur-3xl"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute left-1/2 top-1/2 size-72 animate-pulse rounded-full bg-indigo-500/10 blur-3xl"
          style={{ animationDelay: "2s" }}
        />
        <div className="via-background/80 to-background absolute inset-0 bg-gradient-to-b from-transparent" />
      </div>

      <div className="container-padding w-full">
        {/* Enhanced Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-8 flex justify-center"
        >
          <Badge className="glass shadow-glow rounded-full px-6 py-3 text-sm font-medium">
            <Target className="mr-2 size-4 text-blue-600" />
            <span className="text-gray-700 dark:text-gray-300">
              AI-Powered Lead Generation
            </span>
            <div className="mx-3 h-4 w-px bg-gray-300 dark:bg-gray-600" />
            <span className="gradient-text font-semibold">
              New: Advanced Analytics
            </span>
          </Badge>
        </motion.div>

        {/* Enhanced Main Content */}
        <div className="mb-20 space-y-8 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="mx-auto max-w-5xl text-5xl font-bold tracking-tight md:text-7xl lg:text-8xl"
          >
            Find High-Quality
            <span className="gradient-text mt-2 block">Reddit Leads</span>
            <span className="text-muted-foreground mt-4 block text-3xl font-medium leading-tight md:text-4xl lg:text-5xl">
              with AI Precision
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="text-muted-foreground mx-auto max-w-4xl text-xl leading-relaxed md:text-2xl"
          >
            Transform Reddit conversations into qualified business
            opportunities. Our AI identifies high-intent prospects and generates
            personalized responses that convert browsers into buyers.
          </motion.p>

          {/* Enhanced Feature Pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="mx-auto flex max-w-4xl flex-wrap justify-center gap-4"
          >
            {[
              { icon: Sparkles, text: "AI-Powered Analysis", color: "blue" },
              { icon: Target, text: "High-Intent Detection", color: "purple" },
              {
                icon: TrendingUp,
                text: "Conversion Optimization",
                color: "green"
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                className="glass shadow-glow hover:shadow-glow-lg flex items-center gap-3 rounded-full px-6 py-3 text-sm font-medium transition-all duration-300"
              >
                <item.icon
                  className={cn(
                    "size-4",
                    item.color === "blue" && "text-blue-600",
                    item.color === "purple" && "text-purple-600",
                    item.color === "green" && "text-green-600"
                  )}
                />
                {item.text}
              </motion.div>
            ))}
          </motion.div>

          {/* Enhanced CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            className="flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link href="/onboarding" onClick={handleGetStartedClick}>
              <Button
                size="lg"
                className="group min-w-[200px] transform-gpu rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-10 py-6 text-lg font-semibold shadow-lg transition-all duration-300 hover:scale-105 hover:from-blue-700 hover:to-blue-800 hover:shadow-xl"
              >
                Start Finding Leads
                <ArrowRight className="ml-2 size-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>

            <Button
              variant="outline"
              size="lg"
              className="group min-w-[180px] rounded-xl border-2 bg-white/50 px-10 py-6 text-lg font-semibold shadow-md backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              <Play className="mr-2 size-5 transition-transform group-hover:scale-110" />
              Watch Demo
            </Button>
          </motion.div>

          {/* Enhanced Social Proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
            className="flex flex-col items-center justify-center gap-8 text-sm sm:flex-row"
          >
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <div
                    key={i}
                    className="border-background size-10 rounded-full border-2 bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg"
                  />
                ))}
              </div>
              <div className="text-left">
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  Join 500+ marketers
                </div>
                <div className="text-muted-foreground text-xs">
                  Growing their business with AI
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star
                    key={i}
                    className="size-4 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
              <div className="text-left">
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  4.9/5 rating
                </div>
                <div className="text-muted-foreground text-xs">
                  From verified users
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Check className="size-5 text-green-600" />
              <div className="text-left">
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  No credit card
                </div>
                <div className="text-muted-foreground text-xs">
                  Start for free today
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Enhanced Video Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6, ease: "easeOut" }}
          className="relative mx-auto max-w-6xl"
        >
          <div className="relative overflow-hidden rounded-2xl border border-gray-200 shadow-2xl shadow-blue-500/10 dark:border-gray-800">
            <div className="from-background/10 to-background/10 absolute inset-0 z-10 bg-gradient-to-t via-transparent" />
            <HeroVideoDialog
              animationStyle="top-in-bottom-out"
              videoSrc="https://www.youtube.com/embed/9yS0dR0kP-s"
              thumbnailSrc="/hero.png"
              thumbnailAlt="Reddit Lead Finder Dashboard Demo"
              className="w-full"
            />
          </div>

          {/* Enhanced Decorative elements */}
          <div className="absolute -left-6 -top-6 size-12 rounded-full bg-blue-500 opacity-60 blur-lg" />
          <div className="absolute -bottom-6 -right-6 size-16 rounded-full bg-purple-500 opacity-60 blur-lg" />
          <div className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-400 opacity-40 blur-sm" />
        </motion.div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
          className="mt-20 grid grid-cols-1 gap-8 md:grid-cols-3"
        >
          {[
            {
              number: "500+",
              label: "Active Users",
              sublabel: "Growing daily"
            },
            {
              number: "10k+",
              label: "Leads Generated",
              sublabel: "This month"
            },
            {
              number: "40%",
              label: "Avg. Conversion",
              sublabel: "Increase rate"
            }
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 + index * 0.1 }}
              className="text-center"
            >
              <div className="gradient-text text-4xl font-bold md:text-5xl">
                {stat.number}
              </div>
              <div className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                {stat.label}
              </div>
              <div className="text-muted-foreground text-sm">
                {stat.sublabel}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
