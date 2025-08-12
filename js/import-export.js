// データインポート・エクスポート機能

// Google Sheets API設定
const GOOGLE_SHEETS_CONFIG = {
    API_KEY: '', // Google Cloud ConsoleでAPI Keyを取得
    DISCOVERY_DOC: 'https://sheets.googleapis.com/$discovery/rest?version=v4',
    SCOPES: 'https://www.googleapis.com/auth/spreadsheets.readonly'
};

let gapi_loaded = false;
let gis_loaded = false;
let tokenClient = null;

// Google API初期化
async function initializeGoogleAPI() {
    try {
        // API Keyが設定されているかチェック
        const apiKey = getGoogleAPIKey();
        if (!apiKey) {
            console.log('Google API Keyが設定されていません');
            throw new Error('Google API Keyが設定されていません。設定画面で入力してください。');
        }
        
        const clientId = getGoogleClientId();
        if (!clientId) {
            console.log('Google Client IDが設定されていません');
            throw new Error('Google Client IDが設定されていません。設定画面で入力してください。');
        }
        
        // GAPI読み込み
        if (!window.gapi) {
            await loadScript('https://apis.google.com/js/api.js');
            // gapiの読み込み完了を待つ
            await new Promise((resolve) => {
                if (window.gapi) {
                    resolve();
                } else {
                    setTimeout(resolve, 1000);
                }
            });
        }
        
        // GIS読み込み
        if (!window.google?.accounts?.oauth2) {
            await loadScript('https://accounts.google.com/gsi/client');
            // Google Identity Servicesの読み込み完了を待つ
            await new Promise((resolve) => {
                if (window.google?.accounts?.oauth2) {
                    resolve();
                } else {
                    setTimeout(resolve, 1000);
                }
            });
        }
        
        // gapiクライアント初期化
        await new Promise((resolve, reject) => {
            window.gapi.load('client', {
                callback: resolve,
                onerror: reject
            });
        });
        
        await initializeGapiClient();
        initializeGis();
        
        return true;
    } catch (error) {
        console.error('Google API初期化エラー:', error);
        throw error;
    }
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        // 既に読み込まれているかチェック
        const existingScript = document.querySelector(`script[src="${src}"]`);
        if (existingScript) {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

async function initializeGapiClient() {
    const apiKey = getGoogleAPIKey();
    await window.gapi.client.init({
        apiKey: apiKey,
        discoveryDocs: [GOOGLE_SHEETS_CONFIG.DISCOVERY_DOC],
    });
    gapi_loaded = true;
}

function initializeGis() {
    try {
        tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: getGoogleClientId(),
            scope: GOOGLE_SHEETS_CONFIG.SCOPES,
            callback: '', // defined later
        });
        gis_loaded = true;
    } catch (error) {
        console.error('Google Identity Services初期化エラー:', error);
        throw error;
    }
}

// Google API設定
function getGoogleAPIKey() {
    return localStorage.getItem('googleAPIKey') || GOOGLE_SHEETS_CONFIG.API_KEY;
}

function getGoogleClientId() {
    return localStorage.getItem('googleClientId') || '';
}

function setGoogleCredentials(apiKey, clientId) {
    localStorage.setItem('googleAPIKey', apiKey);
    localStorage.setItem('googleClientId', clientId);
    GOOGLE_SHEETS_CONFIG.API_KEY = apiKey;
}

