import * as vscode from 'vscode';
import { CodeAnalyzer } from './commands/codeAnalyzer';
import { TimeTracker } from './commands/timeTracker';
import { SnippetManager } from './commands/snippetManager';
import { ProductivityDashboard } from './webview/dashboard';
import { CompletionProvider } from './providers/completionProvider';
import { AdvancedSecurity, SecureSession } from './utils/advancedSecurity';
import { RealAIAnalyzer } from './ai/realAIAnalyzer';
import { TeamCollaboration } from './collaboration/teamCollaboration';
import { MLAnalytics } from './analytics/mlAnalytics';
import { GamificationSystem } from './gamification/gamificationSystem';

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
    
    // Initialize advanced features
    const aiAnalyzer = new RealAIAnalyzer();
    const teamCollab = new TeamCollaboration(context);
    const mlAnalytics = new MLAnalytics(context);
    const gamification = new GamificationSystem(context);

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
        }),

        vscode.commands.registerCommand('devboost.showAchievements', () => {
            gamification.showAchievementsPanel();
        }),

        vscode.commands.registerCommand('devboost.joinTeam', async () => {
            const teamCode = await vscode.window.showInputBox({
                prompt: 'Enter team code to join',
                placeHolder: 'team-code-123'
            });
            if (teamCode) {
                const success = await teamCollab.joinTeam(teamCode);
                if (success) {
                    gamification.addXP(100, 'Joined team');
                }
            }
        }),

        vscode.commands.registerCommand('devboost.showLeaderboard', () => {
            gamification.showLeaderboard();
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