/**
 * ユーティリティ関数
 */

const Utils = {
    /**
     * 科目名を取得
     */
    getSubjectName(subject) {
        const subjects = {
            1: '学科Ⅰ（計画）',
            2: '学科Ⅱ（環境・設備）',
            3: '学科Ⅲ（法規）',
            4: '学科Ⅳ（構造）',
            5: '学科Ⅴ（施工）'
        };
        return subjects[subject] || '不明';
    },

    /**
     * 科目の短縮名を取得
     */
    getSubjectShortName(subject) {
        const subjects = {
            1: '計画',
            2: '環境・設備',
            3: '法規',
            4: '構造',
            5: '施工'
        };
        return subjects[subject] || '不明';
    },

    /**
     * 年度を和暦に変換
     */
    toJapaneseYear(year) {
        if (year >= 2019) {
            const reiwa = year - 2018;
            return `令和${reiwa === 1 ? '元' : reiwa}年`;
        } else if (year >= 1989) {
            const heisei = year - 1988;
            return `平成${heisei === 1 ? '元' : heisei}年`;
        }
        return `${year}年`;
    },

    /**
     * 一意のIDを生成
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /**
     * 問題IDを生成（年度-科目-番号）
     */
    generateQuestionId(year, subject, number) {
        return `${year}-${String(subject).padStart(2, '0')}-${String(number).padStart(3, '0')}`;
    },

    /**
     * 配列をシャッフル（Fisher-Yatesアルゴリズム）
     */
    shuffle(array) {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    },

    /**
     * 日付をフォーマット
     */
    formatDate(dateString, format = 'YYYY/MM/DD HH:mm') {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes);
    },

    /**
     * 相対時間を取得（「3時間前」など）
     */
    getRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;

        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (minutes < 1) return 'たった今';
        if (minutes < 60) return `${minutes}分前`;
        if (hours < 24) return `${hours}時間前`;
        if (days < 7) return `${days}日前`;

        return this.formatDate(dateString, 'YYYY/MM/DD');
    },

    /**
     * Toast通知を表示
     */
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span>${message}</span>`;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    /**
     * 確認ダイアログを表示
     */
    async confirm(message) {
        return new Promise((resolve) => {
            const result = window.confirm(message);
            resolve(result);
        });
    },

    /**
     * 画像をBase64に変換
     */
    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    /**
     * JSONファイルをダウンロード
     */
    downloadJSON(data, filename) {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * JSONファイルを読み込み
     */
    async readJSONFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    resolve(data);
                } catch (error) {
                    reject(new Error('Invalid JSON file'));
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    },

    /**
     * 利用可能な年度リストを取得
     */
    getAvailableYears() {
        const years = [];
        for (let year = 2025; year >= 2009; year--) {
            years.push(year);
        }
        return years;
    }
};
