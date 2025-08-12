// 発注管理関連関数
function createOrdersFromAlerts() {
    const lowStockItems = inventory.filter(item => item.status === 'low' || item.status === 'out');
    
    if (lowStockItems.length === 0) {
        showAlert('発注が必要な部品がありません', 'info');
        return;
    }
    
    // 発注先別にグループ化
    const ordersBySupplier = {};
    
    lowStockItems.forEach(item => {
        const part = parts.find(p => p.id === item.partId);
        if (part && part.supplier) {
            if (!ordersBySupplier[part.supplier]) {
                ordersBySupplier[part.supplier] = [];
            }
            
            const orderQuantity = Math.max(
                item.reorderPoint - item.currentStock,
                item.minStock
            );
            
            ordersBySupplier[part.supplier].push({
                partId: part.id,
                quantity: orderQuantity,
                unitPrice: part.purchasePrice
            });
        }
    });
    
    showOrderConfirmationModal(ordersBySupplier);
}

function showOrderConfirmationModal(ordersBySupplier) {
    const modalContent = `
        <div class="modal-header">
            <h3 class="modal-title">発注確認</h3>
            <button class="modal-close" onclick="closeModal()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="order-confirmation">
            ${Object.keys(ordersBySupplier).map(supplier => {
                const supplierOrders = ordersBySupplier[supplier];
                const totalAmount = supplierOrders.reduce((total, order) => 
                    total + (order.quantity * order.unitPrice), 0);
                
                return `
                    <div class="supplier-order" style="margin-bottom: 1.5rem; padding: 1rem; border: 1px solid #e2e8f0; border-radius: 8px;">
                        <h4 style="margin-bottom: 1rem; color: #2d3748;">${supplier}</h4>
                        <div class="order-items">
                            ${supplierOrders.map(order => {
                                const part = parts.find(p => p.id === order.partId);
                                return `
                                    <div class="order-item" style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #f7fafc;">
                                        <span>${part.partNumber} - ${part.name}</span>
                                        <span>${order.quantity}個 × ¥${order.unitPrice.toLocaleString()}</span>
                                        <span style="font-weight: 600;">¥${(order.quantity * order.unitPrice).toLocaleString()}</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                        <div class="supplier-total" style="margin-top: 1rem; padding-top: 1rem; border-top: 2px solid #667eea; font-weight: 600; text-align: right;">
                            合計: ¥${totalAmount.toLocaleString()}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
        <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
            <button type="button" class="btn btn-primary" onclick="confirmOrders(\`${JSON.stringify(ordersBySupplier).replace(/`/g, '\\`')}\`)">
                発注作成
            </button>
        </div>
    `;
    
    showModal(modalContent);
}

async function confirmOrders(ordersBySupplierJson) {
    try {
        const ordersBySupplier = JSON.parse(ordersBySupplierJson);
        
        for (const supplier of Object.keys(ordersBySupplier)) {
            const supplierOrders = ordersBySupplier[supplier];
            const totalAmount = supplierOrders.reduce((total, order) => 
                total + (order.quantity * order.unitPrice), 0);
            
            const order = new Order(supplier, supplierOrders, totalAmount);
            
            // リードタイムを考慮した納期計算
            const maxLeadTime = Math.max(...supplierOrders.map(order => {
                const part = parts.find(p => p.id === order.partId);
                return part ? part.leadTime : 0;
            }));
            
            const expectedDelivery = new Date();
            expectedDelivery.setDate(expectedDelivery.getDate() + maxLeadTime);
            order.expectedDeliveryDate = expectedDelivery;
            
            const savedId = await DatabaseService.saveOrder(order);
            order.id = savedId;
            orders.push(order);
        }
        
        closeModal();
        renderOrdersTable();
        updateDashboard();
        showAlert(`${Object.keys(ordersBySupplier).length}件の発注を作成しました`, 'success');
        
        // LINE通知送信（実装は後で）
        sendLineNotification(ordersBySupplier);
        
    } catch (error) {
        console.error('発注の作成に失敗しました:', error);
        showAlert('発注の作成に失敗しました', 'error');
    }
}

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

function viewOrderDetails(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    const modalContent = `
        <div class="modal-header">
            <h3 class="modal-title">発注詳細 - ${order.orderNumber}</h3>
            <button class="modal-close" onclick="closeModal()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="order-details">
            <div class="order-info" style="margin-bottom: 1.5rem; padding: 1rem; background: #f7fafc; border-radius: 8px;">
                <h4 style="margin-bottom: 1rem;">発注情報</h4>
                <p><strong>発注先:</strong> ${order.supplier}</p>
                <p><strong>発注日:</strong> ${formatDate(order.orderDate)}</p>
                <p><strong>納期:</strong> ${formatDate(order.expectedDeliveryDate)}</p>
                <p><strong>ステータス:</strong> ${getOrderStatusText(order.status)}</p>
            </div>
            <div class="order-items">
                <h4 style="margin-bottom: 1rem;">発注品目</h4>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>品番</th>
                                <th>部品名</th>
                                <th>数量</th>
                                <th>単価</th>
                                <th>小計</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${order.parts.map(orderPart => {
                                const part = parts.find(p => p.id === orderPart.partId);
                                return part ? `
                                    <tr>
                                        <td>${part.partNumber}</td>
                                        <td>${part.name}</td>
                                        <td>${orderPart.quantity}</td>
                                        <td>¥${orderPart.unitPrice.toLocaleString()}</td>
                                        <td>¥${(orderPart.quantity * orderPart.unitPrice).toLocaleString()}</td>
                                    </tr>
                                ` : '';
                            }).join('')}
                            <tr style="font-weight: 600; background: #f7fafc;">
                                <td colspan="4"><strong>合計</strong></td>
                                <td><strong>¥${order.totalAmount.toLocaleString()}</strong></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="closeModal()">閉じる</button>
            <button type="button" class="btn btn-primary" onclick="updateOrderStatus('${order.id}')">
                ステータス更新
            </button>
        </div>
    `;
    
    showModal(modalContent);
}

function updateOrderStatus(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    const modalContent = `
        <div class="modal-header">
            <h3 class="modal-title">ステータス更新 - ${order.orderNumber}</h3>
            <button class="modal-close" onclick="closeModal()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <form id="status-form">
            <div class="form-group">
                <label class="form-label">ステータス</label>
                <select id="order-status" class="form-select" required>
                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>発注待ち</option>
                    <option value="ordered" ${order.status === 'ordered' ? 'selected' : ''}>発注済み</option>
                    <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>納品済み</option>
                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>キャンセル</option>
                </select>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
                <button type="submit" class="btn btn-primary">更新</button>
            </div>
        </form>
    `;
    
    showModal(modalContent);
    
    document.getElementById('status-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveOrderStatus(orderId);
    });
}

