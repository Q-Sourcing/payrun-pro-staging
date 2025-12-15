/**
 * Test file for secure logging utility
 * This demonstrates the secure logging functionality
 */

import { log, warn, error, debug, getLoggingConfig } from './logger';

// Test the secure logger functionality
export function testSecureLogger() {
  console.log('=== Testing Secure Logger ===');

  // Test 1: Normal logging (should work in development)
  log('This is a normal log message');
  debug('This is a debug message');
  warn('This is a warning message');
  error('This is an error message');

  // Test 2: Sensitive data redaction
  log('User login attempt:', {
    email: 'user@example.com',
    password: 'mock-password-to-redact',
    access_token: 'mock-jwt-token-header.payload.signature',
    api_key: 'mock-api-key-12345'
  });

  // Test 3: String with sensitive keywords
  log('Authorization header:', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');

  // Test 4: Configuration info
  console.log('Current logging config:', getLoggingConfig());

  console.log('=== Secure Logger Test Complete ===');
}

// Make test function available globally for browser console testing
if (typeof window !== 'undefined') {
  // Browser environment - make test function available globally
  (window as any).testSecureLogger = testSecureLogger;

  // Also make individual logger functions available for testing
  (window as any).secureLog = log;
  (window as any).secureWarn = warn;
  (window as any).secureError = error;
  (window as any).secureDebug = debug;
  (window as any).getLoggingConfig = getLoggingConfig;

  console.log('🔧 Secure Logger Test Functions Available:');
  console.log('- testSecureLogger() - Run full test');
  console.log('- secureLog(msg) - Test log function');
  console.log('- secureWarn(msg) - Test warn function');
  console.log('- secureError(msg) - Test error function');
  console.log('- secureDebug(msg) - Test debug function');
  console.log('- getLoggingConfig() - Get current config');
}
