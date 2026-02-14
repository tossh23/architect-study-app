/**
 * メインアプリケーションモジュール
 */

const App = {
    currentPage: 'home',

    /**
     * アプリを初期化（最適化版：UI先行表示）
     */
    async init() {
        try {
            // データベース初期化
            await db.init();

            // イベントリスナー設定（即座に操作可能に）
            this.setupEventListeners();

            // ローカルキャッシュで即座にUI表示
            await this.updateHomeStats();

            // 問題管理を初期化
            await Questions.init();

            // Service Worker登録
            this.registerServiceWorker();

            console.log('App initialized with local cache');

            // バックグラウンドでFirebase同期（非ブロッキング）
            this.initFirebaseInBackground();

        } catch (error) {
            console.error('App initialization failed:', error);
            Utils.showToast('アプリの初期化に失敗しました', 'error');
        }
    },

    /**
     * Firebaseをバックグラウンドで初期化
     */
    async initFirebaseInBackground() {
        try {
            // Firebase初期化
            await FirebaseSync.init();

            // 問題データを非同期で読み込み・更新
            await this.loadQuestionsOptimized();

            // 統計を再更新（新しいデータがあれば反映）
            await this.updateHomeStats();

            // 問題管理も更新
            await Questions.loadQuestions();

            console.log('Firebase sync completed in background');
        } catch (error) {
            console.error('Background Firebase sync failed:', error);
        }
    },

    /**
     * 問題データを最適化読み込み（バッチ処理版）
     */
    async loadQuestionsOptimized() {
        try {
            const firebaseQuestions = await FirebaseSync.loadQuestions();

            if (!firebaseQuestions || firebaseQuestions.length === 0) {
                // Firebaseに問題がない場合、ビルトイン問題を使用
                await this.loadBuiltinQuestionsOptimized();
                return;
            }

            // ハッシュ比較で変更チェック
            const newHash = this.computeQuestionsHash(firebaseQuestions);
            const storedHash = localStorage.getItem('questionsHash');

            if (storedHash === newHash) {
                console.log('Questions unchanged, skipping update');
                return;
            }

            console.log(`Updating ${firebaseQuestions.length} questions from Firebase (batch)`);

            // バッチ処理で一括更新
            await db.clearAllQuestions();

            const questionsWithTimestamp = firebaseQuestions.map(q => ({
                ...q,
                createdAt: q.createdAt || new Date().toISOString(),
                updatedAt: q.updatedAt || new Date().toISOString()
            }));

            await db.addQuestionsBatch(questionsWithTimestamp);

            localStorage.setItem('questionsHash', newHash);
            localStorage.setItem('questionsVersion', `firebase_${firebaseQuestions.length}`);
            console.log(`Synced ${firebaseQuestions.length} questions from Firebase`);

        } catch (error) {
            console.log('Could not load from Firebase:', error.message);
        }
    },

    /**
     * 問題ハッシュを計算（変更検出用）
     */
    computeQuestionsHash(questions) {
        const ids = questions.map(q => q.id).sort().join(',');
        const updatedAts = questions.map(q => q.updatedAt || '').sort().join(',');
        return `${questions.length}_${ids.length}_${updatedAts.length}`;
    },

    /**
     * ビルトイン問題をローカルDBに読み込み（最適化版）
     */
    async loadBuiltinQuestionsOptimized() {
        if (typeof BUILTIN_QUESTIONS === 'undefined' || !BUILTIN_QUESTIONS.length) {
            return;
        }

        const builtinVersion = `builtin_${BUILTIN_QUESTIONS.length}`;
        const storedVersion = localStorage.getItem('questionsVersion');

        if (storedVersion === builtinVersion) {
            console.log(`Builtin questions already loaded (${builtinVersion})`);
            return;
        }

        console.log(`Loading builtin questions: ${BUILTIN_QUESTIONS.length} (batch)`);

        // バッチ処理で一括更新
        await db.clearAllQuestions();

        const questionsWithTimestamp = BUILTIN_QUESTIONS.map(q => ({
            ...q,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }));

        await db.addQuestionsBatch(questionsWithTimestamp);

        localStorage.setItem('questionsVersion', builtinVersion);
        console.log(`Loaded ${BUILTIN_QUESTIONS.length} builtin questions`);
    },

    // 旧メソッド（互換性のため残す）
    async loadQuestions() {
        await this.loadQuestionsOptimized();
    },

    async loadBuiltinQuestionsToLocal() {
        await this.loadBuiltinQuestionsOptimized();
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

        // 年度・科目別出題（問番号順）
        document.getElementById('startYearSubjectSequential').addEventListener('click', async () => {
            const year = document.getElementById('yearSelectHome').value;
            const subject = document.getElementById('subjectSelectHome').value;
            const success = await Study.start({
                mode: 'yearSubject',
                year: year ? parseInt(year) : null,
                subject: subject ? parseInt(subject) : null,
                shuffle: false
            });
            if (success) {
                this.showPage('study');
            }
        });

        // 年度・科目別出題（ランダム）
        document.getElementById('startYearSubjectRandom').addEventListener('click', async () => {
            const year = document.getElementById('yearSelectHome').value;
            const subject = document.getElementById('subjectSelectHome').value;
            const success = await Study.start({
                mode: 'yearSubject',
                year: year ? parseInt(year) : null,
                subject: subject ? parseInt(subject) : null,
                shuffle: true
            });
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

        // 設定画面のログインボタン
        document.getElementById('loginBtn').addEventListener('click', () => {
            FirebaseSync.login();
        });

        document.getElementById('logoutBtn').addEventListener('click', () => {
            FirebaseSync.logout();
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
        } else if (page === 'mastery') {
            await Mastery.init();
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

        // 年度ドロップダウンを更新
        const yearSelect = document.getElementById('yearSelectHome');
        if (yearSelect && questions.length > 0) {
            const years = [...new Set(questions.map(q => q.year))].sort((a, b) => b - a);
            const currentValue = yearSelect.value;
            yearSelect.innerHTML = '<option value="">すべての年度</option>';
            years.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = Utils.toJapaneseYear(year);
                yearSelect.appendChild(option);
            });
            if (currentValue) {
                yearSelect.value = currentValue;
            }
        }
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
     * 学習履歴を削除
     */
    async deleteAllData() {
        const confirmed = await Utils.confirm(
            '学習履歴を削除しますか？問題データは保持されます。'
        );

        if (!confirmed) return;

        try {
            // Firebaseから先に削除（ログイン中の場合）
            // ローカルより先に削除することで、再読み込み時の再同期を防ぐ
            if (FirebaseSync.isLoggedIn()) {
                FirebaseSync.stopSync();
                await FirebaseSync.deleteAllHistory();
                await FirebaseSync.deleteAllMemos();
            }

            // ローカルデータを削除
            await db.deleteHistoryData();
            localStorage.removeItem('memos'); // メモも削除

            await this.updateHomeStats();
            Utils.showToast('学習履歴を削除しました', 'success');
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
