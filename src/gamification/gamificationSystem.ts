import * as vscode from 'vscode';

interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    unlocked: boolean;
    unlockedAt?: Date;
    progress: number;
    maxProgress: number;
    xp: number;
}

interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    earned: boolean;
}

interface Challenge {
    id: string;
    title: string;
    description: string;
    type: 'daily' | 'weekly' | 'monthly';
    target: number;
    progress: number;
    reward: { xp: number; badge?: string };
    expiresAt: Date;
}

export class GamificationSystem {
    private achievements: Achievement[] = [];
    private badges: Badge[] = [];
    private challenges: Challenge[] = [];
    private userLevel = 1;
    private userXP = 0;
    private streak = 0;

    constructor(private context: vscode.ExtensionContext) {
        this.loadGameData();
        this.initializeAchievements();
        this.initializeBadges();
        this.generateDailyChallenges();
    }

    addXP(amount: number, reason: string) {
        this.userXP += amount;
        const newLevel = Math.floor(this.userXP / 1000) + 1;
        
        if (newLevel > this.userLevel) {
            this.userLevel = newLevel;
            this.showLevelUpNotification(newLevel);
        }
        
        this.checkAchievements();
        this.saveGameData();
        
        vscode.window.showInformationMessage(`+${amount} XP: ${reason}`);
    }

    checkAchievements() {
        this.achievements.forEach(achievement => {
            if (!achievement.unlocked && achievement.progress >= achievement.maxProgress) {
                this.unlockAchievement(achievement);
            }
        });
    }

    private unlockAchievement(achievement: Achievement) {
        achievement.unlocked = true;
        achievement.unlockedAt = new Date();
        
        this.addXP(achievement.xp, `Achievement: ${achievement.title}`);
        
        vscode.window.showInformationMessage(
            `🏆 Achievement Unlocked: ${achievement.title}!`,
            'View Achievements'
        ).then(selection => {
            if (selection === 'View Achievements') {
                this.showAchievementsPanel();
            }
        });
    }

    updateProgress(type: string, amount: number = 1) {
        // Update achievements
        this.achievements.forEach(achievement => {
            if (achievement.id.includes(type) && !achievement.unlocked) {
                achievement.progress = Math.min(achievement.progress + amount, achievement.maxProgress);
            }
        });

        // Update challenges
        this.challenges.forEach(challenge => {
            if (challenge.id.includes(type) && challenge.progress < challenge.target) {
                challenge.progress = Math.min(challenge.progress + amount, challenge.target);
                
                if (challenge.progress >= challenge.target) {
                    this.completeChallenge(challenge);
                }
            }
        });

        this.checkAchievements();
        this.saveGameData();
    }

    private completeChallenge(challenge: Challenge) {
        this.addXP(challenge.reward.xp, `Challenge: ${challenge.title}`);
        
        if (challenge.reward.badge) {
            this.earnBadge(challenge.reward.badge);
        }
        
        vscode.window.showInformationMessage(
            `✅ Challenge Complete: ${challenge.title}!`
        );
    }

    private earnBadge(badgeId: string) {
        const badge = this.badges.find(b => b.id === badgeId);
        if (badge && !badge.earned) {
            badge.earned = true;
            vscode.window.showInformationMessage(
                `🎖️ Badge Earned: ${badge.name}!`
            );
        }
    }

    showAchievementsPanel() {
        const panel = vscode.window.createWebviewPanel(
            'achievements',
            'Achievements & Progress',
            vscode.ViewColumn.Two,
            { enableScripts: true }
        );

        panel.webview.html = this.getAchievementsHtml();
    }

    showLeaderboard() {
        // Mock leaderboard data
        const leaderboard = [
            { name: 'You', level: this.userLevel, xp: this.userXP, rank: 1 },
            { name: 'CodeMaster', level: 15, xp: 14500, rank: 2 },
            { name: 'DevNinja', level: 12, xp: 11200, rank: 3 },
            { name: 'BugHunter', level: 10, xp: 9800, rank: 4 }
        ].sort((a, b) => b.xp - a.xp);

        const panel = vscode.window.createWebviewPanel(
            'leaderboard',
            'Global Leaderboard',
            vscode.ViewColumn.Two,
            { enableScripts: false }
        );

        panel.webview.html = this.getLeaderboardHtml(leaderboard);
    }

