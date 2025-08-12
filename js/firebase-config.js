// Firebase設定ファイル
// Firebase Consoleから取得した設定情報

window.FIREBASE_CONFIG = {
    apiKey: "AIzaSyDT3HapGcz2iF-WiYIfiytjZCtc3RbW3B0",
    authDomain: "bom-system-cusor.firebaseapp.com", 
    projectId: "bom-system-cusor",
    storageBucket: "bom-system-cusor.firebasestorage.app",
    messagingSenderId: "522573986412",
    appId: "1:522573986412:web:7b3e9f287f0e9083a7f649",
    measurementId: "G-192206V835"
};

// 環境変数として設定
window.FIREBASE_API_KEY = window.FIREBASE_CONFIG.apiKey;
window.FIREBASE_AUTH_DOMAIN = window.FIREBASE_CONFIG.authDomain;
window.FIREBASE_PROJECT_ID = window.FIREBASE_CONFIG.projectId;
window.FIREBASE_STORAGE_BUCKET = window.FIREBASE_CONFIG.storageBucket;
window.FIREBASE_MESSAGING_SENDER_ID = window.FIREBASE_CONFIG.messagingSenderId;
window.FIREBASE_APP_ID = window.FIREBASE_CONFIG.appId;
window.FIREBASE_MEASUREMENT_ID = window.FIREBASE_CONFIG.measurementId;

console.log('Firebase設定を読み込みました:', window.FIREBASE_CONFIG.projectId);
