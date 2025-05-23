/*
<ai_context>
This server page displays pricing options for the product, integrating Stripe payment links.
</ai_context>
*/

"use server"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { auth } from "@clerk/nextjs/server"
import {
  Check,
  Star,
  Zap,
  Target,
  TrendingUp,
  Crown,
  Rocket,
  Shield,
  Clock,
  Users
} from "lucide-react"

const pricingPlans = [
  {
    name: "Starter",
    price: "$29",
    period: "month",
    description: "Perfect for individuals and small teams getting started",
    popular: false,
    featured: false,
    features: [
      "Up to 5 keywords tracked",
      "Daily Reddit monitoring",
      "50 AI responses per month",
      "Basic analytics dashboard",
      "Email support",
      "Standard response templates"
    ],
    link: process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_MONTHLY || "#",
    color: "blue"
  },
  {
    name: "Professional",
    price: "$79",
    period: "month",
    description: "For growing businesses that need advanced features",
    popular: true,
    featured: true,
    features: [
      "Up to 25 keywords tracked",
      "24/7 Reddit monitoring",
      "500 AI responses per month",
      "Advanced analytics & insights",
      "Voice analysis (Reddit style matching)",
      "Priority support & onboarding",
      "Custom response templates",
      "Campaign performance tracking"
    ],
    link: process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_YEARLY || "#",
    color: "purple"
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "month",
    description: "For large teams with advanced requirements",
    popular: false,
    featured: false,
    features: [
      "Unlimited keywords tracked",
      "Real-time monitoring & alerts",
      "Unlimited AI responses",
      "White-label solution",
      "Advanced integrations (Slack, CRM)",
      "Dedicated account manager",
      "Custom AI training & fine-tuning",
      "API access & webhooks"
    ],
    link: "#",
    color: "orange"
  }
]

const valueProps = [
  {
    icon: Target,
    title: "AI-Powered Precision",
    description:
      "Advanced AI identifies high-intent prospects with 95% accuracy, saving you hours of manual searching.",
    color: "blue"
  },
  {
    icon: Zap,
    title: "Instant Response Generation",
    description:
      "Generate personalized, authentic responses in seconds that match your brand voice and convert prospects.",
    color: "green"
  },
  {
    icon: TrendingUp,
    title: "Proven Results",
    description:
      "Average 40% increase in qualified leads and 25% improvement in conversion rates within 30 days.",
    color: "purple"
  }
]