    private initializeAchievements() {
        this.achievements = [
            {
                id: 'first_analysis',
                title: 'Code Detective',
                description: 'Analyze your first file',
                icon: '🔍',
                unlocked: false,
                progress: 0,
                maxProgress: 1,
                xp: 100
            },
            {
                id: 'analysis_streak_7',
                title: 'Weekly Warrior',
                description: 'Analyze code for 7 consecutive days',
                icon: '🔥',
                unlocked: false,
                progress: 0,
                maxProgress: 7,
                xp: 500
            },
            {
                id: 'coding_time_100',
                title: 'Century Coder',
                description: 'Code for 100 hours total',
                icon: '⏰',
                unlocked: false,
                progress: 0,
                maxProgress: 100,
                xp: 1000
            },
            {
                id: 'security_fixes_10',
                title: 'Security Guardian',
                description: 'Fix 10 security issues',
                icon: '🛡️',
                unlocked: false,
                progress: 0,
                maxProgress: 10,
                xp: 750
            }
        ];
    }

    private initializeBadges() {
        this.badges = [
            {
                id: 'early_bird',
                name: 'Early Bird',
                description: 'Code before 7 AM',
                icon: '🌅',
                rarity: 'common',
                earned: false
            },
            {
                id: 'night_owl',
                name: 'Night Owl',
                description: 'Code after 11 PM',
                icon: '🦉',
                rarity: 'common',
                earned: false
            },
            {
                id: 'polyglot',
                name: 'Polyglot',
                description: 'Code in 5+ languages',
                icon: '🌍',
                rarity: 'rare',
                earned: false
            },
            {
                id: 'perfectionist',
                name: 'Perfectionist',
                description: 'Achieve 100% code quality score',
                icon: '💎',
                rarity: 'epic',
                earned: false
            }
        ];
    }

    private generateDailyChallenges() {
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        this.challenges = [
            {
                id: 'daily_coding_60',
                title: 'Daily Grind',
                description: 'Code for 60 minutes today',
                type: 'daily',
                target: 60,
                progress: 0,
                reward: { xp: 200 },
                expiresAt: today
            },
            {
                id: 'daily_analysis_3',
                title: 'Quality Check',
                description: 'Analyze 3 files today',
                type: 'daily',
                target: 3,
                progress: 0,
                reward: { xp: 150, badge: 'quality_inspector' },
                expiresAt: today
            }
        ];
    }

    private showLevelUpNotification(level: number) {
        vscode.window.showInformationMessage(
            `🎉 Level Up! You're now level ${level}!`,
            'View Progress'
        ).then(selection => {
            if (selection === 'View Progress') {
                this.showAchievementsPanel();
            }
        });
    }

