/*
<ai_context>
This client component provides a scrolling logo carousel for the landing page.
</ai_context>
*/

"use client"

import { motion } from "framer-motion"

const logos = [
  { name: "TechCorp", logo: "🏢" },
  { name: "StartupXYZ", logo: "🚀" },
  { name: "DesignStudio", logo: "🎨" },
  { name: "DevAgency", logo: "💻" },
  { name: "CloudTech", logo: "☁️" },
  { name: "DataFlow", logo: "📊" },
  { name: "BuildCo", logo: "🏗️" },
  { name: "CodeCraft", logo: "⚡" }
]

// Duplicate logos for seamless scroll
const scrollingLogos = [...logos, ...logos]

export const LogoCarousel = () => {
  return (
    <section className="bg-gray-50 py-12 dark:bg-black">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-8 text-center"
        >
          <p className="text-muted-foreground text-sm uppercase tracking-wider">
            Trusted by leading companies
          </p>
        </motion.div>

        {/* Scrolling logos container */}
        <div className="relative">
          <div className="overflow-hidden whitespace-nowrap">
            <div className="animate-scroll-fast inline-flex items-center space-x-12 hover:[animation-play-state:paused]">
              {scrollingLogos.map((company, index) => (
                <div
                  key={index}
                  className="inline-flex items-center space-x-3 px-4 py-2 transition-opacity hover:opacity-70"
                >
                  <span className="text-2xl">{company.logo}</span>
                  <span className="text-muted-foreground whitespace-nowrap text-lg font-semibold">
                    {company.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Gradient overlays for fade effect */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-gray-50 to-transparent dark:from-black" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-gray-50 to-transparent dark:from-black" />
        </div>
      </div>
    </section>
  )
}