// Google設定ダイアログ
function openGoogleSettingsModal() {
    const currentAPIKey = getGoogleAPIKey();
    const currentClientId = getGoogleClientId();
    
    const modalContent = `
        <div class="modal-header">
            <h3 class="modal-title">Google連携設定</h3>
            <button class="modal-close" onclick="closeModal()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="google-settings">
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i>
                Googleスプレッドシートとの連携手順：<br>
                1. <a href="https://console.cloud.google.com/" target="_blank">Google Cloud Console</a>でプロジェクトを作成<br>
                2. Google Sheets APIを有効化<br>
                3. 認証情報でAPIキーを作成（HTTPリファラー制限を設定推奨）<br>
                4. OAuth 2.0クライアントIDを作成（Webアプリケーション用）<br>
                5. 承認済みJavaScriptオリジンにこのサイトのURLを追加
            </div>
            
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle"></i>
                <strong>重要:</strong> OAuth設定で「承認済みJavaScriptオリジン」に以下を追加してください：<br>
                • https://your-domain.netlify.app<br>
                • http://localhost:3000（開発時）
            </div>
            
            <form id="google-settings-form">
                <div class="form-group">
                    <label class="form-label">Google API Key</label>
                    <input type="password" id="google-api-key" class="form-input" 
                           placeholder="Google Cloud ConsoleのAPIキーを入力..."
                           value="${currentAPIKey || ''}">
                    <small class="form-help">Google Sheets APIが有効化されたAPIキーを入力してください</small>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Google Client ID</label>
                    <input type="text" id="google-client-id" class="form-input" 
                           placeholder="OAuth 2.0クライアントIDを入力..."
                           value="${currentClientId || ''}">
                    <small class="form-help">OAuth 2.0認証用のクライアントIDを入力してください</small>
                </div>
                
                <div class="form-group">
                    <button type="button" class="btn btn-secondary" onclick="testGoogleConnection()">
                        <i class="fas fa-link"></i> 接続テスト
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="showDebugInfo()">
                        <i class="fas fa-bug"></i> デバッグ情報
                    </button>
                </div>
                
                <div id="debug-output" class="debug-output" style="display: none;">
                    <h4>デバッグ情報</h4>
                    <pre id="debug-text"></pre>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
                    <button type="submit" class="btn btn-primary">保存</button>
                </div>
            </form>
        </div>
    `;
    
    showModal(modalContent);
    
    document.getElementById('google-settings-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const apiKey = document.getElementById('google-api-key').value;
        const clientId = document.getElementById('google-client-id').value;
        setGoogleCredentials(apiKey, clientId);
        showAlert('Google設定を保存しました', 'success');
        closeModal();
    });
}

// デバッグ情報表示
function showDebugInfo() {
    const debugOutput = document.getElementById('debug-output');
    const debugText = document.getElementById('debug-text');
    
    const debugInfo = {
        currentUrl: window.location.href,
        origin: window.location.origin,
        userAgent: navigator.userAgent,
        gapiLoaded: typeof window.gapi !== 'undefined',
        googleLoaded: typeof window.google !== 'undefined',
        googleOAuth: typeof window.google?.accounts?.oauth2 !== 'undefined',
        storedApiKey: !!localStorage.getItem('googleAPIKey'),
        storedClientId: !!localStorage.getItem('googleClientId'),
        apiKeyFormat: localStorage.getItem('googleAPIKey')?.substring(0, 10) + '...',
        clientIdFormat: localStorage.getItem('googleClientId')?.substring(0, 20) + '...',
        gapi_loaded: gapi_loaded,
        gis_loaded: gis_loaded,
        tokenClient: !!tokenClient
    };
    
    debugText.textContent = JSON.stringify(debugInfo, null, 2);
    debugOutput.style.display = 'block';
}

// Google接続テスト
async function testGoogleConnection() {
    const apiKey = document.getElementById('google-api-key').value;
    const clientId = document.getElementById('google-client-id').value;
    
    if (!apiKey || !clientId) {
        showAlert('APIキーとクライアントIDの両方を入力してください', 'warning');
        return;
    }
    
    // APIキーの形式チェック
    if (!apiKey.trim().startsWith('AIza')) {
        showAlert('APIキーの形式が正しくありません。AIzaで始まる文字列を入力してください。', 'error');
        return;
    }
    
    // クライアントIDの形式チェック
    if (!clientId.trim().includes('.googleusercontent.com')) {
        showAlert('クライアントIDの形式が正しくありません。.googleusercontent.comを含む文字列を入力してください。', 'error');
        return;
    }
    
    try {
        setGoogleCredentials(apiKey.trim(), clientId.trim());
        showAlert('接続テスト中...', 'info');
        
        const initialized = await initializeGoogleAPI();
        
        if (initialized) {
            showAlert('Google API接続に成功しました！', 'success');
        } else {
            showAlert('Google API接続に失敗しました', 'error');
        }
    } catch (error) {
        console.error('Google接続テストエラー:', error);
        let errorMessage = 'エラー: ' + error.message;
        
        // よくあるエラーパターンに応じたメッセージ
        if (error.message.includes('API Key')) {
            errorMessage = 'APIキーが無効です。Google Cloud ConsoleでSheets APIが有効になっているか確認してください。';
        } else if (error.message.includes('Client ID')) {
            errorMessage = 'クライアントIDが無効です。Google Cloud ConsoleでOAuth 2.0クライアントが正しく設定されているか確認してください。';
        } else if (error.message.includes('origin')) {
            errorMessage = 'OAuth設定でこのドメインが承認されていません。Google Cloud ConsoleでJavaScriptの許可オリジンを追加してください。';
        }
        
        showAlert(errorMessage, 'error');
    }
}