    private getAchievementsHtml(): string {
        const unlockedAchievements = this.achievements.filter(a => a.unlocked);
        const lockedAchievements = this.achievements.filter(a => !a.unlocked);
        const earnedBadges = this.badges.filter(b => b.earned);
        const activeChallenges = this.challenges.filter(c => c.progress < c.target);

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
                .level-info { text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(45deg, #007ACC, #0099FF); border-radius: 10px; }
                .section { margin: 20px 0; }
                .achievement { display: flex; align-items: center; padding: 15px; margin: 10px 0; background: #2d2d30; border-radius: 8px; }
                .achievement.unlocked { border-left: 4px solid #4CAF50; }
                .achievement.locked { border-left: 4px solid #757575; opacity: 0.7; }
                .achievement-icon { font-size: 2em; margin-right: 15px; }
                .progress-bar { width: 100%; height: 8px; background: #404040; border-radius: 4px; margin: 5px 0; }
                .progress-fill { height: 100%; background: #4CAF50; border-radius: 4px; }
                .badge { display: inline-block; margin: 5px; padding: 10px; background: #3c3c3c; border-radius: 8px; text-align: center; }
                .badge.rare { border: 2px solid #2196F3; }
                .badge.epic { border: 2px solid #9C27B0; }
                .badge.legendary { border: 2px solid #FF9800; }
            </style>
        </head>
        <body>
            <div class="level-info">
                <h1>Level ${this.userLevel}</h1>
                <p>${this.userXP} XP | Next level: ${(this.userLevel * 1000) - this.userXP} XP to go</p>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${(this.userXP % 1000) / 10}%"></div>
                </div>
            </div>

            <div class="section">
                <h2>🏆 Achievements (${unlockedAchievements.length}/${this.achievements.length})</h2>
                ${this.achievements.map(achievement => `
                    <div class="achievement ${achievement.unlocked ? 'unlocked' : 'locked'}">
                        <div class="achievement-icon">${achievement.icon}</div>
                        <div style="flex: 1;">
                            <h3>${achievement.title}</h3>
                            <p>${achievement.description}</p>
                            ${!achievement.unlocked ? `
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${(achievement.progress / achievement.maxProgress) * 100}%"></div>
                                </div>
                                <small>${achievement.progress}/${achievement.maxProgress}</small>
                            ` : `<small>Unlocked ${achievement.unlockedAt?.toLocaleDateString()}</small>`}
                        </div>
                        <div style="text-align: right;">
                            <strong>+${achievement.xp} XP</strong>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="section">
                <h2>🎖️ Badges (${earnedBadges.length}/${this.badges.length})</h2>
                <div>
                    ${this.badges.map(badge => `
                        <div class="badge ${badge.rarity} ${badge.earned ? '' : 'locked'}">
                            <div style="font-size: 2em;">${badge.icon}</div>
                            <div><strong>${badge.name}</strong></div>
                            <div><small>${badge.description}</small></div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="section">
                <h2>🎯 Daily Challenges</h2>
                ${activeChallenges.map(challenge => `
                    <div class="achievement">
                        <div style="flex: 1;">
                            <h3>${challenge.title}</h3>
                            <p>${challenge.description}</p>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${(challenge.progress / challenge.target) * 100}%"></div>
                            </div>
                            <small>${challenge.progress}/${challenge.target}</small>
                        </div>
                        <div style="text-align: right;">
                            <strong>+${challenge.reward.xp} XP</strong>
                        </div>
                    </div>
                `).join('')}
            </div>
        </body>
        </html>`;
    }

    private getLeaderboardHtml(leaderboard: any[]): string {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
                .leaderboard-item { display: flex; align-items: center; padding: 15px; margin: 10px 0; background: #2d2d30; border-radius: 8px; }
                .rank { font-size: 1.5em; font-weight: bold; margin-right: 20px; width: 40px; }
                .rank.first { color: #FFD700; }
                .rank.second { color: #C0C0C0; }
                .rank.third { color: #CD7F32; }
            </style>
        </head>
        <body>
            <h1>🏆 Global Leaderboard</h1>
            ${leaderboard.map((player, index) => `
                <div class="leaderboard-item">
                    <div class="rank ${index === 0 ? 'first' : index === 1 ? 'second' : index === 2 ? 'third' : ''}">#${index + 1}</div>
                    <div style="flex: 1;">
                        <h3>${player.name}</h3>
                        <p>Level ${player.level}</p>
                    </div>
                    <div style="text-align: right;">
                        <strong>${player.xp.toLocaleString()} XP</strong>
                    </div>
                </div>
            `).join('')}
        </body>
        </html>`;
    }

    private loadGameData() {
        const saved = this.context.globalState.get('gamificationData', {});
        this.userLevel = saved.userLevel || 1;
        this.userXP = saved.userXP || 0;
        this.streak = saved.streak || 0;
    }

    private saveGameData() {
        this.context.globalState.update('gamificationData', {
            userLevel: this.userLevel,
            userXP: this.userXP,
            streak: this.streak,
            achievements: this.achievements,
            badges: this.badges,
            challenges: this.challenges
        });
    }
}