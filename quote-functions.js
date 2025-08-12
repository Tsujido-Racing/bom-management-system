// 見積もり管理関連関数
function openQuoteModal(quoteId = null) {
    const quote = quoteId ? quotes.find(q => q.id === quoteId) : null;
    const isEdit = !!quote;
    
    const modalContent = `
        <div class="modal-header">
            <h3 class="modal-title">${isEdit ? '見積もり編集' : '新規見積もり'}</h3>
            <button class="modal-close" onclick="closeModal()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <form id="quote-form">
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">顧客名 *</label>
                    <input type="text" id="quote-customer" class="form-input" required 
                           value="${quote ? quote.customerName : ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">製品名 *</label>
                    <input type="text" id="quote-product" class="form-input" required 
                           value="${quote ? quote.productName : ''}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">数量 *</label>
                    <input type="number" id="quote-quantity" class="form-input" required min="1"
                           value="${quote ? quote.quantity : ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">BOM選択</label>
                    <select id="quote-bom" class="form-select">
                        <option value="">BOMを選択...</option>
                        ${boms.map(bom => `
                            <option value="${bom.id}" ${quote && quote.bomId === bom.id ? 'selected' : ''}>
                                ${bom.name} - ${bom.productName}
                            </option>
                        `).join('')}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">製造開始日</label>
                    <input type="date" id="quote-manufacturing-date" class="form-input" 
                           value="${quote ? quote.manufacturingStartDate : ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">納期 *</label>
                    <input type="date" id="quote-delivery-date" class="form-input" required
                           value="${quote ? quote.deliveryDate : ''}">
                </div>
            </div>
            <div id="quote-cost-display" class="form-group text-center" style="color: #667eea; font-weight: 600;">
                予想コスト: ¥0
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
                <button type="submit" class="btn btn-primary">
                    ${isEdit ? '更新' : '作成'}
                </button>
            </div>
        </form>
    `;
    
    showModal(modalContent);
    
    // BOM変更時のコスト計算
    document.getElementById('quote-bom').addEventListener('change', updateQuoteCost);
    document.getElementById('quote-quantity').addEventListener('input', updateQuoteCost);
    
    const form = document.getElementById('quote-form');
    
    // バリデーションルール定義
    const validationRules = {
        'quote-customer': [
            (value) => Validation.required(value, '顧客名'),
            (value) => Validation.maxLength(value, 100, '顧客名')
        ],
        'quote-product': [
            (value) => Validation.required(value, '製品名'),
            (value) => Validation.maxLength(value, 100, '製品名')
        ],
        'quote-quantity': [
            (value) => Validation.required(value, '数量'),
            (value) => Validation.number(value, '数量'),
            (value) => Validation.min(value, 1, '数量')
        ],
        'quote-delivery-date': [
            (value) => Validation.required(value, '納期'),
            (value) => Validation.date(value, '納期'),
            (value) => Validation.futureDate(value, '納期')
        ],
        'quote-manufacturing-date': [
            (value) => value ? Validation.date(value, '製造開始日') : null,
            (value) => value ? Validation.futureDate(value, '製造開始日') : null
        ]
    };
    
    // リアルタイムバリデーション設定
    addRealTimeValidation(form, validationRules);
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveQuote(quoteId);
    });
    
    // 初期コスト計算
    setTimeout(updateQuoteCost, 100);
}

function updateQuoteCost() {
    const bomId = document.getElementById('quote-bom').value;
    const quantity = parseInt(document.getElementById('quote-quantity').value) || 1;
    
    if (bomId) {
        const bom = boms.find(b => b.id === bomId);
        if (bom) {
            const totalCost = bom.totalCost * quantity;
            const costDisplay = document.getElementById('quote-cost-display');
            if (costDisplay) {
                costDisplay.textContent = `予想コスト: ¥${totalCost.toLocaleString()}`;
            }
        }
    } else {
        const costDisplay = document.getElementById('quote-cost-display');
        if (costDisplay) {
            costDisplay.textContent = `予想コスト: ¥0`;
        }
    }
}

