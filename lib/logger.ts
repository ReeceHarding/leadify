/*
<ai_context>
Logger utility that wraps console methods with timestamp, environment, and emoji prefixes.
Can be silenced in production.
</ai_context>
*/

type LogLevel = "debug" | "info" | "warn" | "error"

interface LoggerOptions {
  prefix?: string
  emoji?: string
  timestamp?: boolean
}

class Logger {
  private isDevelopment = process.env.NODE_ENV !== "production"
  private prefix: string
  private emoji: string
  private showTimestamp: boolean

  constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix || ""
    this.emoji = options.emoji || ""
    this.showTimestamp = options.timestamp !== false
  }

  private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    const parts: string[] = []
    
    if (this.showTimestamp) {
      parts.push(`[${new Date().toISOString()}]`)
    }
    
    if (this.emoji) {
      parts.push(this.emoji)
    }
    
    if (this.prefix) {
      parts.push(`[${this.prefix}]`)
    }
    
    parts.push(message)
    
    return parts.join(" ")
  }

  debug(message: string, ...args: any[]) {
    if (!this.isDevelopment) return
    console.log(this.formatMessage("debug", message), ...args)
  }

  info(message: string, ...args: any[]) {
    console.log(this.formatMessage("info", message), ...args)
  }

  warn(message: string, ...args: any[]) {
    console.warn(this.formatMessage("warn", message), ...args)
  }

  error(message: string, ...args: any[]) {
    console.error(this.formatMessage("error", message), ...args)
  }

  // Create a child logger with additional prefix
  child(prefix: string, emoji?: string): Logger {
    return new Logger({
      prefix: this.prefix ? `${this.prefix}:${prefix}` : prefix,
      emoji: emoji || this.emoji,
      timestamp: this.showTimestamp
    })
  }
}

// Pre-configured loggers for different modules
export const logger = new Logger()

export const loggers = {
  api: new Logger({ prefix: "API", emoji: "🌐" }),
  db: new Logger({ prefix: "DB", emoji: "🗄️" }),
  auth: new Logger({ prefix: "AUTH", emoji: "🔐" }),
  reddit: new Logger({ prefix: "REDDIT", emoji: "🤖" }),
  openai: new Logger({ prefix: "OPENAI", emoji: "🤖" }),
  warmup: new Logger({ prefix: "WARMUP", emoji: "🔥" }),
  leadGen: new Logger({ prefix: "LEAD-GEN", emoji: "🔍" }),
  keywords: new Logger({ prefix: "KEYWORDS", emoji: "🔑" }),
  twitter: new Logger({ prefix: "TWITTER", emoji: "🐦" }),
  stripe: new Logger({ prefix: "STRIPE", emoji: "💳" }),
  firebase: new Logger({ prefix: "FIREBASE", emoji: "🔥" }),
  queue: new Logger({ prefix: "QUEUE", emoji: "📋" }),
  scraper: new Logger({ prefix: "SCRAPER", emoji: "🕷️" }),
  org: new Logger({ prefix: "ORG", emoji: "🏢" })
}

export default logger 