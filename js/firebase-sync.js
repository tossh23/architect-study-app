/**
 * Firebase連携モジュール
 * 学習履歴と問題データのクラウド同期を担当
 */
const FirebaseSync = {
    // 管理者UID（問題編集可能なユーザー）
    ADMIN_UID: 'tkBmB3Gqcdgj9qV24ozUZ0uvkDh2',

    db: null,
    auth: null,
    user: null,
    historyRef: null,
    questionsRef: null,
    unsubscribe: null,

    /**
     * Firebase初期化
     */
    async init() {
        // Firebase設定
        const firebaseConfig = {
            apiKey: "AIzaSyDmox4utFuukGQOhOCpZLC-wIRBszs3L3I",
            authDomain: "architect-study-app-3449d.firebaseapp.com",
            projectId: "architect-study-app-3449d",
            storageBucket: "architect-study-app-3449d.firebasestorage.app",
            messagingSenderId: "888623618244",
            appId: "1:888623618244:web:579c102c6e5177738c9191",
            databaseURL: "https://architect-study-app-3449d-default-rtdb.asia-southeast1.firebasedatabase.app"
        };

        // Firebase初期化
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }

        this.auth = firebase.auth();
        this.db = firebase.database();

        // リダイレクト結果を取得
        try {
            const result = await this.auth.getRedirectResult();
            if (result.user) {
                console.log('Logged in via redirect:', result.user.displayName);
                Utils.showToast('ログインしました', 'success');
            }
        } catch (error) {
            console.error('Redirect result error:', error);
        }

        // 認証状態の監視
        this.auth.onAuthStateChanged((user) => {
            this.user = user;
            this.updateUI();
            if (user) {
                this.startSync();
            } else {
                this.stopSync();
            }
        });

        console.log('Firebase initialized');
    },

    /**
     * Googleログイン（ポップアップ方式）
     */
    async login() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            // ポップアップ方式でログイン
            const result = await this.auth.signInWithPopup(provider);
            if (result.user) {
                console.log('Logged in:', result.user.displayName);
                Utils.showToast('ログインしました', 'success');
            }
        } catch (error) {
            console.error('Login error:', error);
            let message = 'ログインに失敗しました';
            if (error.code === 'auth/unauthorized-domain') {
                message = 'ドメインが未承認です';
            } else if (error.code === 'auth/popup-blocked') {
                message = 'ポップアップがブロックされました';
            } else if (error.code === 'auth/popup-closed-by-user') {
                message = 'ログインがキャンセルされました';
            } else if (error.code) {
                message = `エラー: ${error.code}`;
            }
            Utils.showToast(message, 'error');
        }
    },

    /**
     * ログアウト
     */
    async logout() {
        try {
            await this.auth.signOut();
            Utils.showToast('ログアウトしました', 'success');
        } catch (error) {
            console.error('Logout error:', error);
        }
    },

    /**
     * UIを更新
     */
    updateUI() {
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const userInfo = document.getElementById('userInfo');
        const syncStatus = document.getElementById('syncStatus');

        if (this.user) {
            if (loginBtn) loginBtn.classList.add('hidden');
            if (logoutBtn) logoutBtn.classList.remove('hidden');
            if (userInfo) {
                userInfo.textContent = this.user.displayName || this.user.email;
                userInfo.classList.remove('hidden');
            }
            if (syncStatus) {
                syncStatus.textContent = '同期中';
                syncStatus.classList.add('syncing');
            }
        } else {
            if (loginBtn) loginBtn.classList.remove('hidden');
            if (logoutBtn) logoutBtn.classList.add('hidden');
            if (userInfo) userInfo.classList.add('hidden');
            if (syncStatus) {
                syncStatus.textContent = '未ログイン';
                syncStatus.classList.remove('syncing');
            }
        }

        // 管理者専用UI要素の表示制御
        const isAdmin = this.isAdmin();
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = isAdmin ? '' : 'none';
        });
    },

    /**
     * 同期を開始（最適化版：バッチ処理）
     */
    async startSync() {
        if (!this.user) return;

        this.historyRef = this.db.ref(`users/${this.user.uid}/history`);

        try {
            // クラウドの履歴を一括取得
            const snapshot = await this.historyRef.once('value');
            const cloudHistory = snapshot.val() || {};
            const cloudHistoryIds = new Set(Object.keys(cloudHistory));

            // ローカル履歴を取得
            const localHistory = await db.getAllHistory();
            const localHistoryIds = new Set(localHistory.map(h => h.id));

            // クラウドにないローカル履歴を一括アップロード
            const toUpload = localHistory.filter(h => !cloudHistoryIds.has(h.id));
            if (toUpload.length > 0) {
                const updates = {};
                for (const item of toUpload) {
                    updates[item.id] = item;
                }
                await this.historyRef.update(updates);
                console.log(`Uploaded ${toUpload.length} history items to cloud`);
            }

            // ローカルにないクラウド履歴を一括ダウンロード
            const toDownload = Object.values(cloudHistory).filter(h => !localHistoryIds.has(h.id));
            if (toDownload.length > 0) {
                await db.addHistoryBatch(toDownload);
                console.log(`Downloaded ${toDownload.length} history items from cloud`);

                // UIを更新（バックグラウンドで）
                if (typeof App !== 'undefined') {
                    App.updateHomeStats();
                }
            }

            console.log('History synced with cloud');

            // メモも同期
            await this.syncMemos();

            Utils.showToast('履歴を同期しました', 'success');
        } catch (error) {
            console.error('History sync error:', error);
        }
    },

    /**
     * 同期を停止
     */
    stopSync() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
        this.historyRef = null;
    },

    /**
     * 履歴をクラウドに保存
     */
    async saveHistory(historyItem) {
        if (!this.user || !this.historyRef) return;

        try {
            await this.historyRef.child(historyItem.id).set(historyItem);
        } catch (error) {
            console.error('Error saving to cloud:', error);
        }
    },

    /**
     * ログイン状態を取得
     */
    isLoggedIn() {
        return !!this.user;
    },

    /**
     * 管理者かどうかを判定
     */
    isAdmin() {
        return this.user && this.user.uid === this.ADMIN_UID;
    },

    /**
     * Firebaseから問題データを読み込み
     */
    async loadQuestions() {
        if (!this.db) return null;

        try {
            this.questionsRef = this.db.ref('questions');
            const snapshot = await this.questionsRef.once('value');
            const data = snapshot.val();

            if (data) {
                // オブジェクトを配列に変換
                const questions = Object.values(data);
                console.log(`Loaded ${questions.length} questions from Firebase`);
                return questions;
            }
            return null;
        } catch (error) {
            console.error('Error loading questions from Firebase:', error);
            return null;
        }
    },

    /**
     * 問題をFirebaseに保存（管理者のみ）
     */
    async saveQuestion(question) {
        if (!this.isAdmin()) {
            console.error('Only admin can save questions');
            return false;
        }

        try {
            await this.db.ref(`questions/${question.id}`).set(question);
            console.log('Question saved to Firebase:', question.id);
            return true;
        } catch (error) {
            console.error('Error saving question to Firebase:', error);
            return false;
        }
    },

    /**
     * 問題をFirebaseから削除（管理者のみ）
     */
    async deleteQuestion(questionId) {
        if (!this.isAdmin()) {
            console.error('Only admin can delete questions');
            return false;
        }

        try {
            await this.db.ref(`questions/${questionId}`).remove();
            console.log('Question deleted from Firebase:', questionId);
            return true;
        } catch (error) {
            console.error('Error deleting question from Firebase:', error);
            return false;
        }
    },

    /**
     * ビルトイン問題をFirebaseにアップロード（初回のみ）
     */
    async uploadBuiltinQuestions() {
        if (!this.isAdmin()) {
            Utils.showToast('管理者のみ実行できます', 'error');
            return;
        }

        if (typeof BUILTIN_QUESTIONS === 'undefined' || !BUILTIN_QUESTIONS.length) {
            Utils.showToast('埋め込み問題がありません', 'error');
            return;
        }

        try {
            Utils.showToast('問題をアップロード中...', 'info');

            for (const q of BUILTIN_QUESTIONS) {
                await this.db.ref(`questions/${q.id}`).set(q);
            }

            Utils.showToast(`${BUILTIN_QUESTIONS.length}問をFirebaseにアップロードしました`, 'success');
            console.log('Uploaded', BUILTIN_QUESTIONS.length, 'questions to Firebase');
        } catch (error) {
            console.error('Error uploading questions:', error);
            Utils.showToast('アップロードに失敗しました', 'error');
        }
    },

    // ========== メモ同期機能 ==========

    /**
     * メモをクラウドに保存
     */
    async saveMemo(questionId, memo) {
        if (!this.user || !this.db) {
            console.log('Cannot save memo: user or db not available');
            return false;
        }

        try {
            const memoRef = this.db.ref(`users/${this.user.uid}/memos/${questionId}`);
            if (memo && memo.trim()) {
                await memoRef.set({
                    content: memo,
                    updatedAt: new Date().toISOString()
                });
                console.log('Memo saved to cloud:', questionId);
            } else {
                await memoRef.remove();
                console.log('Memo removed from cloud:', questionId);
            }
            return true;
        } catch (error) {
            console.error('Error saving memo to cloud:', error);
            return false;
        }
    },

    /**
     * クラウドからメモを取得
     */
    async getMemo(questionId) {
        if (!this.user || !this.db) return null;

        try {
            const snapshot = await this.db.ref(`users/${this.user.uid}/memos/${questionId}`).once('value');
            const data = snapshot.val();
            return data ? data.content : null;
        } catch (error) {
            console.error('Error getting memo from cloud:', error);
            return null;
        }
    },

    /**
     * 全メモをクラウドから取得
     */
    async getAllMemos() {
        if (!this.user || !this.db) return {};

        try {
            const snapshot = await this.db.ref(`users/${this.user.uid}/memos`).once('value');
            const data = snapshot.val() || {};
            // content だけを抽出
            const memos = {};
            for (const [questionId, memoData] of Object.entries(data)) {
                memos[questionId] = memoData.content;
            }
            return memos;
        } catch (error) {
            console.error('Error getting all memos from cloud:', error);
            return {};
        }
    },

    /**
     * ローカルとクラウドのメモを同期
     */
    async syncMemos() {
        if (!this.user || !this.db) return;

        try {
            // ローカルメモを取得
            const localMemos = JSON.parse(localStorage.getItem('memos') || '{}');

            // クラウドメモを取得
            const cloudMemos = await this.getAllMemos();

            // マージ（両方を結合、クラウド優先）
            const mergedMemos = { ...localMemos, ...cloudMemos };

            // ローカルにないクラウドメモをローカルに保存
            localStorage.setItem('memos', JSON.stringify(mergedMemos));

            // クラウドにないローカルメモをアップロード
            for (const [questionId, memo] of Object.entries(localMemos)) {
                if (!cloudMemos[questionId] && memo) {
                    await this.saveMemo(questionId, memo);
                }
            }

            console.log('Memos synced with cloud');
        } catch (error) {
            console.error('Error syncing memos:', error);
        }
    }
};
