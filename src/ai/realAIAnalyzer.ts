import * as vscode from 'vscode';
import axios from 'axios';

interface AIAnalysis {
    suggestions: string[];
    bugs: string[];
    refactoring: string[];
    security: string[];
    performance: string[];
    score: number;
}

export class RealAIAnalyzer {
    private apiKey: string = '';
    
    constructor() {
        this.loadAPIKey();
    }

    private loadAPIKey() {
        const config = vscode.workspace.getConfiguration('devboost');
        this.apiKey = config.get('openaiApiKey', '');
    }

    async analyzeWithGPT(code: string, language: string): Promise<AIAnalysis> {
        if (!this.apiKey) {
            return this.getFallbackAnalysis(code, language);
        }

        try {
            const prompt = `Analyze this ${language} code for:
1. Code quality issues
2. Potential bugs
3. Refactoring opportunities
4. Security vulnerabilities
5. Performance improvements

Code:
\`\`\`${language}
${code}
\`\`\`

Respond in JSON format with arrays for each category and an overall score (0-100).`;

            const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: 'gpt-4',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 1000,
                temperature: 0.3
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            const analysis = JSON.parse(response.data.choices[0].message.content);
            return this.validateAnalysis(analysis);
            
        } catch (error) {
            console.error('AI Analysis failed:', error);
            return this.getFallbackAnalysis(code, language);
        }
    }

    private validateAnalysis(analysis: any): AIAnalysis {
        return {
            suggestions: Array.isArray(analysis.suggestions) ? analysis.suggestions : [],
            bugs: Array.isArray(analysis.bugs) ? analysis.bugs : [],
            refactoring: Array.isArray(analysis.refactoring) ? analysis.refactoring : [],
            security: Array.isArray(analysis.security) ? analysis.security : [],
            performance: Array.isArray(analysis.performance) ? analysis.performance : [],
            score: typeof analysis.score === 'number' ? Math.max(0, Math.min(100, analysis.score)) : 75
        };
    }

    private getFallbackAnalysis(code: string, language: string): AIAnalysis {
        const suggestions = [];
        const bugs = [];
        const security = [];
        const performance = [];
        
        if (code.includes('console.log')) {
            suggestions.push('Remove console.log statements for production');
        }
        
        if (code.includes('eval(')) {
            security.push('Avoid using eval() - security risk');
            bugs.push('eval() can cause runtime errors');
        }
        
        if (code.includes('var ') && language === 'javascript') {
            suggestions.push('Use let/const instead of var');
        }
        
        if (code.split('\n').some(line => line.length > 120)) {
            suggestions.push('Break long lines for better readability');
        }
        
        if (code.includes('setTimeout') && !code.includes('clearTimeout')) {
            performance.push('Consider cleanup for setTimeout');
        }

        return {
            suggestions,
            bugs,
            refactoring: ['Consider extracting complex functions', 'Add type annotations'],
            security,
            performance,
            score: Math.max(60, 100 - suggestions.length * 5)
        };
    }
}