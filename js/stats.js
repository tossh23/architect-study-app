/**
 * 統計・可視化モジュール
 */

const Stats = {
    subjectChart: null,
    progressChart: null,
    yearChart: null,

    /**
     * 統計ページを初期化
     */
    async init() {
        await this.loadStats();
    },

    /**
     * 統計を読み込み・表示
     */
    async loadStats() {
        const stats = await db.getStatsBySubject();
        const history = await db.getAllHistory();
        const questions = await db.getAllQuestions();

        this.renderSubjectChart(stats);
        this.renderProgressChart(history);
        this.renderStatsTable(stats);
        await this.renderYearChart(questions, history);
        await this.renderMasterySection(questions, history);
    },

    /**
     * 科目別正答率チャートを描画
     */
    renderSubjectChart(stats) {
        const ctx = document.getElementById('subjectChart').getContext('2d');

        const labels = [
            '計画',
            '環境・設備',
            '法規',
            '構造',
            '施工'
        ];

        const data = [
            stats[1].accuracy,
            stats[2].accuracy,
            stats[3].accuracy,
            stats[4].accuracy,
            stats[5].accuracy
        ];

        const colors = [
            '#3b82f6',
            '#22c55e',
            '#f59e0b',
            '#ef4444',
            '#8b5cf6'
        ];

        if (this.subjectChart) {
            this.subjectChart.destroy();
        }

        this.subjectChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '正答率 (%)',
                    data: data,
                    backgroundColor: colors.map(c => c + '80'),
                    borderColor: colors,
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            color: '#334155'
                        },
                        ticks: {
                            color: '#94a3b8',
                            callback: value => value + '%'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#94a3b8'
                        }
                    }
                }
            }
        });
    },

    /**
     * 学習推移チャートを描画
     */
    renderProgressChart(history) {
        const ctx = document.getElementById('progressChart').getContext('2d');

        // 直近30日のデータを集計
        const days = 30;
        const now = new Date();
        const labels = [];
        const correctData = [];
        const totalData = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            labels.push(`${date.getMonth() + 1}/${date.getDate()}`);

            const dayHistory = history.filter(h => {
                const hDate = new Date(h.answeredAt).toISOString().split('T')[0];
                return hDate === dateStr;
            });

            totalData.push(dayHistory.length);
            correctData.push(dayHistory.filter(h => h.isCorrect).length);
        }

        if (this.progressChart) {
            this.progressChart.destroy();
        }

        this.progressChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '解答数',
                        data: totalData,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: '正解数',
                        data: correctData,
                        borderColor: '#22c55e',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#94a3b8'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#334155'
                        },
                        ticks: {
                            color: '#94a3b8'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#94a3b8',
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                }
            }
        });
    },

    /**
     * 統計テーブルを描画
     */
    renderStatsTable(stats) {
        const tbody = document.getElementById('statsTableBody');

        const subjects = [
            { id: 1, name: '学科Ⅰ（計画）' },
            { id: 2, name: '学科Ⅱ（環境・設備）' },
            { id: 3, name: '学科Ⅲ（法規）' },
            { id: 4, name: '学科Ⅳ（構造）' },
            { id: 5, name: '学科Ⅴ（施工）' }
        ];

        tbody.innerHTML = subjects.map(subject => {
            const s = stats[subject.id];
            return `
                <tr>
                    <td>${subject.name}</td>
                    <td>${s.totalQuestions}</td>
                    <td>${s.totalAnswered}</td>
                    <td>${s.correctCount}</td>
                    <td>${s.accuracy}%</td>
                </tr>
            `;
        }).join('');

        // 合計行
        const total = {
            questions: Object.values(stats).reduce((a, b) => a + b.totalQuestions, 0),
            answered: Object.values(stats).reduce((a, b) => a + b.totalAnswered, 0),
            correct: Object.values(stats).reduce((a, b) => a + b.correctCount, 0)
        };
        total.accuracy = total.answered > 0 ? Math.round((total.correct / total.answered) * 100) : 0;

        tbody.innerHTML += `
            <tr style="font-weight: bold; background: var(--bg-tertiary);">
                <td>合計</td>
                <td>${total.questions}</td>
                <td>${total.answered}</td>
                <td>${total.correct}</td>
                <td>${total.accuracy}%</td>
            </tr>
        `;
    },

    /**
     * 年度別正答率チャートを描画
     */
    async renderYearChart(questions, history) {
        const ctx = document.getElementById('yearChart');
        if (!ctx) return;

        // 年度を抽出してソート
        const years = [...new Set(questions.map(q => q.year))].sort();
        if (years.length === 0) return;

        const labels = years.map(y => Utils.toJapaneseYear(y));
        const accuracyData = [];

        for (const year of years) {
            const yearQuestions = questions.filter(q => q.year === year);
            const yearQuestionIds = yearQuestions.map(q => q.id);
            const yearHistory = history.filter(h => yearQuestionIds.includes(h.questionId));

            const total = yearHistory.length;
            const correct = yearHistory.filter(h => h.isCorrect).length;
            const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
            accuracyData.push(accuracy);
        }

        if (this.yearChart) {
            this.yearChart.destroy();
        }

        this.yearChart = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '正答率 (%)',
                    data: accuracyData,
                    backgroundColor: '#8b5cf680',
                    borderColor: '#8b5cf6',
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: { color: '#334155' },
                        ticks: { color: '#94a3b8', callback: v => v + '%' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8' }
                    }
                }
            }
        });
    },

    /**
     * 達成度（王冠）セクションを描画
     */
    async renderMasterySection(questions, history) {
        const container = document.getElementById('masterySection');
        if (!container) return;

        // 年度・科目別にグループ化
        const years = [...new Set(questions.map(q => q.year))].sort().reverse();

        let html = '';
        for (const year of years) {
            html += `<div class="mastery-year">`;
            html += `<h4>${Utils.toJapaneseYear(year)}</h4>`;

            for (let subject = 1; subject <= 5; subject++) {
                const subjectQuestions = questions.filter(q => q.year === year && q.subject === subject);
                if (subjectQuestions.length === 0) continue;

                // 問題番号順にソート
                subjectQuestions.sort((a, b) => a.questionNumber - b.questionNumber);

                html += `<div class="mastery-subject">`;
                html += `<span class="mastery-subject-label">${Utils.getSubjectShortName(subject)}</span>`;
                html += `<div class="mastery-grid">`;

                for (const q of subjectQuestions) {
                    const crown = this.getCrownForQuestion(q.id, history);
                    html += `<div class="mastery-item" title="問${q.questionNumber}">`;
                    html += `<span class="crown ${crown.class}">${crown.icon}</span>`;
                    html += `</div>`;
                }

                html += `</div></div>`;
            }
            html += `</div>`;
        }

        container.innerHTML = html || '<p class="text-muted">問題データがありません</p>';
    },

    /**
     * 問題の王冠を判定
     */
    getCrownForQuestion(questionId, history) {
        // 直近2回の履歴を取得
        const qHistory = history
            .filter(h => h.questionId === questionId)
            .sort((a, b) => new Date(b.answeredAt) - new Date(a.answeredAt))
            .slice(0, 2);

        if (qHistory.length === 0) {
            return { icon: '○', class: 'crown-empty' }; // 未解答
        }

        const last1 = qHistory[0]?.isCorrect;
        const last2 = qHistory[1]?.isCorrect;

        if (qHistory.length >= 2 && last1 && last2) {
            return { icon: '♛', class: 'crown-gold' }; // 2回連続正解
        } else if (last1) {
            return { icon: '♛', class: 'crown-silver' }; // 直近1回正解
        } else if (qHistory.length >= 2 && !last1 && !last2) {
            return { icon: '♛', class: 'crown-black' }; // 2回連続不正解
        } else {
            return { icon: '♛', class: 'crown-bronze' }; // 直近1回不正解
        }
    }
};

