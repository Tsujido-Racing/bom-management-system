// Firebase機能は index.html で読み込み済み

// グローバル変数
let currentTab = 'dashboard';
let parts = [];
let boms = [];
let inventory = [];
let quotes = [];
let orders = [];

// データモデル定義
class Part {
    constructor(partNumber, name, category, manufacturer, listPrice, purchasePrice, supplier, leadTime) {
        this.id = '';
        this.partNumber = partNumber;
        this.name = name;
        this.category = category;
        this.manufacturer = manufacturer;
        this.listPrice = listPrice;
        this.purchasePrice = purchasePrice;
        this.supplier = supplier;
        this.leadTime = leadTime;
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
}

class BOMItem {
    constructor(partId, quantity, level = 0, parentId = null, usageTiming = 'manufacturing') {
        this.id = '';
        this.partId = partId;
        this.quantity = quantity;
        this.level = level;
        this.parentId = parentId;
        this.usageTiming = usageTiming; // 'manufacturing', 'delivery', 'days_after_start'
        this.daysAfterStart = 0; // usageTiming が 'days_after_start' の場合の日数
        this.children = [];
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
}

class BOM {
    constructor(name, productName, version = '1.0') {
        this.id = '';
        this.name = name;
        this.productName = productName;
        this.version = version;
        this.items = [];
        this.totalCost = 0;
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
}

class InventoryRecord {
    constructor(partId, currentStock, minStock, reorderPoint) {
        this.id = '';
        this.partId = partId;
        this.currentStock = currentStock;
        this.minStock = minStock;
        this.reorderPoint = reorderPoint;
        this.lastUpdated = new Date();
        this.status = this.calculateStatus();
    }
    
    calculateStatus() {
        if (this.currentStock <= 0) return 'out';
        if (this.currentStock <= this.reorderPoint) return 'low';
        return 'normal';
    }
    
    updateStock(newStock) {
        this.currentStock = newStock;
        this.lastUpdated = new Date();
        this.status = this.calculateStatus();
    }
    
