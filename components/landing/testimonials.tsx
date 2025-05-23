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
    name: "Emily Davis",
    role: "Sales Lead, Innovation Labs",
    content:
      "Finding quality leads used to take hours. Now it takes minutes, and the quality is actually better than manual research.",
    rating: 5,
    avatar: "👩‍🚀"
  }
]

export const TestimonialsSection = () => {
  return (
    <section className="bg-white py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-4xl font-bold text-gray-900">
            What Our Users Say
          </h2>
          <p className="mx-auto max-w-2xl text-xl text-gray-600">
            See how teams are using our AI-powered lead generation to grow their
            business
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.8,
                delay: index * 0.2,
                ease: "easeOut"
              }}
            >
              <Card className="h-full transition-shadow duration-300 hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="size-5 fill-current text-yellow-400"
                      />
                    ))}
                  </div>

                  <p className="mb-6 leading-relaxed text-gray-700">
                    "{testimonial.content}"
                  </p>

                  <div className="flex items-center">
                    <div className="mr-3 text-3xl">{testimonial.avatar}</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {testimonial.name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {testimonial.role}
                      </p>
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
