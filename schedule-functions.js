// 製造スケジュール管理関連関数

class ProductionSchedule {
    constructor(quoteId, startDate, endDate, status = 'planned') {
        this.id = '';
        this.quoteId = quoteId;
        this.startDate = startDate;
        this.endDate = endDate;
        this.status = status; // planned, in_progress, completed, delayed
        this.milestones = [];
        this.materialRequirements = [];
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
}

class Milestone {
    constructor(name, date, description = '', status = 'pending') {
        this.id = '';
        this.name = name;
        this.date = date;
        this.description = description;
        this.status = status; // pending, completed, delayed
        this.createdAt = new Date();
    }
}

class MaterialRequirement {
    constructor(partId, quantity, requiredDate, usageTiming) {
        this.id = '';
        this.partId = partId;
        this.quantity = quantity;
        this.requiredDate = requiredDate;
        this.usageTiming = usageTiming;
        this.orderStatus = 'not_ordered'; // not_ordered, ordered, delivered
        this.createdAt = new Date();
    }
}

// 見積もりから製造スケジュールを自動生成
function generateProductionSchedule(quote) {
    if (!quote.bomId || !quote.manufacturingStartDate || !quote.deliveryDate) {
        showAlert('製造スケジュール生成には、BOM、製造開始日、納期が必要です', 'warning');
        return;
    }
    
    const bom = boms.find(b => b.id === quote.bomId);
    if (!bom) {
        showAlert('対応するBOMが見つかりません', 'error');
        return;
    }
    
    const schedule = new ProductionSchedule(
        quote.id,
        new Date(quote.manufacturingStartDate),
        new Date(quote.deliveryDate)
    );
    
    // マイルストーンの自動生成
    schedule.milestones = generateMilestones(schedule.startDate, schedule.endDate);
    
    // 資材所要計画の生成
    schedule.materialRequirements = generateMaterialRequirements(bom, quote, schedule.startDate);
    
    return schedule;
}

function generateMilestones(startDate, endDate) {
    const milestones = [];
    const totalDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    // 基本的なマイルストーン
    const milestoneTemplate = [
        { name: '製造開始', percentage: 0, description: '製造工程の開始' },
        { name: '材料準備完了', percentage: 10, description: '必要な材料の準備完了' },
        { name: '初期組立完了', percentage: 30, description: '基本的な組立作業の完了' },
        { name: '中間検査', percentage: 50, description: '中間工程での品質検査' },
        { name: '最終組立完了', percentage: 80, description: '最終的な組立作業の完了' },
        { name: '最終検査', percentage: 95, description: '出荷前の最終品質検査' },
        { name: '出荷準備完了', percentage: 100, description: '納品準備の完了' }
    ];
    
    milestoneTemplate.forEach(template => {
        const milestoneDate = new Date(startDate);
        milestoneDate.setDate(milestoneDate.getDate() + Math.floor(totalDays * template.percentage / 100));
        
        milestones.push(new Milestone(
            template.name,
            milestoneDate,
            template.description
        ));
    });
    
    return milestones;
}

function generateMaterialRequirements(bom, quote, startDate) {
    const requirements = [];
    
    bom.items.forEach(item => {
        const part = parts.find(p => p.id === item.partId);
        if (!part) return;
        
        const totalQuantity = item.quantity * quote.quantity;
        let requiredDate = new Date(startDate);
        
        // 使用タイミングに基づいて必要日を計算
        switch (item.usageTiming) {
            case 'manufacturing':
                // 製造開始日
                break;
            case 'delivery':
                requiredDate = new Date(quote.deliveryDate);
                break;
            case 'days_after_start':
                requiredDate.setDate(requiredDate.getDate() + (item.daysAfterStart || 0));
                break;
        }
        
        // リードタイムを考慮して発注必要日を計算
        const orderDate = new Date(requiredDate);
        orderDate.setDate(orderDate.getDate() - (part.leadTime || 0));
        
        requirements.push(new MaterialRequirement(
            item.partId,
            totalQuantity,
            requiredDate,
            item.usageTiming
        ));
    });
    
    return requirements;
}

// 製造スケジュール表示
function showProductionSchedule(quote) {
    const schedule = generateProductionSchedule(quote);
    if (!schedule) return;
    
    const modalContent = `
        <div class="modal-header">
            <h3 class="modal-title">製造スケジュール - ${quote.quoteNumber}</h3>
            <button class="modal-close" onclick="closeModal()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="schedule-content">
            <div class="schedule-info">
                <h4>基本情報</h4>
                <div class="info-grid">
                    <div><strong>製品名:</strong> ${quote.productName}</div>
                    <div><strong>数量:</strong> ${quote.quantity}</div>
                    <div><strong>製造開始:</strong> ${formatDate(schedule.startDate)}</div>
                    <div><strong>納期:</strong> ${formatDate(schedule.endDate)}</div>
                </div>
            </div>
            
            <div class="milestones-section">
                <h4>マイルストーン</h4>
                <div class="milestones-timeline">
                    ${schedule.milestones.map(milestone => `
                        <div class="milestone-item">
                            <div class="milestone-date">${formatDate(milestone.date)}</div>
                            <div class="milestone-info">
                                <div class="milestone-name">${milestone.name}</div>
                                <div class="milestone-description">${milestone.description}</div>
                            </div>
                            <div class="milestone-status">
                                <span class="status-badge status-${milestone.status}">
                                    ${getMilestoneStatusText(milestone.status)}
                                </span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="material-requirements-section">
                <h4>資材所要計画</h4>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>品番</th>
                                <th>部品名</th>
                                <th>必要数量</th>
                                <th>必要日</th>
                                <th>使用タイミング</th>
                                <th>発注状況</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${schedule.materialRequirements.map(req => {
                                const part = parts.find(p => p.id === req.partId);
                                return part ? `
                                    <tr>
                                        <td>${part.partNumber}</td>
                                        <td>${part.name}</td>
                                        <td>${req.quantity}</td>
                                        <td>${formatDate(req.requiredDate)}</td>
                                        <td>${getUsageTimingText({usageTiming: req.usageTiming})}</td>
                                        <td>
                                            <span class="status-badge status-${req.orderStatus}">
                                                ${getOrderStatusText(req.orderStatus)}
                                            </span>
                                        </td>
                                    </tr>
                                ` : '';
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick="closeModal()">閉じる</button>
            <button type="button" class="btn btn-primary" onclick="createProductionOrder('${quote.id}')">
                製造指示書作成
            </button>
        </div>
    `;
    
    showModal(modalContent);
}

function getMilestoneStatusText(status) {
    const statusTexts = {
        'pending': '予定',
        'completed': '完了',
        'delayed': '遅延'
    };
    return statusTexts[status] || status;
}

function createProductionOrder(quoteId) {
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote) return;
    
    const schedule = generateProductionSchedule(quote);
    if (!schedule) return;
    
    // 製造指示書の生成（簡易版）
    const orderContent = `
        製造指示書
        
        製品名: ${quote.productName}
        数量: ${quote.quantity}
        顧客: ${quote.customerName}
        納期: ${formatDate(quote.deliveryDate)}
        
        製造スケジュール:
        ${schedule.milestones.map(m => `・${formatDate(m.date)}: ${m.name}`).join('\n')}
        
        必要資材:
        ${schedule.materialRequirements.map(req => {
            const part = parts.find(p => p.id === req.partId);
            return part ? `・${part.partNumber} ${part.name}: ${req.quantity}個` : '';
        }).filter(Boolean).join('\n')}
    `;
    
    // 製造指示書をダウンロード
    const blob = new Blob([orderContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `製造指示書_${quote.quoteNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showAlert('製造指示書を作成しました', 'success');
}

// 見積もりテーブルに製造スケジュールボタンを追加するための関数
function addScheduleButtonToQuote() {
    // 既存の見積もりテーブルレンダリング関数を拡張
    const originalRenderQuoteTable = window.renderQuoteTable;
    
    window.renderQuoteTable = function() {
        originalRenderQuoteTable();
        
        // 製造スケジュールボタンを追加
        const rows = document.querySelectorAll('#quote-tbody tr');
        rows.forEach((row, index) => {
            if (quotes[index] && quotes[index].bomId && quotes[index].manufacturingStartDate) {
                const actionsCell = row.querySelector('td:last-child');
                if (actionsCell) {
                    const scheduleBtn = document.createElement('button');
                    scheduleBtn.className = 'btn btn-sm btn-secondary';
                    scheduleBtn.innerHTML = '<i class="fas fa-calendar-alt"></i>';
                    scheduleBtn.onclick = () => showProductionSchedule(quotes[index]);
                    actionsCell.insertBefore(scheduleBtn, actionsCell.firstChild);
                }
            }
        });
    };
}

// 見積もり削除関数（グローバルで参照される場合に対応）
async function deleteQuote(quoteId) {
    if (!confirm('この見積もりを削除しますか？')) return;
    
    try {
        await window.deleteDoc(window.doc(window.db, 'quotes', quoteId));
        quotes = quotes.filter(q => q.id !== quoteId);
        renderQuoteTable();
        updateDashboard();
        showAlert('見積もりを削除しました', 'success');
    } catch (error) {
        console.error('見積もりの削除に失敗しました:', error);
        showAlert('見積もりの削除に失敗しました', 'error');
    }
}

// 発注詳細表示・削除関数（グローバルで参照される場合に対応）
function viewOrderDetails(orderId) {
    // order-functions.js の関数を呼び出し
    if (typeof window.viewOrderDetails === 'function') {
        return window.viewOrderDetails(orderId);
    }
}

async function deleteOrder(orderId) {
    if (typeof window.deleteOrder === 'function') {
        return window.deleteOrder(orderId);
    }
}

// スケジュール機能の追加
function scheduleProduction(quoteId) {
    const quote = quotes.find(q => q.id === quoteId);
    if (quote) {
        showProductionSchedule(quote);
    }
}

// 初期化時に実行
document.addEventListener('DOMContentLoaded', () => {
    addScheduleButtonToQuote();
});
