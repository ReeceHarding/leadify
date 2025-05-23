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
import { Star, Quote, Shield, Clock, TrendingUp, Award } from "lucide-react"

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Marketing Director",
    company: "TechFlow",
    companyLogo: "🚀",
    avatar: "/avatars/sarah.jpg",
    rating: 5,
    text: "Lead Finder transformed our Reddit strategy. We've generated 200+ qualified leads in just 3 months. The AI responses are incredibly natural and effective.",
    metric: "200+ leads generated",
    featured: true,
    verified: true
  },
  {
    name: "Marcus Rodriguez",
    role: "Growth Manager",
    company: "StartupBoost",
    companyLogo: "📈",
    avatar: "/avatars/marcus.jpg",
    rating: 5,
    text: "The quality of leads we get through Lead Finder is exceptional. Our conversion rate improved by 40% since we started using their AI-powered approach.",
    metric: "40% conversion boost",
    featured: false,
    verified: true
  },
  {
    name: "Emily Watson",
    role: "Founder",
    company: "DesignStudio",
    companyLogo: "🎨",
    avatar: "/avatars/emily.jpg",
    rating: 5,
    text: "I was skeptical about AI-generated responses, but Lead Finder proved me wrong. The personalization is spot-on and saves us 15+ hours per week.",
    metric: "15+ hours saved weekly",
    featured: true,
    verified: true
  },
  {
    name: "David Kim",
    role: "Sales Lead",
    company: "CloudScale",
    companyLogo: "☁️",
    avatar: "/avatars/david.jpg",
    rating: 5,
    text: "Finding high-intent prospects on Reddit used to be like finding a needle in a haystack. Lead Finder made it systematic and scalable.",
    metric: "3x faster prospecting",
    featured: false,
    verified: true
  },
  {
    name: "Lisa Thompson",
    role: "VP of Sales",
    company: "GrowthLabs",
    companyLogo: "🧪",
    avatar: "/avatars/lisa.jpg",
    rating: 5,
    text: "The ROI we've seen from Lead Finder is incredible. We're closing 25% more deals with prospects we find through the platform.",
    metric: "25% more closed deals",
    featured: true,
    verified: true
  },
  {
    name: "James Park",
    role: "Marketing Head",
    company: "InnovateCorp",
    companyLogo: "💡",
    avatar: "/avatars/james.jpg",
    rating: 5,
    text: "Lead Finder's AI understands context better than most humans. Our engagement rates on Reddit have never been higher.",
    metric: "Record engagement rates",
    featured: false,
    verified: true
  }
]

export const TestimonialsSection = () => {
  return (
    <section className="section-gradient section-padding relative overflow-hidden">
      {/* Background Pattern */}
      <div className="bg-grid absolute inset-0 opacity-30" />

      <div className="container-padding relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true }}
          className="mb-20 text-center"
        >
          <Badge className="glass shadow-glow mb-6 px-6 py-3 text-sm font-medium">
            <Star className="mr-2 size-4 fill-yellow-400 text-yellow-400" />
            <span className="text-gray-700 dark:text-gray-300">
              Trusted by 500+ Companies
            </span>
          </Badge>

          <h2 className="mb-6 text-4xl font-bold md:text-5xl lg:text-6xl">
            Loved by marketers
            <span className="gradient-text mt-2 block">worldwide</span>
          </h2>

          <p className="text-muted-foreground mx-auto max-w-3xl text-xl leading-relaxed">
            See how companies are using Lead Finder to transform their Reddit
            lead generation and achieve remarkable results
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                delay: index * 0.1,
                ease: "easeOut"
              }}
              viewport={{ once: true }}
              className="group"
            >
              <Card
                className={`
                shadow-glow hover:shadow-glow-lg h-full border-0 bg-white/80 backdrop-blur-sm transition-all duration-500 hover:-translate-y-2 dark:bg-gray-900/80
                ${testimonial.featured ? "shadow-blue-500/10 ring-2 ring-blue-500/20" : ""}
              `}
              >
                <CardContent className="space-y-6 p-8">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 text-xl dark:from-blue-950 dark:to-blue-900">
                        {testimonial.companyLogo}
                      </div>
                      <Quote className="text-primary/30 group-hover:text-primary/50 size-8 transition-colors" />
                    </div>
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
                  <blockquote className="text-foreground text-[15px] font-medium leading-relaxed">
                    "{testimonial.text}"
                  </blockquote>

                  {/* Metric Badge */}
                  <div className="flex items-center gap-2">
                    <TrendingUp className="size-4 text-green-600" />
                    <Badge
                      variant="secondary"
                      className="border-green-200 bg-green-50 font-medium text-green-700 dark:border-green-800 dark:bg-green-950/50 dark:text-green-300"
                    >
                      {testimonial.metric}
                    </Badge>
                  </div>

                  {/* Author Info */}
                  <div className="flex items-center gap-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                    <Avatar className="ring-offset-background size-14 ring-2 ring-blue-100 ring-offset-2 dark:ring-blue-900">
                      <AvatarImage
                        src={testimonial.avatar}
                        alt={testimonial.name}
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-lg font-bold text-white">
                        {testimonial.name
                          .split(" ")
                          .map(n => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                          {testimonial.name}
                        </h4>
                        {testimonial.verified && (
                          <div className="flex size-5 items-center justify-center rounded-full bg-blue-500 shadow-sm">
                            <svg
                              className="size-3 text-white"
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
                        {testimonial.featured && (
                          <Award className="size-4 fill-yellow-100 text-yellow-500" />
                        )}
                      </div>
                      <p className="text-muted-foreground text-sm font-medium">
                        {testimonial.role}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {testimonial.company}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Enhanced Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          viewport={{ once: true }}
          className="mt-20 text-center"
        >
          <div className="glass shadow-glow mx-auto max-w-4xl rounded-2xl p-8">
            <h3 className="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
              Join hundreds of companies already using Lead Finder
            </h3>
            <p className="text-muted-foreground mb-8 text-lg">
              Don't just take our word for it - see the results for yourself
            </p>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="flex items-center justify-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/20">
                <Shield className="size-5 text-green-600" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                  95% customer satisfaction
                </span>
              </div>
              <div className="flex items-center justify-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
                <Clock className="size-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Setup in under 5 minutes
                </span>
              </div>
              <div className="flex items-center justify-center gap-3 rounded-xl border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-950/20">
                <Award className="size-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  30-day money-back guarantee
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