// スプレッドシートからデータ読み込み
async function importFromGoogleSheets(spreadsheetId, range = 'A:Z') {
    try {
        if (!gapi_loaded || !gis_loaded) {
            const initialized = await initializeGoogleAPI();
            if (!initialized) {
                throw new Error('Google APIの初期化に失敗しました');
            }
        }
        
        // 認証
        return new Promise((resolve, reject) => {
            tokenClient.callback = async (resp) => {
                if (resp.error !== undefined) {
                    reject(resp);
                    return;
                }
                
                try {
                    const response = await window.gapi.client.sheets.spreadsheets.values.get({
                        spreadsheetId: spreadsheetId,
                        range: range,
                    });
                    
                    const values = response.result.values;
                    if (!values || values.length === 0) {
                        throw new Error('スプレッドシートにデータが見つかりません');
                    }
                    
                    resolve(values);
                } catch (error) {
                    reject(error);
                }
            };
            
            if (window.gapi.client.getToken() === null) {
                tokenClient.requestAccessToken({prompt: 'consent'});
            } else {
                tokenClient.requestAccessToken({prompt: ''});
            }
        });
    } catch (error) {
        console.error('Googleスプレッドシート読み込みエラー:', error);
        throw error;
    }
}

// スプレッドシートインポートダイアログ
function openSheetsImportModal() {
    const modalContent = `
        <div class="modal-header">
            <h3 class="modal-title">Googleスプレッドシートインポート</h3>
            <button class="modal-close" onclick="closeModal()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="sheets-import">
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i>
                Googleスプレッドシートからデータをインポートします。<br>
                スプレッドシートは共有設定で「リンクを知っている全員が閲覧可能」にしてください。
            </div>
            
            <form id="sheets-import-form">
                <div class="form-group">
                    <label class="form-label">スプレッドシートURL</label>
                    <input type="url" id="sheets-url" class="form-input" required
                           placeholder="https://docs.google.com/spreadsheets/d/...">
                    <small class="form-help">GoogleスプレッドシートのURLを貼り付けてください</small>
                </div>
                
                <div class="form-group">
                    <label class="form-label">シート範囲</label>
                    <input type="text" id="sheets-range" class="form-input" 
                           value="A:Z" placeholder="A:Z">
                    <small class="form-help">読み込む範囲を指定（例：A1:F100、Sheet1!A:Z）</small>
                </div>
                
                <div class="form-group">
                    <label class="form-label">データ種類</label>
                    <select id="import-data-type" class="form-select" required>
                        <option value="">選択してください</option>
                        <option value="parts">部品マスタ</option>
                        <option value="inventory">在庫データ</option>
                        <option value="boms">BOM</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">
                        <input type="checkbox" id="has-header"> 
                        1行目はヘッダー
                    </label>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
                    <button type="submit" class="btn btn-primary">インポート</button>
                </div>
            </form>
        </div>
    `;
    
    showModal(modalContent);
    
    document.getElementById('sheets-import-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleSheetsImport();
    });
}

// スプレッドシートインポート処理
async function handleSheetsImport() {
    try {
        const url = document.getElementById('sheets-url').value;
        const range = document.getElementById('sheets-range').value || 'A:Z';
        const dataType = document.getElementById('import-data-type').value;
        const hasHeader = document.getElementById('has-header').checked;
        
        // URLからスプレッドシートIDを抽出
        const spreadsheetId = extractSpreadsheetId(url);
        if (!spreadsheetId) {
            throw new Error('有効なGoogleスプレッドシートのURLを入力してください');
        }
        
        showAlert('スプレッドシートからデータを読み込み中...', 'info');
        
        const values = await importFromGoogleSheets(spreadsheetId, range);
        
        // ヘッダー行をスキップ
        const dataRows = hasHeader ? values.slice(1) : values;
        
        // データ種類に応じて処理
        let importedCount = 0;
        switch (dataType) {
            case 'parts':
                importedCount = await importPartsData(dataRows);
                break;
            case 'inventory':
                importedCount = await importInventoryData(dataRows);
                break;
            case 'boms':
                importedCount = await importBOMData(dataRows);
                break;
            default:
                throw new Error('データ種類を選択してください');
        }
        
        closeModal();
        showAlert(`${importedCount}件のデータをインポートしました`, 'success');
        
        // データを再読み込み
        await syncData();
        
    } catch (error) {
        console.error('スプレッドシートインポートエラー:', error);
        showAlert('インポートエラー: ' + error.message, 'error');
    }
}

