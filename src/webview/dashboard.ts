import * as vscode from 'vscode';
import { TimeTracker } from '../commands/timeTracker';
import { AdvancedSecurity } from '../utils/advancedSecurity';

export class ProductivityDashboard {
    private panel: vscode.WebviewPanel | undefined;

    constructor(private context: vscode.ExtensionContext) {}

    show() {
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.One);
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            'devboostDashboard',
            'DevBoost Pro Dashboard',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'media')]
            }
        );

        const nonce = AdvancedSecurity.generateNonce();
        this.panel.webview.html = this.getDashboardHtml(nonce);
        
        this.panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'refresh':
                        this.panel!.webview.html = this.getDashboardHtml();
                        break;
                    case 'exportData':
                        this.exportProductivityData();
                        break;
                }
            },
            undefined,
            this.context.subscriptions
        );

        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });
    }

    private getDashboardHtml(nonce?: string): string {
        const secureNonce = nonce || AdvancedSecurity.generateNonce();
        const csp = AdvancedSecurity.generateSecureCSP(secureNonce);
        const stats = this.getProductivityStats();
        
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="${csp}">
            <title>DevBoost Pro Dashboard</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #1e1e1e 0%, #2d2d30 100%);
                    color: #d4d4d4;
                    padding: 20px;
                    min-height: 100vh;
                }
                .header { text-align: center; margin-bottom: 30px; }
                .header h1 { color: #569cd6; font-size: 2.5em; margin-bottom: 10px; }
                .header p { color: #9cdcfe; font-size: 1.1em; }
                .dashboard-grid { 
                    display: grid; 
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
                    gap: 20px; 
                    margin-bottom: 30px;
                }
                .card { 
                    background: rgba(45, 45, 48, 0.8);
                    border-radius: 12px;
                    padding: 25px;
                    border: 1px solid #3c3c3c;
                    backdrop-filter: blur(10px);
                    transition: transform 0.3s ease, box-shadow 0.3s ease;
                }
                .card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 10px 25px rgba(0,0,0,0.3);
                }
                .card h3 { color: #4CAF50; margin-bottom: 15px; font-size: 1.3em; }
                .stat-item { 
                    display: flex; 
                    justify-content: space-between; 
                    margin: 10px 0; 
                    padding: 8px 0;
                    border-bottom: 1px solid #404040;
                }
                .stat-value { 
                    font-weight: bold; 
                    color: #9cdcfe; 
                    font-size: 1.1em;
                }
                .progress-bar {
                    width: 100%;
                    height: 8px;
                    background: #404040;
                    border-radius: 4px;
                    overflow: hidden;
                    margin: 10px 0;
                }
                .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #4CAF50, #8BC34A);
                    transition: width 0.3s ease;
                }
                .actions {
                    display: flex;
                    gap: 15px;
                    justify-content: center;
                    margin-top: 30px;
                }
                .btn {
                    padding: 12px 24px;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 1em;
                    font-weight: 600;
                    transition: all 0.3s ease;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .btn-primary {
                    background: linear-gradient(45deg, #007ACC, #0099FF);
                    color: white;
                }
                .btn-secondary {
                    background: linear-gradient(45deg, #6A4C93, #9B59B6);
                    color: white;
                }
                .btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                }
                .language-chart {
                    margin-top: 15px;
                }
                .language-item {
                    display: flex;
                    align-items: center;
                    margin: 8px 0;
                }
                .language-color {
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    margin-right: 10px;
                }
                .tips {
                    background: linear-gradient(135deg, #FF6B6B, #FF8E53);
                    color: white;
                    padding: 20px;
                    border-radius: 12px;
                    margin-top: 20px;
                }
                .tips h3 { color: white; margin-bottom: 10px; }
                .emoji { font-size: 1.2em; margin-right: 8px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🚀 DevBoost Pro Dashboard</h1>
                <p>Your productivity command center</p>
            </div>

            <div class="dashboard-grid">
                <div class="card">
                    <h3><span class="emoji">⏱️</span>Today's Activity</h3>
                    <div class="stat-item">
                        <span>Coding Time</span>
                        <span class="stat-value">${stats.todayMinutes} min</span>
                    </div>
                    <div class="stat-item">
                        <span>Sessions</span>
                        <span class="stat-value">${stats.totalSessions}</span>
                    </div>
                    <div class="stat-item">
                        <span>Avg Session</span>
                        <span class="stat-value">${stats.averageSessionLength} min</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(100, (stats.todayMinutes / 480) * 100)}%"></div>
                    </div>
                    <small>Daily goal: 8 hours</small>
                </div>

                <div class="card">
                    <h3><span class="emoji">📊</span>Language Usage</h3>
                    <div class="language-chart">
                        ${this.generateLanguageChart(stats.languageStats)}
                    </div>
                </div>

                <div class="card">
                    <h3><span class="emoji">🎯</span>Productivity Score</h3>
                    <div class="stat-item">
                        <span>Current Score</span>
                        <span class="stat-value">${stats.productivityScore}/100</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${stats.productivityScore}%"></div>
                    </div>
                    <div class="stat-item">
                        <span>Streak</span>
                        <span class="stat-value">${stats.streak} days</span>
                    </div>
                </div>

                <div class="card">
                    <h3><span class="emoji">📈</span>Weekly Trends</h3>
                    <div class="stat-item">
                        <span>This Week</span>
                        <span class="stat-value">${stats.weeklyMinutes} min</span>
                    </div>
                    <div class="stat-item">
                        <span>Last Week</span>
                        <span class="stat-value">${stats.lastWeekMinutes} min</span>
                    </div>
                    <div class="stat-item">
                        <span>Change</span>
                        <span class="stat-value" style="color: ${stats.weeklyChange >= 0 ? '#4CAF50' : '#F44336'}">
                            ${stats.weeklyChange >= 0 ? '+' : ''}${stats.weeklyChange}%
                        </span>
                    </div>
                </div>
            </div>

            <div class="tips">
                <h3><span class="emoji">💡</span>Productivity Tips</h3>
                <p>${this.getRandomTip()}</p>
            </div>

            <div class="actions">
                <button class="btn btn-primary" onclick="refreshDashboard()">
                    <span class="emoji">🔄</span>Refresh Data
                </button>
                <button class="btn btn-secondary" onclick="exportData()">
                    <span class="emoji">📤</span>Export Report
                </button>
            </div>

            <script nonce="${secureNonce}">
                function refreshDashboard() {
                    const vscode = acquireVsCodeApi();
                    vscode.postMessage({ command: 'refresh' });
                }

                function exportData() {
                    const vscode = acquireVsCodeApi();
                    vscode.postMessage({ command: 'exportData' });
                }

                // Auto-refresh every 30 seconds
                setInterval(refreshDashboard, 30000);
            </script>
        </body>
        </html>`;
    }

    private generateLanguageChart(languageStats: Record<string, number>): string {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
        const total = Object.values(languageStats).reduce((sum, time) => sum + time, 0);
        
        if (total === 0) {
            return '<p>No coding activity yet today</p>';
        }

        return Object.entries(languageStats)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 6)
            .map(([lang, time], index) => {
                const percentage = ((time / total) * 100).toFixed(1);
                const minutes = Math.round(time / 60000);
                return `
                    <div class="language-item">
                        <div class="language-color" style="background: ${colors[index]}"></div>
                        <span>${lang}: ${minutes}min (${percentage}%)</span>
                    </div>
                `;
            }).join('');
    }

    private getProductivityStats() {
        // Mock data for demonstration - in real implementation, get from TimeTracker
        return {
            todayMinutes: 245,
            totalSessions: 8,
            averageSessionLength: 31,
            productivityScore: 87,
            streak: 5,
            weeklyMinutes: 1680,
            lastWeekMinutes: 1520,
            weeklyChange: 10.5,
            languageStats: {
                'typescript': 7200000,
                'javascript': 5400000,
                'python': 3600000,
                'json': 1800000
            }
        };
    }

    private getRandomTip(): string {
        const tips = [
            "Take a 5-minute break every 25 minutes to maintain focus (Pomodoro Technique)",
            "Use keyboard shortcuts to boost your coding speed by up to 40%",
            "Write comments as you code - your future self will thank you",
            "Commit your code frequently with meaningful commit messages",
            "Review your code before pushing - catch bugs early",
            "Use consistent naming conventions across your project",
            "Keep functions small and focused on a single responsibility"
        ];
        
        return tips[Math.floor(Math.random() * tips.length)];
    }

    private async exportProductivityData() {
        const stats = this.getProductivityStats();
        const report = `
DevBoost Pro Productivity Report
Generated: ${new Date().toLocaleString()}

=== TODAY'S SUMMARY ===
Coding Time: ${stats.todayMinutes} minutes
Sessions: ${stats.totalSessions}
Average Session: ${stats.averageSessionLength} minutes
Productivity Score: ${stats.productivityScore}/100

=== WEEKLY TRENDS ===
This Week: ${stats.weeklyMinutes} minutes
Last Week: ${stats.lastWeekMinutes} minutes
Change: ${stats.weeklyChange}%

=== LANGUAGE BREAKDOWN ===
${Object.entries(stats.languageStats)
    .map(([lang, time]) => `${lang}: ${Math.round(time / 60000)} minutes`)
    .join('\n')}
        `;

        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file('devboost-report.txt'),
            filters: { 'Text Files': ['txt'] }
        });

        if (uri) {
            await vscode.workspace.fs.writeFile(uri, Buffer.from(report, 'utf8'));
            vscode.window.showInformationMessage('📊 Productivity report exported successfully!');
        }
    }
}