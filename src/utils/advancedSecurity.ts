import * as vscode from 'vscode';
import * as crypto from 'crypto';

export class AdvancedSecurity {
    private static readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    private static readonly MAX_LOGIN_ATTEMPTS = 3;
    private static readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

    /**
     * Content Security Policy for webviews with strict nonce-based security
     */
    static generateSecureCSP(nonce: string): string {
        return `default-src 'none'; 
                script-src 'nonce-${nonce}' 'strict-dynamic'; 
                style-src 'nonce-${nonce}'; 
                img-src data: https: 'self'; 
                font-src https: 'self';
                connect-src 'self';
                base-uri 'none';
                form-action 'none';
                frame-ancestors 'none';`;
    }

    /**
     * Generate cryptographically secure nonce
     */
    static generateNonce(): string {
        return crypto.randomBytes(16).toString('base64');
    }

    /**
     * Memory-safe string comparison to prevent timing attacks
     */
    static secureStringCompare(a: string, b: string): boolean {
        if (a.length !== b.length) {
            return false;
        }

        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }

        return result === 0;
    }

    /**
     * Enhanced string sanitization with multiple attack vectors
     */
    static sanitizeString(input: string): string {
        return input
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
            .replace(/javascript:/gi, '') // Remove javascript protocol
            .replace(/on\w+\s*=/gi, '') // Remove event handlers
            .replace(/data:/gi, '') // Remove data URLs
            .replace(/vbscript:/gi, '') // Remove VBScript
            .replace(/expression\s*\(/gi, '') // Remove CSS expressions
            .replace(/import\s+/gi, '') // Remove import statements
            .replace(/eval\s*\(/gi, '') // Remove eval calls
            .replace(/Function\s*\(/gi, '') // Remove Function constructor
            .replace(/setTimeout\s*\(/gi, '') // Remove setTimeout
            .replace(/setInterval\s*\(/gi, '') // Remove setInterval
            .trim()
            .substring(0, 1000); // Limit length
    }

    /**
     * Deep object sanitization with depth limits
     */
    static sanitizeObject(obj: any, maxDepth: number = 5): any {
        const sanitizeRecursive = (item: any, depth: number): any => {
            if (depth > maxDepth) return null;
            
            if (Array.isArray(item)) {
                return item.slice(0, 100).map(el => sanitizeRecursive(el, depth + 1));
            }
            
            if (typeof item === 'object' && item !== null) {
                const result: any = {};
                Object.keys(item).slice(0, 50).forEach(key => {
                    const sanitizedKey = this.sanitizeString(key);
                    result[sanitizedKey] = sanitizeRecursive(item[key], depth + 1);
                });
                return result;
            }
            
            if (typeof item === 'string') {
                return this.sanitizeString(item);
            }
            
            return item;
        };

        return sanitizeRecursive(obj, 0);
    }

    /**
     * Advanced rate limiting with sliding window and burst protection
     */
    static createAdvancedRateLimiter(maxRequests: number, windowMs: number, burstLimit: number = 5) {
        const requests = new Map<string, { times: number[], blocked: number }>();

        return (identifier: string): { allowed: boolean; retryAfter?: number } => {
            const now = Date.now();
            const windowStart = now - windowMs;

            if (!requests.has(identifier)) {
                requests.set(identifier, { times: [], blocked: 0 });
            }

            const userRequests = requests.get(identifier)!;

            // Check if user is blocked
            if (userRequests.blocked > now) {
                return { allowed: false, retryAfter: userRequests.blocked - now };
            }

            // Clean old requests
            userRequests.times = userRequests.times.filter(time => time > windowStart);

            // Check burst limit (5 requests per second)
            const recentRequests = userRequests.times.filter(time => time > now - 1000);
            if (recentRequests.length >= burstLimit) {
                userRequests.blocked = now + (windowMs * 2);
                return { allowed: false, retryAfter: windowMs * 2 };
            }

            // Check rate limit
            if (userRequests.times.length >= maxRequests) {
                userRequests.blocked = now + windowMs;
                return { allowed: false, retryAfter: windowMs };
            }

            userRequests.times.push(now);
            return { allowed: true };
        };
    }

    /**
     * Secure file path validation with whitelist
     */
    static validateSecureFilePath(filePath: string, allowedDirectories: string[] = []): boolean {
        const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();
        
        // Block dangerous paths
        const dangerousPaths = [
            '../', './', '/etc/', '/proc/', '/sys/', '/dev/', '/var/',
            'c:/windows/', 'c:/system32/', '/system/', '/library/',
            'node_modules/', '.git/', '.env', 'package.json', 'tsconfig.json'
        ];

        if (dangerousPaths.some(dangerous => normalizedPath.includes(dangerous))) {
            return false;
        }

        // Check whitelist if provided
        if (allowedDirectories.length > 0) {
            return allowedDirectories.some(allowed => 
                normalizedPath.startsWith(allowed.toLowerCase())
            );
        }

        return true;
    }

    /**
     * Secure random password generation
     */
    static generateSecurePassword(length: number = 32): string {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        
        for (let i = 0; i < length; i++) {
            const randomIndex = crypto.randomInt(0, charset.length);
            password += charset[randomIndex];
        }
        
        return password;
    }

    /**
     * Structured security audit logging
     */
    static auditLog(event: string, details: any, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'): void {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event: this.sanitizeString(event),
            severity,
            details: this.sanitizeObject(details),
            source: 'DevBoostPro',
            version: '1.0.0',
            sessionId: this.generateNonce()
        };

        console.log(`SECURITY_AUDIT_${severity.toUpperCase()}:`, JSON.stringify(logEntry));
    }

    /**
     * Create secure session with timeout management
     */
    static createSecureSession(context: vscode.ExtensionContext): SecureSession {
        return new SecureSession(context);
    }
}

export class SecureSession {
    private sessionId: string;
    private createdAt: number;
    private lastActivity: number;
    private isValid: boolean = true;

    constructor(private context: vscode.ExtensionContext) {
        this.sessionId = AdvancedSecurity.generateNonce();
        this.createdAt = Date.now();
        this.lastActivity = Date.now();
        
        AdvancedSecurity.auditLog('session_created', { sessionId: this.sessionId }, 'low');
    }

    updateActivity(): void {
        if (this.isExpired()) {
            this.invalidate();
            return;
        }
        this.lastActivity = Date.now();
    }

    isExpired(): boolean {
        return Date.now() - this.lastActivity > AdvancedSecurity['SESSION_TIMEOUT'];
    }

    invalidate(): void {
        this.isValid = false;
        AdvancedSecurity.auditLog('session_invalidated', { sessionId: this.sessionId }, 'medium');
    }

    getSessionId(): string {
        return this.isValid && !this.isExpired() ? this.sessionId : '';
    }

    isValidSession(): boolean {
        return this.isValid && !this.isExpired();
    }
}