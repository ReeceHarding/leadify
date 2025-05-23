/*
<ai_context>
This client component provides a scrolling testimonials section for the landing page.
</ai_context>
*/

"use client"

import { motion } from "framer-motion"
import { Star } from "lucide-react"

const testimonials = [
  {
    name: "Sarah Johnson",
    company: "TechCorp",
    content:
      "This template saved us weeks of development time. Incredible quality.",
    rating: 5
  },
  {
    name: "Mike Chen",
    company: "StartupXYZ",
    content: "Clean code, modern design. Everything we needed to get started.",
    rating: 5
  },
  {
    name: "Emma Davis",
    company: "DesignStudio",
    content: "The best Next.js template I've used. Highly recommended.",
    rating: 5
  },
  {
    name: "Alex Rivera",
    company: "DevAgency",
    content: "Perfect for rapid prototyping. Great documentation too.",
    rating: 5
  },
  {
    name: "Lisa Park",
    company: "CloudTech",
    content: "Saved our team countless hours. Worth every penny.",
    rating: 5
  }
]

// Duplicate testimonials for seamless scroll
const scrollingTestimonials = [...testimonials, ...testimonials]

export const TestimonialsSection = () => {
  return (
    <section className="overflow-hidden bg-black py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-12 text-center"
        >
          <h2 className="mb-4 text-4xl font-bold">What Our Users Say</h2>
          <p className="text-muted-foreground mx-auto max-w-2xl text-xl">
            Join thousands of developers who trust our template
          </p>
        </motion.div>

        {/* Scrolling testimonials container */}
        <div className="relative">
          <div className="overflow-hidden whitespace-nowrap">
            <div className="animate-scroll-slow inline-flex space-x-6 hover:[animation-play-state:paused]">
              {scrollingTestimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="bg-card inline-block w-80 whitespace-normal rounded-lg border p-6 shadow-sm"
                >
                  <div className="mb-3 flex">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="size-4 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4 line-clamp-3 text-sm">
                    "{testimonial.content}"
                  </p>
                  <div>
                    <p className="text-sm font-semibold">{testimonial.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {testimonial.company}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gradient overlays for fade effect */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-black to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-black to-transparent" />
        </div>
      </div>
    </section>
  )
}
