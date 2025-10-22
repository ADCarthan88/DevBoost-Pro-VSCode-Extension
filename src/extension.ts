import * as vscode from 'vscode';
import { CodeAnalyzer } from './commands/codeAnalyzer';
import { TimeTracker } from './commands/timeTracker';
import { SnippetManager } from './commands/snippetManager';
import { ProductivityDashboard } from './webview/dashboard';
import { CompletionProvider } from './providers/completionProvider';
import { AdvancedSecurity, SecureSession } from './utils/advancedSecurity';

export function activate(context: vscode.ExtensionContext) {
    console.log('DevBoost Pro is now active!');

    // Initialize security
    const secureSession = AdvancedSecurity.createSecureSession(context);
    const rateLimiter = AdvancedSecurity.createAdvancedRateLimiter(60, 60000, 10);
    
    // Audit activation
    AdvancedSecurity.auditLog('extension_activated', { version: '1.0.0' }, 'low');

    // Initialize services
    const codeAnalyzer = new CodeAnalyzer();
    const timeTracker = new TimeTracker(context);
    const snippetManager = new SnippetManager();
    const dashboard = new ProductivityDashboard(context);

    // Register commands
    const commands = [
        vscode.commands.registerCommand('devboost.analyzeCode', () => {
            // Security check
            const clientId = 'analyze_' + Date.now();
            const rateCheck = rateLimiter(clientId);
            
            if (!rateCheck.allowed) {
                vscode.window.showWarningMessage('Rate limit exceeded. Please wait before analyzing again.');
                AdvancedSecurity.auditLog('rate_limit_exceeded', { command: 'analyzeCode' }, 'medium');
                return;
            }
            
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                // Validate file path
                if (!AdvancedSecurity.validateSecureFilePath(editor.document.fileName)) {
                    vscode.window.showErrorMessage('Cannot analyze files in restricted directories.');
                    AdvancedSecurity.auditLog('restricted_file_access', { file: editor.document.fileName }, 'high');
                    return;
                }
                
                secureSession.updateActivity();
                codeAnalyzer.analyzeCurrentFile(editor);
            }
        }),

        vscode.commands.registerCommand('devboost.showDashboard', () => {
            dashboard.show();
        }),

        vscode.commands.registerCommand('devboost.startTimeTracking', () => {
            timeTracker.startTracking();
        }),

        vscode.commands.registerCommand('devboost.generateSnippet', () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                snippetManager.generateFromSelection(editor);
            }
        }),

        vscode.commands.registerCommand('devboost.optimizeImports', () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                codeAnalyzer.optimizeImports(editor);
            }
        })
    ];

    // Register providers
    const completionProvider = vscode.languages.registerCompletionItemProvider(
        ['javascript', 'typescript', 'python', 'java'],
        new CompletionProvider(),
        '.'
    );

    // Add to subscriptions
    context.subscriptions.push(...commands, completionProvider);

    // Start time tracking if enabled
    const config = vscode.workspace.getConfiguration('devboost');
    if (config.get('trackTime')) {
        timeTracker.startTracking();
    }

    // Show welcome message
    vscode.window.showInformationMessage('DevBoost Pro activated! Press Ctrl+Shift+D to open dashboard.');
}

export function deactivate() {
    console.log('DevBoost Pro deactivated');
}