// URLからスプレッドシートIDを抽出
function extractSpreadsheetId(url) {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
}

// CSVインポート機能
function openCSVImportModal() {
    const modalContent = `
        <div class="modal-header">
            <h3 class="modal-title">CSVインポート</h3>
            <button class="modal-close" onclick="closeModal()">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="csv-import">
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i>
                CSVファイルからデータをインポートします。文字エンコーディングはUTF-8を推奨します。
            </div>
            
            <form id="csv-import-form">
                <div class="form-group">
                    <label class="form-label">CSVファイル</label>
                    <div class="file-input-wrapper">
                        <input type="file" id="csv-file" class="file-input" accept=".csv" required>
                        <label for="csv-file" class="file-input-label">
                            <i class="fas fa-file-csv"></i>
                            ファイルを選択
                        </label>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">データ種類</label>
                    <select id="csv-data-type" class="form-select" required>
                        <option value="">選択してください</option>
                        <option value="parts">部品マスタ</option>
                        <option value="inventory">在庫データ</option>
                        <option value="boms">BOM</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label class="form-label">
                        <input type="checkbox" id="csv-has-header" checked> 
                        1行目はヘッダー
                    </label>
                </div>
                
                <div class="form-group">
                    <label class="form-label">区切り文字</label>
                    <select id="csv-delimiter" class="form-select">
                        <option value=",">カンマ (,)</option>
                        <option value="\\t">タブ</option>
                        <option value=";">セミコロン (;)</option>
                    </select>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
                    <button type="submit" class="btn btn-primary">インポート</button>
                </div>
            </form>
        </div>
    `;
    
    showModal(modalContent);
    
    document.getElementById('csv-import-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleCSVImport();
    });
    
    // ファイル選択時の表示更新
    document.getElementById('csv-file').addEventListener('change', (e) => {
        const fileName = e.target.files[0]?.name || 'ファイルを選択';
        document.querySelector('.file-input-label').innerHTML = `
            <i class="fas fa-file-csv"></i>
            ${fileName}
        `;
    });
}

// CSVインポート処理
async function handleCSVImport() {
    try {
        const fileInput = document.getElementById('csv-file');
        const dataType = document.getElementById('csv-data-type').value;
        const hasHeader = document.getElementById('csv-has-header').checked;
        const delimiter = document.getElementById('csv-delimiter').value === '\\t' ? '\t' : document.getElementById('csv-delimiter').value;
        
        if (!fileInput.files[0]) {
            throw new Error('CSVファイルを選択してください');
        }
        
        showAlert('CSVファイルを読み込み中...', 'info');
        
        const text = await readFileAsText(fileInput.files[0]);
        const rows = parseCSV(text, delimiter);
        
        // ヘッダー行をスキップ
        const dataRows = hasHeader ? rows.slice(1) : rows;
        
        // データ種類に応じて処理
        let importedCount = 0;
        switch (dataType) {
            case 'parts':
                importedCount = await importPartsData(dataRows);
                break;
            case 'inventory':
                importedCount = await importInventoryData(dataRows);
                break;
            case 'boms':
                importedCount = await importBOMData(dataRows);
                break;
            default:
                throw new Error('データ種類を選択してください');
        }
        
        closeModal();
        showAlert(`${importedCount}件のデータをインポートしました`, 'success');
        
        // データを再読み込み
        await syncData();
        
    } catch (error) {
        console.error('CSVインポートエラー:', error);
        showAlert('インポートエラー: ' + error.message, 'error');
    }
}

// ファイルをテキストとして読み込み
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file, 'UTF-8');
    });
}

// CSV解析
function parseCSV(text, delimiter = ',') {
    const rows = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
        if (line.trim() === '') continue;
        
        const row = [];
        let inQuotes = false;
        let currentField = '';
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === delimiter && !inQuotes) {
                row.push(currentField.trim());
                currentField = '';
            } else {
                currentField += char;
            }
        }
        
        row.push(currentField.trim());
        rows.push(row);
    }
    
    return rows;
}

