/*
<ai_context>
This client component provides testimonials section for the landing page.
</ai_context>
*/

"use client"

import { motion } from "framer-motion"
import { Star } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Founder, TechStart",
    content:
      "This lead generation tool completely transformed how we find prospects on Reddit. We've seen a 300% increase in qualified leads.",
    rating: 5,
    avatar: "👩‍💼"
  },
  {
    name: "Mike Rodriguez",
    role: "Marketing Director, Growth Co",
    content:
      "The AI-generated comments are so natural and relevant. We've engaged with more potential customers in one month than the previous six.",
    rating: 5,
    avatar: "👨‍💻"
  },
  {
    name: "Alex Thompson",
    role: "CEO, StartupLabs",
    content:
      "Finally, a Reddit lead generation tool that actually works. The keyword targeting is incredibly accurate and saves us hours of manual work.",
    rating: 5,
    avatar: "👨‍💼"
  }
]

export function TestimonialsSection() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter text-gray-900 sm:text-5xl dark:text-gray-100">
              What Our Users Say
            </h2>
            <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
              Join thousands of businesses already using our Reddit lead
              generation platform
            </p>
          </div>
        </div>

        <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="flex h-full flex-col justify-between">
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center space-x-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="size-4 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>
                  <blockquote className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                    "{testimonial.content}"
                  </blockquote>
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{testimonial.avatar}</div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {testimonial.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {testimonial.role}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
