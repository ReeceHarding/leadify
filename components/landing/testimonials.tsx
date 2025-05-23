/*
<ai_context>
This client component provides testimonials section for the landing page.
</ai_context>
*/

"use client"

import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Star, Quote } from "lucide-react"

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Marketing Director",
    company: "TechFlow",
    avatar: "/avatars/sarah.jpg",
    rating: 5,
    text: "Lead Finder transformed our Reddit strategy. We've generated 200+ qualified leads in just 3 months. The AI responses are incredibly natural and effective.",
    metric: "200+ leads",
    verified: true
  },
  {
    name: "Marcus Rodriguez",
    role: "Growth Manager",
    company: "StartupBoost",
    avatar: "/avatars/marcus.jpg",
    rating: 5,
    text: "The quality of leads we get through Lead Finder is exceptional. Our conversion rate improved by 40% since we started using their AI-powered approach.",
    metric: "40% improvement",
    verified: true
  },
  {
    name: "Emily Watson",
    role: "Founder",
    company: "DesignStudio",
    avatar: "/avatars/emily.jpg",
    rating: 5,
    text: "I was skeptical about AI-generated responses, but Lead Finder proved me wrong. The personalization is spot-on and saves us 15+ hours per week.",
    metric: "15+ hours saved",
    verified: true
  },
  {
    name: "David Kim",
    role: "Sales Lead",
    company: "CloudScale",
    avatar: "/avatars/david.jpg",
    rating: 5,
    text: "Finding high-intent prospects on Reddit used to be like finding a needle in a haystack. Lead Finder made it systematic and scalable.",
    metric: "3x faster prospecting",
    verified: true
  },
  {
    name: "Lisa Thompson",
    role: "VP of Sales",
    company: "GrowthLabs",
    avatar: "/avatars/lisa.jpg",
    rating: 5,
    text: "The ROI we've seen from Lead Finder is incredible. We're closing 25% more deals with prospects we find through the platform.",
    metric: "25% more deals",
    verified: true
  },
  {
    name: "James Park",
    role: "Marketing Head",
    company: "InnovateCorp",
    avatar: "/avatars/james.jpg",
    rating: 5,
    text: "Lead Finder's AI understands context better than most humans. Our engagement rates on Reddit have never been higher.",
    metric: "Higher engagement",
    verified: true
  }
]

export const TestimonialsSection = () => {
  return (
    <section className="from-background to-muted/20 bg-gradient-to-b py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <Badge variant="outline" className="mb-4 px-4 py-2">
            <Star className="mr-2 size-4 fill-yellow-400 text-yellow-400" />
            Trusted by 500+ Companies
          </Badge>

          <h2 className="mb-6 text-4xl font-bold md:text-5xl">
            Loved by marketers
            <span className="gradient-text block">worldwide</span>
          </h2>

          <p className="text-muted-foreground mx-auto max-w-2xl text-xl">
            See how companies are using Lead Finder to transform their Reddit
            lead generation
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                delay: index * 0.1,
                ease: "easeOut"
              }}
              viewport={{ once: true }}
            >
              <Card className="card-hover bg-card/50 h-full border-0 shadow-sm backdrop-blur-sm">
                <CardContent className="space-y-4 p-6">
                  {/* Quote Icon */}
                  <div className="flex items-start justify-between">
                    <Quote className="text-primary/20 size-8" />
                    <div className="flex items-center gap-1">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star
                          key={i}
                          className="size-4 fill-yellow-400 text-yellow-400"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Testimonial Text */}
                  <blockquote className="text-foreground leading-relaxed">
                    "{testimonial.text}"
                  </blockquote>

                  {/* Metric Badge */}
                  <Badge variant="secondary" className="w-fit">
                    {testimonial.metric}
                  </Badge>

                  {/* Author Info */}
                  <div className="flex items-center gap-3 pt-2">
                    <Avatar className="size-12">
                      <AvatarImage
                        src={testimonial.avatar}
                        alt={testimonial.name}
                      />
                      <AvatarFallback className="from-primary to-primary/80 text-primary-foreground bg-gradient-to-br font-semibold">
                        {testimonial.name
                          .split(" ")
                          .map(n => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold">
                          {testimonial.name}
                        </h4>
                        {testimonial.verified && (
                          <div className="flex size-4 items-center justify-center rounded-full bg-blue-500">
                            <svg
                              className="size-2.5 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {testimonial.role} at {testimonial.company}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <p className="text-muted-foreground mb-6">
            Join hundreds of companies already using Lead Finder
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Badge variant="outline" className="px-4 py-2">
              🚀 95% customer satisfaction
            </Badge>
            <Badge variant="outline" className="px-4 py-2">
              ⚡ Setup in under 5 minutes
            </Badge>
            <Badge variant="outline" className="px-4 py-2">
              💰 30-day money-back guarantee
            </Badge>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
