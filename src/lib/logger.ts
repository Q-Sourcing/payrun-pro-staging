/**
 * Secure Logging Utility
 * 
 * This logger provides secure console output by:
 * - Automatically redacting sensitive data (tokens, passwords, keys)
 * - Disabling verbose logging in production
 * - Adding development prefixes and timestamps
 * - Ensuring audit compliance and data protection
 */

type LogLevel = 'log' | 'warn' | 'error' | 'debug';

// Sensitive keywords that should be redacted
const SENSITIVE_KEYWORDS = [
  'access_token',
  'refresh_token', 
  'service_role_key',
  'authorization',
  'password',
  'secret',
  'key',
  'private',
  'token',
  'bearer',
  'jwt',
  'auth',
  'credential',
  'api_key',
  'apikey'
];

// Production mode detection
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Redact sensitive information from log messages
 */
function redactSensitiveData(message: any): any {
  if (typeof message === 'string') {
    let redacted = message;
    
    // Check for sensitive keywords (case-insensitive)
    const hasSensitiveData = SENSITIVE_KEYWORDS.some(keyword => 
      redacted.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (hasSensitiveData) {
      // Redact the entire message if it contains sensitive data
      return '[REDACTED - Contains sensitive data]';
    }
    
    return redacted;
  }
  
  if (typeof message === 'object' && message !== null) {
    // Deep clone and redact object properties
    const redacted = JSON.parse(JSON.stringify(message));
    
    function redactObject(obj: any): any {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }
      
      for (const key in obj) {
        const lowerKey = key.toLowerCase();
        
        // Check if key contains sensitive information
        const isSensitiveKey = SENSITIVE_KEYWORDS.some(keyword => 
          lowerKey.includes(keyword.toLowerCase())
        );
        
        if (isSensitiveKey) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          obj[key] = redactObject(obj[key]);
        } else if (typeof obj[key] === 'string') {
          const hasSensitiveValue = SENSITIVE_KEYWORDS.some(keyword => 
            obj[key].toLowerCase().includes(keyword.toLowerCase())
          );
          
          if (hasSensitiveValue) {
            obj[key] = '[REDACTED]';
          }
        }
      }
      
      return obj;
    }
    
    return redactObject(redacted);
  }
  
  return message;
}

/**
 * Format log message with timestamp and prefix for development
 */
function formatMessage(level: LogLevel, ...args: any[]): any[] {
  if (isProduction && (level === 'log' || level === 'debug')) {
    // In production, don't format log/debug messages since they're disabled
    return [];
  }
  
  const timestamp = new Date().toISOString();
  const prefix = isProduction ? '' : `[DEV] [${timestamp}] [${level.toUpperCase()}]`;
  
  return [prefix, ...args.map(redactSensitiveData)];
}

/**
 * Secure console.log wrapper
 */
export function log(...args: any[]): void {
  if (isProduction) {
    // Disable console.log in production
    return;
  }
  
  const formattedArgs = formatMessage('log', ...args);
  if (formattedArgs.length > 0) {
    console.log(...formattedArgs);
  }
}

/**
 * Secure console.warn wrapper
 */
export function warn(...args: any[]): void {
  const formattedArgs = formatMessage('warn', ...args);
  console.warn(...formattedArgs);
}

/**
 * Secure console.error wrapper
 */
export function error(...args: any[]): void {
  const formattedArgs = formatMessage('error', ...args);
  console.error(...formattedArgs);
}

/**
 * Secure console.debug wrapper
 */
export function debug(...args: any[]): void {
  if (isProduction) {
    // Disable console.debug in production
    return;
  }
  
  const formattedArgs = formatMessage('debug', ...args);
  if (formattedArgs.length > 0) {
    console.debug(...formattedArgs);
  }
}

/**
 * Info level logging (alias for log)
 */
export const info = log;

/**
 * Get current logging configuration
 */
export function getLoggingConfig() {
  return {
    isProduction,
    sensitiveKeywords: SENSITIVE_KEYWORDS,
    enabledLevels: isProduction 
      ? ['warn', 'error'] 
      : ['log', 'warn', 'error', 'debug']
  };
}

// Export the logger object for convenience
export const logger = {
  log,
  warn,
  error,
  debug,
  info,
  getLoggingConfig
};
