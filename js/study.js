/**
 * 学習機能モジュール
 */

const Study = {
    questions: [],
    currentIndex: 0,
    isAnswered: false,
    mode: 'all', // 'all', 'subject', 'wrong'
    selectedSubject: null,

    /**
     * 学習を開始
     */
    async start(options = {}) {
        this.mode = options.mode || 'all';
        this.selectedSubject = options.subject || null;
        this.currentIndex = 0;
        this.isAnswered = false;

        let questions = [];

        if (this.mode === 'wrong') {
            // 間違えた問題のみ
            const wrongIds = await db.getWrongQuestionIds();
            const allQuestions = await db.getAllQuestions();
            questions = allQuestions.filter(q => wrongIds.includes(q.id));
        } else if (this.mode === 'subject' && this.selectedSubject) {
            // 科目別
            questions = await db.getQuestionsBySubject(this.selectedSubject);
        } else {
            // 全問題
            questions = await db.getAllQuestions();
        }

        if (questions.length === 0) {
            Utils.showToast('該当する問題がありません', 'warning');
            return false;
        }

        // シャッフル
        this.questions = Utils.shuffle(questions);

        // 学習画面のヘッダーを更新
        this.updateHeader();

        // 最初の問題を表示
        this.showQuestion();

        return true;
    },

    /**
     * 指定した1問だけを解く
     */
    startWithQuestion(question) {
        this.mode = 'single';
        this.selectedSubject = null;
        this.currentIndex = 0;
        this.isAnswered = false;
        this.questions = [question];

        // 学習画面のヘッダーを更新
        this.updateHeader();

        // 問題を表示
        this.showQuestion();

        return true;
    },

    /**
     * ヘッダーを更新
     */
    updateHeader() {
        const subjectEl = document.getElementById('studySubject');

        if (this.mode === 'wrong') {
            subjectEl.textContent = '間違えた問題';
        } else if (this.mode === 'subject' && this.selectedSubject) {
            subjectEl.textContent = Utils.getSubjectName(this.selectedSubject);
        } else {
            subjectEl.textContent = '全科目';
        }

        document.getElementById('totalNumber').textContent = this.questions.length;
    },

    /**
     * 問題を表示
     */
    showQuestion() {
        if (this.currentIndex >= this.questions.length) {
            this.showResults();
            return;
        }

        const question = this.questions[this.currentIndex];
        this.isAnswered = false;

        // question-containerのDOM構造を復元（結果画面で破壊された場合）
        const container = document.querySelector('.question-container');
        if (!document.getElementById('questionText')) {
            container.innerHTML = `
                <div class="question-meta">
                    <span class="question-year" id="questionYear"></span>
                    <span class="question-number" id="questionNum"></span>
                </div>
                <div class="question-text" id="questionText"></div>
                <div class="choices" id="choices"></div>
            `;
        }

        // 問題番号を更新
        document.getElementById('currentNumber').textContent = this.currentIndex + 1;

        // 問題情報を表示
        document.getElementById('questionYear').textContent = Utils.toJapaneseYear(question.year);
        document.getElementById('questionNum').textContent = `問${question.questionNumber}`;

        // 問題文と問題図を表示
        let questionContent = question.questionText;
        if (question.questionImages && question.questionImages.length > 0) {
            questionContent += '<div class="question-images">';
            question.questionImages.forEach(img => {
                questionContent += `<img src="${img}" alt="問題図" class="question-image">`;
            });
            questionContent += '</div>';
        }
        document.getElementById('questionText').innerHTML = questionContent;

        // 選択肢を生成（タップで消去法）
        const choicesContainer = document.getElementById('choices');
        choicesContainer.innerHTML = question.choices.map((choice, index) => {
            const choiceImage = question.choiceImages && question.choiceImages[index];
            const choiceContent = choiceImage
                ? `<img src="${choiceImage}" alt="選択肢${index + 1}" class="choice-image">`
                : `<span class="choice-text">${choice}</span>`;

            return `
                <div class="choice-item" data-choice="${index + 1}">
                    <span class="choice-number">${index + 1}</span>
                    ${choiceContent}
                </div>
            `;
        }).join('');

        // 回答ボタンを生成
        choicesContainer.innerHTML += `
            <div class="answer-buttons">
                <span class="answer-label">回答:</span>
                <button class="answer-btn" data-answer="1">1</button>
                <button class="answer-btn" data-answer="2">2</button>
                <button class="answer-btn" data-answer="3">3</button>
                <button class="answer-btn" data-answer="4">4</button>
            </div>
        `;

        // 選択肢タップで消去法トグル
        choicesContainer.querySelectorAll('.choice-item').forEach(item => {
            item.addEventListener('click', () => {
                if (!this.isAnswered) {
                    item.classList.toggle('eliminated');
                }
            });
        });

        // 回答ボタンクリックで回答
        choicesContainer.querySelectorAll('.answer-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!this.isAnswered) {
                    this.answer(parseInt(btn.dataset.answer));
                }
            });
        });

        // 解答セクションを非表示
        document.getElementById('answerSection').classList.add('hidden');

        // 問題を編集ボタン（管理者のみ表示）
        const editBtn = document.getElementById('editCurrentQuestion');
        if (editBtn) {
            editBtn.style.display = FirebaseSync.isAdmin() ? '' : 'none';
        }
    },

    /**
     * 回答を処理
     */
    async answer(selectedChoice) {
        if (this.isAnswered) return;
        this.isAnswered = true;

        const question = this.questions[this.currentIndex];
        const isCorrect = selectedChoice === question.correctAnswer;

        // 選択肢の表示を更新
        const items = document.querySelectorAll('.choice-item');
        items.forEach(item => {
            const choice = parseInt(item.dataset.choice);
            item.style.cursor = 'default';

            if (choice === question.correctAnswer) {
                item.classList.add('correct');
            } else if (choice === selectedChoice && !isCorrect) {
                item.classList.add('wrong');
            }
        });

        // 回答ボタンを非表示
        document.querySelector('.answer-buttons').classList.add('hidden');

        // 履歴を保存
        const historyItem = {
            id: Utils.generateId(),
            questionId: question.id,
            answeredAt: new Date().toISOString(),
            selectedAnswer: selectedChoice,
            isCorrect: isCorrect
        };
        await db.addHistory(historyItem);

        // Firebaseに同期
        if (typeof FirebaseSync !== 'undefined' && FirebaseSync.isLoggedIn()) {
            FirebaseSync.saveHistory(historyItem);
        }

        // 結果を表示
        const resultSection = document.getElementById('answerSection');
        const resultEl = document.getElementById('answerResult');

        if (isCorrect) {
            resultEl.className = 'answer-result correct';
            resultEl.innerHTML = `
                <div class="result-icon">⭕</div>
                <div class="result-text">正解！</div>
            `;
        } else {
            resultEl.className = 'answer-result wrong';
            resultEl.innerHTML = `
                <div class="result-icon">❌</div>
                <div class="result-text">不正解（正解: ${question.correctAnswer}）</div>
            `;
        }

        // 解説を表示
        const explanationContent = document.getElementById('explanationContent');
        if (question.explanation) {
            let content = question.explanation;

            // 画像を追加
            if (question.explanationImages && question.explanationImages.length > 0) {
                content += '<div class="explanation-images">';
                question.explanationImages.forEach(img => {
                    content += `<img src="${img}" alt="解説画像">`;
                });
                content += '</div>';
            }

            explanationContent.innerHTML = content;
        } else {
            explanationContent.innerHTML = '<p class="no-explanation">解説は登録されていません</p>';
        }

        // メモを読み込み
        const memoTextarea = document.getElementById('questionMemo');
        const savedMemo = this.getMemo(question.id);
        memoTextarea.value = savedMemo || '';

        // メモ保存ボタンの設定
        const saveMemoBtn = document.getElementById('saveMemo');
        saveMemoBtn.onclick = () => {
            this.saveMemo(question.id, memoTextarea.value);
            Utils.showToast('メモを保存しました', 'success');
        };

        // 次の問題ボタンのテキストを更新
        const nextBtn = document.getElementById('nextQuestion');
        if (this.currentIndex >= this.questions.length - 1) {
            nextBtn.textContent = '結果を見る';
        } else {
            nextBtn.textContent = '次の問題へ →';
        }

        resultSection.classList.remove('hidden');
    },

    /**
     * 次の問題へ
     */
    nextQuestion() {
        this.currentIndex++;

        if (this.currentIndex >= this.questions.length) {
            this.showResults();
        } else {
            this.showQuestion();
        }
    },

    /**
     * 結果を表示
     */
    async showResults() {
        // 今回の学習履歴を集計
        const history = await db.getAllHistory();
        const questionIds = this.questions.map(q => q.id);

        // 今回のセッションで回答したもののみ（最新の回答を取得）
        const sessionHistory = [];
        const answered = new Set();

        const recentHistory = history
            .filter(h => questionIds.includes(h.questionId))
            .sort((a, b) => new Date(b.answeredAt) - new Date(a.answeredAt));

        for (const h of recentHistory) {
            if (!answered.has(h.questionId) && sessionHistory.length < this.questions.length) {
                sessionHistory.push(h);
                answered.add(h.questionId);
            }
        }

        const correctCount = sessionHistory.filter(h => h.isCorrect).length;
        const totalCount = this.questions.length;
        const accuracy = Math.round((correctCount / totalCount) * 100);

        // 結果画面を表示
        const questionContainer = document.querySelector('.question-container');
        questionContainer.innerHTML = `
            <div class="study-results">
                <h2>学習終了！</h2>
                <div class="results-summary">
                    <div class="result-stat">
                        <span class="result-value">${totalCount}</span>
                        <span class="result-label">問題数</span>
                    </div>
                    <div class="result-stat">
                        <span class="result-value">${correctCount}</span>
                        <span class="result-label">正解数</span>
                    </div>
                    <div class="result-stat">
                        <span class="result-value">${accuracy}%</span>
                        <span class="result-label">正答率</span>
                    </div>
                </div>
                <div class="results-actions">
                    <button class="btn btn-primary btn-large" onclick="App.showPage('home')">ホームに戻る</button>
                </div>
            </div>
        `;

        document.getElementById('answerSection').classList.add('hidden');

        // 統計を更新
        await App.updateHomeStats();
    },

    /**
     * 学習を中断
     */
    abort() {
        App.showPage('home');
    },

    /**
     * 現在の問題を取得
     */
    getCurrentQuestion() {
        if (this.currentIndex < this.questions.length) {
            return this.questions[this.currentIndex];
        }
        return null;
    },

    /**
     * メモを取得（Firebase + ローカル対応）
     */
    getMemo(questionId) {
        // まずローカルから取得（即座に表示）
        const memos = JSON.parse(localStorage.getItem('memos') || '{}');
        return memos[questionId] || '';
    },

    /**
     * メモを保存（Firebase + ローカル対応）
     */
    saveMemo(questionId, memo) {
        console.log('Saving memo for question:', questionId);

        // ローカルに保存
        const memos = JSON.parse(localStorage.getItem('memos') || '{}');
        if (memo.trim()) {
            memos[questionId] = memo;
        } else {
            delete memos[questionId];
        }
        localStorage.setItem('memos', JSON.stringify(memos));
        console.log('Memo saved to localStorage');

        // ログイン中はFirebaseにも保存
        if (typeof FirebaseSync !== 'undefined' && FirebaseSync.isLoggedIn()) {
            console.log('User is logged in, saving to Firebase...');
            FirebaseSync.saveMemo(questionId, memo);
        } else {
            console.log('User not logged in, skipping Firebase sync');
        }
    }
};