// 部品データインポート
async function importPartsData(rows) {
    let importedCount = 0;
    
    for (const row of rows) {
        if (row.length < 2) continue; // 最低限の列数チェック
        
        try {
            const part = new Part(
                row[0] || '', // 品番
                row[1] || '', // 部品名
                row[2] || 'electronic', // カテゴリ
                row[3] || '', // メーカー
                parseFloat(row[4]) || 0, // 定価
                parseFloat(row[5]) || 0, // 仕入れ値
                row[6] || '', // 発注先
                parseInt(row[7]) || 0  // リードタイム
            );
            
            if (part.partNumber && part.name) {
                // 重複チェック
                const existing = parts.find(p => p.partNumber === part.partNumber);
                if (existing) {
                    // 既存データを更新
                    part.id = existing.id;
                }
                
                const savedId = await DatabaseService.savePart(part);
                
                if (!existing) {
                    part.id = savedId;
                    parts.push(part);
                } else {
                    const index = parts.findIndex(p => p.id === existing.id);
                    if (index !== -1) {
                        parts[index] = { ...part, id: existing.id };
                    }
                }
                
                importedCount++;
            }
        } catch (error) {
            console.error('部品データインポートエラー:', error);
        }
    }
    
    return importedCount;
}

// 在庫データインポート
async function importInventoryData(rows) {
    let importedCount = 0;
    
    for (const row of rows) {
        if (row.length < 2) continue;
        
        try {
            const partNumber = row[0];
            const currentStock = parseInt(row[1]) || 0;
            const minStock = parseInt(row[2]) || 0;
            const reorderPoint = parseInt(row[3]) || 0;
            
            // 部品IDを検索
            const part = parts.find(p => p.partNumber === partNumber);
            if (!part) {
                console.warn(`部品番号 ${partNumber} が見つかりません`);
                continue;
            }
            
            // 既存の在庫記録を検索
            let inventoryRecord = inventory.find(i => i.partId === part.id);
            
            if (inventoryRecord) {
                inventoryRecord.updateStock(currentStock);
                inventoryRecord.updateSettings(minStock, reorderPoint);
            } else {
                inventoryRecord = new InventoryRecord(part.id, currentStock, minStock, reorderPoint);
                inventory.push(inventoryRecord);
            }
            
            const savedId = await DatabaseService.saveInventory(inventoryRecord);
            
            if (!inventoryRecord.id) {
                inventoryRecord.id = savedId;
            }
            
            importedCount++;
        } catch (error) {
            console.error('在庫データインポートエラー:', error);
        }
    }
    
    return importedCount;
}

// BOMデータインポート
async function importBOMData(rows) {
    let importedCount = 0;
    // BOMインポートは複雑なため、基本的な実装のみ
    showAlert('BOMインポートは今後のバージョンで対応予定です', 'info');
    return importedCount;
}

// データエクスポート
function exportToCSV(data, filename, headers) {
    let csvContent = '';
    
    // ヘッダー行
    if (headers) {
        csvContent += headers.join(',') + '\n';
    }
    
    // データ行
    for (const row of data) {
        const csvRow = row.map(field => {
            // カンマや改行を含む場合はクォートで囲む
            if (typeof field === 'string' && (field.includes(',') || field.includes('\n') || field.includes('"'))) {
                return '"' + field.replace(/"/g, '""') + '"';
            }
            return field;
        });
        csvContent += csvRow.join(',') + '\n';
    }
    
    // ダウンロード
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// 部品マスタエクスポート
function exportParts() {
    const headers = ['品番', '部品名', 'カテゴリ', 'メーカー', '定価', '仕入れ値', '発注先', 'リードタイム'];
    const data = parts.map(part => [
        part.partNumber,
        part.name,
        part.category,
        part.manufacturer,
        part.listPrice,
        part.purchasePrice,
        part.supplier,
        part.leadTime
    ]);
    
    const filename = `部品マスタ_${formatDate(new Date()).replace(/\//g, '')}.csv`;
    exportToCSV(data, filename, headers);
    showAlert('部品マスタをエクスポートしました', 'success');
}

// 在庫データエクスポート
function exportInventory() {
    const headers = ['品番', '部品名', '現在庫数', '最小在庫数', '発注点', 'ステータス', '最終更新日'];
    const data = inventory.map(item => {
        const part = parts.find(p => p.id === item.partId);
        return [
            part ? part.partNumber : '',
            part ? part.name : '',
            item.currentStock,
            item.minStock,
            item.reorderPoint,
            getStatusText(item.status),
            formatDate(item.lastUpdated)
        ];
    });
    
    const filename = `在庫データ_${formatDate(new Date()).replace(/\//g, '')}.csv`;
    exportToCSV(data, filename, headers);
    showAlert('在庫データをエクスポートしました', 'success');
}
