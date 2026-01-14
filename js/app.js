/**
 * メインアプリケーションモジュール
 */

const App = {
    currentPage: 'home',

    /**
     * アプリを初期化
     */
    async init() {
        try {
            // データベース初期化
            await db.init();

            // 組み込み問題を自動ロード
            await this.loadBuiltinQuestions();

            // Service Worker登録
            this.registerServiceWorker();

            // イベントリスナー設定
            this.setupEventListeners();

            // ホーム画面の統計を更新
            await this.updateHomeStats();

            // 問題管理を初期化
            await Questions.init();

            console.log('App initialized successfully');
        } catch (error) {
            console.error('App initialization failed:', error);
            Utils.showToast('アプリの初期化に失敗しました', 'error');
        }
    },

    /**
     * 組み込み問題を自動ロード
     */
    async loadBuiltinQuestions() {
        if (typeof BUILTIN_QUESTIONS === 'undefined' || !BUILTIN_QUESTIONS.length) {
            return;
        }

        let loaded = 0;
        for (const q of BUILTIN_QUESTIONS) {
            try {
                const existing = await db.getQuestion(q.id);
                if (!existing) {
                    await db.addQuestion({
                        ...q,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    });
                    loaded++;
                }
            } catch (e) {
                console.error('Error loading builtin question:', q.id, e);
            }
        }

        if (loaded > 0) {
            console.log(`Loaded ${loaded} builtin questions`);
        }
    },

    /**
     * Service Workerを登録
     */
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js')
                .then(registration => {
                    console.log('SW registered:', registration);
                })
                .catch(error => {
                    console.log('SW registration failed:', error);
                });
        }
    },

    /**
     * イベントリスナーを設定
     */
    setupEventListeners() {
        // メニューボタン
        const menuBtn = document.getElementById('menuBtn');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');

        menuBtn.addEventListener('click', () => {
            menuBtn.classList.toggle('active');
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        });

        overlay.addEventListener('click', () => {
            menuBtn.classList.remove('active');
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });

        // サイドバーメニュー
        document.querySelectorAll('.sidebar-menu a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                this.showPage(page);

                // モバイルではメニューを閉じる
                menuBtn.classList.remove('active');
                sidebar.classList.remove('open');
                overlay.classList.remove('active');
            });
        });

        // 科目カード
        document.querySelectorAll('.subject-card').forEach(card => {
            card.addEventListener('click', async () => {
                const subject = parseInt(card.dataset.subject);
                const success = await Study.start({ mode: 'subject', subject });
                if (success) {
                    this.showPage('study');
                }
            });
        });

        // ランダム出題ボタン
        document.getElementById('startRandomStudy').addEventListener('click', async () => {
            const success = await Study.start({ mode: 'all' });
            if (success) {
                this.showPage('study');
            }
        });

        // 間違えた問題のみボタン
        document.getElementById('startWrongOnly').addEventListener('click', async () => {
            const success = await Study.start({ mode: 'wrong' });
            if (success) {
                this.showPage('study');
            }
        });

        // 学習画面の戻るボタン
        document.getElementById('backToHome').addEventListener('click', () => {
            Study.abort();
        });

        // 次の問題ボタン
        document.getElementById('nextQuestion').addEventListener('click', () => {
            Study.nextQuestion();
        });

        // 問題を編集ボタン（学習中）
        document.getElementById('editCurrentQuestion').addEventListener('click', () => {
            const question = Study.getCurrentQuestion();
            if (question) {
                Questions.openEditModal(question.id);
            }
        });

        // 設定画面のボタン
        document.getElementById('exportData').addEventListener('click', async () => {
            await this.exportData();
        });

        document.getElementById('importData').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });

        document.getElementById('importFile').addEventListener('change', async (e) => {
            if (e.target.files[0]) {
                await this.importData(e.target.files[0]);
                e.target.value = '';
            }
        });

        document.getElementById('deleteAllData').addEventListener('click', async () => {
            await this.deleteAllData();
        });
    },

    /**
     * ページを表示
     */
    async showPage(page) {
        // 現在のページを非表示
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });

        // 新しいページを表示
        const pageEl = document.getElementById(`page-${page}`);
        if (pageEl) {
            pageEl.classList.add('active');
        }

        // メニューのアクティブ状態を更新
        document.querySelectorAll('.sidebar-menu a').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.page === page) {
                link.classList.add('active');
            }
        });

        this.currentPage = page;

        // ページごとの初期化
        if (page === 'stats') {
            await Stats.init();
        } else if (page === 'history') {
            await History.init();
        } else if (page === 'home') {
            await this.updateHomeStats();
        }
    },

    /**
     * ホーム画面の統計を更新
     */
    async updateHomeStats() {
        const questions = await db.getAllQuestions();
        const history = await db.getAllHistory();
        const stats = await db.getStatsBySubject();

        // 全体統計
        document.getElementById('totalQuestions').textContent = questions.length;
        document.getElementById('totalAnswered').textContent = history.length;

        const totalCorrect = history.filter(h => h.isCorrect).length;
        const overallAccuracy = history.length > 0
            ? Math.round((totalCorrect / history.length) * 100)
            : 0;
        document.getElementById('overallAccuracy').textContent = `${overallAccuracy}%`;

        // 科目別統計
        document.querySelectorAll('.subject-card').forEach(card => {
            const subject = parseInt(card.dataset.subject);
            const s = stats[subject];

            card.querySelector('.subject-count').textContent = `${s.totalQuestions}問`;
            card.querySelector('.subject-accuracy').textContent =
                s.totalAnswered > 0 ? `正答率 ${s.accuracy}%` : '--';
        });
    },

    /**
     * データをエクスポート
     */
    async exportData() {
        try {
            const data = await db.exportData();
            const filename = `architect-study-backup-${new Date().toISOString().split('T')[0]}.json`;
            Utils.downloadJSON(data, filename);
            Utils.showToast('データをエクスポートしました', 'success');
        } catch (error) {
            console.error('Export error:', error);
            Utils.showToast('エクスポートに失敗しました', 'error');
        }
    },

    /**
     * データをインポート
     */
    async importData(file) {
        try {
            const data = await Utils.readJSONFile(file);
            await db.importData(data);
            await this.updateHomeStats();
            await Questions.loadQuestions();
            Utils.showToast('データをインポートしました', 'success');
        } catch (error) {
            console.error('Import error:', error);
            Utils.showToast('インポートに失敗しました', 'error');
        }
    },

    /**
     * 全データを削除
     */
    async deleteAllData() {
        const confirmed = await Utils.confirm(
            'すべてのデータを削除しますか？この操作は元に戻せません。'
        );

        if (!confirmed) return;

        try {
            await db.deleteAllData();
            await this.updateHomeStats();
            await Questions.loadQuestions();
            Utils.showToast('すべてのデータを削除しました', 'success');
        } catch (error) {
            console.error('Delete error:', error);
            Utils.showToast('削除に失敗しました', 'error');
        }
    }
};

// アプリ起動
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
