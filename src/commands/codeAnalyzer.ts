import * as vscode from 'vscode';

export class CodeAnalyzer {
    
    async analyzeCurrentFile(editor: vscode.TextEditor) {
        const document = editor.document;
        const text = document.getText();
        
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Analyzing code...",
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0 });
            
            const analysis = await this.performAnalysis(text, document.languageId);
            
            progress.report({ increment: 100 });
            
            this.showAnalysisResults(analysis);
        });
    }

    private async performAnalysis(code: string, language: string) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const lines = code.split('\n');
        const analysis = {
            totalLines: lines.length,
            codeLines: lines.filter(line => line.trim() && !line.trim().startsWith('//')).length,
            comments: lines.filter(line => line.trim().startsWith('//')).length,
            complexity: this.calculateComplexity(code),
            suggestions: this.generateSuggestions(code, language),
            score: 0,
            security: this.checkSecurity(code, language)
        };
        
        analysis.score = Math.max(0, 100 - analysis.complexity * 2);
        
        return analysis;
    }

    private calculateComplexity(code: string): number {
        const complexityKeywords = ['if', 'else', 'for', 'while', 'switch', 'case', 'try', 'catch'];
        let complexity = 1;
        
        complexityKeywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'g');
            const matches = code.match(regex);
            if (matches) {
                complexity += matches.length;
            }
        });
        
        return complexity;
    }

    private checkSecurity(code: string, language: string): string[] {
        const issues: string[] = [];
        
        if (code.includes('eval(')) {
            issues.push('Avoid using eval() - security risk');
        }
        
        if (code.includes('innerHTML') && !code.includes('sanitize')) {
            issues.push('innerHTML usage detected - ensure input is sanitized');
        }
        
        if (code.match(/password.*=.*["'][^"']*["']/i)) {
            issues.push('Hardcoded password detected');
        }
        
        if (code.includes('document.write')) {
            issues.push('document.write() is deprecated and unsafe');
        }
        
        return issues;
    }

    private generateSuggestions(code: string, language: string): string[] {
        const suggestions: string[] = [];
        
        if (code.includes('console.log') && language === 'javascript') {
            suggestions.push('Consider removing console.log statements for production');
        }
        
        if (code.split('\n').some(line => line.length > 120)) {
            suggestions.push('Some lines exceed 120 characters - consider breaking them up');
        }
        
        if (!code.includes('//') && !code.includes('/*')) {
            suggestions.push('Add comments to improve code readability');
        }
        
        if (code.includes('var ') && language === 'javascript') {
            suggestions.push('Consider using let/const instead of var');
        }
        
        return suggestions;
    }

    private showAnalysisResults(analysis: any) {
        const panel = vscode.window.createWebviewPanel(
            'codeAnalysis',
            'Code Analysis Results',
            vscode.ViewColumn.Two,
            { 
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        panel.webview.html = this.getAnalysisHtml(analysis);
    }

    private getAnalysisHtml(analysis: any): string {
        const securitySection = analysis.security.length > 0 ? 
            `<h3 style="color: red;">Security Issues</h3>
             <div class="security">
                <ul>${analysis.security.map((s: string) => `<li>${s}</li>`).join('')}</ul>
             </div>` : '';

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
                .score { font-size: 24px; font-weight: bold; color: ${analysis.score > 80 ? '#4CAF50' : analysis.score > 60 ? '#FF9800' : '#F44336'}; }
                .metric { margin: 10px 0; padding: 8px; background: #2d2d30; border-radius: 4px; }
                .suggestions, .security { background: #2d2d30; padding: 15px; border-radius: 5px; margin: 10px 0; }
                .security { border-left: 4px solid #F44336; }
                ul { margin: 0; }
                h2, h3 { color: #569cd6; }
            </style>
        </head>
        <body>
            <h2>🔍 Code Analysis Results</h2>
            <div class="score">Quality Score: ${analysis.score}/100</div>
            
            <h3>📊 Metrics</h3>
            <div class="metric">📝 Total Lines: ${analysis.totalLines}</div>
            <div class="metric">💻 Code Lines: ${analysis.codeLines}</div>
            <div class="metric">💬 Comments: ${analysis.comments}</div>
            <div class="metric">🔄 Complexity: ${analysis.complexity}</div>
            
            ${securitySection}
            
            <h3>💡 Suggestions</h3>
            <div class="suggestions">
                ${analysis.suggestions.length > 0 ? 
                    '<ul>' + analysis.suggestions.map((s: string) => `<li>${s}</li>`).join('') + '</ul>' :
                    '<p>✅ Great job! No suggestions at this time.</p>'
                }
            </div>
        </body>
        </html>`;
    }

    async optimizeImports(editor: vscode.TextEditor) {
        const document = editor.document;
        const text = document.getText();
        
        if (document.languageId === 'javascript' || document.languageId === 'typescript') {
            const optimized = this.optimizeJSImports(text);
            
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), optimized);
            
            await vscode.workspace.applyEdit(edit);
            vscode.window.showInformationMessage('✅ Imports optimized!');
        }
    }

    private optimizeJSImports(code: string): string {
        const lines = code.split('\n');
        const imports: string[] = [];
        const otherLines: string[] = [];
        
        lines.forEach(line => {
            if (line.trim().startsWith('import ')) {
                imports.push(line);
            } else {
                otherLines.push(line);
            }
        });
        
        imports.sort();
        
        return [...imports, '', ...otherLines].join('\n');
    }
}