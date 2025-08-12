// BOM管理関連関数
function openBomModal(bomId = null) {
    const bom = bomId ? boms.find(b => b.id === bomId) : null;
    const isEdit = !!bom;
    
    const modalContent = `
        <div class="modal-header">
            <h3 class="modal-title">${isEdit ? 'BOM編集' : '新規BOM作成'}</h3>
            <button class="modal-close" onclick="closeModal()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <form id="bom-form">
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">BOM名 *</label>
                    <input type="text" id="bom-name" class="form-input" required 
                           value="${bom ? bom.name : ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">製品名 *</label>
                    <input type="text" id="bom-product-name" class="form-input" required 
                           value="${bom ? bom.productName : ''}">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">バージョン</label>
                <input type="text" id="bom-version" class="form-input" 
                       value="${bom ? bom.version : '1.0'}">
            </div>
            
            <div class="form-group">
                <label class="form-label">BOM構成</label>
                <div id="bom-items-container">
                    ${renderBomItemsEditor(bom ? bom.items : [])}
                </div>
                <button type="button" class="btn btn-secondary btn-sm" onclick="addBomItem()">
                    <i class="fas fa-plus"></i> 部品追加
                </button>
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
    
    document.getElementById('bom-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveBOM(bomId);
    });
}

function renderBomItemsEditor(items = []) {
    return `
        <div class="bom-items-editor">
            ${items.map((item, index) => `
                <div class="bom-item-row" data-index="${index}" style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem; align-items: center;">
                    <select class="form-select" style="flex: 2;">
                        <option value="">部品を選択...</option>
                        ${parts.map(part => `
                            <option value="${part.id}" ${item.partId === part.id ? 'selected' : ''}>
                                ${part.partNumber} - ${part.name}
                            </option>
                        `).join('')}
                    </select>
                    <input type="number" class="form-input" placeholder="数量" value="${item.quantity}" 
                           style="flex: 1;" min="1">
                    <select class="form-select" style="flex: 1;" onchange="toggleDaysInput(this)">
                        <option value="manufacturing" ${item.usageTiming === 'manufacturing' ? 'selected' : ''}>製造開始時</option>
                        <option value="delivery" ${item.usageTiming === 'delivery' ? 'selected' : ''}>納品時</option>
                        <option value="days_after_start" ${item.usageTiming === 'days_after_start' ? 'selected' : ''}>製造開始後</option>
                    </select>
                    <input type="number" class="form-input" placeholder="日数" value="${item.daysAfterStart || ''}" 
                           style="flex: 1; ${item.usageTiming === 'days_after_start' ? '' : 'display: none;'}">
                    <button type="button" class="btn btn-sm btn-danger" onclick="removeBomItem(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `).join('')}
        </div>
    `;
}

function addBomItem() {
    const container = document.getElementById('bom-items-container');
    const currentItems = container.querySelectorAll('.bom-item-row').length;
    
    const newItemHtml = `
        <div class="bom-item-row" data-index="${currentItems}" style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem; align-items: center;">
            <select class="form-select" style="flex: 2;">
                <option value="">部品を選択...</option>
                ${parts.map(part => `
                    <option value="${part.id}">${part.partNumber} - ${part.name}</option>
                `).join('')}
            </select>
            <input type="number" class="form-input" placeholder="数量" value="1" 
                   style="flex: 1;" min="1" required>
            <select class="form-select" style="flex: 1;" onchange="toggleDaysInput(this)">
                <option value="manufacturing">製造開始時</option>
                <option value="delivery">納品時</option>
                <option value="days_after_start">製造開始後</option>
            </select>
            <input type="number" class="form-input" placeholder="日数" value="" 
                   style="flex: 1; display: none;" min="0">
            <button type="button" class="btn btn-sm btn-danger" onclick="removeBomItem(${currentItems})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    container.querySelector('.bom-items-editor').insertAdjacentHTML('beforeend', newItemHtml);
}

function removeBomItem(index) {
    const item = document.querySelector(`[data-index="${index}"]`);
    if (item) {
        item.remove();
        // インデックスを再計算
        updateBomItemIndices();
    }
}

function updateBomItemIndices() {
    const items = document.querySelectorAll('.bom-item-row');
    items.forEach((item, newIndex) => {
        item.setAttribute('data-index', newIndex);
        const removeButton = item.querySelector('.btn-danger');
        if (removeButton) {
            removeButton.setAttribute('onclick', `removeBomItem(${newIndex})`);
        }
    });
}

function toggleDaysInput(select) {
    const daysInput = select.parentNode.querySelector('input[placeholder="日数"]');
    if (select.value === 'days_after_start') {
        daysInput.style.display = 'block';
    } else {
        daysInput.style.display = 'none';
        daysInput.value = '';
    }
}

