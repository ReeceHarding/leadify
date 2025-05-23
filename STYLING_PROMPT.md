# Next.js MVP Styling Prompt - Sleek & Modern

Based on mckays-app-template-4, create sleek and modern Next.js styling with these exact specifications:

## Core Tech Stack
- **Next.js 15** with App Router
- **Tailwind CSS** for styling
- **Shadcn/ui** components
- **Framer Motion** for minimal animations
- **Lucide React** for icons

## Design Philosophy
- **MVP Focus**: Core functionality only, no accessibility or performance optimization yet
- **High Quality**: Clean, professional, modern aesthetic
- **Minimal Animations**: Subtle, purposeful motion - NO overboard effects
- **Mobile-first**: Responsive but basic breakpoints

## Color System
Use CSS variables with Tailwind for theme support:
```css
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;
  --border: 240 5.9% 90%;
  --card: 0 0% 100%;
}

.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  --primary-foreground: 240 5.9% 10%;
  --muted: 240 3.7% 15.9%;
  --muted-foreground: 240 5% 64.9%;
  --border: 240 3.7% 15.9%;
  --card: 240 10% 3.9%;
}
```

## Typography Scale
- **Headings**: font-bold with text-4xl, text-3xl, text-2xl, text-xl
- **Body**: text-base (16px default)
- **Small**: text-sm (14px)
- **Spacing**: Use text-balance for headlines, max-w-2xl for content

## Animation Guidelines
**Keep animations minimal and purposeful:**

### Entry Animations (Framer Motion)
```tsx
// Basic fade-in
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.6, ease: "easeOut" }}

// Staggered elements
transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}

// Hover effects (subtle only)
whileHover={{ scale: 1.05 }}
transition={{ type: "spring", stiffness: 300 }}
```

### CSS Transitions
```css
/* Hover states */
transition-all duration-200 ease-out
hover:shadow-lg hover:scale-105

/* Color transitions */
transition-colors duration-200

/* Transform effects */
transform-gpu transition-transform duration-200
```

## Component Patterns

### Cards
```tsx
<Card className="group transition-shadow duration-200 hover:shadow-lg">
  <CardHeader>
    <Icon className="text-primary mb-2 size-12" />
    <CardTitle>{title}</CardTitle>
    <CardDescription>{description}</CardDescription>
  </CardHeader>
</Card>
```

### Buttons
```tsx
<Button className="bg-blue-500 hover:bg-blue-600 text-lg">
  <Icon className="mr-2 size-5" />
  Text &rarr;
</Button>
```

### Sections
```tsx
<section className="py-20 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
  <div className="container mx-auto px-4">
    <div className="mx-auto max-w-6xl">
      {/* Content */}
    </div>
  </div>
</section>
```

## Layout Structure

### Page Layout
```tsx
<div className="pb-20">
  <HeroSection />
  <FeaturesSection />
  <TestimonialsSection />
  <CTASection />
</div>
```

### Grid Systems
```tsx
// Feature grids
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

// Content grids  
<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
```

## Scrolling Animations
For testimonials and logos, use CSS-only infinite scroll:

```tsx
// Horizontal scroll container
<div className="overflow-hidden whitespace-nowrap">
  <div className="animate-scroll inline-flex space-x-8">
    {/* Items */}
  </div>
</div>

// CSS animation
@keyframes scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.animate-scroll {
  animation: scroll 30s linear infinite;
}
```

## Spacing System
- **Sections**: py-20 (80px vertical)
- **Components**: gap-8, gap-6, gap-4  
- **Content**: px-4 for container padding
- **Text**: space-y-6 for content blocks

## Component Library Priorities
1. **Cards** - Primary content containers
2. **Buttons** - Clear CTAs with icons
3. **Typography** - Consistent heading hierarchy
4. **Grid Layouts** - Responsive content organization
5. **Subtle Animations** - Entry effects and hover states

## Forbidden Patterns
- ❌ Complex scroll-triggered animations
- ❌ Heavy parallax effects  
- ❌ Accessibility attributes (MVP phase)
- ❌ Performance optimizations
- ❌ Multiple animation libraries
- ❌ Custom CSS beyond Tailwind

## Example Component Structure
```tsx
"use client"

import { motion } from "framer-motion"
import { Icon } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export const ExampleSection = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h2 className="text-4xl font-bold text-center mb-12">Section Title</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {items.map((item, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="transform-gpu"
              >
                <Card className="group transition-shadow duration-200 hover:shadow-lg">
                  <CardHeader>
                    <Icon className="text-primary mb-2 size-12" />
                    <CardTitle>{item.title}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
```

Remember: **LASER FOCUS** on core MVP functionality. Beautiful, modern, but minimal scope. 