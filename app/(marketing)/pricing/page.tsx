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
import { Check, Star, Zap, Target, TrendingUp } from "lucide-react"

const pricingPlans = [
  {
    name: "Starter",
    price: "$29",
    period: "month",
    description: "Perfect for individuals and small teams",
    popular: false,
    features: [
      "Up to 5 keywords",
      "Daily Reddit monitoring",
      "50 AI responses/month",
      "Basic analytics",
      "Email support"
    ],
    link: process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_MONTHLY || "#"
  },
  {
    name: "Professional",
    price: "$79",
    period: "month",
    description: "For growing businesses that need more reach",
    popular: true,
    features: [
      "Up to 25 keywords",
      "24/7 Reddit monitoring",
      "500 AI responses/month",
      "Advanced analytics",
      "Voice analysis (Reddit)",
      "Priority support",
      "Custom templates"
    ],
    link: process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_YEARLY || "#"
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "month",
    description: "For large teams with advanced needs",
    popular: false,
    features: [
      "Unlimited keywords",
      "Real-time monitoring",
      "Unlimited AI responses",
      "White-label solution",
      "Advanced integrations",
      "Dedicated manager",
      "Custom AI training"
    ],
    link: "#"
  }
]

export default async function PricingPage() {
  const { userId } = await auth()

  return (
    <div className="from-background to-muted/20 bg-gradient-to-b py-24">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-16 text-center">
          <Badge variant="outline" className="mb-4 px-4 py-2">
            <Star className="mr-2 size-4 fill-yellow-400 text-yellow-400" />
            Simple, Transparent Pricing
          </Badge>

          <h1 className="mb-6 text-4xl font-bold md:text-5xl">
            Choose Your
            <span className="gradient-text block">Lead Generation Plan</span>
          </h1>

          <p className="text-muted-foreground mx-auto max-w-2xl text-xl">
            Start finding qualified leads on Reddit today. No setup fees, cancel
            anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
          {pricingPlans.map((plan, index) => (
            <PricingCard
              key={plan.name}
              plan={plan}
              userId={userId}
              index={index}
            />
          ))}
        </div>

        {/* Features Comparison */}
        <div className="mt-20 text-center">
          <h2 className="mb-8 text-2xl font-bold">Why Choose Lead Finder?</h2>

          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-3">
            <div className="space-y-4 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-blue-500/10">
                <Target className="size-6 text-blue-600" />
              </div>
              <h3 className="font-semibold">AI-Powered Detection</h3>
              <p className="text-muted-foreground text-sm">
                Advanced AI identifies high-intent prospects with 95% accuracy
              </p>
            </div>

            <div className="space-y-4 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-green-500/10">
                <Zap className="size-6 text-green-600" />
              </div>
              <h3 className="font-semibold">Instant Responses</h3>
              <p className="text-muted-foreground text-sm">
                Generate personalized responses in seconds, not hours
              </p>
            </div>

            <div className="space-y-4 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-purple-500/10">
                <TrendingUp className="size-6 text-purple-600" />
              </div>
              <h3 className="font-semibold">Proven Results</h3>
              <p className="text-muted-foreground text-sm">
                Average 40% increase in qualified leads within 30 days
              </p>
            </div>
          </div>
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
        "card-hover relative flex h-full flex-col",
        plan.popular && "border-primary scale-105 shadow-lg"
      )}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground px-4 py-1">
            Most Popular
          </Badge>
        </div>
      )}

      <CardHeader className="pb-6 text-center">
        <CardTitle className="text-2xl">{plan.name}</CardTitle>
        <CardDescription className="text-base">
          {plan.description}
        </CardDescription>

        <div className="pt-4">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-bold">{plan.price}</span>
            {plan.price !== "Custom" && (
              <span className="text-muted-foreground">/{plan.period}</span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        <ul className="space-y-3">
          {plan.features.map((feature, i) => (
            <li key={i} className="flex items-center gap-3">
              <Check className="size-4 shrink-0 text-green-600" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="pt-6">
        <Button
          className={cn(
            "h-11 w-full font-semibold",
            plan.popular && "bg-primary hover:bg-primary/90"
          )}
          variant={plan.popular ? "default" : "outline"}
          asChild
        >
          <a
            href={finalButtonLink}
            className={cn(
              "inline-flex items-center justify-center",
              finalButtonLink === "#" && "pointer-events-none opacity-50"
            )}
          >
            {plan.price === "Custom" ? "Contact Sales" : `Get ${plan.name}`}
          </a>
        </Button>
      </CardFooter>
    </Card>
  )
}
