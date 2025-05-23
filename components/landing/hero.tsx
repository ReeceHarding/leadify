/*
<ai_context>
This client component provides the hero section for the landing page.
</ai_context>
*/

"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { ArrowRight, Sparkles, Target, TrendingUp } from "lucide-react"
import Link from "next/link"
import posthog from "posthog-js"
import AnimatedGradientText from "../magicui/animated-gradient-text"
import HeroVideoDialog from "../magicui/hero-video-dialog"

export const HeroSection = () => {
  const handleGetStartedClick = () => {
    posthog.capture("clicked_get_started")
  }

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/4 top-1/4 size-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 size-96 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="via-background/50 to-background absolute inset-0 bg-gradient-to-b from-transparent" />
      </div>

      <div className="container mx-auto max-w-7xl">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-8 flex justify-center"
        >
          <AnimatedGradientText className="glass rounded-full">
            <Target className="mr-2 size-4" />
            <hr className="mx-2 h-4 w-px shrink-0 bg-gray-300 dark:bg-gray-600" />
            <span className="gradient-text font-semibold">
              AI-Powered Lead Generation
            </span>
            <ArrowRight className="ml-2 size-4 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
          </AnimatedGradientText>
        </motion.div>

        {/* Main Content */}
        <div className="mb-16 space-y-8 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="text-5xl font-bold tracking-tight md:text-7xl lg:text-8xl"
          >
            Find High-Quality
            <span className="gradient-text block">Reddit Leads</span>
            <span className="text-muted-foreground mt-4 block text-3xl font-medium md:text-4xl lg:text-5xl">
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

          {/* Feature Pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="mx-auto flex max-w-2xl flex-wrap justify-center gap-4"
          >
            {[
              { icon: Sparkles, text: "AI-Powered Analysis" },
              { icon: Target, text: "High-Intent Detection" },
              { icon: TrendingUp, text: "Conversion Optimization" }
            ].map((item, index) => (
              <div
                key={index}
                className="glass flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium"
              >
                <item.icon className="text-primary size-4" />
                {item.text}
              </div>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            className="flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link href="/onboarding" onClick={handleGetStartedClick}>
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 group rounded-xl px-8 py-6 text-lg font-semibold shadow-lg transition-all duration-300 hover:shadow-xl"
              >
                Start Finding Leads
                <ArrowRight className="ml-2 size-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>

            <Button
              variant="outline"
              size="lg"
              className="hover:bg-muted/50 rounded-xl border-2 px-8 py-6 text-lg font-semibold transition-all duration-300"
            >
              Watch Demo
            </Button>
          </motion.div>

          {/* Social Proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
            className="text-muted-foreground flex flex-col items-center justify-center gap-8 text-sm sm:flex-row"
          >
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1">
                {[1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className="border-background size-8 rounded-full border-2 bg-gradient-to-r from-blue-500 to-purple-500"
                  />
                ))}
              </div>
              <span>Join 500+ marketers</span>
            </div>

            <div className="flex items-center gap-1">
              <span>⭐⭐⭐⭐⭐</span>
              <span>4.9/5 rating</span>
            </div>
          </motion.div>
        </div>

        {/* Video Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6, ease: "easeOut" }}
          className="relative mx-auto max-w-6xl"
        >
          <div className="border-border relative overflow-hidden rounded-2xl border shadow-2xl">
            <div className="from-background/20 absolute inset-0 z-10 bg-gradient-to-t to-transparent" />
            <HeroVideoDialog
              animationStyle="top-in-bottom-out"
              videoSrc="https://www.youtube.com/embed/9yS0dR0kP-s"
              thumbnailSrc="/hero.png"
              thumbnailAlt="Reddit Lead Finder Dashboard Demo"
              className="w-full"
            />
          </div>

          {/* Decorative elements */}
          <div className="absolute -left-4 -top-4 size-8 rounded-full bg-blue-500 blur-sm" />
          <div className="absolute -bottom-4 -right-4 size-12 rounded-full bg-purple-500 blur-sm" />
        </motion.div>
      </div>
    </section>
  )
}
