/**
 * 分類定義マスターデータ
 * 各科目の大分類・小分類を定義
 */

const FIELD_DEFINITIONS = {
    1: {
        name: '計画',
        categories: [
            {
                id: '1-1',
                name: '建築計画',
                fields: [
                    { id: '1-1-1', name: '基本計画' },
                    { id: '1-1-2', name: '住宅建築計画' },
                    { id: '1-1-3', name: '公共・商業建築計画' },
                    { id: '1-1-4', name: '細部計画' }
                ]
            },
            {
                id: '1-3',
                name: '建築積算',
                fields: []
            },
            {
                id: '1-4',
                name: '建築生産（マネジメント）',
                fields: [
                    { id: '1-4-1', name: '建築士の職責・業務' },
                    { id: '1-4-2', name: '設計・工事監理等' },
                    { id: '1-4-3', name: 'マネジメント' }
                ]
            },
            {
                id: '1-5',
                name: '都市計画',
                fields: []
            },
            {
                id: '1-6',
                name: '建築史',
                fields: [
                    { id: '1-6-1', name: '古典建築' },
                    { id: '1-6-2', name: '近現代建築' }
                ]
            }
        ]
    },
    2: {
        name: '環境・設備',
        categories: [
            {
                id: '2-1',
                name: '環境工学',
                fields: [
                    { id: '2-1-1', name: '環境工学全般' },
                    { id: '2-1-2', name: '換気' },
                    { id: '2-1-3', name: '伝熱・結露' },
                    { id: '2-1-4', name: '日照・日射' },
                    { id: '2-1-5', name: '採光・照明' },
                    { id: '2-1-6', name: '色彩' },
                    { id: '2-1-7', name: '音響' }
                ]
            },
            {
                id: '2-2',
                name: '建築設備',
                fields: [
                    { id: '2-2-1', name: '建築設備全般' },
                    { id: '2-2-2', name: '空気調和設備' },
                    { id: '2-2-3', name: '給排水衛生設備' },
                    { id: '2-2-4', name: '電気・昇降設備等' },
                    { id: '2-2-5', name: '防災計画・防災設備' }
                ]
            }
        ]
    },
    3: {
        name: '法規',
        categories: [
            {
                id: '3-1',
                name: '制度規定【第一章】',
                fields: []
            },
            {
                id: '3-2',
                name: '単体規定【第二章】',
                fields: [
                    { id: '3-2-1', name: '一般構造' },
                    { id: '3-2-2', name: '構造関係規程（法第20条）' },
                    { id: '3-2-3', name: '防火避難規定（法第35条）' }
                ]
            },
            {
                id: '3-3',
                name: '集団規定【第三章】',
                fields: [
                    { id: '3-3-1', name: '道路・壁面線（法第42～47条）' },
                    { id: '3-3-2', name: '建築物の用途（法第48～51条）' },
                    { id: '3-3-3', name: '建蔽率・容積率' },
                    { id: '3-3-4', name: '高さ制限' },
                    { id: '3-3-5', name: '集団規定その他' }
                ]
            },
            {
                id: '3-4',
                name: '建築基準法その他・融合',
                fields: []
            },
            {
                id: '3-5',
                name: '関係法令',
                fields: [
                    { id: '3-5-1', name: '建築士法' },
                    { id: '3-5-2', name: '都市計画法' },
                    { id: '3-5-3', name: '消防法' },
                    { id: '3-5-4', name: 'バリアフリー法' },
                    { id: '3-5-5', name: '省エネ法' },
                    { id: '3-5-6', name: 'その他法令・融合' }
                ]
            }
        ]
    },
    4: {
        name: '構造',
        categories: [
            {
                id: '4-1',
                name: '構造力学',
                fields: []
            },
            {
                id: '4-2',
                name: '構造設計',
                fields: []
            },
            {
                id: '4-3',
                name: '一般構造',
                fields: [
                    { id: '4-3-1', name: '木質構造' },
                    { id: '4-3-2', name: '鉄骨構造' },
                    { id: '4-3-3', name: '鉄筋コンクリート構造' },
                    { id: '4-3-4', name: '合成構造・混構造' },
                    { id: '4-3-5', name: '免震・制振構造' },
                    { id: '4-3-6', name: '地盤・基礎構造' },
                    { id: '4-3-7', name: '各種構造融合問題' }
                ]
            },
            {
                id: '4-4',
                name: '材料',
                fields: [
                    { id: '4-4-1', name: '木・木質系' },
                    { id: '4-4-2', name: 'コンクリート' },
                    { id: '4-4-3', name: '金属' }
                ]
            }
        ]
    },
    5: {
        name: '施工',
        categories: [
            { id: '5-1', name: '施工管理', fields: [] },
            { id: '5-2', name: '地質調査・測量', fields: [] },
            { id: '5-3', name: '仮設工事', fields: [] },
            { id: '5-4', name: '土工事', fields: [] },
            { id: '5-5', name: '地業工事', fields: [] },
            { id: '5-6', name: '鉄筋工事', fields: [] },
            { id: '5-7', name: '型枠工事', fields: [] },
            { id: '5-8', name: 'コンクリート工事', fields: [] },
            { id: '5-9', name: '鉄骨工事', fields: [] },
            { id: '5-10', name: 'プレキャス鉄筋コンクリート工事', fields: [] },
            { id: '5-11', name: '左官工事', fields: [] },
            { id: '5-12', name: '防水工事', fields: [] },
            { id: '5-13', name: '木工事', fields: [] },
            { id: '5-14', name: 'ガラス・金属工事', fields: [] },
            { id: '5-15', name: '内外装工事', fields: [] },
            { id: '5-16', name: '改修工事', fields: [] },
            { id: '5-17', name: '設備工事', fields: [] },
            { id: '5-18', name: '複合問題', fields: [] }
        ]
    }
};