    updateSettings(minStock, reorderPoint) {
        this.minStock = minStock;
        this.reorderPoint = reorderPoint;
        this.lastUpdated = new Date();
        this.status = this.calculateStatus();
    }
}

class Quote {
    constructor(customerName, productName, quantity, manufacturingStartDate, deliveryDate) {
        this.id = '';
        this.quoteNumber = this.generateQuoteNumber();
        this.customerName = customerName;
        this.productName = productName;
        this.quantity = quantity;
        this.manufacturingStartDate = manufacturingStartDate;
        this.deliveryDate = deliveryDate;
        this.bomId = null;
        this.totalAmount = 0;
        this.status = 'draft'; // draft, sent, accepted, rejected
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
    
    generateQuoteNumber() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `Q${year}${month}${day}-${random}`;
    }
}

class Order {
    constructor(supplier, parts, totalAmount) {
        this.id = '';
        this.orderNumber = this.generateOrderNumber();
        this.supplier = supplier;
        this.parts = parts; // Array of {partId, quantity, unitPrice}
        this.totalAmount = totalAmount;
        this.orderDate = new Date();
        this.expectedDeliveryDate = null;
        this.status = 'pending'; // pending, ordered, delivered, cancelled
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
    
    generateOrderNumber() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `PO${year}${month}${day}-${random}`;
    }
}

// Firebase操作関数
class DatabaseService {
    static async savePart(part) {
        try {
            if (part.id) {
                // 更新
                const partRef = doc(window.db, 'parts', part.id);
                await updateDoc(partRef, {
                    ...part,
                    updatedAt: serverTimestamp()
                });
                return part.id;
            } else {
                // 新規作成
                const docRef = await addDoc(collection(window.db, 'parts'), {
                    ...part,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
                return docRef.id;
            }
        } catch (error) {
            console.error('部品の保存に失敗しました:', error);
            throw error;
        }
    }
    
    static async loadParts() {
        try {
            const querySnapshot = await getDocs(collection(window.db, 'parts'));
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('部品の読み込みに失敗しました:', error);
            throw error;
        }
    }
    
    static async saveBOM(bom) {
        try {
            if (bom.id) {
                const bomRef = doc(window.db, 'boms', bom.id);
                await updateDoc(bomRef, {
                    ...bom,
                    updatedAt: serverTimestamp()
                });
                return bom.id;
            } else {
                const docRef = await addDoc(collection(window.db, 'boms'), {
                    ...bom,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
                return docRef.id;
            }
        } catch (error) {
            console.error('BOMの保存に失敗しました:', error);
            throw error;
        }
    }
    
    static async loadBOMs() {
        try {
            const querySnapshot = await getDocs(collection(window.db, 'boms'));
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('BOMの読み込みに失敗しました:', error);
            throw error;
        }
    }
    
    static async saveInventory(inventoryRecord) {
        try {
            if (inventoryRecord.id) {
                const invRef = doc(window.db, 'inventory', inventoryRecord.id);
                await updateDoc(invRef, {
                    ...inventoryRecord,
                    lastUpdated: serverTimestamp()
                });
                return inventoryRecord.id;
            } else {
                const docRef = await addDoc(collection(window.db, 'inventory'), {
                    ...inventoryRecord,
                    lastUpdated: serverTimestamp()
                });
                return docRef.id;
            }
        } catch (error) {
            console.error('在庫の保存に失敗しました:', error);
            throw error;
        }
    }
    
    static async loadInventory() {
        try {
            const querySnapshot = await getDocs(collection(window.db, 'inventory'));
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('在庫の読み込みに失敗しました:', error);
            throw error;
        }
    }
    
    static async saveQuote(quote) {
        try {
            if (quote.id) {
                const quoteRef = doc(window.db, 'quotes', quote.id);
                await updateDoc(quoteRef, {
                    ...quote,
                    updatedAt: serverTimestamp()
                });
                return quote.id;
            } else {
                const docRef = await addDoc(collection(window.db, 'quotes'), {
                    ...quote,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
                return docRef.id;
            }
        } catch (error) {
            console.error('見積もりの保存に失敗しました:', error);
            throw error;
        }
    }
    
    static async loadQuotes() {
        try {
            const querySnapshot = await getDocs(collection(window.db, 'quotes'));
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('見積もりの読み込みに失敗しました:', error);
            throw error;
        }
    }
    
    static async saveOrder(order) {
        try {
            if (order.id) {
                const orderRef = doc(window.db, 'orders', order.id);
                await updateDoc(orderRef, {
                    ...order,
                    updatedAt: serverTimestamp()
                });
                return order.id;
            } else {
                const docRef = await addDoc(collection(window.db, 'orders'), {
                    ...order,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
                return docRef.id;
            }
        } catch (error) {
            console.error('発注の保存に失敗しました:', error);
            throw error;
        }
    }
    
    static async loadOrders() {
        try {
            const querySnapshot = await getDocs(collection(window.db, 'orders'));
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('発注の読み込みに失敗しました:', error);
            throw error;
        }
    }
}

// UI制御関数
function showTab(tabName) {
    // すべてのタブを非表示
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // すべてのナビリンクからactiveクラスを削除
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // 指定されたタブを表示
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // 対応するナビリンクにactiveクラスを追加
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    currentTab = tabName;
    
    // タブ固有の初期化処理
    switch(tabName) {
        case 'dashboard':
            updateDashboard();
            break;
        case 'parts':
            renderPartsTable();
            break;
        case 'bom':
            renderBOMTree();
            break;
        case 'inventory':
            renderInventoryTable();
            break;
        case 'quote':
            renderQuoteTable();
            break;
        case 'orders':
            renderOrdersTable();
            break;
    }
}

function showModal(content) {
    const modalOverlay = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-content');
    
    // 既存のモーダルを閉じる
    closeModal();
    
    modalContent.innerHTML = content;
    modalOverlay.classList.add('active');
    
    // モーダル表示時にbodyのスクロールを無効化
    document.body.style.overflow = 'hidden';
    
    // フォーカストラップ設定
    setupModalFocusTrap(modalContent);
}

function closeModal() {
    const modalOverlay = document.getElementById('modal-overlay');
    modalOverlay.classList.remove('active');
    
    // bodyのスクロールを有効化
    document.body.style.overflow = '';
    
    // フォーカスをリセット
    const activeElement = document.activeElement;
    if (activeElement && modalOverlay.contains(activeElement)) {
        activeElement.blur();
    }
}

function setupModalFocusTrap(modalContent) {
    const focusableElements = modalContent.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    // 最初の要素にフォーカス
    setTimeout(() => firstElement.focus(), 100);
    
    modalContent.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        }
    });
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        ${message}
    `;
    
    // アラートを表示する位置を決定（通常は画面上部）
    const mainContent = document.querySelector('.main-content');
    mainContent.insertBefore(alertDiv, mainContent.firstChild);
    
    // 5秒後に自動削除
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, 5000);
}

// ダッシュボード更新
function updateDashboard() {
    // 発注アラート数を計算
    const lowStockItems = inventory.filter(item => item.status === 'low' || item.status === 'out');
    document.getElementById('alert-count').textContent = lowStockItems.length;
    
    // 在庫不足数を更新
    document.getElementById('low-stock-count').textContent = lowStockItems.length;
    
    // 見積もり件数を更新
    document.getElementById('quote-count').textContent = quotes.length;
    
    // 今月の発注額を計算
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyOrderAmount = orders
        .filter(order => {
            const orderDate = new Date(order.orderDate);
            return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
        })
        .reduce((total, order) => total + order.totalAmount, 0);
    
    document.getElementById('monthly-orders').textContent = `¥${monthlyOrderAmount.toLocaleString()}`;
    
    // 最近のアクティビティを更新
    updateRecentActivities();
}

function updateRecentActivities() {
    const activityList = document.getElementById('activity-list');
    const activities = [];
    
    // 最近の発注を追加
    orders.slice(-5).forEach(order => {
        activities.push({
            icon: 'shopping-cart',
            text: `発注 ${order.orderNumber} を作成しました`,
            time: formatDateTime(order.createdAt)
        });
    });
    
    // 最近の見積もりを追加
    quotes.slice(-3).forEach(quote => {
        activities.push({
            icon: 'file-invoice',
            text: `見積もり ${quote.quoteNumber} を作成しました`,
            time: formatDateTime(quote.createdAt)
        });
    });
    
    // 時間順にソート
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    
    activityList.innerHTML = activities.slice(0, 10).map(activity => `
        <div class="activity-item">
            <div class="activity-icon">
                <i class="fas fa-${activity.icon}"></i>
            </div>
            <div class="activity-text">${activity.text}</div>
            <div class="activity-time">${activity.time}</div>
        </div>
    `).join('');
    
    if (activities.length === 0) {
        activityList.innerHTML = '<div class="text-center text-muted">アクティビティがありません</div>';
    }
}

// 部品マスタ関連関数
function openPartModal(partId = null) {
    const part = partId ? parts.find(p => p.id === partId) : null;
    const isEdit = !!part;
    
    const modalContent = `
        <div class="modal-header">
            <h3 class="modal-title">${isEdit ? '部品編集' : '新規部品登録'}</h3>
            <button class="modal-close" onclick="closeModal()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <form id="part-form">
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">品番 *</label>
                    <input type="text" id="part-number" class="form-input" required 
                           value="${part ? part.partNumber : ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">部品名 *</label>
                    <input type="text" id="part-name" class="form-input" required 
                           value="${part ? part.name : ''}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">カテゴリ</label>
                    <select id="part-category" class="form-select">
                        <option value="electronic" ${part && part.category === 'electronic' ? 'selected' : ''}>電子部品</option>
                        <option value="mechanical" ${part && part.category === 'mechanical' ? 'selected' : ''}>機械部品</option>
                        <option value="material" ${part && part.category === 'material' ? 'selected' : ''}>材料</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">メーカー</label>
                    <input type="text" id="part-manufacturer" class="form-input" 
                           value="${part ? part.manufacturer : ''}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">定価</label>
                    <input type="number" id="part-list-price" class="form-input" step="0.01" 
                           value="${part ? part.listPrice : ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">仕入れ値</label>
                    <input type="number" id="part-purchase-price" class="form-input" step="0.01" 
                           value="${part ? part.purchasePrice : ''}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">発注先</label>
                    <input type="text" id="part-supplier" class="form-input" 
                           value="${part ? part.supplier : ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">リードタイム（日）</label>
                    <input type="number" id="part-lead-time" class="form-input" 
                           value="${part ? part.leadTime : ''}">
                </div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
                <button type="submit" class="btn btn-primary">
                    ${isEdit ? '更新' : '登録'}
                </button>
            </div>
        </form>
    `;
    
    showModal(modalContent);
    
    // フォーム送信イベントリスナー
    const form = document.getElementById('part-form');
    
    // バリデーションルール定義
    const validationRules = {
        'part-number': [
            (value) => Validation.required(value, '品番'),
            (value) => Validation.minLength(value, 1, '品番'),
            (value) => Validation.maxLength(value, 50, '品番'),
            (value) => Validation.unique(value, parts, '品番', partId)
        ],
        'part-name': [
            (value) => Validation.required(value, '部品名'),
            (value) => Validation.minLength(value, 1, '部品名'),
            (value) => Validation.maxLength(value, 100, '部品名')
        ],
        'part-list-price': [
            (value) => value ? Validation.number(value, '定価') : null,
            (value) => value ? Validation.min(value, 0, '定価') : null
        ],
        'part-purchase-price': [
            (value) => value ? Validation.number(value, '仕入れ値') : null,
            (value) => value ? Validation.min(value, 0, '仕入れ値') : null
        ],
        'part-lead-time': [
            (value) => value ? Validation.number(value, 'リードタイム') : null,
            (value) => value ? Validation.min(value, 0, 'リードタイム') : null
        ]
    };
    
    // リアルタイムバリデーション設定
    addRealTimeValidation(form, validationRules);
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await savePart(partId);
    });
}

async function savePart(partId = null) {
    try {
        const partData = {
            partNumber: document.getElementById('part-number').value,
            name: document.getElementById('part-name').value,
            category: document.getElementById('part-category').value,
            manufacturer: document.getElementById('part-manufacturer').value,
            listPrice: parseFloat(document.getElementById('part-list-price').value) || 0,
            purchasePrice: parseFloat(document.getElementById('part-purchase-price').value) || 0,
            supplier: document.getElementById('part-supplier').value,
            leadTime: parseInt(document.getElementById('part-lead-time').value) || 0
        };
        
        // バリデーション実行
        const validationRules = {
            partNumber: [
                (value) => Validation.required(value, '品番'),
                (value) => Validation.maxLength(value, 50, '品番'),
                (value) => Validation.unique(value, parts, '品番', partId)
            ],
            name: [
                (value) => Validation.required(value, '部品名'),
                (value) => Validation.maxLength(value, 100, '部品名')
            ],
            listPrice: [
                (value) => Validation.min(value, 0, '定価')
            ],
            purchasePrice: [
                (value) => Validation.min(value, 0, '仕入れ値')
            ],
            leadTime: [
                (value) => Validation.min(value, 0, 'リードタイム')
            ]
        };
        
        const errors = validateForm(partData, validationRules);
        if (errors.length > 0) {
            showAlert(errors.join('\n'), 'error');
            return;
        }
        
        if (partId) {
            partData.id = partId;
        }
        
        const part = new Part(
            partData.partNumber,
            partData.name,
            partData.category,
            partData.manufacturer,
            partData.listPrice,
            partData.purchasePrice,
            partData.supplier,
            partData.leadTime
        );
        
        if (partId) {
            part.id = partId;
        }
        
        const savedId = await DatabaseService.savePart(part);
        
        if (!partId) {
            part.id = savedId;
            parts.push(part);
        } else {
            const index = parts.findIndex(p => p.id === partId);
            if (index !== -1) {
                parts[index] = { ...part, id: partId };
            }
        }
        
        closeModal();
        renderPartsTable();
        showAlert(partId ? '部品を更新しました' : '部品を登録しました', 'success');
        
    } catch (error) {
        console.error('部品の保存に失敗しました:', error);
        showAlert('部品の保存に失敗しました', 'error');
    }
}

function renderPartsTable() {
    const tbody = document.getElementById('parts-tbody');
    
    if (parts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">部品が登録されていません</td></tr>';
        return;
    }
    
    tbody.innerHTML = parts.map(part => `
        <tr>
            <td>${part.partNumber}</td>
            <td>${part.name}</td>
            <td>${getCategoryName(part.category)}</td>
            <td>${part.manufacturer || '-'}</td>
            <td>¥${part.listPrice.toLocaleString()}</td>
            <td>¥${part.purchasePrice.toLocaleString()}</td>
            <td>${part.supplier || '-'}</td>
            <td>${part.leadTime}日</td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="openPartModal('${part.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deletePart('${part.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function getCategoryName(category) {
    const categories = {
        'electronic': '電子部品',
        'mechanical': '機械部品',
        'material': '材料'
    };
    return categories[category] || category;
}

async function deletePart(partId) {
    if (!confirm('この部品を削除しますか？')) return;
    
    try {
        await deleteDoc(doc(window.db, 'parts', partId));
        parts = parts.filter(p => p.id !== partId);
        renderPartsTable();
        showAlert('部品を削除しました', 'success');
    } catch (error) {
        console.error('部品の削除に失敗しました:', error);
        showAlert('部品の削除に失敗しました', 'error');
    }
}

// データ検証関数
const Validation = {
    required: (value, fieldName) => {
        if (!value || value.toString().trim() === '') {
            return `${fieldName}は必須項目です`;
        }
        return null;
    },
    
    minLength: (value, min, fieldName) => {
        if (value && value.length < min) {
            return `${fieldName}は${min}文字以上で入力してください`;
        }
        return null;
    },
    
    maxLength: (value, max, fieldName) => {
        if (value && value.length > max) {
            return `${fieldName}は${max}文字以下で入力してください`;
        }
        return null;
    },
    
    number: (value, fieldName) => {
        if (value && isNaN(Number(value))) {
            return `${fieldName}は数値で入力してください`;
        }
        return null;
    },
    
    min: (value, min, fieldName) => {
        if (value && Number(value) < min) {
            return `${fieldName}は${min}以上で入力してください`;
        }
        return null;
    },
    
    max: (value, max, fieldName) => {
        if (value && Number(value) > max) {
            return `${fieldName}は${max}以下で入力してください`;
        }
        return null;
    },
    
    email: (value, fieldName) => {
        if (value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                return `${fieldName}の形式が正しくありません`;
            }
        }
        return null;
    },
    
    date: (value, fieldName) => {
        if (value) {
            const date = new Date(value);
            if (isNaN(date.getTime())) {
                return `${fieldName}の日付形式が正しくありません`;
            }
        }
        return null;
    },
    
    futureDate: (value, fieldName) => {
        if (value) {
            const date = new Date(value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (date < today) {
                return `${fieldName}は今日以降の日付を選択してください`;
            }
        }
        return null;
    },
    
    unique: (value, array, fieldName, currentId = null) => {
        if (value) {
            const exists = array.some(item => 
                item.id !== currentId && 
                item[fieldName.toLowerCase().replace(/\s/g, '')] === value
            );
            if (exists) {
                return `この${fieldName}は既に使用されています`;
            }
        }
        return null;
    }
};

// フォーム検証実行
function validateForm(formData, rules) {
    const errors = [];
    
    for (const field in rules) {
        const value = formData[field];
        const fieldRules = rules[field];
        
        for (const rule of fieldRules) {
            const error = rule(value);
            if (error) {
                errors.push(error);
                break; // 最初のエラーで停止
            }
        }
    }
    
    return errors;
}

// リアルタイム検証
function addRealTimeValidation(formElement, rules) {
    Object.keys(rules).forEach(fieldName => {
        const field = formElement.querySelector(`#${fieldName}`);
        if (field) {
            field.addEventListener('blur', () => {
                validateField(field, rules[fieldName]);
            });
            
            field.addEventListener('input', () => {
                clearFieldError(field);
            });
        }
    });
}

function validateField(field, rules) {
    const value = field.value;
    for (const rule of rules) {
        const error = rule(value);
        if (error) {
            showFieldError(field, error);
            return false;
        }
    }
    clearFieldError(field);
    return true;
}

function showFieldError(field, message) {
    clearFieldError(field);
    
    field.classList.add('field-error');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error-message';
    errorDiv.textContent = message;
    
    field.parentNode.appendChild(errorDiv);
}

function clearFieldError(field) {
    field.classList.remove('field-error');
    const existingError = field.parentNode.querySelector('.field-error-message');
    if (existingError) {
        existingError.remove();
    }
}

// ユーティリティ関数
function formatDateTime(date) {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleString('ja-JP');
}

function formatDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('ja-JP');
}

// イベントリスナー設定
document.addEventListener('DOMContentLoaded', async () => {
    // ナビゲーションクリックイベント
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = link.dataset.tab;
            showTab(tabName);
        });
    });
    
    // モーダルクリックイベント
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            closeModal();
        }
    });
    
