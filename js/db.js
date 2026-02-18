/**
 * IndexedDB データベース管理モジュール
 */

const DB_NAME = 'ArchitectStudyDB';
const DB_VERSION = 1;

class Database {
    constructor() {
        this.db = null;
    }

    /**
     * データベースを初期化
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // 問題ストア
                if (!db.objectStoreNames.contains('questions')) {
                    const questionStore = db.createObjectStore('questions', { keyPath: 'id' });
                    questionStore.createIndex('subject', 'subject', { unique: false });
                    questionStore.createIndex('year', 'year', { unique: false });
                    questionStore.createIndex('subjectYear', ['subject', 'year'], { unique: false });
                }

                // 学習履歴ストア
                if (!db.objectStoreNames.contains('history')) {
                    const historyStore = db.createObjectStore('history', { keyPath: 'id' });
                    historyStore.createIndex('questionId', 'questionId', { unique: false });
                    historyStore.createIndex('answeredAt', 'answeredAt', { unique: false });
                    historyStore.createIndex('isCorrect', 'isCorrect', { unique: false });
                }
            };
        });
    }

    /**
     * 問題を追加
     */
    async addQuestion(question) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['questions'], 'readwrite');
            const store = transaction.objectStore('questions');
            const request = store.add(question);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 問題を更新
     */
    async updateQuestion(question) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['questions'], 'readwrite');
            const store = transaction.objectStore('questions');
            const request = store.put(question);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 問題を削除
     */
    async deleteQuestion(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['questions'], 'readwrite');
            const store = transaction.objectStore('questions');
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 問題を取得
     */
    async getQuestion(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['questions'], 'readonly');
            const store = transaction.objectStore('questions');
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 全問題を取得
     */
    async getAllQuestions() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['questions'], 'readonly');
            const store = transaction.objectStore('questions');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 科目別に問題を取得
     */
    async getQuestionsBySubject(subject) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['questions'], 'readonly');
            const store = transaction.objectStore('questions');
            const index = store.index('subject');
            const request = index.getAll(subject);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 年度別に問題を取得
     */
    async getQuestionsByYear(year) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['questions'], 'readonly');
            const store = transaction.objectStore('questions');
            const index = store.index('year');
            const request = index.getAll(year);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 年度と科目で問題を取得
     */
    async getQuestionsByYearAndSubject(year, subject) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['questions'], 'readonly');
            const store = transaction.objectStore('questions');
            const index = store.index('subjectYear');
            const request = index.getAll([parseInt(subject), parseInt(year)]);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 学習履歴を追加
     */
    async addHistory(history) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['history'], 'readwrite');
            const store = transaction.objectStore('history');
            const request = store.add(history);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 全学習履歴を取得
     */
    async getAllHistory() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['history'], 'readonly');
            const store = transaction.objectStore('history');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 問題IDで学習履歴を取得
     */
    async getHistoryByQuestionId(questionId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['history'], 'readonly');
            const store = transaction.objectStore('history');
            const index = store.index('questionId');
            const request = index.getAll(questionId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 間違えた問題のIDリストを取得
     */
    async getWrongQuestionIds() {
        const history = await this.getAllHistory();
        const wrongIds = new Set();
        const correctIds = new Set();

        // 最新の回答結果で判定
        history.sort((a, b) => new Date(b.answeredAt) - new Date(a.answeredAt));

        for (const item of history) {
            if (!correctIds.has(item.questionId) && !wrongIds.has(item.questionId)) {
                if (item.isCorrect) {
                    correctIds.add(item.questionId);
                } else {
                    wrongIds.add(item.questionId);
                }
            }
        }

        return Array.from(wrongIds);
    }

    /**
     * 科目別統計を取得
     */
    async getStatsBySubject() {
        const questions = await this.getAllQuestions();
        const history = await this.getAllHistory();

        const stats = {};
        for (let i = 1; i <= 5; i++) {
            stats[i] = {
                subject: i,
                totalQuestions: 0,
                totalAnswered: 0,
                correctCount: 0,
                accuracy: 0
            };
        }

        // 問題数をカウント
        for (const q of questions) {
            if (stats[q.subject]) {
                stats[q.subject].totalQuestions++;
            }
        }

        // 回答をカウント
        for (const h of history) {
            const question = questions.find(q => q.id === h.questionId);
            if (question && stats[question.subject]) {
                stats[question.subject].totalAnswered++;
                if (h.isCorrect) {
                    stats[question.subject].correctCount++;
                }
            }
        }

        // 正答率を計算
        for (const key in stats) {
            if (stats[key].totalAnswered > 0) {
                stats[key].accuracy = Math.round((stats[key].correctCount / stats[key].totalAnswered) * 100);
            }
        }

        return stats;
    }

    /**
     * 分類別統計を取得（指定科目）
     */
    async getStatsByField(subject) {
        const questions = await this.getAllQuestions();
        const history = await this.getAllHistory();

        // 指定科目の問題のみ
        const subjectQuestions = questions.filter(q => q.subject === subject);

        // 分類リストを取得
        if (typeof getAllFieldsList !== 'function') return [];
        const fieldsList = getAllFieldsList(subject);

        // 問題IDからquestionオブジェクトへのマップ
        const questionMap = {};
        for (const q of subjectQuestions) {
            questionMap[q.id] = q;
        }

        // 各分類の統計を計算
        const stats = fieldsList.map(fieldDef => {
            // この分類に属する問題を集計
            const fieldQuestions = subjectQuestions.filter(q =>
                typeof matchesField === 'function' && matchesField(q.field, fieldDef.id)
            );

            let totalAnswered = 0;
            let correctCount = 0;

            for (const h of history) {
                const q = questionMap[h.questionId];
                if (q && typeof matchesField === 'function' && matchesField(q.field, fieldDef.id)) {
                    totalAnswered++;
                    if (h.isCorrect) correctCount++;
                }
            }

            return {
                ...fieldDef,
                totalQuestions: fieldQuestions.length,
                totalAnswered,
                correctCount,
                accuracy: totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0
            };
        });

        return stats;
    }

    /**
     * 全問題を一括削除
     */
    async clearAllQuestions() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['questions'], 'readwrite');
            const store = transaction.objectStore('questions');
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * 複数問題を一括追加（バッチ処理）
     */
    async addQuestionsBatch(questions) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['questions'], 'readwrite');
            const store = transaction.objectStore('questions');

            for (const question of questions) {
                store.put(question);
            }

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    /**
     * 複数履歴を一括追加（バッチ処理）
     */
    async addHistoryBatch(historyItems) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['history'], 'readwrite');
            const store = transaction.objectStore('history');

            for (const item of historyItems) {
                store.put(item);
            }

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    /**
     * 全データをエクスポート
     */
    async exportData() {
        const questions = await this.getAllQuestions();
        const history = await this.getAllHistory();

        return {
            version: DB_VERSION,
            exportedAt: new Date().toISOString(),
            questions,
            history
        };
    }

    /**
     * データをインポート
     */
    async importData(data) {
        if (!data.questions || !data.history) {
            throw new Error('Invalid data format');
        }

        // 問題をインポート
        for (const question of data.questions) {
            await this.updateQuestion(question);
        }

        // 履歴をインポート
        const transaction = this.db.transaction(['history'], 'readwrite');
        const store = transaction.objectStore('history');

        for (const item of data.history) {
            store.put(item);
        }

        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    /**
     * 学習履歴を削除（問題データは保持）
     */
    async deleteHistoryData() {
        const transaction = this.db.transaction(['history'], 'readwrite');

        transaction.objectStore('history').clear();

        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }
}

// グローバルインスタンス
const db = new Database();