async function saveQuote(quoteId = null) {
    try {
        const quoteData = {
            customerName: document.getElementById('quote-customer').value,
            productName: document.getElementById('quote-product').value,
            quantity: parseInt(document.getElementById('quote-quantity').value),
            manufacturingStartDate: document.getElementById('quote-manufacturing-date').value,
            deliveryDate: document.getElementById('quote-delivery-date').value
        };
        
        const quote = new Quote(
            quoteData.customerName,
            quoteData.productName,
            quoteData.quantity,
            quoteData.manufacturingStartDate,
            quoteData.deliveryDate
        );
        
        const bomId = document.getElementById('quote-bom').value;
        if (bomId) {
            quote.bomId = bomId;
            const bom = boms.find(b => b.id === bomId);
            if (bom) {
                quote.totalAmount = bom.totalCost * quote.quantity;
            }
        }
        
        if (quoteId) {
            quote.id = quoteId;
        }
        
        const savedId = await DatabaseService.saveQuote(quote);
        
        if (!quoteId) {
            quote.id = savedId;
            quotes.push(quote);
        } else {
            const index = quotes.findIndex(q => q.id === quoteId);
            if (index !== -1) {
                quotes[index] = { ...quote, id: quoteId };
            }
        }
        
        closeModal();
        renderQuoteTable();
        updateDashboard();
        showAlert(quoteId ? '見積もりを更新しました' : '見積もりを作成しました', 'success');
        
        // 在庫確認と発注アラート生成
        if (quote.bomId) {
            checkInventoryForQuote(quote);
        }
        
        // 製造スケジュールの確認メッセージ
        if (quote.bomId && quote.manufacturingStartDate) {
            showAlert('見積もりが作成されました。製造スケジュールを確認できます。', 'info');
        }
        
    } catch (error) {
        console.error('見積もりの保存に失敗しました:', error);
        showAlert('見積もりの保存に失敗しました', 'error');
    }
}

function checkInventoryForQuote(quote) {
    const bom = boms.find(b => b.id === quote.bomId);
    if (!bom) return;
    
    const requiredParts = {};
    bom.items.forEach(item => {
        const totalRequired = item.quantity * quote.quantity;
        if (requiredParts[item.partId]) {
            requiredParts[item.partId] += totalRequired;
        } else {
            requiredParts[item.partId] = totalRequired;
        }
    });
    
    const shortages = [];
    Object.keys(requiredParts).forEach(partId => {
        const required = requiredParts[partId];
        const inventoryRecord = inventory.find(i => i.partId === partId);
        const currentStock = inventoryRecord ? inventoryRecord.currentStock : 0;
        
        if (currentStock < required) {
            const part = parts.find(p => p.id === partId);
            if (part) {
                shortages.push({
                    part: part,
                    required: required,
                    current: currentStock,
                    shortage: required - currentStock
                });
            }
        }
    });
    
    if (shortages.length > 0) {
        showInventoryShortageAlert(shortages, quote);
    }
}

function showInventoryShortageAlert(shortages, quote) {
    const shortageText = shortages.map(s => 
        `${s.part.partNumber}: ${s.shortage}個不足`
    ).join(', ');
    
    showAlert(`見積もり ${quote.quoteNumber} の部品が不足しています: ${shortageText}`, 'warning');
}

function renderQuoteTable() {
    const tbody = document.getElementById('quote-tbody');
    
    if (quotes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">見積もりがありません</td></tr>';
        return;
    }
    
    tbody.innerHTML = quotes.map(quote => `
        <tr>
            <td>${quote.quoteNumber}</td>
            <td>${quote.customerName}</td>
            <td>${quote.productName}</td>
            <td>${quote.quantity}</td>
            <td>¥${quote.totalAmount.toLocaleString()}</td>
            <td>${formatDate(quote.deliveryDate)}</td>
            <td>
                <span class="status-badge status-${quote.status}">
                    ${getQuoteStatusText(quote.status)}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="openQuoteModal('${quote.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteQuote('${quote.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function getQuoteStatusText(status) {
    const statusTexts = {
        'draft': '下書き',
        'sent': '送信済み',
        'accepted': '受注',
        'rejected': '失注'
    };
    return statusTexts[status] || status;
}

async function deleteQuote(quoteId) {
    if (!confirm('この見積もりを削除しますか？')) return;
    
    try {
        await deleteDoc(doc(window.db, 'quotes', quoteId));
        quotes = quotes.filter(q => q.id !== quoteId);
        renderQuoteTable();
        updateDashboard();
        showAlert('見積もりを削除しました', 'success');
    } catch (error) {
        console.error('見積もりの削除に失敗しました:', error);
        showAlert('見積もりの削除に失敗しました', 'error');
    }
}