    // グローバルキーボードイベント
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('modal-overlay');
            if (modal.classList.contains('active')) {
                closeModal();
            }
        }
    });
    
    // 検索フィルター
    const partSearch = document.getElementById('part-search');
    if (partSearch) {
        partSearch.addEventListener('input', filterParts);
    }
    
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterParts);
    }
    
    // 在庫検索フィルター
    const inventorySearch = document.getElementById('inventory-search');
    if (inventorySearch) {
        inventorySearch.addEventListener('input', filterInventory);
    }
    
    const stockStatusFilter = document.getElementById('stock-status-filter');
    if (stockStatusFilter) {
        stockStatusFilter.addEventListener('change', filterInventory);
    }
    
    // 初期データ読み込み
    await loadInitialData();
    
    // 初期表示
    showTab('dashboard');
});

async function loadInitialData() {
    try {
        // 全データを並列で読み込み
        const [partsData, bomsData, inventoryData, quotesData, ordersData] = await Promise.all([
            DatabaseService.loadParts(),
            DatabaseService.loadBOMs(),
            DatabaseService.loadInventory(),
            DatabaseService.loadQuotes(),
            DatabaseService.loadOrders()
        ]);
        
        parts = partsData;
        boms = bomsData;
        inventory = inventoryData;
        quotes = quotesData;
        orders = ordersData;
        
        console.log('初期データを読み込みました');
        
        // 定期的な在庫ステータス更新（5分ごと）
        setInterval(updateAllInventoryStatus, 5 * 60 * 1000);
        
    } catch (error) {
        console.error('初期データの読み込みに失敗しました:', error);
        showAlert('データの読み込みに失敗しました', 'error');
    }
}

