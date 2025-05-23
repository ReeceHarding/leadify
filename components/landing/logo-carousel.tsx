/*
<ai_context>
This client component provides a scrolling logo carousel for the landing page.
</ai_context>
*/

"use client"

import { motion } from "framer-motion"
import { Building2, Users, Target, Zap, TrendingUp } from "lucide-react"

const companies = [
  { name: "TechFlow", logo: "🚀", industry: "SaaS" },
  { name: "StartupBoost", logo: "⚡", industry: "Consulting" },
  { name: "DesignStudio", logo: "🎨", industry: "Design" },
  { name: "CloudScale", logo: "☁️", industry: "Cloud" },
  { name: "GrowthLabs", logo: "📈", industry: "Marketing" },
  { name: "InnovateCorp", logo: "💡", industry: "Tech" },
  { name: "DataDriven", logo: "📊", industry: "Analytics" },
  { name: "MarketPro", logo: "🎯", industry: "Marketing" },
  { name: "NextGen", logo: "🌟", industry: "Innovation" },
  { name: "ScaleUp", logo: "📈", industry: "Growth" },
  { name: "Velocity", logo: "⚡", industry: "Performance" },
  { name: "Zenith", logo: "🏔️", industry: "Enterprise" }
]

const stats = [
  {
    icon: Building2,
    value: "500+",
    label: "Companies",
    color: "blue"
  },
  {
    icon: Target,
    value: "10k+",
    label: "Leads Generated",
    color: "green"
  },
  {
    icon: Users,
    value: "95%",
    label: "Satisfaction Rate",
    color: "purple"
  },
  {
    icon: Zap,
    value: "24/7",
    label: "AI Monitoring",
    color: "orange"
  }
]

export const LogoCarousel = () => {
  // Duplicate the array to create seamless infinite scroll
  const duplicatedCompanies = [...companies, ...companies]

  return (
    <section className="section-gradient relative overflow-hidden py-20">
      {/* Background Elements */}
      <div className="bg-dots absolute inset-0 opacity-20" />

      <div className="container-padding relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <h2 className="mb-3 text-2xl font-bold text-gray-900 dark:text-gray-100">
            Trusted by innovative companies worldwide
          </h2>
          <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
            Join the growing community of businesses that have transformed their
            lead generation with AI
          </p>
        </motion.div>

        {/* Enhanced Infinite Scroll Container */}
        <div className="relative mb-16 overflow-hidden">
          <div className="animate-scroll flex space-x-8">
            {duplicatedCompanies.map((company, index) => (
              <motion.div
                key={`${company.name}-${index}`}
                className="glass shadow-glow hover:shadow-glow-lg group flex min-w-fit shrink-0 cursor-pointer items-center gap-4 rounded-2xl px-8 py-6 transition-all duration-300"
                whileHover={{ scale: 1.05, y: -2 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 text-2xl transition-transform group-hover:scale-110 dark:from-blue-950 dark:to-blue-900">
                  {company.logo}
                </div>
                <div className="text-left">
                  <div className="text-foreground whitespace-nowrap text-lg font-bold">
                    {company.name}
                  </div>
                  <div className="text-muted-foreground text-sm font-medium">
                    {company.industry}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Enhanced Gradient Overlays */}
          <div className="from-background via-background/80 absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r to-transparent" />
          <div className="from-background via-background/80 absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l to-transparent" />
        </div>

        {/* Enhanced Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          viewport={{ once: true }}
          className="glass shadow-glow rounded-2xl p-8"
        >
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                viewport={{ once: true }}
                className="group text-center"
              >
                <div
                  className={`
                  mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-110
                  ${stat.color === "blue" ? "bg-blue-50 dark:bg-blue-950/50" : ""}
                  ${stat.color === "green" ? "bg-green-50 dark:bg-green-950/50" : ""}
                  ${stat.color === "purple" ? "bg-purple-50 dark:bg-purple-950/50" : ""}
                  ${stat.color === "orange" ? "bg-orange-50 dark:bg-orange-950/50" : ""}
                `}
                >
                  <stat.icon
                    className={`
                    size-8
                    ${stat.color === "blue" ? "text-blue-600" : ""}
                    ${stat.color === "green" ? "text-green-600" : ""}
                    ${stat.color === "purple" ? "text-purple-600" : ""}
                    ${stat.color === "orange" ? "text-orange-600" : ""}
                  `}
                  />
                </div>
                <div className="gradient-text mb-2 text-3xl font-bold transition-transform group-hover:scale-105">
                  {stat.value}
                </div>
                <div className="text-muted-foreground font-medium">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Success Stories Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-green-100/50 p-6 dark:border-green-800 dark:from-green-950/20 dark:to-green-900/20">
              <TrendingUp className="mx-auto mb-3 size-8 text-green-600" />
              <div className="mb-1 text-2xl font-bold text-green-700 dark:text-green-300">
                40%
              </div>
              <div className="text-sm font-medium text-green-600 dark:text-green-400">
                Average conversion increase
              </div>
            </div>
            <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 dark:border-blue-800 dark:from-blue-950/20 dark:to-blue-900/20">
              <Target className="mx-auto mb-3 size-8 text-blue-600" />
              <div className="mb-1 text-2xl font-bold text-blue-700 dark:text-blue-300">
                15hrs
              </div>
              <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                Weekly time saved on average
              </div>
            </div>
            <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 p-6 dark:border-purple-800 dark:from-purple-950/20 dark:to-purple-900/20">
              <Users className="mx-auto mb-3 size-8 text-purple-600" />
              <div className="mb-1 text-2xl font-bold text-purple-700 dark:text-purple-300">
                200+
              </div>
              <div className="text-sm font-medium text-purple-600 dark:text-purple-400">
                Qualified leads per month
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Enhanced CSS for infinite scroll animation */}
      <style jsx>{`
        .animate-scroll {
          animation: scroll 40s linear infinite;
        }

        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .animate-scroll:hover {
          animation-play-state: paused;
        }

        /* Smooth animation on page load */
        @media (prefers-reduced-motion: no-preference) {
          .animate-scroll {
            animation-timing-function: linear;
          }
        }
      `}</style>
    </section>
  )
}
