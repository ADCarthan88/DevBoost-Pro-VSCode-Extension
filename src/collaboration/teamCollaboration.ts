import * as vscode from 'vscode';
import { WebSocket } from 'ws';

interface TeamMember {
    id: string;
    name: string;
    status: 'online' | 'coding' | 'away';
    currentFile?: string;
    productivity: number;
}

interface Challenge {
    id: string;
    title: string;
    description: string;
    startDate: Date;
    endDate: Date;
    participants: string[];
    leaderboard: { userId: string; score: number }[];
}

export class TeamCollaboration {
    private ws: WebSocket | null = null;
    private teamMembers: Map<string, TeamMember> = new Map();
    private challenges: Challenge[] = [];
    private roomId: string = '';

    constructor(private context: vscode.ExtensionContext) {
        this.loadTeamData();
    }

    async joinTeam(teamCode: string): Promise<boolean> {
        try {
            this.roomId = teamCode;
            this.ws = new WebSocket(`wss://devboost-collab.herokuapp.com/team/${teamCode}`);
            
            this.ws.on('open', () => {
                this.sendMessage('join', { 
                    userId: this.getUserId(),
                    name: this.getUserName()
                });
                vscode.window.showInformationMessage(`Joined team: ${teamCode}`);
            });

            this.ws.on('message', (data) => {
                this.handleMessage(JSON.parse(data.toString()));
            });

            this.ws.on('error', () => {
                vscode.window.showErrorMessage('Failed to connect to team');
            });

            return true;
        } catch (error) {
            return false;
        }
    }

    shareProductivityStats() {
        if (!this.ws) return;

        const stats = this.getLocalProductivityStats();
        this.sendMessage('productivity_update', {
            userId: this.getUserId(),
            stats: {
                todayMinutes: stats.todayMinutes,
                streak: stats.streak,
                score: stats.productivityScore
            }
        });
    }

    startPairProgramming(partnerId: string) {
        if (!this.ws) return;

        this.sendMessage('pair_request', {
            from: this.getUserId(),
            to: partnerId,
            file: vscode.window.activeTextEditor?.document.fileName
        });
    }

    createChallenge(title: string, description: string, duration: number) {
        const challenge: Challenge = {
            id: Date.now().toString(),
            title,
            description,
            startDate: new Date(),
            endDate: new Date(Date.now() + duration * 24 * 60 * 60 * 1000),
            participants: [this.getUserId()],
            leaderboard: []
        };

        this.challenges.push(challenge);
        this.sendMessage('challenge_created', challenge);
        
        vscode.window.showInformationMessage(`Challenge "${title}" created!`);
    }

    getTeamLeaderboard(): { name: string; score: number; status: string }[] {
        return Array.from(this.teamMembers.values())
            .sort((a, b) => b.productivity - a.productivity)
            .map(member => ({
                name: member.name,
                score: member.productivity,
                status: member.status
            }));
    }

    showTeamDashboard() {
        const panel = vscode.window.createWebviewPanel(
            'teamDashboard',
            'Team Dashboard',
            vscode.ViewColumn.Two,
            { enableScripts: true }
        );

        panel.webview.html = this.getTeamDashboardHtml();
    }

    private handleMessage(message: any) {
        switch (message.type) {
            case 'member_joined':
                this.teamMembers.set(message.data.userId, message.data);
                break;
            case 'productivity_update':
                const member = this.teamMembers.get(message.data.userId);
                if (member) {
                    member.productivity = message.data.stats.score;
                    this.teamMembers.set(message.data.userId, member);
                }
                break;
            case 'pair_request':
                this.handlePairRequest(message.data);
                break;
            case 'challenge_update':
                this.updateChallenge(message.data);
                break;
        }
    }

    private handlePairRequest(data: any) {
        vscode.window.showInformationMessage(
            `Pair programming request from ${data.from}`,
            'Accept', 'Decline'
        ).then(selection => {
            if (selection === 'Accept') {
                this.sendMessage('pair_accepted', {
                    from: data.from,
                    to: this.getUserId()
                });
            }
        });
    }

    private sendMessage(type: string, data: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type, data }));
        }
    }

    private getUserId(): string {
        return this.context.globalState.get('userId') || 'user_' + Date.now();
    }

    private getUserName(): string {
        return vscode.workspace.getConfiguration('devboost').get('userName', 'Developer');
    }

    private getLocalProductivityStats() {
        return {
            todayMinutes: 120,
            streak: 5,
            productivityScore: 85
        };
    }

    private updateChallenge(challengeData: any) {
        const index = this.challenges.findIndex(c => c.id === challengeData.id);
        if (index !== -1) {
            this.challenges[index] = challengeData;
        }
    }

    private loadTeamData() {
        const saved = this.context.globalState.get('teamData', {});
        // Load saved team state
    }

    private getTeamDashboardHtml(): string {
        const leaderboard = this.getTeamLeaderboard();
        
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
                .member { display: flex; justify-content: space-between; padding: 10px; margin: 5px 0; background: #2d2d30; border-radius: 5px; }
                .online { border-left: 4px solid #4CAF50; }
                .coding { border-left: 4px solid #FF9800; }
                .away { border-left: 4px solid #757575; }
                .challenge { background: #3c3c3c; padding: 15px; margin: 10px 0; border-radius: 8px; }
            </style>
        </head>
        <body>
            <h2>Team Dashboard</h2>
            
            <h3>Team Leaderboard</h3>
            ${leaderboard.map((member, index) => `
                <div class="member ${member.status}">
                    <span>#${index + 1} ${member.name}</span>
                    <span>${member.score} pts</span>
                </div>
            `).join('')}
            
            <h3>Active Challenges</h3>
            ${this.challenges.map(challenge => `
                <div class="challenge">
                    <h4>${challenge.title}</h4>
                    <p>${challenge.description}</p>
                    <small>Participants: ${challenge.participants.length}</small>
                </div>
            `).join('')}
        </body>
        </html>`;
    }
}