// 手動データ同期
function syncData() {
    loadInitialData().then(() => {
        showAlert('データを同期しました', 'success');
        if (currentTab === 'dashboard') {
            updateDashboard();
        }
    }).catch(error => {
        console.error('データ同期エラー:', error);
        showAlert('データの同期に失敗しました', 'error');
    });
}

function filterParts() {
    const searchTerm = document.getElementById('part-search').value.toLowerCase();
    const categoryFilter = document.getElementById('category-filter').value;
    
    let filteredParts = parts;
    
    if (searchTerm) {
        filteredParts = filteredParts.filter(part => 
            part.name.toLowerCase().includes(searchTerm) || 
            part.partNumber.toLowerCase().includes(searchTerm)
        );
    }
    
    if (categoryFilter) {
        filteredParts = filteredParts.filter(part => part.category === categoryFilter);
    }
    
    renderFilteredPartsTable(filteredParts);
}

function renderFilteredPartsTable(filteredParts) {
    const tbody = document.getElementById('parts-tbody');
    
    if (filteredParts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">該当する部品が見つかりません</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredParts.map(part => `
        <tr>
            <td>${part.partNumber}</td>
            <td>${part.name}</td>
            <td>${getCategoryName(part.category)}</td>
            <td>${part.manufacturer || '-'}</td>
            <td>¥${part.listPrice.toLocaleString()}</td>
            <td>¥${part.purchasePrice.toLocaleString()}</td>
            <td>${part.supplier || '-'}</td>
            <td>${part.leadTime}日</td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="openPartModal('${part.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deletePart('${part.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// 在庫管理関数
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

// 見積もり管理関数
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
                ${quote.bomId && quote.manufacturingStartDate ? `
                    <button class="btn btn-sm btn-secondary" onclick="showProductionSchedule(quotes.find(q => q.id === '${quote.id}'))">
                        <i class="fas fa-calendar-alt"></i>
                    </button>
                ` : ''}
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

// 発注管理関数
function renderOrdersTable() {
    const tbody = document.getElementById('orders-tbody');
    
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">発注がありません</td></tr>';
        return;
    }
    
    tbody.innerHTML = orders.map(order => `
        <tr>
            <td>${order.orderNumber}</td>
            <td>${order.supplier}</td>
            <td>${order.parts.length}</td>
            <td>¥${order.totalAmount.toLocaleString()}</td>
            <td>${formatDate(order.orderDate)}</td>
            <td>${formatDate(order.expectedDeliveryDate)}</td>
            <td>
                <span class="status-badge status-${order.status}">
                    ${getOrderStatusText(order.status)}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="viewOrderDetails('${order.id}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteOrder('${order.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function getOrderStatusText(status) {
    const statusTexts = {
        'pending': '発注待ち',
        'ordered': '発注済み',
        'delivered': '納品済み',
        'cancelled': 'キャンセル'
    };
    return statusTexts[status] || status;
}

// BOM管理関数
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

// フィルタリング関数
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

// 在庫ステータス一括更新
function updateAllInventoryStatus() {
    inventory.forEach(item => {
        const oldStatus = item.status;
        item.status = item.calculateStatus();
        
        // ステータスが変更された場合はデータベースを更新
        if (oldStatus !== item.status) {
            DatabaseService.saveInventory(item).catch(error => {
                console.error('在庫ステータス更新エラー:', error);
            });
        }
    });
    
    // 表示を更新
    if (currentTab === 'inventory') {
        renderInventoryTable();
    }
    updateDashboard();
}

// 在庫消費機能（製造時に使用）
function consumeInventory(partId, quantity) {
    const inventoryRecord = inventory.find(i => i.partId === partId);
    if (inventoryRecord) {
        inventoryRecord.updateStock(Math.max(0, inventoryRecord.currentStock - quantity));
        DatabaseService.saveInventory(inventoryRecord);
        
        // アラート生成
        if (inventoryRecord.status === 'low' || inventoryRecord.status === 'out') {
            const part = parts.find(p => p.id === partId);
            if (part) {
                showAlert(`${part.partNumber}の在庫が不足しています（現在庫：${inventoryRecord.currentStock}）`, 'warning');
            }
        }
        
        updateAllInventoryStatus();
    }
}

// 在庫補充機能（納品時に使用）
function replenishInventory(partId, quantity) {
    const inventoryRecord = inventory.find(i => i.partId === partId);
    if (inventoryRecord) {
        inventoryRecord.updateStock(inventoryRecord.currentStock + quantity);
        DatabaseService.saveInventory(inventoryRecord);
        updateAllInventoryStatus();
        
        const part = parts.find(p => p.id === partId);
        if (part) {
            showAlert(`${part.partNumber}の在庫を${quantity}個補充しました`, 'success');
        }
    }
}