/**
 * 履歴ページモジュール
 */
const History = {
    currentMonth: new Date(),

    /**
     * 履歴ページを初期化
     */
    async init() {
        await this.loadHistory();
    },

    /**
     * 履歴を読み込み・表示
     */
    async loadHistory() {
        const history = await db.getAllHistory();
        const questions = await db.getAllQuestions();

        this.renderCalendar(history);
        this.renderHistoryList(history, questions);
    },

    /**
     * カレンダーを描画
     */
    renderCalendar(history) {
        const container = document.getElementById('historyCalendar');
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();

        // 学習した日をセットに変換
        const studyDays = new Set();
        history.forEach(h => {
            const date = new Date(h.answeredAt);
            if (date.getFullYear() === year && date.getMonth() === month) {
                studyDays.add(date.getDate());
            }
        });

        // 月の最初と最後の日
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDayOfWeek = firstDay.getDay();
        const today = new Date();

        container.innerHTML = `
            <div class="calendar-header">
                <h3>${year}年${month + 1}月</h3>
                <div class="calendar-nav">
                    <button class="btn btn-ghost" onclick="History.prevMonth()">←</button>
                    <button class="btn btn-ghost" onclick="History.nextMonth()">→</button>
                </div>
            </div>
            <div class="calendar-grid">
                <div class="calendar-day-header">日</div>
                <div class="calendar-day-header">月</div>
                <div class="calendar-day-header">火</div>
                <div class="calendar-day-header">水</div>
                <div class="calendar-day-header">木</div>
                <div class="calendar-day-header">金</div>
                <div class="calendar-day-header">土</div>
                ${this.generateCalendarDays(startDayOfWeek, lastDay.getDate(), studyDays, today, year, month)}
            </div>
        `;
    },

    /**
     * カレンダーの日付を生成
     */
    generateCalendarDays(startDayOfWeek, daysInMonth, studyDays, today, year, month) {
        let html = '';

        // 空白日
        for (let i = 0; i < startDayOfWeek; i++) {
            html += '<div class="calendar-day empty"></div>';
        }

        // 日付
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = today.getFullYear() === year &&
                today.getMonth() === month &&
                today.getDate() === day;
            const hasActivity = studyDays.has(day);

            let classes = 'calendar-day';
            if (isToday) classes += ' today';
            if (hasActivity) classes += ' has-activity';

            html += `<div class="${classes}">${day}</div>`;
        }

        return html;
    },

    /**
     * 前月へ
     */
    async prevMonth() {
        this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
        await this.loadHistory();
    },

    /**
     * 次月へ
     */
    async nextMonth() {
        this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
        await this.loadHistory();
    },

    /**
     * 履歴リストを描画
     */
    renderHistoryList(history, questions) {
        const container = document.getElementById('historyList');

        // 日付でソート（新しい順）
        const sortedHistory = [...history].sort((a, b) =>
            new Date(b.answeredAt) - new Date(a.answeredAt)
        ).slice(0, 50); // 直近50件

        if (sortedHistory.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p class="text-muted">学習履歴がありません</p>
                </div>
            `;
            return;
        }

        container.innerHTML = sortedHistory.map(h => {
            const question = questions.find(q => q.id === h.questionId);
            if (!question) return '';

            return `
                <div class="history-item">
                    <div class="history-date">${Utils.formatDate(h.answeredAt)}</div>
                    <div class="history-content">
                        ${Utils.toJapaneseYear(question.year)} ${Utils.getSubjectShortName(question.subject)} 問${question.questionNumber}
                    </div>
                    <div class="history-result ${h.isCorrect ? 'correct' : 'wrong'}">
                        ${h.isCorrect ? '⭕ 正解' : '❌ 不正解'}
                    </div>
                </div>
            `;
        }).join('');
    }
};
