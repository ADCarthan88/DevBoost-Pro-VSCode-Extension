import * as assert from 'assert';
import * as vscode from 'vscode';
import { CodeAnalyzer } from '../../src/commands/codeAnalyzer';
import { TimeTracker } from '../../src/commands/timeTracker';
import { SecurityManager } from '../../src/utils/security';

suite('DevBoost Pro Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    suite('Code Analyzer Tests', () => {
        let codeAnalyzer: CodeAnalyzer;

        setup(() => {
            codeAnalyzer = new CodeAnalyzer();
        });

        test('Should calculate complexity correctly', async () => {
            const testCode = `
                function testFunction() {
                    if (condition) {
                        for (let i = 0; i < 10; i++) {
                            while (true) {
                                try {
                                    // Some code
                                } catch (error) {
                                    // Handle error
                                }
                            }
                        }
                    }
                }
            `;

            // Use reflection to access private method for testing
            const complexity = (codeAnalyzer as any).calculateComplexity(testCode);
            assert.ok(complexity > 1, 'Complexity should be greater than 1 for complex code');
        });

        test('Should generate security suggestions', async () => {
            const unsafeCode = `
                const userInput = document.getElementById('input').value;
                document.innerHTML = userInput;
                eval(userInput);
                const password = "hardcoded123";
            `;

            const suggestions = (codeAnalyzer as any).checkSecurity(unsafeCode, 'javascript');
            assert.ok(suggestions.length > 0, 'Should detect security issues');
            assert.ok(suggestions.some((s: string) => s.includes('eval')), 'Should detect eval usage');
            assert.ok(suggestions.some((s: string) => s.includes('innerHTML')), 'Should detect innerHTML usage');
        });

        test('Should optimize imports correctly', async () => {
            const unoptimizedCode = `
                import { z } from 'zod';
                import { a } from 'alpha';
                import { b } from 'beta';
                
                console.log('Hello World');
            `;

            const optimized = (codeAnalyzer as any).optimizeJSImports(unoptimizedCode);
            const lines = optimized.split('\n');
            const importLines = lines.filter(line => line.trim().startsWith('import'));
            
            // Check if imports are sorted
            for (let i = 1; i < importLines.length; i++) {
                assert.ok(importLines[i-1] <= importLines[i], 'Imports should be sorted alphabetically');
            }
        });
    });

    suite('Security Manager Tests', () => {
        test('Should sanitize input correctly', () => {
            const maliciousInput = '<script>alert("xss")</script>javascript:void(0)onclick=alert(1)';
            const sanitized = SecurityManager.sanitizeInput(maliciousInput);
            
            assert.ok(!sanitized.includes('<script>'), 'Should remove script tags');
            assert.ok(!sanitized.includes('javascript:'), 'Should remove javascript protocol');
            assert.ok(!sanitized.includes('onclick='), 'Should remove event handlers');
        });

        test('Should validate file paths correctly', () => {
            const validPath = '/home/user/project/file.js';
            const invalidPath = '../../../etc/passwd';
            const windowsInvalidPath = 'C:\\Windows\\System32\\config';

            assert.ok(SecurityManager.validateFilePath(validPath), 'Valid path should pass');
            assert.ok(!SecurityManager.validateFilePath(invalidPath), 'Directory traversal should fail');
            assert.ok(!SecurityManager.validateFilePath(windowsInvalidPath), 'Windows system path should fail');
        });

        test('Should encrypt and decrypt data correctly', () => {
            const originalText = 'Sensitive data that needs encryption';
            const password = 'test-password-123';

            const encrypted = SecurityManager.encrypt(originalText, password);
            assert.ok(encrypted !== originalText, 'Encrypted text should be different from original');
            assert.ok(encrypted.includes(':'), 'Encrypted format should contain separators');

            const decrypted = SecurityManager.decrypt(encrypted, password);
            assert.strictEqual(decrypted, originalText, 'Decrypted text should match original');
        });

        test('Should generate secure tokens', () => {
            const token1 = SecurityManager.generateSecureToken(32);
            const token2 = SecurityManager.generateSecureToken(32);

            assert.strictEqual(token1.length, 64, 'Token should be 64 characters (32 bytes hex)');
            assert.notStrictEqual(token1, token2, 'Tokens should be unique');
            assert.ok(/^[a-f0-9]+$/.test(token1), 'Token should be valid hex');
        });

        test('Should validate configuration correctly', () => {
            const validConfig = {
                enableAI: true,
                trackTime: false
            };

            const invalidConfig1 = {
                enableAI: 'true', // Should be boolean
                trackTime: false
            };

            const invalidConfig2 = {
                enableAI: true
                // Missing trackTime
            };

            assert.ok(SecurityManager.validateConfig(validConfig), 'Valid config should pass');
            assert.ok(!SecurityManager.validateConfig(invalidConfig1), 'Invalid type should fail');
            assert.ok(!SecurityManager.validateConfig(invalidConfig2), 'Missing property should fail');
        });

        test('Should implement rate limiting correctly', () => {
            const rateLimiter = SecurityManager.createRateLimiter(3, 1000); // 3 requests per second
            const identifier = 'test-user';

            // First 3 requests should pass
            assert.ok(rateLimiter(identifier), 'First request should pass');
            assert.ok(rateLimiter(identifier), 'Second request should pass');
            assert.ok(rateLimiter(identifier), 'Third request should pass');

            // Fourth request should fail
            assert.ok(!rateLimiter(identifier), 'Fourth request should be rate limited');
        });

        test('Should validate webview messages correctly', () => {
            const validMessage = {
                command: 'refresh',
                data: { test: true }
            };

            const invalidMessage1 = {
                // Missing command
                data: { test: true }
            };

            const invalidMessage2 = {
                command: 'malicious-command',
                data: { test: true }
            };

            assert.ok(SecurityManager.validateWebviewMessage(validMessage), 'Valid message should pass');
            assert.ok(!SecurityManager.validateWebviewMessage(invalidMessage1), 'Missing command should fail');
            assert.ok(!SecurityManager.validateWebviewMessage(invalidMessage2), 'Invalid command should fail');
        });
    });

    suite('Time Tracker Tests', () => {
        let timeTracker: TimeTracker;
        let mockContext: vscode.ExtensionContext;

        setup(() => {
            // Create mock context
            mockContext = {
                globalState: {
                    get: () => [],
                    update: () => Promise.resolve()
                }
            } as any;

            timeTracker = new TimeTracker(mockContext);
        });

        test('Should start and stop tracking correctly', () => {
            // Test starting tracking
            timeTracker.startTracking();
            assert.ok((timeTracker as any).isTracking, 'Should be tracking after start');

            // Test stopping tracking
            timeTracker.stopTracking();
            assert.ok(!(timeTracker as any).isTracking, 'Should not be tracking after stop');
        });

        test('Should calculate productivity stats correctly', () => {
            const stats = timeTracker.getProductivityStats();
            
            assert.ok(typeof stats.todayMinutes === 'number', 'Today minutes should be a number');
            assert.ok(typeof stats.totalSessions === 'number', 'Total sessions should be a number');
            assert.ok(typeof stats.averageSessionLength === 'number', 'Average session should be a number');
            assert.ok(typeof stats.languageStats === 'object', 'Language stats should be an object');
        });
    });

    suite('Integration Tests', () => {
        test('Extension should activate correctly', async () => {
            const extension = vscode.extensions.getExtension('ADCarthan88.devboost-pro');
            
            if (extension) {
                await extension.activate();
                assert.ok(extension.isActive, 'Extension should be active');
            }
        });

        test('Commands should be registered', async () => {
            const commands = await vscode.commands.getCommands();
            
            const expectedCommands = [
                'devboost.analyzeCode',
                'devboost.showDashboard',
                'devboost.startTimeTracking',
                'devboost.generateSnippet',
                'devboost.optimizeImports'
            ];

            expectedCommands.forEach(command => {
                assert.ok(commands.includes(command), `Command ${command} should be registered`);
            });
        });
    });

    suite('Performance Tests', () => {
        test('Code analysis should complete within reasonable time', async () => {
            const codeAnalyzer = new CodeAnalyzer();
            const largeCodeSample = 'function test() {\n'.repeat(1000) + '}\n'.repeat(1000);
            
            const startTime = Date.now();
            await (codeAnalyzer as any).performAnalysis(largeCodeSample, 'javascript');
            const endTime = Date.now();
            
            const duration = endTime - startTime;
            assert.ok(duration < 5000, 'Analysis should complete within 5 seconds for large files');
        });

        test('Security operations should be performant', () => {
            const largeText = 'A'.repeat(10000);
            const password = 'test-password';
            
            const startTime = Date.now();
            const encrypted = SecurityManager.encrypt(largeText, password);
            const decrypted = SecurityManager.decrypt(encrypted, password);
            const endTime = Date.now();
            
            const duration = endTime - startTime;
            assert.ok(duration < 1000, 'Encryption/decryption should complete within 1 second');
            assert.strictEqual(decrypted, largeText, 'Large text should encrypt/decrypt correctly');
        });
    });
});