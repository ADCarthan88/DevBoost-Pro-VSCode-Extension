import * as vscode from 'vscode';

export class CompletionProvider implements vscode.CompletionItemProvider {
    
    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        
        const linePrefix = document.lineAt(position).text.substr(0, position.character);
        const language = document.languageId;
        
        return this.getSmartCompletions(linePrefix, language, document, position);
    }

    private getSmartCompletions(
        linePrefix: string, 
        language: string, 
        document: vscode.TextDocument, 
        position: vscode.Position
    ): vscode.CompletionItem[] {
        
        const completions: vscode.CompletionItem[] = [];
        
        // Context-aware completions based on language
        switch (language) {
            case 'javascript':
            case 'typescript':
                completions.push(...this.getJSCompletions(linePrefix, document, position));
                break;
            case 'python':
                completions.push(...this.getPythonCompletions(linePrefix, document, position));
                break;
            case 'java':
                completions.push(...this.getJavaCompletions(linePrefix, document, position));
                break;
        }
        
        // Add universal productivity snippets
        completions.push(...this.getProductivitySnippets(linePrefix));
        
        return completions;
    }

    private getJSCompletions(linePrefix: string, document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        
        // Smart async/await patterns
        if (linePrefix.includes('fetch') || linePrefix.includes('axios')) {
            const asyncFetch = new vscode.CompletionItem('async-fetch-pattern', vscode.CompletionItemKind.Snippet);
            asyncFetch.insertText = new vscode.SnippetString(`try {
  const response = await fetch('\${1:url}');
  const data = await response.json();
  \${2:// Handle data}
} catch (error) {
  console.error('Error:', error);
}`);
            asyncFetch.documentation = new vscode.MarkdownString('Smart async/await fetch pattern with error handling');
            completions.push(asyncFetch);
        }
        
        // React hooks patterns
        if (linePrefix.includes('useState') || linePrefix.includes('useEffect')) {
            const useStatePattern = new vscode.CompletionItem('useState-pattern', vscode.CompletionItemKind.Snippet);
            useStatePattern.insertText = new vscode.SnippetString('const [\${1:state}, set\${1/(.*)/${1:/capitalize}/}] = useState(\${2:initialValue});');
            useStatePattern.documentation = new vscode.MarkdownString('Smart useState hook with proper naming');
            completions.push(useStatePattern);
        }
        
        // Error handling patterns
        if (linePrefix.includes('try') || linePrefix.includes('catch')) {
            const errorHandler = new vscode.CompletionItem('error-handler', vscode.CompletionItemKind.Snippet);
            errorHandler.insertText = new vscode.SnippetString(`try {
  \${1:// Code that might throw}
} catch (error) {
  console.error('\${2:Operation failed}:', error);
  \${3:// Handle error appropriately}
} finally {
  \${4:// Cleanup code}
}`);
            completions.push(errorHandler);
        }
        
        return completions;
    }

    private getPythonCompletions(linePrefix: string, document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        
        // Python class template
        if (linePrefix.includes('class')) {
            const classTemplate = new vscode.CompletionItem('class-template', vscode.CompletionItemKind.Snippet);
            classTemplate.insertText = new vscode.SnippetString(`class \${1:ClassName}:
    """
    \${2:Class description}
    """
    
    def __init__(self\${3:, args}):
        \${4:# Initialize instance variables}
        pass
    
    def \${5:method_name}(self\${6:, args}):
        \${7:# Method implementation}
        pass`);
            completions.push(classTemplate);
        }
        
        // Exception handling
        if (linePrefix.includes('try') || linePrefix.includes('except')) {
            const exceptionHandler = new vscode.CompletionItem('exception-handler', vscode.CompletionItemKind.Snippet);
            exceptionHandler.insertText = new vscode.SnippetString(`try:
    \${1:# Code that might raise an exception}
except \${2:Exception} as e:
    \${3:# Handle exception}
    print(f"Error: {e}")
finally:
    \${4:# Cleanup code}`);
            completions.push(exceptionHandler);
        }
        
        return completions;
    }

    private getJavaCompletions(linePrefix: string, document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        
        // Java class template
        if (linePrefix.includes('public class')) {
            const classTemplate = new vscode.CompletionItem('java-class-template', vscode.CompletionItemKind.Snippet);
            classTemplate.insertText = new vscode.SnippetString(`public class \${1:ClassName} {
    
    // Instance variables
    \${2:private String field;}
    
    // Constructor
    public \${1:ClassName}(\${3:parameters}) {
        \${4:// Initialize fields}
    }
    
    // Getter
    public \${5:String} get\${6:Field}() {
        return \${7:field};
    }
    
    // Setter
    public void set\${6:Field}(\${5:String} \${7:field}) {
        this.\${7:field} = \${7:field};
    }
    
    @Override
    public String toString() {
        return "\${1:ClassName}{" +
                "\${7:field}='" + \${7:field} + '\\'' +
                '}';
    }
}`);
            completions.push(classTemplate);
        }
        
        return completions;
    }

    private getProductivitySnippets(linePrefix: string): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        
        // TODO comment with timestamp
        if (linePrefix.includes('todo') || linePrefix.includes('TODO')) {
            const todoSnippet = new vscode.CompletionItem('todo-timestamp', vscode.CompletionItemKind.Snippet);
            todoSnippet.insertText = new vscode.SnippetString(`// TODO: \${1:Description} - \${CURRENT_USER} (\${CURRENT_DATE})`);
            todoSnippet.documentation = new vscode.MarkdownString('TODO comment with timestamp and user');
            completions.push(todoSnippet);
        }
        
        // Function documentation template
        if (linePrefix.includes('/**') || linePrefix.includes('function') || linePrefix.includes('def ')) {
            const docTemplate = new vscode.CompletionItem('function-docs', vscode.CompletionItemKind.Snippet);
            docTemplate.insertText = new vscode.SnippetString(`/**
 * \${1:Function description}
 * 
 * @param {\${2:type}} \${3:paramName} - \${4:Parameter description}
 * @returns {\${5:type}} \${6:Return description}
 * @throws {\${7:ErrorType}} \${8:When error occurs}
 * 
 * @example
 * \${9:// Usage example}
 */`);
            completions.push(docTemplate);
        }
        
        // Performance measurement snippet
        if (linePrefix.includes('performance') || linePrefix.includes('benchmark')) {
            const perfSnippet = new vscode.CompletionItem('performance-measure', vscode.CompletionItemKind.Snippet);
            perfSnippet.insertText = new vscode.SnippetString(`console.time('\${1:operation}');
\${2:// Code to measure}
console.timeEnd('\${1:operation}');`);
            perfSnippet.documentation = new vscode.MarkdownString('Performance measurement wrapper');
            completions.push(perfSnippet);
        }
        
        return completions;
    }

    resolveCompletionItem(
        item: vscode.CompletionItem,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.CompletionItem> {
        // Add additional details when item is selected
        if (item.label === 'async-fetch-pattern') {
            item.detail = 'DevBoost Pro: Smart async/await pattern';
            item.documentation = new vscode.MarkdownString(`
**Smart Async/Await Pattern**

Provides a complete async/await pattern with:
- Proper error handling
- JSON response parsing
- Console error logging
- Best practices structure

*Generated by DevBoost Pro*
            `);
        }
        
        return item;
    }
}