/**
 * 分類IDから分類名を取得
 */
function getFieldName(fieldId) {
    if (!fieldId) return '未設定';
    for (const subjectKey in FIELD_DEFINITIONS) {
        const subject = FIELD_DEFINITIONS[subjectKey];
        for (const category of subject.categories) {
            if (category.id === fieldId) return category.name;
            for (const field of category.fields) {
                if (field.id === fieldId) return field.name;
            }
        }
    }
    return '不明';
}

/**
 * 分類IDから大分類（カテゴリ）IDを取得
 */
function getCategoryId(fieldId) {
    if (!fieldId) return null;
    // 小分類ID (例: '1-1-1') → 大分類ID (例: '1-1')
    const parts = fieldId.split('-');
    if (parts.length === 3) {
        return parts[0] + '-' + parts[1];
    }
    // 既に大分類IDの場合はそのまま返す
    if (parts.length === 2) {
        return fieldId;
    }
    return null;
}

/**
 * 分類IDから大分類名を取得
 */
function getCategoryName(fieldId) {
    const catId = getCategoryId(fieldId);
    if (!catId) return '未設定';
    for (const subjectKey in FIELD_DEFINITIONS) {
        const subject = FIELD_DEFINITIONS[subjectKey];
        for (const category of subject.categories) {
            if (category.id === catId) return category.name;
        }
    }
    return '不明';
}

/**
 * 指定した分類ID（大分類または小分類）に属する問題かどうかを判定
 */
function matchesField(questionField, targetFieldId) {
    if (!questionField || !targetFieldId) return false;
    // 完全一致
    if (questionField === targetFieldId) return true;
    // 大分類IDで指定された場合、小分類が属しているかチェック
    if (questionField.startsWith(targetFieldId + '-')) return true;
    return false;
}

/**
 * 科目に対応する分類選択肢を生成（select要素用）
 * optgroupで大分類をグループ化し、小分類がある場合はその下に表示
 * 大分類自体も選択可能にする
 */
function getFieldOptionsHtml(subject) {
    const subjectDef = FIELD_DEFINITIONS[subject];
    if (!subjectDef) return '<option value="">未設定</option>';

    let html = '<option value="">未設定</option>';
    for (const category of subjectDef.categories) {
        if (category.fields.length > 0) {
            html += `<optgroup label="${category.name}">`;
            html += `<option value="${category.id}">${category.name}（全体）</option>`;
            for (const field of category.fields) {
                html += `<option value="${field.id}">${field.name}</option>`;
            }
            html += '</optgroup>';
        } else {
            // 小分類がない場合は大分類だけ
            html += `<option value="${category.id}">${category.name}</option>`;
        }
    }
    return html;
}

/**
 * 全分類のフラットなリストを取得（統計用）
 * 大分類と小分類の両方を含む
 */
function getAllFieldsList(subject) {
    const subjectDef = FIELD_DEFINITIONS[subject];
    if (!subjectDef) return [];

    const list = [];
    for (const category of subjectDef.categories) {
        list.push({
            id: category.id,
            name: category.name,
            type: 'category',
            subject: parseInt(subject)
        });
        for (const field of category.fields) {
            list.push({
                id: field.id,
                name: field.name,
                type: 'field',
                categoryId: category.id,
                categoryName: category.name,
                subject: parseInt(subject)
            });
        }
    }
    return list;
}
