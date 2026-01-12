/**
 * 問題管理モジュール
 */

const Questions = {
    currentEditingId: null,

    /**
     * 問題管理ページを初期化
     */
    async init() {
        this.setupEventListeners();
        this.populateYearFilters();
        await this.loadQuestions();
    },

    /**
     * イベントリスナーを設定
     */
    setupEventListeners() {
        // 新規問題登録ボタン
        document.getElementById('addQuestionBtn').addEventListener('click', () => {
            this.openModal();
        });

        // モーダル閉じるボタン
        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('cancelQuestion').addEventListener('click', () => {
            this.closeModal();
        });

        // フォーム送信
        document.getElementById('questionForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveQuestion();
        });

        // フィルター変更
        document.getElementById('filterSubject').addEventListener('change', () => {
            this.loadQuestions();
        });

        document.getElementById('filterYear').addEventListener('change', () => {
            this.loadQuestions();
        });

        document.getElementById('searchQuestion').addEventListener('input', () => {
            this.loadQuestions();
        });

        // 画像プレビュー（問題図）
        document.getElementById('questionImages').addEventListener('change', async (e) => {
            await this.previewImages(e.target.files, 'questionImagePreview');
        });

        // 画像プレビュー（解説）
        document.getElementById('explanationImages').addEventListener('change', async (e) => {
            await this.previewImages(e.target.files, 'imagePreview');
        });

        // モーダル外クリックで閉じる
        document.getElementById('questionModal').addEventListener('click', (e) => {
            if (e.target.id === 'questionModal') {
                this.closeModal();
            }
        });
    },

    /**
     * 年度フィルターを設定
     */
    populateYearFilters() {
        const years = Utils.getAvailableYears();
        const filterYear = document.getElementById('filterYear');
        const qYear = document.getElementById('qYear');

        years.forEach(year => {
            const option1 = document.createElement('option');
            option1.value = year;
            option1.textContent = Utils.toJapaneseYear(year);
            filterYear.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = year;
            option2.textContent = Utils.toJapaneseYear(year);
            qYear.appendChild(option2);
        });
    },

    /**
     * 問題リストを読み込み
     */
    async loadQuestions() {
        const filterSubject = document.getElementById('filterSubject').value;
        const filterYear = document.getElementById('filterYear').value;
        const searchQuery = document.getElementById('searchQuestion').value.toLowerCase();

        let questions = await db.getAllQuestions();

        // フィルター適用
        if (filterSubject) {
            questions = questions.filter(q => q.subject === parseInt(filterSubject));
        }
        if (filterYear) {
            questions = questions.filter(q => q.year === parseInt(filterYear));
        }
        if (searchQuery) {
            questions = questions.filter(q =>
                q.questionText.toLowerCase().includes(searchQuery)
            );
        }

        // ソート（年度降順、科目昇順、問題番号昇順）
        questions.sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            if (a.subject !== b.subject) return a.subject - b.subject;
            return a.questionNumber - b.questionNumber;
        });

        this.renderQuestionsList(questions);
    },

    /**
     * 問題リストを描画
     */
    renderQuestionsList(questions) {
        const container = document.getElementById('questionsList');

        if (questions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <p>問題が登録されていません</p>
                    <p class="text-muted">「新規問題登録」ボタンから問題を追加してください</p>
                </div>
            `;
            return;
        }

        container.innerHTML = questions.map(q => `
            <div class="question-item" data-id="${q.id}">
                <div class="question-item-content">
                    <div class="question-item-meta">
                        <span>${Utils.toJapaneseYear(q.year)}</span>
                        <span>${Utils.getSubjectShortName(q.subject)}</span>
                        <span>問${q.questionNumber}</span>
                    </div>
                    <div class="question-item-text">${q.questionText}</div>
                </div>
                <div class="question-item-actions">
                    <button class="btn btn-ghost" onclick="Questions.editQuestion('${q.id}')">編集</button>
                    <button class="btn btn-ghost" onclick="Questions.deleteQuestion('${q.id}')">削除</button>
                </div>
            </div>
        `).join('');
    },

    /**
     * モーダルを開く
     */
    openModal(question = null) {
        const modal = document.getElementById('questionModal');
        const form = document.getElementById('questionForm');
        const title = document.getElementById('modalTitle');
        const preview = document.getElementById('imagePreview');

        const questionPreview = document.getElementById('questionImagePreview');

        form.reset();
        preview.innerHTML = '';
        questionPreview.innerHTML = '';
        this.currentEditingId = null;

        if (question) {
            title.textContent = '問題を編集';
            this.currentEditingId = question.id;

            document.getElementById('qYear').value = question.year;
            document.getElementById('qSubject').value = question.subject;
            document.getElementById('qNumber').value = question.questionNumber;
            document.getElementById('qText').value = question.questionText;
            document.getElementById('choice1').value = question.choices[0] || '';
            document.getElementById('choice2').value = question.choices[1] || '';
            document.getElementById('choice3').value = question.choices[2] || '';
            document.getElementById('choice4').value = question.choices[3] || '';
            document.getElementById('qExplanation').value = question.explanation || '';

            // 正解を設定
            const correctRadio = document.querySelector(`input[name="correctAnswer"][value="${question.correctAnswer}"]`);
            if (correctRadio) correctRadio.checked = true;

            // 既存の画像を表示
            if (question.questionImages && question.questionImages.length > 0) {
                this.displayExistingImages(question.questionImages, 'questionImagePreview');
            }
            if (question.explanationImages && question.explanationImages.length > 0) {
                this.displayExistingImages(question.explanationImages, 'imagePreview');
            }
        } else {
            title.textContent = '新規問題登録';
        }

        modal.classList.add('open');
    },

    /**
     * モーダルを閉じる
     */
    closeModal() {
        const modal = document.getElementById('questionModal');
        modal.classList.remove('open');
        this.currentEditingId = null;
    },

    /**
     * 問題を保存
     */
    async saveQuestion() {
        const year = parseInt(document.getElementById('qYear').value);
        const subject = parseInt(document.getElementById('qSubject').value);
        const questionNumber = parseInt(document.getElementById('qNumber').value);
        const questionText = document.getElementById('qText').value.trim();
        const choices = [
            document.getElementById('choice1').value.trim(),
            document.getElementById('choice2').value.trim(),
            document.getElementById('choice3').value.trim(),
            document.getElementById('choice4').value.trim()
        ];
        const correctAnswer = parseInt(document.querySelector('input[name="correctAnswer"]:checked').value);
        const explanation = document.getElementById('qExplanation').value.trim();

        // 問題図を収集
        const questionImages = [];
        const qPreviewItems = document.querySelectorAll('#questionImagePreview .image-preview-item img');
        qPreviewItems.forEach(img => {
            questionImages.push(img.src);
        });

        // 解説画像を収集
        const explanationImages = [];
        const previewItems = document.querySelectorAll('#imagePreview .image-preview-item img');
        previewItems.forEach(img => {
            explanationImages.push(img.src);
        });

        const question = {
            id: this.currentEditingId || Utils.generateQuestionId(year, subject, questionNumber),
            year,
            subject,
            questionNumber,
            questionText,
            questionImages,
            choices,
            correctAnswer,
            explanation,
            explanationImages,
            updatedAt: new Date().toISOString()
        };

        if (!this.currentEditingId) {
            question.createdAt = new Date().toISOString();
        }

        try {
            if (this.currentEditingId) {
                await db.updateQuestion(question);
                Utils.showToast('問題を更新しました', 'success');
            } else {
                await db.addQuestion(question);
                Utils.showToast('問題を登録しました', 'success');
            }

            this.closeModal();
            await this.loadQuestions();
            await App.updateHomeStats();
        } catch (error) {
            console.error('Save error:', error);
            Utils.showToast('保存に失敗しました', 'error');
        }
    },

    /**
     * 問題を編集
     */
    async editQuestion(id) {
        const question = await db.getQuestion(id);
        if (question) {
            this.openModal(question);
        }
    },

    /**
     * 問題を削除
     */
    async deleteQuestion(id) {
        const confirmed = await Utils.confirm('この問題を削除しますか？');
        if (!confirmed) return;

        try {
            await db.deleteQuestion(id);
            Utils.showToast('問題を削除しました', 'success');
            await this.loadQuestions();
            await App.updateHomeStats();
        } catch (error) {
            console.error('Delete error:', error);
            Utils.showToast('削除に失敗しました', 'error');
        }
    },

    /**
     * 画像プレビューを表示
     */
    async previewImages(files, containerId) {
        for (const file of files) {
            try {
                const base64 = await Utils.fileToBase64(file);
                this.addImageToPreview(base64, containerId);
            } catch (error) {
                console.error('Image load error:', error);
            }
        }
    },

    /**
     * 既存の画像を表示
     */
    displayExistingImages(images, containerId) {
        const preview = document.getElementById(containerId);
        preview.innerHTML = '';

        images.forEach(src => {
            this.addImageToPreview(src, containerId);
        });
    },

    /**
     * プレビューに画像を追加
     */
    addImageToPreview(src, containerId) {
        const preview = document.getElementById(containerId);
        const item = document.createElement('div');
        item.className = 'image-preview-item';
        item.innerHTML = `
            <img src="${src}" alt="画像">
            <button type="button" class="remove-image" onclick="this.parentElement.remove()">×</button>
        `;
        preview.appendChild(item);
    }
};
