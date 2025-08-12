// 共通ユーティリティ関数とコンポーネント

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
                const partRef = window.doc(window.db, 'parts', part.id);
                await window.updateDoc(partRef, {
                    ...part,
                    updatedAt: window.serverTimestamp()
                });
                return part.id;
            } else {
                // 新規作成
                const docRef = await window.addDoc(window.collection(window.db, 'parts'), {
                    ...part,
                    createdAt: window.serverTimestamp(),
                    updatedAt: window.serverTimestamp()
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
            const querySnapshot = await window.getDocs(window.collection(window.db, 'parts'));
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
                const bomRef = window.doc(window.db, 'boms', bom.id);
                await window.updateDoc(bomRef, {
                    ...bom,
                    updatedAt: window.serverTimestamp()
                });
                return bom.id;
            } else {
                const docRef = await window.addDoc(window.collection(window.db, 'boms'), {
                    ...bom,
                    createdAt: window.serverTimestamp(),
                    updatedAt: window.serverTimestamp()
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
            const querySnapshot = await window.getDocs(window.collection(window.db, 'boms'));
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
                const invRef = window.doc(window.db, 'inventory', inventoryRecord.id);
                await window.updateDoc(invRef, {
                    ...inventoryRecord,
                    lastUpdated: window.serverTimestamp()
                });
                return inventoryRecord.id;
            } else {
                const docRef = await window.addDoc(window.collection(window.db, 'inventory'), {
                    ...inventoryRecord,
                    lastUpdated: window.serverTimestamp()
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
            const querySnapshot = await window.getDocs(window.collection(window.db, 'inventory'));
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
                const quoteRef = window.doc(window.db, 'quotes', quote.id);
                await window.updateDoc(quoteRef, {
                    ...quote,
                    updatedAt: window.serverTimestamp()
                });
                return quote.id;
            } else {
                const docRef = await window.addDoc(window.collection(window.db, 'quotes'), {
                    ...quote,
                    createdAt: window.serverTimestamp(),
                    updatedAt: window.serverTimestamp()
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
            const querySnapshot = await window.getDocs(window.collection(window.db, 'quotes'));
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
                const orderRef = window.doc(window.db, 'orders', order.id);
                await window.updateDoc(orderRef, {
                    ...order,
                    updatedAt: window.serverTimestamp()
                });
                return order.id;
            } else {
                const docRef = await window.addDoc(window.collection(window.db, 'orders'), {
                    ...order,
                    createdAt: window.serverTimestamp(),
                    updatedAt: window.serverTimestamp()
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
            const querySnapshot = await window.getDocs(window.collection(window.db, 'orders'));
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

// モーダル機能
function showModal(content) {
    const modalOverlay = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-content');
    
    if (!modalOverlay || !modalContent) {
        console.error('モーダル要素が見つかりません');
        return;
    }
    
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
    if (modalOverlay) {
        modalOverlay.classList.remove('active');
    }
    
    // bodyのスクロールを有効化
    document.body.style.overflow = '';
    
    // フォーカスをリセット
    const activeElement = document.activeElement;
    if (activeElement && modalOverlay && modalOverlay.contains(activeElement)) {
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

// アラート表示
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        ${message}
    `;
    
    // アラートを表示する位置を決定
    const mainContent = document.querySelector('.main-content') || document.body;
    mainContent.insertBefore(alertDiv, mainContent.firstChild);
    
    // 5秒後に自動削除
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, 5000);
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

function getCategoryName(category) {
    const categories = {
        'electronic': '電子部品',
        'mechanical': '機械部品',
        'material': '材料'
    };
    return categories[category] || category;
}

function getStatusText(status) {
    const statusTexts = {
        'normal': '正常',
        'low': '在庫不足',
        'out': '在庫切れ'
    };
    return statusTexts[status] || status;
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

function getOrderStatusText(status) {
    const statusTexts = {
        'pending': '発注待ち',
        'ordered': '発注済み',
        'delivered': '納品済み',
        'cancelled': 'キャンセル'
    };
    return statusTexts[status] || status;
}

function getUsageTimingText(item) {
    switch(item.usageTiming) {
        case 'manufacturing': return '製造開始時';
        case 'delivery': return '納品時';
        case 'days_after_start': return `製造開始${item.daysAfterStart}日後`;
        default: return '製造開始時';
    }
}

// 初期データ読み込み
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
        
    } catch (error) {
        console.error('初期データの読み込みに失敗しました:', error);
        showAlert('データの読み込みに失敗しました', 'error');
    }
}

// 手動データ同期
function syncData() {
    loadInitialData().then(() => {
        showAlert('データを同期しました', 'success');
        // 現在のページに応じて表示を更新
        if (typeof updateCurrentView === 'function') {
            updateCurrentView();
        }
    }).catch(error => {
        console.error('データ同期エラー:', error);
        showAlert('データの同期に失敗しました', 'error');
    });
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
    if (typeof updateCurrentView === 'function') {
        updateCurrentView();
    }
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

// ページネーション
class Pagination {
    constructor(data, itemsPerPage = 50) {
        this.data = data;
        this.itemsPerPage = itemsPerPage;
        this.currentPage = 1;
        this.totalPages = Math.ceil(data.length / itemsPerPage);
    }
    
    getCurrentPageData() {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        return this.data.slice(startIndex, endIndex);
    }
    
    goToPage(page) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            return true;
        }
        return false;
    }
    
    nextPage() {
        return this.goToPage(this.currentPage + 1);
    }
    
    prevPage() {
        return this.goToPage(this.currentPage - 1);
    }
    
    renderPagination(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        let html = '<div class="pagination">';
        
        // 前のページボタン
        html += `<button class="btn btn-sm btn-secondary" ${this.currentPage === 1 ? 'disabled' : ''} onclick="pagination.prevPage() && updateCurrentView()">
            <i class="fas fa-chevron-left"></i>
        </button>`;
        
        // ページ番号
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.totalPages, this.currentPage + 2);
        
        if (startPage > 1) {
            html += `<button class="btn btn-sm btn-secondary" onclick="pagination.goToPage(1) && updateCurrentView()">1</button>`;
            if (startPage > 2) {
                html += '<span class="pagination-ellipsis">...</span>';
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="btn btn-sm ${i === this.currentPage ? 'btn-primary' : 'btn-secondary'}" 
                     onclick="pagination.goToPage(${i}) && updateCurrentView()">${i}</button>`;
        }
        
        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                html += '<span class="pagination-ellipsis">...</span>';
            }
            html += `<button class="btn btn-sm btn-secondary" onclick="pagination.goToPage(${this.totalPages}) && updateCurrentView()">${this.totalPages}</button>`;
        }
        
        // 次のページボタン
        html += `<button class="btn btn-sm btn-secondary" ${this.currentPage === this.totalPages ? 'disabled' : ''} onclick="pagination.nextPage() && updateCurrentView()">
            <i class="fas fa-chevron-right"></i>
        </button>`;
        
        html += '</div>';
        html += `<div class="pagination-info">
            ${this.data.length}件中 ${(this.currentPage - 1) * this.itemsPerPage + 1}-${Math.min(this.currentPage * this.itemsPerPage, this.data.length)}件を表示
        </div>`;
        
        container.innerHTML = html;
    }
}

// 共通初期化
function initializeCommon() {
    // グローバルキーボードイベント
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('modal-overlay');
            if (modal && modal.classList.contains('active')) {
                closeModal();
            }
        }
    });
    
    // モーダルクリックイベント
    const modalOverlay = document.getElementById('modal-overlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                closeModal();
            }
        });
    }
    
    // 定期的な在庫ステータス更新（5分ごと）
    setInterval(updateAllInventoryStatus, 5 * 60 * 1000);
}

// 初期化をDOMContentLoadedで実行
document.addEventListener('DOMContentLoaded', initializeCommon);
