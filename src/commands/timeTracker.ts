import * as vscode from 'vscode';

interface TimeSession {
    start: Date;
    end?: Date;
    file: string;
    language: string;
    duration: number;
}

export class TimeTracker {
    private isTracking = false;
    private currentSession: TimeSession | null = null;
    private sessions: TimeSession[] = [];
    private statusBarItem: vscode.StatusBarItem;
    private startTime: Date | null = null;

    constructor(private context: vscode.ExtensionContext) {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.command = 'devboost.toggleTimeTracking';
        this.loadSessions();
        
        // Register event listeners
        vscode.window.onDidChangeActiveTextEditor(this.onEditorChange, this);
        vscode.workspace.onDidSaveTextDocument(this.onDocumentSave, this);
    }

    startTracking() {
        if (this.isTracking) {
            this.stopTracking();
            return;
        }

        this.isTracking = true;
        this.startTime = new Date();
        
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            this.currentSession = {
                start: this.startTime,
                file: editor.document.fileName,
                language: editor.document.languageId,
                duration: 0
            };
        }

        this.updateStatusBar();
        vscode.window.showInformationMessage('⏱️ Time tracking started');
        
        // Update every second
        const interval = setInterval(() => {
            if (!this.isTracking) {
                clearInterval(interval);
                return;
            }
            this.updateStatusBar();
        }, 1000);
    }

    stopTracking() {
        if (!this.isTracking || !this.currentSession) {
            return;
        }

        this.isTracking = false;
        this.currentSession.end = new Date();
        this.currentSession.duration = this.currentSession.end.getTime() - this.currentSession.start.getTime();
        
        this.sessions.push(this.currentSession);
        this.saveSessions();
        
        const minutes = Math.round(this.currentSession.duration / 60000);
        vscode.window.showInformationMessage(`⏹️ Session ended: ${minutes} minutes`);
        
        this.currentSession = null;
        this.updateStatusBar();
    }

    private onEditorChange(editor: vscode.TextEditor | undefined) {
        if (!this.isTracking || !editor) {
            return;
        }

        // Switch to new file tracking
        if (this.currentSession && this.currentSession.file !== editor.document.fileName) {
            this.stopTracking();
            setTimeout(() => this.startTracking(), 100);
        }
    }

    private onDocumentSave(document: vscode.TextDocument) {
        if (this.isTracking && this.currentSession && this.currentSession.file === document.fileName) {
            // Log save event for productivity metrics
            console.log(`File saved: ${document.fileName}`);
        }
    }

    private updateStatusBar() {
        if (!this.isTracking || !this.startTime) {
            this.statusBarItem.text = '⏱️ Start Tracking';
            this.statusBarItem.tooltip = 'Click to start time tracking';
        } else {
            const elapsed = Date.now() - this.startTime.getTime();
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            
            this.statusBarItem.text = `⏱️ ${minutes}:${seconds.toString().padStart(2, '0')}`;
            this.statusBarItem.tooltip = 'Click to stop time tracking';
        }
        
        this.statusBarItem.show();
    }

    getProductivityStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todaySessions = this.sessions.filter(s => s.start >= today);
        const totalTime = todaySessions.reduce((sum, s) => sum + s.duration, 0);
        
        const languageStats = this.sessions.reduce((stats, session) => {
            stats[session.language] = (stats[session.language] || 0) + session.duration;
            return stats;
        }, {} as Record<string, number>);

        return {
            todayMinutes: Math.round(totalTime / 60000),
            totalSessions: todaySessions.length,
            languageStats,
            averageSessionLength: todaySessions.length > 0 ? Math.round(totalTime / todaySessions.length / 60000) : 0
        };
    }

    private saveSessions() {
        this.context.globalState.update('devboost.sessions', this.sessions);
    }

    private loadSessions() {
        const saved = this.context.globalState.get<TimeSession[]>('devboost.sessions', []);
        this.sessions = saved.map(s => ({
            ...s,
            start: new Date(s.start),
            end: s.end ? new Date(s.end) : undefined
        }));
    }

    dispose() {
        this.statusBarItem.dispose();
        if (this.isTracking) {
            this.stopTracking();
        }
    }
}