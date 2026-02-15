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
        await this.populateYearFilters();

        // 初期表示時は最新年度と計画科目でフィルタ（パフォーマンス対策）
        const filterYear = document.getElementById('filterYear');
        const filterSubject = document.getElementById('filterSubject');
        if (filterYear.options.length > 1) {
            filterYear.value = filterYear.options[1].value; // 最新年度を選択
        }
        filterSubject.value = '1'; // 計画を選択

        await this.loadQuestions();

        // 管理者でない場合は編集関連ボタンを非表示
        this.updateAdminUI();
    },

    /**
     * 管理者UIを更新（管理者のみ編集可能）
     */
    updateAdminUI() {
        const isAdmin = FirebaseSync.isAdmin();

        // 新規登録ボタン
        const addBtn = document.getElementById('addQuestion');
        if (addBtn) addBtn.style.display = isAdmin ? '' : 'none';

        // CSVインポートボタン
        const importBtn = document.getElementById('importCsv');
        if (importBtn) importBtn.style.display = isAdmin ? '' : 'none';

        // 編集・削除ボタン（問題リスト内）
        document.querySelectorAll('.question-actions').forEach(el => {
            el.style.display = isAdmin ? '' : 'none';
        });
    },

    /**
     * イベントリスナーを設定
     */
    setupEventListeners() {
        // 新規問題登録ボタン
        document.getElementById('addQuestionBtn').addEventListener('click', () => {
            this.openModal();
        });

        // CSVインポートボタン
        document.getElementById('importCsvBtn').addEventListener('click', () => {
            document.getElementById('csvImportFile').click();
        });

        // CSVファイル選択
        document.getElementById('csvImportFile').addEventListener('change', async (e) => {
            if (e.target.files[0]) {
                await this.importFromCsv(e.target.files[0]);
                e.target.value = '';
            }
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

        // 選択肢画像プレビュー
        for (let i = 1; i <= 4; i++) {
            document.getElementById(`choiceImage${i}`).addEventListener('change', async (e) => {
                await this.previewChoiceImage(e.target.files[0], `choiceImagePreview${i}`);
            });
        }

        // モーダル外クリックで閉じる
        document.getElementById('questionModal').addEventListener('click', (e) => {
            if (e.target.id === 'questionModal') {
                this.closeModal();
            }
        });

        // 書式設定ツールバー
        document.querySelectorAll('.format-toolbar').forEach(toolbar => {
            const targetId = toolbar.dataset.target;
            if (targetId) {
                toolbar.querySelectorAll('.format-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        // 対象のcontenteditable divにフォーカスを戻す
                        const target = document.getElementById(targetId);
                        if (target) target.focus();
                        if (btn.classList.contains('format-btn-bold')) {
                            this.applyFormat('bold');
                        } else if (btn.classList.contains('format-btn-red')) {
                            this.applyFormat('red');
                        } else if (btn.classList.contains('format-btn-blue')) {
                            this.applyFormat('blue');
                        } else if (btn.classList.contains('format-btn-default')) {
                            this.applyFormat('default');
                        }
                    });
                });
            }
        });
    },

    /**
     * contenteditable要素の選択範囲に書式を適用
     */
    applyFormat(type) {
        const selection = window.getSelection();
        if (!selection.rangeCount || selection.isCollapsed) {
            Utils.showToast('テキストを選択してください', 'warning');
            return;
        }

        if (type === 'bold') {
            document.execCommand('bold', false, null);
        } else if (type === 'red') {
            document.execCommand('foreColor', false, 'red');
        } else if (type === 'blue') {
            document.execCommand('foreColor', false, 'blue');
        } else if (type === 'default') {
            document.execCommand('foreColor', false, '#f8fafc');
        }
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
        const isAdmin = FirebaseSync.isAdmin();

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
                ${isAdmin ? `
                <div class="question-item-actions">
                    <button class="btn btn-ghost" onclick="Questions.editQuestion('${q.id}')">編集</button>
                    <button class="btn btn-ghost" onclick="Questions.deleteQuestion('${q.id}')">削除</button>
                </div>
                ` : ''}
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

        // contenteditable divをクリア
        document.getElementById('qText').innerHTML = '';
        document.getElementById('qExplanation').innerHTML = '';

        // 選択肢画像プレビューをクリア
        for (let i = 1; i <= 4; i++) {
            document.getElementById(`choiceImagePreview${i}`).innerHTML = '';
        }

        this.currentEditingId = null;

        if (question) {
            title.textContent = '問題を編集';
            this.currentEditingId = question.id;

            document.getElementById('qYear').value = question.year;
            document.getElementById('qSubject').value = question.subject;
            document.getElementById('qNumber').value = question.questionNumber;
            document.getElementById('qText').innerHTML = question.questionText || '';
            document.getElementById('choice1').value = question.choices[0] || '';
            document.getElementById('choice2').value = question.choices[1] || '';
            document.getElementById('choice3').value = question.choices[2] || '';
            document.getElementById('choice4').value = question.choices[3] || '';
            document.getElementById('qExplanation').innerHTML = question.explanation || '';

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

            // 選択肢画像を表示
            if (question.choiceImages) {
                for (let i = 0; i < 4; i++) {
                    if (question.choiceImages[i]) {
                        this.displayChoiceImage(question.choiceImages[i], `choiceImagePreview${i + 1}`);
                    }
                }
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
        // 管理者権限チェック
        if (!FirebaseSync.isAdmin()) {
            Utils.showToast('問題の編集は管理者のみ可能です', 'error');
            return;
        }

        const year = parseInt(document.getElementById('qYear').value);
        const subject = parseInt(document.getElementById('qSubject').value);
        const questionNumber = parseInt(document.getElementById('qNumber').value);
        const questionText = document.getElementById('qText').innerHTML.trim();
        const choices = [
            document.getElementById('choice1').value.trim(),
            document.getElementById('choice2').value.trim(),
            document.getElementById('choice3').value.trim(),
            document.getElementById('choice4').value.trim()
        ];
        const correctAnswer = parseInt(document.querySelector('input[name="correctAnswer"]:checked').value);
        const explanation = document.getElementById('qExplanation').innerHTML.trim();

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

        // 選択肢画像を収集
        const choiceImages = [];
        for (let i = 1; i <= 4; i++) {
            const preview = document.getElementById(`choiceImagePreview${i}`);
            const img = preview.querySelector('img');
            choiceImages.push(img ? img.src : null);
        }

        const question = {
            id: this.currentEditingId || Utils.generateQuestionId(year, subject, questionNumber),
            year,
            subject,
            questionNumber,
            questionText,
            questionImages,
            choices,
            choiceImages,
            correctAnswer,
            explanation,
            explanationImages,
            updatedAt: new Date().toISOString()
        };

        if (!this.currentEditingId) {
            question.createdAt = new Date().toISOString();
        }

        try {
            // Firebaseに保存（管理者のみ）
            const firebaseSaved = await FirebaseSync.saveQuestion(question);
            if (!firebaseSaved) {
                Utils.showToast('Firebaseへの保存に失敗しました', 'error');
                return;
            }

            // ローカルDBにも保存
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
     * 問題編集モーダルを開く（学習画面から）
     */
    async openEditModal(id) {
        const question = await db.getQuestion(id);
        if (question) {
            this.openModal(question);
        }
    },

    /**
     * 問題を削除
     */
    async deleteQuestion(id) {
        // 管理者権限チェック
        if (!FirebaseSync.isAdmin()) {
            Utils.showToast('問題の削除は管理者のみ可能です', 'error');
            return;
        }

        const confirmed = await Utils.confirm('この問題を削除しますか？');
        if (!confirmed) return;

        try {
            // Firebaseから削除
            await FirebaseSync.deleteQuestion(id);
            // ローカルDBからも削除
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
     * 選択肢画像プレビューを表示
     */
    async previewChoiceImage(file, containerId) {
        if (!file) return;

        try {
            const base64 = await Utils.fileToBase64(file);
            this.displayChoiceImage(base64, containerId);
        } catch (error) {
            console.error('Choice image load error:', error);
        }
    },

    /**
     * 選択肢画像を表示
     */
    displayChoiceImage(src, containerId) {
        const preview = document.getElementById(containerId);
        preview.innerHTML = `
            <div class="choice-image-item">
                <img src="${src}" alt="選択肢画像">
                <button type="button" class="remove-choice-image" onclick="Questions.removeChoiceImage('${containerId}')">&times;</button>
            </div>
        `;
    },

    /**
     * 選択肢画像を削除
     */
    removeChoiceImage(containerId) {
        document.getElementById(containerId).innerHTML = '';
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
    },

    /**
     * CSVからインポート
     */
    async importFromCsv(file) {
        try {
            // まずUTF-8で試す、失敗したらShift-JISで試す
            let text;
            try {
                text = await file.text();
                // 文字化けチェック（日本語が含まれるはずなのに含まれない場合）
                if (!text.includes('計画') && !text.includes('環境') && !text.includes('問題')) {
                    throw new Error('Encoding issue detected');
                }
            } catch (e) {
                // Shift-JISで読み込み
                const buffer = await file.arrayBuffer();
                const decoder = new TextDecoder('shift-jis');
                text = decoder.decode(buffer);
            }

            console.log('CSV content (first 500 chars):', text.substring(0, 500));

            const questions = this.parseCsv(text);
            console.log('Parsed questions count:', questions.length);

            if (questions.length === 0) {
                Utils.showToast('インポートできる問題がありませんでした', 'warning');
                return;
            }

            let imported = 0;
            let skipped = 0;

            for (const q of questions) {
                try {
                    // 既存チェック
                    const existing = await db.getQuestion(q.id);
                    if (existing) {
                        skipped++;
                        continue;
                    }
                    await db.addQuestion(q);
                    imported++;
                } catch (error) {
                    console.error('Import error for question:', q, error);
                    skipped++;
                }
            }

            Utils.showToast(`${imported}問をインポートしました（${skipped}問スキップ）`, 'success');
            await this.loadQuestions();
            await App.updateHomeStats();

        } catch (error) {
            console.error('CSV import error:', error);
            Utils.showToast('CSVの読み込みに失敗しました', 'error');
        }
    },

    /**
     * CSVをパース
     */
    parseCsv(text) {
        const lines = text.split('\n');
        const questions = [];

        console.log('Total lines in CSV:', lines.length);
        console.log('First line (header):', lines[0]);
        if (lines[1]) console.log('Second line (first data):', lines[1]);

        // ヘッダー行をスキップ
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const cols = this.parseCsvLine(line);

            if (i <= 3) {
                console.log(`Line ${i} columns (${cols.length}):`, cols);
            }

            if (cols.length < 9) {
                console.log(`Line ${i} skipped: not enough columns (${cols.length})`);
                continue;
            }

            const [yearStr, subjectStr, numStr, hasImage, questionText, choice1, choice2, choice3, choice4, correctStr] = cols;

            const year = this.parseYear(yearStr);
            const subject = this.parseSubject(subjectStr);
            const questionNumber = parseInt(numStr);
            const correctAnswer = parseInt(correctStr);

            if (i <= 3) {
                console.log(`Line ${i} parsed: year=${year}, subject=${subject}, num=${questionNumber}, correct=${correctAnswer}`);
            }

            if (!year || !subject || !questionNumber || !correctAnswer) {
                console.log(`Line ${i} skipped: invalid data - year=${year}, subject=${subject}, num=${questionNumber}, correct=${correctAnswer}`);
                continue;
            }

            const question = {
                id: Utils.generateQuestionId(year, subject, questionNumber),
                year,
                subject,
                questionNumber,
                questionText: questionText || '',
                questionImages: [],
                choices: [choice1 || '', choice2 || '', choice3 || '', choice4 || ''],
                correctAnswer,
                explanation: '',
                explanationImages: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                hasImageNote: hasImage === '図あり'
            };

            questions.push(question);
        }

        return questions;
    },

    /**
     * CSV行をパース（カンマ区切り、引用符対応）
     */
    parseCsvLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());

        return result;
    },

    /**
     * 年度文字列をパース（H28 → 2016）
     */
    parseYear(yearStr) {
        if (!yearStr) return null;

        // H28, R6 などの形式
        const match = yearStr.match(/^([HR])(\d+)$/i);
        if (match) {
            const era = match[1].toUpperCase();
            const num = parseInt(match[2]);

            if (era === 'H') {
                return 1988 + num; // 平成
            } else if (era === 'R') {
                return 2018 + num; // 令和
            }
        }

        // 数字のみの場合
        const numOnly = parseInt(yearStr);
        if (numOnly > 2000) return numOnly;
        if (numOnly > 0 && numOnly <= 99) {
            // 平成と仮定
            return 1988 + numOnly;
        }

        return null;
    },

    /**
     * 科目文字列をパース
     */
    parseSubject(subjectStr) {
        if (!subjectStr) return null;

        const s = subjectStr.trim();

        if (s.includes('計画')) return 1;
        if (s.includes('環境') || s.includes('設備')) return 2;
        if (s.includes('法規')) return 3;
        if (s.includes('構造')) return 4;
        if (s.includes('施工')) return 5;

        return null;
    }
};