async function saveOrderStatus(orderId) {
    try {
        const newStatus = document.getElementById('order-status').value;
        const order = orders.find(o => o.id === orderId);
        
        if (order) {
            order.status = newStatus;
            order.updatedAt = new Date();
            
            await DatabaseService.saveOrder(order);
            
            const index = orders.findIndex(o => o.id === orderId);
            if (index !== -1) {
                orders[index] = order;
            }
            
            closeModal();
            renderOrdersTable();
            showAlert('ステータスを更新しました', 'success');
        }
    } catch (error) {
        console.error('ステータスの更新に失敗しました:', error);
        showAlert('ステータスの更新に失敗しました', 'error');
    }
}

async function deleteOrder(orderId) {
    if (!confirm('この発注を削除しますか？')) return;
    
    try {
        await deleteDoc(doc(window.db, 'orders', orderId));
        orders = orders.filter(o => o.id !== orderId);
        renderOrdersTable();
        updateDashboard();
        showAlert('発注を削除しました', 'success');
    } catch (error) {
        console.error('発注の削除に失敗しました:', error);
        showAlert('発注の削除に失敗しました', 'error');
    }
}

// LINE通知機能
function sendLineNotification(ordersBySupplier) {
    // LINE Notify トークンの確認
    const lineToken = getLineNotifyToken();
    
    if (!lineToken) {
        console.log('LINE Notifyトークンが設定されていません');
        return;
    }
    
    try {
        const suppliers = Object.keys(ordersBySupplier);
        const totalAmount = Object.values(ordersBySupplier).reduce((total, orders) => {
            return total + orders.reduce((sum, order) => sum + (order.quantity * order.unitPrice), 0);
        }, 0);
        
        const message = `🔔 BOM管理システム - 発注アラート

📦 ${suppliers.length}件の発注を作成しました

💰 総発注金額: ¥${totalAmount.toLocaleString()}

📋 発注先:
${suppliers.map(supplier => {
    const orders = ordersBySupplier[supplier];
    const supplierTotal = orders.reduce((sum, order) => sum + (order.quantity * order.unitPrice), 0);
    return `・${supplier}: ¥${supplierTotal.toLocaleString()} (${orders.length}品目)`;
}).join('\n')}

⏰ ${new Date().toLocaleString('ja-JP')}`;

        sendLineMessage(lineToken, message);
        
    } catch (error) {
        console.error('LINE通知メッセージ作成エラー:', error);
    }
}

