import * as vscode from 'vscode';

interface ProductivityPattern {
    hour: number;
    productivity: number;
    focus: number;
}

interface PredictionResult {
    trend: 'increasing' | 'decreasing' | 'stable';
    confidence: number;
    recommendation: string;
}

export class MLAnalytics {
    private patterns: ProductivityPattern[] = [];
    private historicalData: any[] = [];

    constructor(private context: vscode.ExtensionContext) {
        this.loadHistoricalData();
    }

    predictProductivityTrends(): PredictionResult {
        if (this.historicalData.length < 7) {
            return {
                trend: 'stable',
                confidence: 0.5,
                recommendation: 'Need more data for accurate predictions'
            };
        }

        const recentWeek = this.historicalData.slice(-7);
        const previousWeek = this.historicalData.slice(-14, -7);
        
        const recentAvg = recentWeek.reduce((sum, day) => sum + day.productivity, 0) / 7;
        const previousAvg = previousWeek.reduce((sum, day) => sum + day.productivity, 0) / 7;
        
        const change = (recentAvg - previousAvg) / previousAvg;
        
        let trend: 'increasing' | 'decreasing' | 'stable';
        let recommendation: string;
        
        if (change > 0.1) {
            trend = 'increasing';
            recommendation = 'Great momentum! Keep up the current routine.';
        } else if (change < -0.1) {
            trend = 'decreasing';
            recommendation = 'Consider adjusting your schedule or taking breaks.';
        } else {
            trend = 'stable';
            recommendation = 'Consistent performance. Try new challenges to grow.';
        }

        return {
            trend,
            confidence: Math.min(0.9, this.historicalData.length / 30),
            recommendation
        };
    }

    getPersonalizedRecommendations(): string[] {
        const recommendations: string[] = [];
        const optimalHours = this.getOptimalCodingTimes();
        
        if (optimalHours.length > 0) {
            recommendations.push(`Your peak productivity hours are ${optimalHours.join(', ')}:00`);
        }
        
        const burnoutRisk = this.detectBurnoutRisk();
        if (burnoutRisk > 0.7) {
            recommendations.push('High burnout risk detected. Consider taking breaks.');
        }
        
        const languageInsights = this.getLanguageInsights();
        if (languageInsights) {
            recommendations.push(languageInsights);
        }
        
        return recommendations;
    }

    detectBurnoutRisk(): number {
        const recentDays = this.historicalData.slice(-14);
        if (recentDays.length < 7) return 0;
        
        let riskFactors = 0;
        
        // Long consecutive days
        const consecutiveDays = this.getConsecutiveCodingDays();
        if (consecutiveDays > 10) riskFactors += 0.3;
        
        // Declining productivity
        const trend = this.predictProductivityTrends();
        if (trend.trend === 'decreasing') riskFactors += 0.2;
        
        // Excessive hours
        const avgDailyHours = recentDays.reduce((sum, day) => sum + day.hours, 0) / recentDays.length;
        if (avgDailyHours > 10) riskFactors += 0.3;
        
        // Weekend work
        const weekendWork = recentDays.filter(day => day.isWeekend && day.hours > 2).length;
        if (weekendWork > 2) riskFactors += 0.2;
        
        return Math.min(1, riskFactors);
    }

    getOptimalCodingTimes(): number[] {
        const hourlyProductivity = new Array(24).fill(0);
        const hourlyCounts = new Array(24).fill(0);
        
        this.historicalData.forEach(day => {
            if (day.hourlyData) {
                day.hourlyData.forEach((productivity: number, hour: number) => {
                    if (productivity > 0) {
                        hourlyProductivity[hour] += productivity;
                        hourlyCounts[hour]++;
                    }
                });
            }
        });
        
        const averages = hourlyProductivity.map((total, hour) => 
            hourlyCounts[hour] > 0 ? total / hourlyCounts[hour] : 0
        );
        
        const maxProductivity = Math.max(...averages);
        const threshold = maxProductivity * 0.8;
        
        return averages
            .map((avg, hour) => ({ hour, avg }))
            .filter(item => item.avg >= threshold)
            .map(item => item.hour);
    }

    private getConsecutiveCodingDays(): number {
        let consecutive = 0;
        let maxConsecutive = 0;
        
        this.historicalData.slice(-30).forEach(day => {
            if (day.hours > 0) {
                consecutive++;
                maxConsecutive = Math.max(maxConsecutive, consecutive);
            } else {
                consecutive = 0;
            }
        });
        
        return maxConsecutive;
    }

    private getLanguageInsights(): string | null {
        const languageTime = new Map<string, number>();
        
        this.historicalData.slice(-30).forEach(day => {
            if (day.languages) {
                Object.entries(day.languages).forEach(([lang, time]) => {
                    languageTime.set(lang, (languageTime.get(lang) || 0) + (time as number));
                });
            }
        });
        
        if (languageTime.size === 0) return null;
        
        const sortedLanguages = Array.from(languageTime.entries())
            .sort(([,a], [,b]) => b - a);
        
        const topLanguage = sortedLanguages[0];
        const totalTime = Array.from(languageTime.values()).reduce((sum, time) => sum + time, 0);
        const percentage = (topLanguage[1] / totalTime * 100).toFixed(1);
        
        return `You spend ${percentage}% of your time coding in ${topLanguage[0]}`;
    }

    generateWeeklyReport(): any {
        const weekData = this.historicalData.slice(-7);
        const totalHours = weekData.reduce((sum, day) => sum + day.hours, 0);
        const avgProductivity = weekData.reduce((sum, day) => sum + day.productivity, 0) / 7;
        
        return {
            totalHours: Math.round(totalHours * 10) / 10,
            avgProductivity: Math.round(avgProductivity),
            burnoutRisk: this.detectBurnoutRisk(),
            recommendations: this.getPersonalizedRecommendations(),
            trends: this.predictProductivityTrends(),
            optimalHours: this.getOptimalCodingTimes()
        };
    }

    private loadHistoricalData() {
        this.historicalData = this.context.globalState.get('historicalData', []);
        
        // Generate sample data if empty
        if (this.historicalData.length === 0) {
            this.generateSampleData();
        }
    }

    private generateSampleData() {
        const sampleData = [];
        for (let i = 30; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            
            sampleData.push({
                date: date.toISOString(),
                hours: Math.random() * 8 + 2,
                productivity: Math.random() * 40 + 60,
                isWeekend: date.getDay() === 0 || date.getDay() === 6,
                languages: {
                    typescript: Math.random() * 3,
                    javascript: Math.random() * 2,
                    python: Math.random() * 1
                },
                hourlyData: Array.from({length: 24}, () => Math.random() * 100)
            });
        }
        
        this.historicalData = sampleData;
        this.context.globalState.update('historicalData', sampleData);
    }
}