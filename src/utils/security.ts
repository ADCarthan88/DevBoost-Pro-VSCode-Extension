import * as vscode from 'vscode';
import * as crypto from 'crypto';

export class SecurityManager {
    private static readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm';
    // Using AES-256-GCM for authenticated encryption
    private static readonly KEY_LENGTH = 32;
    private static readonly IV_LENGTH = 16;
    private static readonly TAG_LENGTH = 16;

    /**
     * Sanitize user input to prevent XSS and injection attacks
     */
    static sanitizeInput(input: string): string {
        if (!input || typeof input !== 'string') {
            return '';
        }

        return input
            .replace(/[<>]/g, '') // Remove potential HTML tags
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+=/gi, '') // Remove event handlers
            .trim()
            .substring(0, 1000); // Limit length
    }

    /**
     * Validate file paths to prevent directory traversal
     */
    static validateFilePath(filePath: string): boolean {
        if (!filePath || typeof filePath !== 'string') {
            return false;
        }

        // Check for directory traversal patterns
        const dangerousPatterns = [
            '../',
            '..\\',
            '..',
            '/etc/',
            '/proc/',
            'C:\\Windows\\',
            'C:\\System32\\'
        ];

        const normalizedPath = filePath.toLowerCase();
        return !dangerousPatterns.some(pattern => normalizedPath.includes(pattern));
    }

    /**
     * Encrypt sensitive data before storage
     */
    static encrypt(text: string, password: string): string {
        try {
            const key = crypto.scryptSync(password, 'salt', SecurityManager.KEY_LENGTH);
            const iv = crypto.randomBytes(SecurityManager.IV_LENGTH);
            const cipher = crypto.createCipher(SecurityManager.ENCRYPTION_ALGORITHM, key);
            
            cipher.setAAD(Buffer.from('DevBoostPro', 'utf8'));
            
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            const tag = cipher.getAuthTag();
            
            return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
        } catch (error) {
            console.error('Encryption failed:', error);
            return '';
        }
    }

    /**
     * Decrypt sensitive data from storage
     */
    static decrypt(encryptedText: string, password: string): string {
        try {
            const parts = encryptedText.split(':');
            if (parts.length !== 3) {
                throw new Error('Invalid encrypted format');
            }

            const iv = Buffer.from(parts[0], 'hex');
            const tag = Buffer.from(parts[1], 'hex');
            const encrypted = parts[2];

            const key = crypto.scryptSync(password, 'salt', SecurityManager.KEY_LENGTH);
            const decipher = crypto.createDecipher(SecurityManager.ENCRYPTION_ALGORITHM, key);
            
            decipher.setAAD(Buffer.from('DevBoostPro', 'utf8'));
            decipher.setAuthTag(tag);

            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            console.error('Decryption failed:', error);
            return '';
        }
    }

    /**
     * Generate secure random tokens
     */
    static generateSecureToken(length: number = 32): string {
        return crypto.randomBytes(length).toString('hex');
    }

    /**
     * Hash sensitive data for comparison
     */
    static hashData(data: string): string {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * Validate and sanitize configuration settings
     */
    static validateConfig(config: any): boolean {
        if (!config || typeof config !== 'object') {
            return false;
        }

        // Check for required security properties
        const requiredProps = ['enableAI', 'trackTime'];
        for (const prop of requiredProps) {
            if (!(prop in config)) {
                return false;
            }
        }

        // Validate data types
        if (typeof config.enableAI !== 'boolean' || typeof config.trackTime !== 'boolean') {
            return false;
        }

        return true;
    }

    /**
     * Rate limiting for API calls
     */
    static createRateLimiter(maxRequests: number, windowMs: number) {
        const requests = new Map<string, number[]>();

        return (identifier: string): boolean => {
            const now = Date.now();
            const windowStart = now - windowMs;

            if (!requests.has(identifier)) {
                requests.set(identifier, []);
            }

            const userRequests = requests.get(identifier)!;
            
            // Remove old requests outside the window
            const validRequests = userRequests.filter(time => time > windowStart);
            requests.set(identifier, validRequests);

            // Check if under limit
            if (validRequests.length >= maxRequests) {
                return false;
            }

            // Add current request
            validRequests.push(now);
            return true;
        };
    }

    /**
     * Secure storage wrapper for VS Code global state
     */
    static async secureStore(
        context: vscode.ExtensionContext,
        key: string,
        value: any,
        encrypt: boolean = true
    ): Promise<void> {
        try {
            const sanitizedKey = SecurityManager.sanitizeInput(key);
            let dataToStore = JSON.stringify(value);

            if (encrypt) {
                const password = SecurityManager.generateSecureToken();
                dataToStore = SecurityManager.encrypt(dataToStore, password);
                
                // Store password separately (in real implementation, use secure key management)
                await context.globalState.update(`${sanitizedKey}_key`, password);
            }

            await context.globalState.update(sanitizedKey, dataToStore);
        } catch (error) {
            console.error('Secure storage failed:', error);
            throw new Error('Failed to store data securely');
        }
    }

    /**
     * Secure retrieval from VS Code global state
     */
    static async secureRetrieve(
        context: vscode.ExtensionContext,
        key: string,
        encrypted: boolean = true
    ): Promise<any> {
        try {
            const sanitizedKey = SecurityManager.sanitizeInput(key);
            let storedData = context.globalState.get<string>(sanitizedKey);

            if (!storedData) {
                return null;
            }

            if (encrypted) {
                const password = context.globalState.get<string>(`${sanitizedKey}_key`);
                if (!password) {
                    throw new Error('Encryption key not found');
                }
                
                storedData = SecurityManager.decrypt(storedData, password);
            }

            return JSON.parse(storedData);
        } catch (error) {
            console.error('Secure retrieval failed:', error);
            return null;
        }
    }

    /**
     * Audit logging for security events
     */
    static logSecurityEvent(event: string, details: any = {}): void {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event: SecurityManager.sanitizeInput(event),
            details: SecurityManager.sanitizeObject(details),
            source: 'DevBoostPro'
        };

        console.log('SECURITY_AUDIT:', JSON.stringify(logEntry));
    }

    /**
     * Sanitize object properties recursively
     */
    private static sanitizeObject(obj: any): any {
        if (obj === null || obj === undefined) {
            return obj;
        }

        if (typeof obj === 'string') {
            return SecurityManager.sanitizeInput(obj);
        }

        if (typeof obj === 'object') {
            const sanitized: any = {};
            for (const [key, value] of Object.entries(obj)) {
                const sanitizedKey = SecurityManager.sanitizeInput(key);
                sanitized[sanitizedKey] = SecurityManager.sanitizeObject(value);
            }
            return sanitized;
        }

        return obj;
    }

    /**
     * Content Security Policy for webviews
     */
    static getWebviewCSP(): string {
        return `default-src 'none'; 
                style-src 'unsafe-inline'; 
                script-src 'unsafe-inline'; 
                img-src data: https:; 
                font-src https:;`;
    }

    /**
     * Validate webview messages
     */
    static validateWebviewMessage(message: any): boolean {
        if (!message || typeof message !== 'object') {
            return false;
        }

        // Check for required command property
        if (!message.command || typeof message.command !== 'string') {
            return false;
        }

        // Whitelist allowed commands
        const allowedCommands = ['refresh', 'exportData', 'updateSettings', 'analyzeCode'];
        if (!allowedCommands.includes(message.command)) {
            return false;
        }

        return true;
    }
}