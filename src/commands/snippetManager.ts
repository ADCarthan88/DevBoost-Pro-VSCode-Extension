import * as vscode from 'vscode';
import { AdvancedSecurity } from '../utils/advancedSecurity';

export class SnippetManager {
    
    async generateFromSelection(editor: vscode.TextEditor) {
        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);
        
        // Security validation
        if (!selectedText || selectedText.length > 10000) {
            vscode.window.showErrorMessage('Invalid selection for snippet generation');
            return;
        }
        
        // Sanitize input
        const sanitizedText = AdvancedSecurity.sanitizeString(selectedText);
        
        const snippetName = await vscode.window.showInputBox({
            prompt: 'Enter snippet name',
            validateInput: (value) => {
                if (!value || value.length < 2) {
                    return 'Snippet name must be at least 2 characters';
                }
                if (value.length > 50) {
                    return 'Snippet name too long';
                }
                return null;
            }
        });
        
        if (!snippetName) {
            return;
        }
        
        const sanitizedName = AdvancedSecurity.sanitizeString(snippetName);
        
        // Generate snippet
        const snippet = {
            name: sanitizedName,
            prefix: sanitizedName.toLowerCase().replace(/\s+/g, '-'),
            body: sanitizedText.split('\n'),
            description: `Generated snippet: ${sanitizedName}`
        };
        
        // Show snippet preview
        const panel = vscode.window.createWebviewPanel(
            'snippetPreview',
            'Snippet Preview',
            vscode.ViewColumn.Two,
            { enableScripts: false }
        );
        
        const nonce = AdvancedSecurity.generateNonce();
        const csp = AdvancedSecurity.generateSecureCSP(nonce);
        
        panel.webview.html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy" content="${csp}">
            <style nonce="${nonce}">
                body { font-family: monospace; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
                .snippet { background: #2d2d30; padding: 15px; border-radius: 5px; }
                pre { white-space: pre-wrap; }
            </style>
        </head>
        <body>
            <h2>Generated Snippet: ${sanitizedName}</h2>
            <div class="snippet">
                <strong>Prefix:</strong> ${snippet.prefix}<br>
                <strong>Body:</strong>
                <pre>${sanitizedText}</pre>
            </div>
        </body>
        </html>`;
        
        vscode.window.showInformationMessage(`Snippet "${sanitizedName}" generated successfully!`);
        
        // Audit log
        AdvancedSecurity.auditLog('snippet_generated', { 
            name: sanitizedName, 
            length: sanitizedText.length 
        }, 'low');
    }
}