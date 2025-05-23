/*
<ai_context>
This client component provides a scrolling logo carousel for the landing page.
</ai_context>
*/

"use client"

import { motion } from "framer-motion"

const companies = [
  { name: "TechFlow", logo: "🚀" },
  { name: "StartupBoost", logo: "⚡" },
  { name: "DesignStudio", logo: "🎨" },
  { name: "CloudScale", logo: "☁️" },
  { name: "GrowthLabs", logo: "📈" },
  { name: "InnovateCorp", logo: "💡" },
  { name: "DataDriven", logo: "📊" },
  { name: "MarketPro", logo: "🎯" },
  { name: "NextGen", logo: "🌟" },
  { name: "ScaleUp", logo: "📊" },
  { name: "Velocity", logo: "⚡" },
  { name: "Zenith", logo: "🏔️" }
]

export const LogoCarousel = () => {
  // Duplicate the array to create seamless infinite scroll
  const duplicatedCompanies = [...companies, ...companies]

  return (
    <section className="border-border bg-muted/20 border-y py-16">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <p className="text-muted-foreground mb-4 text-sm font-medium">
            Trusted by innovative companies worldwide
          </p>
        </motion.div>

        {/* Infinite Scroll Container */}
        <div className="relative overflow-hidden">
          <div className="animate-scroll flex space-x-12">
            {duplicatedCompanies.map((company, index) => (
              <motion.div
                key={`${company.name}-${index}`}
                className="bg-card/50 border-border/50 flex min-w-fit shrink-0 items-center gap-3 rounded-xl border px-6 py-4 shadow-sm backdrop-blur-sm"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <span className="text-2xl">{company.logo}</span>
                <span className="text-foreground whitespace-nowrap font-semibold">
                  {company.name}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Gradient Overlays */}
          <div className="from-background absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r to-transparent" />
          <div className="from-background absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l to-transparent" />
        </div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          viewport={{ once: true }}
          className="mt-12 flex flex-wrap items-center justify-center gap-8 text-center"
        >
          <div>
            <div className="text-primary text-2xl font-bold">500+</div>
            <div className="text-muted-foreground text-sm">Companies</div>
          </div>
          <div className="bg-border h-8 w-px" />
          <div>
            <div className="text-primary text-2xl font-bold">10k+</div>
            <div className="text-muted-foreground text-sm">Leads Generated</div>
          </div>
          <div className="bg-border h-8 w-px" />
          <div>
            <div className="text-primary text-2xl font-bold">95%</div>
            <div className="text-muted-foreground text-sm">
              Satisfaction Rate
            </div>
          </div>
          <div className="bg-border h-8 w-px" />
          <div>
            <div className="text-primary text-2xl font-bold">24/7</div>
            <div className="text-muted-foreground text-sm">AI Monitoring</div>
          </div>
        </motion.div>
      </div>

      {/* Add CSS for infinite scroll animation */}
      <style jsx>{`
        .animate-scroll {
          animation: scroll 30s linear infinite;
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
      `}</style>
    </section>
  )
}
