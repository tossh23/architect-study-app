/**
 * Firebase連携モジュール
 * 学習履歴のクラウド同期を担当
 */
const FirebaseSync = {
    db: null,
    auth: null,
    user: null,
    historyRef: null,
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
     * Googleログイン
     */
    async login() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            await this.auth.signInWithPopup(provider);
            Utils.showToast('ログインしました', 'success');
        } catch (error) {
            console.error('Login error:', error);
            // エラーコードに応じたメッセージ
            let message = 'ログインに失敗しました';
            if (error.code === 'auth/unauthorized-domain') {
                message = 'ドメインが未承認です。Firebase Consoleで承認してください';
            } else if (error.code === 'auth/popup-blocked') {
                message = 'ポップアップがブロックされました。許可してください';
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
    },

    /**
     * 同期を開始
     */
    async startSync() {
        if (!this.user) return;

        this.historyRef = this.db.ref(`users/${this.user.uid}/history`);

        // クラウドの履歴を取得してローカルにマージ
        const snapshot = await this.historyRef.once('value');
        const cloudHistory = snapshot.val() || {};

        // ローカル履歴を取得
        const localHistory = await db.getAllHistory();

        // マージ：クラウドにないローカル履歴をアップロード
        for (const local of localHistory) {
            if (!cloudHistory[local.id]) {
                await this.historyRef.child(local.id).set(local);
            }
        }

        // マージ：ローカルにないクラウド履歴をダウンロード
        for (const id of Object.keys(cloudHistory)) {
            const exists = localHistory.some(h => h.id === id);
            if (!exists) {
                await db.addHistory(cloudHistory[id]);
            }
        }

        console.log('History synced with cloud');
        Utils.showToast('履歴を同期しました', 'success');
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
    }
};
