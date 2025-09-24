// Centralized logging system for B4OS Challenges

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  data?: unknown
  timestamp: string
  context?: string
}

class Logger {
  private formatMessage(level: LogLevel, message: string, data?: unknown, context?: string): LogEntry {
    return {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      context,
    }
  }

  private shouldLog(level: LogLevel): boolean {
    if (process.env.NODE_ENV !== 'development' && level === 'debug') {
      return false
    }
    return true
  }

  private log(level: LogLevel, message: string, data?: unknown, context?: string): void {
    if (!this.shouldLog(level)) return

    const entry = this.formatMessage(level, message, data, context)
    
    switch (level) {
      case 'debug':
        console.log(`[DEBUG] ${entry.timestamp} ${context ? `[${context}] ` : ''}${message}`, data)
        break
      case 'info':
        console.info(`[INFO] ${entry.timestamp} ${context ? `[${context}] ` : ''}${message}`, data)
        break
      case 'warn':
        console.warn(`[WARN] ${entry.timestamp} ${context ? `[${context}] ` : ''}${message}`, data)
        break
      case 'error':
        console.error(`[ERROR] ${entry.timestamp} ${context ? `[${context}] ` : ''}${message}`, data)
        break
    }
  }

  debug(message: string, data?: unknown, context?: string): void {
    this.log('debug', message, data, context)
  }

  info(message: string, data?: unknown, context?: string): void {
    this.log('info', message, data, context)
  }

  warn(message: string, data?: unknown, context?: string): void {
    this.log('warn', message, data, context)
  }

  error(message: string, error?: unknown, context?: string): void {
    this.log('error', message, error, context)
  }

  // Specialized logging methods
  apiCall(method: string, url: string, data?: unknown): void {
    this.debug(`API Call: ${method} ${url}`, data, 'API')
  }

  apiResponse(method: string, url: string, status: number, data?: unknown): void {
    const level = status >= 400 ? 'error' : 'debug'
    this.log(level, `API Response: ${method} ${url} - ${status}`, data, 'API')
  }

  userAction(action: string, userId?: string, data?: Record<string, unknown>): void {
    this.info(`User Action: ${action}`, { userId, ...data }, 'USER')
  }

  performance(operation: string, duration: number, data?: unknown): void {
    this.debug(`Performance: ${operation} took ${duration}ms`, data, 'PERF')
  }

  validation(field: string, value: unknown, isValid: boolean, error?: string): void {
    const level = isValid ? 'debug' : 'warn'
    this.log(level, `Validation: ${field}`, { value, isValid, error }, 'VALIDATION')
  }
}

// Export singleton instance
export const logger = new Logger()

// Export individual methods for convenience
export const { debug, info, warn, error, apiCall, apiResponse, userAction, performance, validation } = logger