async function saveBOM(bomId = null) {
    try {
        const bomData = {
            name: document.getElementById('bom-name').value,
            productName: document.getElementById('bom-product-name').value,
            version: document.getElementById('bom-version').value || '1.0'
        };
        
        // BOM項目を収集
        const bomItemRows = document.querySelectorAll('.bom-item-row');
        const items = [];
        let hasValidationError = false;
        
        bomItemRows.forEach((row, index) => {
            const partSelect = row.querySelector('select');
            const quantityInput = row.querySelector('input[placeholder="数量"]');
            const timingSelect = row.querySelector('select:nth-child(3)');
            const daysInput = row.querySelector('input[placeholder="日数"]');
            
            if (partSelect.value && quantityInput.value) {
                const quantity = parseInt(quantityInput.value);
                if (quantity <= 0) {
                    showAlert(`行${index + 1}: 数量は1以上である必要があります`, 'error');
                    hasValidationError = true;
                    return;
                }
                
                const item = new BOMItem(
                    partSelect.value,
                    quantity,
                    0, // level
                    null, // parentId
                    timingSelect.value
                );
                
                if (timingSelect.value === 'days_after_start') {
                    const days = parseInt(daysInput.value);
                    if (!daysInput.value || days < 0) {
                        showAlert(`行${index + 1}: 製造開始後の日数を正しく入力してください`, 'error');
                        hasValidationError = true;
                        return;
                    }
                    item.daysAfterStart = days;
                }
                
                items.push(item);
            } else if (partSelect.value || quantityInput.value) {
                showAlert(`行${index + 1}: 部品と数量の両方を入力してください`, 'error');
                hasValidationError = true;
            }
        });
        
        if (hasValidationError) {
            return;
        }
        
        if (items.length === 0) {
            showAlert('BOMには少なくとも1つの部品が必要です', 'error');
            return;
        }
        
        const bom = new BOM(bomData.name, bomData.productName, bomData.version);
        bom.items = items;
        
        // コスト計算
        bom.totalCost = calculateBOMCost(items);
        
        if (bomId) {
            bom.id = bomId;
        }
        
        const savedId = await DatabaseService.saveBOM(bom);
        
        if (!bomId) {
            bom.id = savedId;
            boms.push(bom);
        } else {
            const index = boms.findIndex(b => b.id === bomId);
            if (index !== -1) {
                boms[index] = { ...bom, id: bomId };
            }
        }
        
        closeModal();
        renderBOMTree();
        showAlert(bomId ? 'BOMを更新しました' : 'BOMを作成しました', 'success');
        
    } catch (error) {
        console.error('BOMの保存に失敗しました:', error);
        showAlert('BOMの保存に失敗しました', 'error');
    }
}

function calculateBOMCost(items) {
    return items.reduce((total, item) => {
        const part = parts.find(p => p.id === item.partId);
        return total + (part ? part.purchasePrice * item.quantity : 0);
    }, 0);
}

function renderBOMTree() {
    const bomTree = document.getElementById('bom-tree');
    
    if (boms.length === 0) {
        bomTree.innerHTML = '<div class="text-center text-muted">BOMが作成されていません</div>';
        return;
    }
    
    bomTree.innerHTML = boms.map(bom => `
        <div class="bom-item level-0">
            <div class="bom-header">
                <div class="bom-title">
                    <i class="fas fa-sitemap"></i>
                    ${bom.name} (${bom.productName})
                </div>
                <div class="d-flex gap-1">
                    <button class="btn btn-sm btn-secondary" onclick="openBomModal('${bom.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteBOM('${bom.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="bom-details">
                <div>バージョン: ${bom.version}</div>
                <div>総コスト: ¥${bom.totalCost.toLocaleString()}</div>
                <div>部品数: ${bom.items.length}</div>
                <div>作成日: ${formatDate(bom.createdAt)}</div>
            </div>
            <div class="bom-items">
                ${bom.items.map(item => {
                    const part = parts.find(p => p.id === item.partId);
                    return part ? `
                        <div class="bom-item level-1">
                            <div class="bom-header">
                                <div class="bom-title">
                                    <i class="fas fa-cube"></i>
                                    ${part.partNumber} - ${part.name} (${item.quantity}個)
                                </div>
                            </div>
                            <div class="bom-details">
                                <div>使用タイミング: ${getUsageTimingText(item)}</div>
                                <div>単価: ¥${part.purchasePrice.toLocaleString()}</div>
                                <div>小計: ¥${(part.purchasePrice * item.quantity).toLocaleString()}</div>
                            </div>
                        </div>
                    ` : '';
                }).join('')}
            </div>
        </div>
    `).join('');
}

function getUsageTimingText(item) {
    switch(item.usageTiming) {
        case 'manufacturing': return '製造開始時';
        case 'delivery': return '納品時';
        case 'days_after_start': return `製造開始${item.daysAfterStart}日後`;
        default: return '製造開始時';
    }
}

async function deleteBOM(bomId) {
    if (!confirm('このBOMを削除しますか？')) return;
    
    try {
        await deleteDoc(doc(window.db, 'boms', bomId));
        boms = boms.filter(b => b.id !== bomId);
        renderBOMTree();
        showAlert('BOMを削除しました', 'success');
    } catch (error) {
        console.error('BOMの削除に失敗しました:', error);
        showAlert('BOMの削除に失敗しました', 'error');
    }
}
