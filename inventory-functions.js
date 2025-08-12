// 在庫管理関連関数
function openInventoryModal(partId = null) {
    const inventoryRecord = partId ? inventory.find(i => i.partId === partId) : null;
    const part = partId ? parts.find(p => p.id === partId) : null;
    
    const modalContent = `
        <div class="modal-header">
            <h3 class="modal-title">在庫更新</h3>
            <button class="modal-close" onclick="closeModal()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <form id="inventory-form">
            <div class="form-group">
                <label class="form-label">部品 *</label>
                <select id="inventory-part" class="form-select" required ${partId ? 'disabled' : ''}>
                    <option value="">部品を選択...</option>
                    ${parts.map(p => `
                        <option value="${p.id}" ${partId === p.id ? 'selected' : ''}>
                            ${p.partNumber} - ${p.name}
                        </option>
                    `).join('')}
                </select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">現在庫数 *</label>
                    <input type="number" id="current-stock" class="form-input" required min="0"
                           value="${inventoryRecord ? inventoryRecord.currentStock : ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">最小在庫数</label>
                    <input type="number" id="min-stock" class="form-input" min="0"
                           value="${inventoryRecord ? inventoryRecord.minStock : ''}">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">発注点</label>
                <input type="number" id="reorder-point" class="form-input" min="0"
                       value="${inventoryRecord ? inventoryRecord.reorderPoint : ''}">
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
                <button type="submit" class="btn btn-primary">更新</button>
            </div>
        </form>
    `;
    
    showModal(modalContent);
    
    document.getElementById('inventory-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveInventory();
    });
}

async function saveInventory() {
    try {
        const partId = document.getElementById('inventory-part').value;
        const currentStock = parseInt(document.getElementById('current-stock').value);
        const minStock = parseInt(document.getElementById('min-stock').value) || 0;
        const reorderPoint = parseInt(document.getElementById('reorder-point').value) || 0;
        
        const existingRecord = inventory.find(i => i.partId === partId);
        
        let inventoryRecord;
        
        if (existingRecord) {
            inventoryRecord = existingRecord;
            inventoryRecord.updateStock(currentStock);
            inventoryRecord.updateSettings(minStock, reorderPoint);
        } else {
            inventoryRecord = new InventoryRecord(partId, currentStock, minStock, reorderPoint);
        }
        
        const savedId = await DatabaseService.saveInventory(inventoryRecord);
        
        if (!existingRecord) {
            inventoryRecord.id = savedId;
            inventory.push(inventoryRecord);
        } else {
            const index = inventory.findIndex(i => i.id === existingRecord.id);
            if (index !== -1) {
                inventory[index] = { ...inventoryRecord, id: existingRecord.id };
            }
        }
        
        closeModal();
        renderInventoryTable();
        updateDashboard(); // ダッシュボードの在庫アラート更新
        showAlert('在庫を更新しました', 'success');
        
    } catch (error) {
        console.error('在庫の保存に失敗しました:', error);
        showAlert('在庫の保存に失敗しました', 'error');
    }
}

function renderInventoryTable() {
    const tbody = document.getElementById('inventory-tbody');
    
    if (inventory.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">在庫データがありません</td></tr>';
        return;
    }
    
    tbody.innerHTML = inventory.map(item => {
        const part = parts.find(p => p.id === item.partId);
        if (!part) return '';
        
        return `
            <tr>
                <td>${part.partNumber}</td>
                <td>${part.name}</td>
                <td>${item.currentStock}</td>
                <td>${item.minStock}</td>
                <td>${item.reorderPoint}</td>
                <td>${formatDate(item.lastUpdated)}</td>
                <td>
                    <span class="status-badge status-${item.status}">
                        ${getStatusText(item.status)}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="openInventoryModal('${item.partId}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function getStatusText(status) {
    const statusTexts = {
        'normal': '正常',
        'low': '在庫不足',
        'out': '在庫切れ'
    };
    return statusTexts[status] || status;
}

function filterInventory() {
    const searchTerm = document.getElementById('inventory-search').value.toLowerCase();
    const statusFilter = document.getElementById('stock-status-filter').value;
    
    let filteredInventory = inventory;
    
    if (searchTerm) {
        filteredInventory = filteredInventory.filter(item => {
            const part = parts.find(p => p.id === item.partId);
            return part && (
                part.name.toLowerCase().includes(searchTerm) || 
                part.partNumber.toLowerCase().includes(searchTerm)
            );
        });
    }
    
    if (statusFilter) {
        filteredInventory = filteredInventory.filter(item => item.status === statusFilter);
    }
    
    renderFilteredInventoryTable(filteredInventory);
}

function renderFilteredInventoryTable(filteredInventory) {
    const tbody = document.getElementById('inventory-tbody');
    
    if (filteredInventory.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">該当する在庫が見つかりません</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredInventory.map(item => {
        const part = parts.find(p => p.id === item.partId);
        if (!part) return '';
        
        return `
            <tr>
                <td>${part.partNumber}</td>
                <td>${part.name}</td>
                <td>${item.currentStock}</td>
                <td>${item.minStock}</td>
                <td>${item.reorderPoint}</td>
                <td>${formatDate(item.lastUpdated)}</td>
                <td>
                    <span class="status-badge status-${item.status}">
                        ${getStatusText(item.status)}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="openInventoryModal('${item.partId}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}