// LINE Notifyトークンを取得
function getLineNotifyToken() {
    // 環境変数から取得を試行
    if (typeof process !== 'undefined' && process.env) {
        return process.env.LINE_NOTIFY_TOKEN;
    }
    
    // ローカルストレージから取得
    const token = localStorage.getItem('lineNotifyToken');
    if (token) {
        return token;
    }
    
    return null;
}

// LINE Notifyトークンを設定
function setLineNotifyToken(token) {
    if (token && token.trim()) {
        localStorage.setItem('lineNotifyToken', token.trim());
        showAlert('LINE Notifyトークンを設定しました', 'success');
    } else {
        localStorage.removeItem('lineNotifyToken');
        showAlert('LINE Notifyトークンを削除しました', 'info');
    }
}

// LINE通知設定ダイアログ
function openLineSettingsModal() {
    const currentToken = getLineNotifyToken();
    
    const modalContent = `
        <div class="modal-header">
            <h3 class="modal-title">LINE通知設定</h3>
            <button class="modal-close" onclick="closeModal()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="line-settings">
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i>
                LINE Notify APIを使用して発注アラートを受信できます。<br>
                <a href="https://notify-bot.line.me/" target="_blank">LINE Notify</a>でトークンを取得してください。
            </div>
            
            <form id="line-settings-form">
                <div class="form-group">
                    <label class="form-label">LINE Notifyトークン</label>
                    <input type="password" id="line-token" class="form-input" 
                           placeholder="LINE Notifyトークンを入力..."
                           value="${currentToken || ''}">
                    <small class="form-help">トークンは安全にローカルストレージに保存されます</small>
                </div>
                
                <div class="form-group">
                    <button type="button" class="btn btn-secondary" onclick="testLineNotification()">
                        <i class="fas fa-paper-plane"></i> テスト送信
                    </button>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
                    <button type="submit" class="btn btn-primary">保存</button>
                    <button type="button" class="btn btn-danger" onclick="clearLineToken()">削除</button>
                </div>
            </form>
        </div>
    `;
    
    showModal(modalContent);
    
    document.getElementById('line-settings-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const token = document.getElementById('line-token').value;
        setLineNotifyToken(token);
        closeModal();
    });
}

// LINE Notifyメッセージ送信
async function sendLineMessage(token, message) {
    try {
        const response = await fetch('https://notify-api.line.me/api/notify', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `message=${encodeURIComponent(message)}`
        });

        if (response.ok) {
            console.log('LINE通知を送信しました');
            showAlert('LINE通知を送信しました', 'success');
        } else {
            throw new Error(`LINE API エラー: ${response.status}`);
        }
    } catch (error) {
        console.error('LINE通知エラー:', error);
        showAlert('LINE通知の送信に失敗しました', 'error');
    }
}

// テスト通知送信
function testLineNotification() {
    const token = document.getElementById('line-token').value;
    
    if (!token) {
        showAlert('トークンを入力してください', 'warning');
        return;
    }
    
    const testMessage = `🧪 BOM管理システム - テスト通知

この通知が届けば設定は正常です。

⏰ ${new Date().toLocaleString('ja-JP')}`;

    sendLineMessage(token, testMessage);
}

// トークンクリア
function clearLineToken() {
    if (confirm('LINE Notifyトークンを削除しますか？')) {
        setLineNotifyToken('');
        closeModal();
    }
}