export default async function PricingPage() {
  const { userId } = await auth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950">
      <div className="section-padding">
        <div className="container-padding">
          {/* Enhanced Header */}
          <div className="mb-20 text-center">
            <Badge className="glass shadow-glow mb-6 px-6 py-3 text-sm font-medium">
              <Star className="mr-2 size-4 fill-yellow-400 text-yellow-400" />
              <span className="text-gray-700 dark:text-gray-300">
                Simple, Transparent Pricing
              </span>
            </Badge>

            <h1 className="mb-6 text-4xl font-bold md:text-5xl lg:text-6xl">
              Choose Your
              <span className="gradient-text mt-2 block">
                Lead Generation Plan
              </span>
            </h1>

            <p className="text-muted-foreground mx-auto max-w-3xl text-xl leading-relaxed">
              Start finding qualified leads on Reddit today with our AI-powered
              platform. No setup fees, cancel anytime, and get results from day
              one.
            </p>
          </div>

          {/* Enhanced Pricing Cards */}
          <div className="mx-auto mb-20 grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-3">
            {pricingPlans.map((plan, index) => (
              <PricingCard
                key={plan.name}
                plan={plan}
                userId={userId}
                index={index}
              />
            ))}
          </div>

          {/* Enhanced Value Proposition */}
          <div className="mb-20 text-center">
            <h2 className="mb-12 text-3xl font-bold text-gray-900 md:text-4xl dark:text-gray-100">
              Why Choose Lead Finder?
            </h2>

            <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
              {valueProps.map((prop, index) => (
                <Card
                  key={index}
                  className="shadow-glow hover:shadow-glow-lg border-0 bg-gradient-to-br from-white to-gray-50/50 transition-all duration-300 hover:-translate-y-1 dark:from-gray-900 dark:to-gray-800/50"
                >
                  <CardContent className="p-8 text-center">
                    <div
                      className={`
                      mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl shadow-lg
                      ${prop.color === "blue" ? "bg-blue-100 dark:bg-blue-950" : ""}
                      ${prop.color === "green" ? "bg-green-100 dark:bg-green-950" : ""}
                      ${prop.color === "purple" ? "bg-purple-100 dark:bg-purple-950" : ""}
                    `}
                    >
                      <prop.icon
                        className={`
                        size-8
                        ${prop.color === "blue" ? "text-blue-600" : ""}
                        ${prop.color === "green" ? "text-green-600" : ""}
                        ${prop.color === "purple" ? "text-purple-600" : ""}
                      `}
                      />
                    </div>
                    <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">
                      {prop.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {prop.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Enhanced Trust Indicators */}
          <Card className="shadow-glow relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
            <div className="absolute right-0 top-0 size-32 -translate-y-16 translate-x-16 rounded-full bg-blue-500/10" />
            <CardContent className="relative p-12 text-center">
              <h3 className="mb-8 text-2xl font-bold text-gray-900 dark:text-gray-100">
                Trusted by 500+ Growing Businesses
              </h3>

              <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <Shield className="size-5 text-green-600" />
                    <span className="text-2xl font-bold text-green-600">
                      95%
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Customer Satisfaction
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="size-5 text-blue-600" />
                    <span className="text-2xl font-bold text-blue-600">
                      5min
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Setup Time
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <TrendingUp className="size-5 text-purple-600" />
                    <span className="text-2xl font-bold text-purple-600">
                      40%
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Lead Increase
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <Users className="size-5 text-orange-600" />
                    <span className="text-2xl font-bold text-orange-600">
                      30d
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Money-Back Guarantee
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

interface PricingCardProps {
  plan: (typeof pricingPlans)[0]
  userId: string | null
  index: number
}

function PricingCard({ plan, userId, index }: PricingCardProps) {
  const finalButtonLink =
    userId && plan.link !== "#"
      ? `${plan.link}?client_reference_id=${userId}`
      : plan.link

  return (
    <Card
      className={cn(
        "shadow-glow hover:shadow-glow-lg relative flex h-full flex-col border-0 bg-gradient-to-br from-white to-gray-50/50 transition-all duration-500 hover:-translate-y-2 dark:from-gray-900 dark:to-gray-800/50",
        plan.popular &&
          "scale-105 shadow-purple-500/10 ring-2 ring-purple-500/20",
        plan.featured &&
          "bg-gradient-to-br from-purple-600 via-purple-700 to-blue-700 text-white"
      )}
    >
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 z-10 -translate-x-1/2">
          <Badge className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-2 text-sm font-semibold text-white shadow-lg">
            <Crown className="mr-1 size-4" />
            Most Popular
          </Badge>
        </div>
      )}

      <CardHeader
        className={cn("pb-8 text-center", plan.featured ? "text-white" : "")}
      >
        <div className="space-y-4">
          <div
            className={cn(
              "mx-auto flex size-16 items-center justify-center rounded-2xl shadow-lg",
              plan.featured
                ? "bg-white/20 backdrop-blur-sm"
                : plan.color === "blue"
                  ? "bg-blue-100 dark:bg-blue-950"
                  : plan.color === "orange"
                    ? "bg-orange-100 dark:bg-orange-950"
                    : "bg-purple-100 dark:bg-purple-950"
            )}
          >
            {plan.name === "Starter" && (
              <Rocket
                className={cn(
                  "size-8",
                  plan.featured ? "text-white" : "text-blue-600"
                )}
              />
            )}
            {plan.name === "Professional" && (
              <Crown
                className={cn(
                  "size-8",
                  plan.featured ? "text-white" : "text-purple-600"
                )}
              />
            )}
            {plan.name === "Enterprise" && (
              <Shield
                className={cn(
                  "size-8",
                  plan.featured ? "text-white" : "text-orange-600"
                )}
              />
            )}
          </div>

          <CardTitle
            className={cn(
              "text-2xl font-bold",
              plan.featured ? "text-white" : "text-gray-900 dark:text-gray-100"
            )}
          >
            {plan.name}
          </CardTitle>

          <CardDescription
            className={cn(
              "text-base leading-relaxed",
              plan.featured ? "text-white/90" : "text-muted-foreground"
            )}
          >
            {plan.description}
          </CardDescription>

          <div className="pt-4">
            <div className="flex items-baseline justify-center gap-2">
              <span
                className={cn(
                  "text-5xl font-bold",
                  plan.featured
                    ? "text-white"
                    : "text-gray-900 dark:text-gray-100"
                )}
              >
                {plan.price}
              </span>
              {plan.price !== "Custom" && (
                <span
                  className={cn(
                    "text-lg",
                    plan.featured ? "text-white/80" : "text-muted-foreground"
                  )}
                >
                  /{plan.period}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 px-8">
        <ul className="space-y-4">
          {plan.features.map((feature, i) => (
            <li key={i} className="flex items-start gap-3">
              <Check
                className={cn(
                  "mt-0.5 size-5 shrink-0",
                  plan.featured ? "text-white" : "text-green-600"
                )}
              />
              <span
                className={cn(
                  "font-medium leading-relaxed",
                  plan.featured
                    ? "text-white/90"
                    : "text-gray-700 dark:text-gray-300"
                )}
              >
                {feature}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="px-8 pt-8">
        <Button
          className={cn(
            "h-12 w-full text-lg font-semibold shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl",
            plan.featured
              ? "bg-white text-purple-700 hover:bg-gray-50"
              : plan.popular
                ? "bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800"
                : "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800"
          )}
          asChild
        >
          <a
            href={finalButtonLink}
            className={cn(
              "inline-flex items-center justify-center",
              finalButtonLink === "#" && "pointer-events-none opacity-50"
            )}
          >
            {plan.price === "Custom" ? (
              <>
                <Shield className="mr-2 size-5" />
                Contact Sales
              </>
            ) : (
              <>
                <Rocket className="mr-2 size-5" />
                Get {plan.name}
              </>
            )}
          </a>
        </Button>
      </CardFooter>
    </Card>
  )
}
