// ===============================================
// Firebase Integration
// ===============================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    updateDoc, 
    arrayUnion, 
    arrayRemove, 
    onSnapshot,
    collection,
    addDoc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAFCTYH5-dRit6HCc9HVK82jeyz7T7BTrs",
    authDomain: "koujou-work-navi.firebaseapp.com",
    projectId: "koujou-work-navi",
    storageBucket: "koujou-work-navi.firebasestorage.app",
    messagingSenderId: "789923892236",
    appId: "1:789923892236:web:4a6586c835126cd3667229"
};

const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
const db = getFirestore(fbApp);

// ===============================================
// Config & Constants
// ===============================================
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz4Y34AizgsNB9DDQcPN2wGv1KA5VrhAi3fA2wdFkRWNst50HJIun54ZpaSpw8bPvzn/exec"; 
const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSiFBtN5piQfnnlcUtP_2_fVQgRClTvhw-MSMTPUMozsx_6W3-XkHNSnwjU8pRM91SKO6MXxinfo42k/pub?gid=0&single=true&output=csv"; 
// ★★★ Cloudflare R2 のドメイン ★★★
const R2_DOMAIN = "https://pub-7087ad3866b640afba0583afd991b1ab.r2.dev";

const ALL_CATEGORIES = [
    { id: 'light', name: '軽作業・検査', icon: '📦' }, { id: 'assembly', name: '組立・加工', icon: '🔧' }, { id: 'logistics', name: '物流・運搬', icon: '🚜' },
    { id: 'operator', name: 'マシンオペレーター', icon: '⚙️' }, { id: 'food', name: '食品加工', icon: '🍱' }, { id: 'metal', name: '溶接・塗装', icon: '🔥' },
    { id: 'maintenance', name: '点検・メンテナンス', icon: '🛠️' }, { id: 'office', name: '工場事務', icon: '💻' }, { id: 'clean', name: '清掃・洗浄', icon: '🧹' },
    { id: 'fork', name: 'フォークリフト', icon: '🚜' }, { id: 'press', name: 'プレス・板金', icon: '🔩' }, { id: 'semicon', name: '半導体製造', icon: '💾' },
    { id: 'cast', name: '鋳造・鍛造', icon: '🔨' }, { id: 'manage', name: '生産管理・品質管理', icon: '📋' },
    { id: 'driver', name: 'ドライバー・配送', icon: '🚚' }, { id: 'cad', name: 'CAD・設計', icon: '📐' }, { id: 'chemical', name: '化学・医薬', icon: '🧪' },
    { id: 'sewing', name: 'アパレル・縫製', icon: '🧵' }, { id: 'qa', name: '品質保証', icon: '✅' }, { id: 'other', name: 'その他', icon: '🏭' }
];
const TOP_CATEGORIES = ALL_CATEGORIES.slice(0, 8);

const EMP_TYPES = ["期間工", "派遣社員", "正社員", "アルバイト・パート", "契約社員"];

const TAG_GROUPS = {
    "給与・特典": ["高収入", "日払い可", "週払い可", "入社祝い金あり", "ボーナスあり", "交通費全額支給"],
    "勤務時間・休日": ["日勤のみ", "夜勤専属", "2交替", "3交替", "土日祝休み", "4勤2休", "残業少なめ", "短時間勤務OK"],
    "職場環境": ["寮完備", "個室寮", "カップル寮", "食堂あり", "空調完備", "車通勤可", "送迎あり", "駅チカ"],
    "応募条件": ["未経験OK", "経験者優遇", "女性活躍", "男性活躍", "ミドル活躍", "シニア活躍", "学歴不問", "友達と応募OK", "カップル応募OK"]
};
const ALL_TAGS_FLAT = Object.values(TAG_GROUPS).flat();

const REGIONS = [
    { name: "北海道・東北", icon: "❄️", prefs: ["北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県"] },
    { name: "関東", icon: "🗼", prefs: ["東京都", "神奈川県", "千葉県", "埼玉県", "茨城県", "栃木県", "群馬県"] },
    { name: "甲信越・北陸", icon: "🌾", prefs: ["新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県"] },
    { name: "東海", icon: "🦐", prefs: ["岐阜県", "静岡県", "愛知県", "三重県"] },
    { name: "関西", icon: "🏯", prefs: ["滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県"] },
    { name: "中国・四国", icon: "🍋", prefs: ["鳥取県", "島根県", "岡山県", "広島県", "山口県", "徳島県", "香川県", "愛媛県", "高知県"] },
    { name: "九州・沖縄", icon: "🌺", prefs: ["福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"] }
];
const PREFS = REGIONS.flatMap(r => r.prefs);

const getFallbackImage = (job) => {
    const catId = job.category;
    let color = '#0056b3', icon = '🏭';
    if(['light','clean'].includes(catId)) { color = '#28a745'; icon = '📦'; }
    else if(['assembly','metal','press'].includes(catId)) { color = '#0056b3'; icon = '🔧'; }
    else if(['logistics','fork','driver'].includes(catId)) { color = '#ff9800'; icon = '🚜'; }
    else if(['food'].includes(catId)) { color = '#e91e63'; icon = '🍱'; }
    const svg = `<svg width="640" height="360" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="${color}" fill-opacity="0.1"/><text x="50%" y="55%" font-family="Arial" font-size="120" text-anchor="middle" dy=".3em">${icon}</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
};

const getCategoryName = (id) => {
    const c = ALL_CATEGORIES.find(x => x.id === id);
    return c ? c.name : id;
};

let JOBS_DATA = [];

const generateJobs = (count) => {
    const data = [];
    const CITIES = ["新宿区", "横浜市", "名古屋市", "大阪市", "神戸市", "福岡市", "札幌市", "仙台市", "広島市", "京都市"];
    
    for (let i = 1; i <= count; i++) {
        const pref = PREFS[Math.floor(Math.random() * PREFS.length)];
        const city = CITIES[Math.floor(Math.random() * CITIES.length)];
        const cat = ALL_CATEGORIES[Math.floor(Math.random() * ALL_CATEGORIES.length)];
        const shuffledTags = [...ALL_TAGS_FLAT].sort(() => 0.5 - Math.random());
        const myTags = shuffledTags.slice(0, Math.floor(Math.random() * 4) + 2);
        const hourly = 1000 + Math.floor(Math.random() * 15) * 100;
        const monthly = Math.floor(hourly * 168 / 10000);
        const annual = monthly * 12;
        const type = EMP_TYPES[i % EMP_TYPES.length];
        
        data.push({
            id: `JOB-${i}`,
            title: `【${pref}】${cat.name}募集！${hourly >= 1600 ? '高時給案件！' : '未経験スタート応援！'}`,
            company: `${pref}マニュファクチャリング ${i}工場`,
            pref: pref, 
            city: city,
            category: cat.id, 
            salaryVal: hourly,
            monthlyVal: monthly,
            annualVal: annual,
            salary: `時給 ${hourly.toLocaleString()}円〜`,
            salarySupp: "入社祝い金あり",
            monthlyIncome: `${monthly}万円〜`,
            tags: [...new Set(myTags)],
            type: type,
            isNew: i <= 25,
            desc: `${pref}${city}エリアの工場で${cat.name}を担当していただきます。マニュアル完備で安心。`,
            flow: "8:00〜17:00 (実働8h)",
            holidays: "土日休み（会社カレンダーによる）",
            benefits: "社会保険完備、有給休暇、制服貸与",
            dorm: "寮完備（ワンルーム）",
            dorm_desc: "テレビ、冷蔵庫、洗濯機完備。即入居可。",
            apply_flow: "応募フォームより応募 → 面接（WEB可） → 採用",
            process: "最短3日で入社可能！",
            transport: "規定内支給",
            station: "駅よりバス15分",
            style: "立ち仕事",
            qualifications: "不問",
            points: "大手企業で長期安定！"
        });
    }
    return data;
};

const parseCSV = (text) => {
    const arr = [];
    let quote = false; let col = 0, row = 0;
    for (let c = 0; c < text.length; c++) {
        let cc = text[c], nc = text[c+1];
        arr[row] = arr[row] || [];
        arr[row][col] = arr[row][col] || '';
        if (cc == '"') { if (quote && nc == '"') { arr[row][col] += cc; ++c; } else { quote = !quote; } }
        else if (cc == ',' && !quote) { ++col; }
        else if (cc == '\r' && nc == '\n' && !quote) { ++row; col = 0; ++c; }
        else if (cc == '\n' && !quote) { ++row; col = 0; }
        else if (cc == '\r' && !quote) { ++row; col = 0; }
        else { arr[row][col] += cc; }
    }
    const headers = arr[0].map(h => h.trim());
    const jobs = [];
    for(let i=1; i<arr.length; i++) {
        if(arr[i].length < headers.length) continue;
        const job = {};
        
        const rawId = arr[i][0] ? arr[i][0].trim() : ''; 
        job.id = rawId;

        headers.forEach((h, idx) => { 
            if(idx > 0) job[h] = arr[i][idx] ? arr[i][idx].trim() : ''; 
        });
        
        const rawSalaryStr = job.salary || '';
        const rawSalaryNum = parseInt(rawSalaryStr.replace(/[^0-9]/g, '')) || 0;

        if (rawSalaryStr.indexOf('月給') !== -1 || rawSalaryStr.indexOf('月収') !== -1) {
            let monthlyYen = rawSalaryNum;
            if(monthlyYen < 1000) monthlyYen = monthlyYen * 10000;
            job.monthlyVal = Math.floor(monthlyYen / 10000); 
            job.salaryVal = Math.floor(monthlyYen / 168);    
            job.annualVal = job.monthlyVal * 12;             
        } else {
            job.salaryVal = rawSalaryNum || 1000;
            job.monthlyVal = Math.floor(job.salaryVal * 168 / 10000);
            job.annualVal = job.monthlyVal * 12;
        }

        job.idNum = parseInt(job.id.replace(/[^0-9]/g, '')) || 0;
        job.isNew = job.isNew === 'TRUE' || job.isNew === 'true';
        job.city = job.city || '';
        job.dorm = job.dorm || '';
        job.dorm_desc = job.dorm_desc || '';
        job.desc = job.desc || ''; 
        
        if(job.tags) job.tags = job.tags.split(/[\s|]+/).filter(t => t); else job.tags = [];
        
        if(job.id) jobs.push(job);
    }
    return jobs;
};

// --- App Core ---
const app = {
    state: {
        filter: { 
            pref: '', 
            city: [], 
            tag: [], 
            category: [], 
            sort: 'new', 
            type: [],
            salaryMin: '', 
            monthlyMin: '', 
            annualMin: ''   
        },
        user: null,
        userProfile: {},
        guestKeeps: [],
        guestApplied: [],
        mypageTab: 'keep',
        isModalSearchMode: false,
        searchLimit: 20
    },

    init: async () => {
        let viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
            viewport = document.createElement('meta');
            viewport.name = "viewport";
            document.head.appendChild(viewport);
        }
        viewport.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";

        if(!document.getElementById('condition-modal')) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="condition-modal" class="modal-overlay"><div class="modal-content"><div class="modal-header"><span>詳細条件を設定</span><button class="modal-close" onclick="app.closeConditionModal()">×</button></div><div id="modal-active-chips" class="modal-chip-bar"></div><div class="modal-body" id="condition-modal-body"></div><div class="modal-footer"><button id="modal-decide-btn" class="btn btn-primary" onclick="app.closeConditionModal()">この条件で決定</button></div></div></div>
            `);
        }
        if(!document.getElementById('region-modal')) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="region-modal" class="modal-overlay"><div class="modal-content"><div class="modal-header"><span id="modal-title">勤務地を選択</span><button class="modal-close" onclick="window.app.closeRegionModal()">×</button></div><div class="modal-body" id="modal-body"></div></div></div>
            `);
        }

        const savedState = sessionStorage.getItem('fwn_state');
        if (savedState) {
            const parsed = JSON.parse(savedState);
            app.state.filter = { ...app.state.filter, ...(parsed.filter || {}) };
            app.state.mypageTab = parsed.mypageTab || 'keep';
        }
        const savedGuestKeeps = localStorage.getItem('factory_work_navi_guest_keeps');
        if (savedGuestKeeps) app.state.guestKeeps = JSON.parse(savedGuestKeeps);
        
        const savedGuestApplied = localStorage.getItem('factory_work_navi_guest_applied');
        if (savedGuestApplied) app.state.guestApplied = JSON.parse(savedGuestApplied);

        const params = new URLSearchParams(window.location.search);
        if (params.get('page') === 'list') {
            const p_pref = params.get('pref');
            const p_city = params.get('city'); 
            const p_cat = params.get('category');
            const p_tag = params.get('tag');
            const p_type = params.get('type');
            const p_sort = params.get('sort');
            const p_salary = params.get('salaryMin');
            const p_monthly = params.get('monthlyMin');
            const p_annual = params.get('annualMin');

            if (p_pref) app.state.filter.pref = p_pref;
            if (p_city) app.state.filter.city = p_city.split(','); 
            if (p_cat) app.state.filter.category = p_cat.split(',');
            if (p_tag) app.state.filter.tag = p_tag.split(',');
            if (p_type) app.state.filter.type = p_type.split(',');
            if (p_sort) app.state.filter.sort = p_sort;
            if (p_salary) app.state.filter.salaryMin = p_salary;
            if (p_monthly) app.state.filter.monthlyMin = p_monthly;
            if (p_annual) app.state.filter.annualMin = p_annual;
        }

        onAuthStateChanged(auth, (user) => {
            if (user) {
                app.state.user = { uid: user.uid, email: user.email, name: user.displayName || "ゲスト" };
                app.syncUserKeeps(user.uid);
            } else {
                app.state.user = null;
                app.state.userKeeps = [];
                app.state.userProfile = {};
            }
            app.renderHeader();
            app.resolveUrlAndRender();
        });

        app.renderHeader();

        if (GOOGLE_SHEET_CSV_URL) {
            try {
                const response = await fetch(GOOGLE_SHEET_CSV_URL);
                if (!response.ok) throw new Error('Network error');
                const text = await response.text();
                JOBS_DATA = parseCSV(text);
                app.resolveUrlAndRender();
            } catch (e) {
                console.error("CSV Error:", e);
                JOBS_DATA = generateJobs(20);
                app.resolveUrlAndRender();
            }
        }
        document.getElementById('loading-overlay').style.display = 'none';

        const page = params.get('page');
        app.resolveUrlAndRender();
    },

    updateTitle: () => {
        const params = new URLSearchParams(window.location.search);
        const page = params.get('page');
        const id = params.get('id');
        let title = "工場ワークNAVi | 工場・製造業の求人情報";

        if (page === 'list') {
            const pref = app.state.filter.pref;
            if (pref) {
                title = `${pref}の求人一覧 | 工場ワークNAVi`;
            } else {
                title = "求人検索結果 | 工場ワークNAVi";
            }
        } else if (page === 'detail' || id) {
            const job = JOBS_DATA.find(j => String(j.id) === String(id));
            if (job) {
                title = `${job.title} | 工場ワークNAVi`;
            }
        } else if (page === 'form') {
            title = "応募フォーム | 工場ワークNAVi";
        } else if (page === 'mypage') {
            title = "マイページ | 工場ワークNAVi";
        }

        document.title = title;
    },

    resolveUrlAndRender: () => {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        const page = params.get('page');

        app.updateTitle();

        const container = document.getElementById('main-content');
        if (!container) return;
        
        container.innerHTML = '';

        if (page === 'form') {
            app.renderForm(container);
        } else if (id && page !== 'list') { 
            app.renderDetail(container, id); 
        } else if (page === 'list') {
            app.renderList(container);
        } else if (page === 'mypage') {
            app.renderMypage(container);
        } else if (page === 'login') {
            app.renderAuthPage(container, 'login');
        } else if (page === 'register') {
            app.renderAuthPage(container, 'register');
        } else if (page === 'terms') {
            app.renderTerms(container);
        } else if (page === 'privacy') {
            app.renderPrivacy(container);
        } else {
            app.renderTop(container);
        }
    },

    router: (pageName, param = null) => {
        app.saveFormData(); 

        let url = window.location.pathname;
        let query = {};
        
        if (pageName === 'detail' && param) {
            query.id = param;
        } else if (pageName === 'form' && param) {
            query.page = 'form';
            query.id = param;
        } else if (pageName === 'list') {
            query.page = 'list';
            const f = app.state.filter;
            if (f.pref) query.pref = f.pref;
            if (f.city && f.city.length) query.city = f.city.join(','); 
            if (f.category && f.category.length) query.category = f.category.join(',');
            if (f.tag && f.tag.length) query.tag = f.tag.join(',');
            if (f.type && f.type.length) query.type = f.type.join(',');
            if (f.sort !== 'new') query.sort = f.sort;
            if (f.salaryMin) query.salaryMin = f.salaryMin;
            if (f.monthlyMin) query.monthlyMin = f.monthlyMin;
            if (f.annualMin) query.annualMin = f.annualMin;

        } else if (pageName !== 'top') {
            query.page = pageName;
        }

        const queryString = new URLSearchParams(query).toString();
        const newUrl = queryString ? `${url}?${queryString}` : url;

        if (newUrl !== window.location.pathname + window.location.search) {
            window.history.pushState(query, '', newUrl);
        }
        
        sessionStorage.setItem('fwn_state', JSON.stringify({
            filter: app.state.filter,
            mypageTab: app.state.mypageTab
        }));

        app.resolveUrlAndRender();
        window.scrollTo(0, 0);
    },

    saveFormData: () => {
        const inputs = document.querySelectorAll('input, select');
        if (inputs.length === 0) return;
        const data = {};
        let hasData = false;
        inputs.forEach(el => {
            if (el.id && el.type !== 'password' && el.type !== 'hidden') {
                if (el.type === 'radio') {
                    if (el.checked) data[el.name] = el.value;
                } else {
                    data[el.id] = el.value;
                }
                hasData = true;
            }
        });
        if (hasData) {
            sessionStorage.setItem('temp_form_data', JSON.stringify(data));
        }
    },

    restoreFormData: () => {
        const json = sessionStorage.getItem('temp_form_data');
        if (!json) return;
        const data = JSON.parse(json);
        Object.keys(data).forEach(key => {
            const el = document.getElementById(key);
            if (el) {
                el.value = data[key];
            } else {
                const radios = document.getElementsByName(key);
                if (radios.length > 0) {
                    radios.forEach(r => { if (r.value === data[key]) r.checked = true; });
                }
            }
        });
    },

    syncUserKeeps: (uid) => {
        const userRef = doc(db, "users", uid);
        onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                app.state.userProfile = data;
                app.state.userKeeps = data.keeps || [];
                if(data.applied) app.state.user.applied = data.applied;
            } else {
                setDoc(userRef, { keeps: [], applied: [], email: app.state.user.email }, { merge: true });
                app.state.userKeeps = [];
                app.state.userProfile = {};
            }
            app.resolveUrlAndRender(); 
            app.renderHeader();
        });
    },

    sendToGas: async (data) => {
        if (!GOOGLE_APPS_SCRIPT_URL) return;
        try {
            await fetch(GOOGLE_APPS_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } catch (e) {
            console.error("GAS Send Error:", e);
        }
    },

    renderHeader: () => {
        const area = document.getElementById('header-nav-area');
        const logo = document.querySelector('.logo');
        if(logo) {
            logo.onclick = () => app.router('top');
            logo.innerHTML = `<span class="logo-fw">工場ワーク</span><span class="logo-navi">NAVi</span><span class="logo-dot">.</span>`;
        }
        
        const keepCount = app.state.user ? app.state.userKeeps.length : app.state.guestKeeps.length;
        const badgeHtml = keepCount > 0 ? `<span class="header-badge">${keepCount}</span>` : '';
        if (app.state.user) {
            area.innerHTML = `<div class="header-btn-icon" onclick="app.router('mypage')"><span class="icon">👤</span>マイページ${badgeHtml}</div><div class="header-btn-icon" onclick="app.router('list')"><span class="icon">🔍</span>さがす</div>`;
        } else {
            area.innerHTML = `<div class="header-btn-icon" onclick="app.router('mypage')"><span class="icon" style="color:#e91e63;">♥</span>キープ${badgeHtml}</div><span class="header-login-link" onclick="app.router('login')">ログイン</span><button class="btn-register-header" onclick="app.router('register')">無料会員登録</button>`;
        }
    },

    renderTerms: (target) => {
        target.innerHTML = `
            <div class="page-header-simple"><button class="back-btn" onclick="app.back()">＜</button><div class="page-header-title">利用規約</div><div style="width:40px;"></div></div>
            <div class="container" style="padding:20px; font-size:14px; line-height:1.6;">
                <h3 style="margin-bottom:20px; font-size:18px; font-weight:bold;">利用規約（Terms of Use）</h3>
                <h4 style="margin:16px 0 8px; font-weight:bold;">第1条（適用）</h4><p>本規約は、株式会社Re.ACT（以下「当社」）が提供する全てのサービス・コンテンツ（以下「本サービス」）の利用条件を定めるものです。</p>
                <h4 style="margin:16px 0 8px; font-weight:bold;">第2条（利用登録）</h4><p>利用希望者は当社所定の方法により登録申請し、当社が承認した時点で利用登録が完了します。<br>登録情報に虚偽がある場合、当社は利用登録を取り消すことがあります。</p>
                <h4 style="margin:16px 0 8px; font-weight:bold;">第3条（ユーザーの責任）</h4><p>利用者は自己の責任で本サービスを利用するものとし、他者への迷惑行為や違法行為を行ってはなりません。<br>当社は利用者間または第三者間のトラブルに関与せず、責任を負いません。</p>
                <h4 style="margin:16px 0 8px; font-weight:bold;">第4条（禁止事項）</h4><p>以下の行為を禁止します（例示）：</p><ul style="list-style-type:disc; padding-left:20px; margin-top:4px;"><li>法令・公序良俗に反する行為</li><li>虚偽情報の登録</li><li>当社サーバへの不正アクセス</li><li>他者情報の無断利用</li></ul>
                <h4 style="margin:16px 0 8px; font-weight:bold;">第5条（サービスの変更・中断）</h4><p>当社は予告なくサービス内容の変更、中断、停止を行うことがあります。これによって生じた損害について当社は責任を負いません。</p>
                <h4 style="margin:16px 0 8px; font-weight:bold;">第6条（免責）</h4><p>当社は本サービスから得られる情報の正確性・完全性・有用性について保証せず、利用による損害について一切責任を負いません。</p>
                <h4 style="margin:16px 0 8px; font-weight:bold;">第7条（規約改定）</h4><p>当社は本規約を随時変更できます。変更後は本サイトへ掲載した時点で有効になります。</p>
                <div style="margin-bottom:40px;"></div>
            </div>`;
    },
    renderPrivacy: (target) => {
        target.innerHTML = `
            <div class="page-header-simple"><button class="back-btn" onclick="app.back()">＜</button><div class="page-header-title">プライバシーポリシー</div><div style="width:40px;"></div></div>
            <div class="container" style="padding:20px; font-size:14px; line-height:1.6;">
                <h3 style="margin-bottom:20px; font-size:18px; font-weight:bold;">プライバシーポリシー（Privacy Policy）</h3>
                <h4 style="margin:16px 0 8px; font-weight:bold;">1．基本方針</h4><p>当社は、個人情報の重要性を認識し、適切な保護・管理を行います。個人情報保護法その他の関連法令を遵守します。</p>
                <h4 style="margin:16px 0 8px; font-weight:bold;">2．個人情報の定義</h4><p>「個人情報」とは、生存する個人を識別できる情報（氏名、住所、電話番号、メールアドレス 等）をいいます。</p>
                <h4 style="margin:16px 0 8px; font-weight:bold;">3．収集する情報と利用目的</h4><p>当社が収集する個人情報と利用目的は次の通りです：</p><ul style="list-style-type:disc; padding-left:20px; margin-top:4px;"><li style="margin-bottom:4px;"><strong>応募・登録時に提供される情報</strong><br>氏名、連絡先、職歴、学歴、メールアドレス等<br>→ 本サービス提供、安全な運用、利用者対応のため</li><li style="margin-bottom:4px;"><strong>お問い合わせ・応募情報</strong><br>→ 連絡、返答、内部処理のため</li><li style="margin-bottom:4px;"><strong>ログ情報・クッキー等の技術的情報</strong><br>→ サービス向上、アクセス解析、システム管理のため</li></ul><p style="font-size:11px; color:#888; margin-top:4px;">※この方針は JOBPAL の例に類似した構成を参考にしています。JobPal</p>
                <h4 style="margin:16px 0 8px; font-weight:bold;">4．第三者提供</h4><p>当社は以下の場合を除き、個人情報を第三者へ提供しません：</p><ul style="list-style-type:disc; padding-left:20px; margin-top:4px;"><li>利用目的の達成に必要な場合</li><li>法令に基づく開示請求があった場合</li><li>人の生命、身体、財産の保護のため必要な場合</li></ul>
                <h4 style="margin:16px 0 8px; font-weight:bold;">5．安全管理</h4><p>個人情報の漏洩、紛失、改ざん、不正アクセス等を防ぐため、必要かつ適切な安全管理措置を講じます。</p>
                <h4 style="margin:16px 0 8px; font-weight:bold;">6．委託</h4><p>個人情報処理の一部を外部委託する場合がありますが、その場合でも当社は適切な管理・監督を行います。</p>
                <h4 style="margin:16px 0 8px; font-weight:bold;">7．共同利用</h4><p>当社グループ会社と個人情報を共有して共同利用する場合、その範囲、目的、管理責任者等を定めたうえで実施します。</p>
                <h4 style="margin:16px 0 8px; font-weight:bold;">8．クッキーの利用</h4><p>本サイトではクッキーを使用し、アクセス情報の収集、サービス改善、利便性向上を行います。クッキーにより個人を特定する情報は保存しません。</p>
                <h4 style="margin:16px 0 8px; font-weight:bold;">9．個人情報の開示・訂正・削除</h4><p>本人からの請求があれば、法令に従い開示・訂正・削除等に対応します。連絡先は以下に記載します。</p><div style="background:#f9f9f9; padding:10px; margin-top:8px; border-radius:4px;"><strong>【問合せ先】</strong><br>株式会社Re.ACT<br>代表：首藤清久<br>メール：k-shuto@react-agent.biz</div>
                <h4 style="margin:16px 0 8px; font-weight:bold;">10．ポリシーの変更</h4><p>本ポリシーは法令・サービス内容の変更に応じて更新します。変更後の内容は当社サイトに掲示した時点で効力が発生します。</p>
                <div style="margin-bottom:40px;"></div>
            </div>`;
    },

    renderTop: (target) => {
        const newJobs = JOBS_DATA.slice(0, 5);
        const totalJobs = JOBS_DATA.length;
        target.innerHTML = `
            <div class="hero">
                <h1>工場・製造業の求人なら<br>工場ワークNAVi</h1>
                <p>全国<span style="color:#ff0000; font-weight:bold; font-size:1.4em;">${totalJobs}件</span>の求人からあなたにぴったりの求人を見つけよう！</p>
                <div class="search-box">
                    <div class="search-input-area">
                        <button type="button" class="search-input-btn" id="top-pref-display" onclick="app.openRegionModal()">勤務地を選択<span>▼</span></button>
                        <button type="button" class="search-input-btn" id="top-condition-btn" onclick="app.openConditionModal(false)">職種・こだわり条件を選択<span>▼</span></button>
                        <button type="button" class="search-input-btn" id="top-salary-btn" onclick="app.openConditionModal(false)">💰 給料から選択<span>▼</span></button>
                    </div>
                    <button type="button" class="btn-search" onclick="app.handleTopSearch()">検索</button>
                </div>
            </div>
            ${!app.state.user ? `<div class="benefit-area"><h3 class="text-center font-bold mb-4" style="color:var(--success-color);">＼ 会員登録でもっと便利に！ ／</h3><div class="benefit-grid"><div class="benefit-item"><span class="benefit-icon">㊙️</span>非公開求人<br>の閲覧</div><div class="benefit-item"><span class="benefit-icon">❤️</span>キープ機能<br>で比較</div><div class="benefit-item"><span class="benefit-icon">📝</span>Web履歴書<br>で即応募</div></div><button class="btn btn-register w-full" onclick="app.router('register')">最短1分！無料で会員登録する</button></div>` : ''}
            <div class="section-title">職種から探す</div>
            <div class="category-list">${TOP_CATEGORIES.map(c => `<div class="category-item" onclick="app.selectCategoryAndOpenModal('${c.id}')"><span class="category-icon">${c.icon}</span> ${c.name}</div>`).join('')}</div>
            <div class="text-center mt-4 clearfix-container"><button type="button" class="btn-more-link" onclick="app.openConditionModal(true)">職種をもっと見る</button></div>
            <div class="section-title">人気のこだわり</div>
            <div class="tag-cloud">${TAG_GROUPS["給与・特典"].slice(0, 8).map(t => `<span class="tag-pill" onclick="app.selectTagAndOpenModal('${t}')">${t}</span>`).join('')}</div>
            <div class="text-center mt-4 clearfix-container"><button type="button" class="btn-more-link" onclick="app.openConditionModal(true)">こだわりをもっと見る</button></div>
            <div class="section-title">新着求人</div>
            <div class="job-list">${newJobs.map(job => app.createJobCard(job)).join('')}</div>
            <div style="background:#fff; padding:30px 20px; text-align:center; border-top:1px solid #eee; margin-top:40px; padding-bottom: calc(30px + env(safe-area-inset-bottom));">
                <div style="font-size:12px; color:#666; margin-bottom:10px; display:flex; justify-content:center; gap:20px;">
                    <span style="cursor:pointer; text-decoration:underline;" onclick="app.router('terms')">利用規約</span>
                    <span style="cursor:pointer; text-decoration:underline;" onclick="app.router('privacy')">プライバシーポリシー</span>
                </div>
                <div style="font-size:11px; color:#999;">© 工場ワーク NAVi</div>
            </div>
        `;
    },

    selectCategoryAndOpenModal: (catId) => {
        app.state.filter.category = [catId];
        app.openConditionModal(true);
    },

    selectTagAndOpenModal: (tagName) => {
        app.state.filter.tag = [tagName];
        app.openConditionModal(true);
    },

    createJobCard: (job) => {
        const isKeep = app.state.user ? app.state.userKeeps.includes(String(job.id)) : app.state.guestKeeps.includes(String(job.id));
        const cleanId = String(job.id).trim();
        const imgUrl = `${R2_DOMAIN}/${cleanId}_1.jpg`;
        const fallback = getFallbackImage(job);
        
        return `
            <div class="job-card">
                <div style="position:relative;" onclick="app.router('detail', '${job.id}')">
                    <img src="${imgUrl}" class="job-card-img" loading="lazy" onerror="this.onerror=null;this.src='${fallback}'">
                    <div class="keep-mark ${isKeep?'active':''} keep-btn-${job.id}" onclick="event.stopPropagation(); app.toggleKeep('${job.id}')">♥</div>
                </div>
                
                <div class="job-card-body" onclick="app.router('detail', '${job.id}')" style="cursor:pointer;">
                    <div class="job-card-title">${job.title}</div>
                    
                    <div class="job-info-row"><span style="margin-right:8px">💴</span><span class="salary-text">${job.salary}</span></div>
                    
                    <div style="font-size:12px; color:#666; margin:4px 0 8px; line-height:1.4;">
                        ${job.monthlyIncome}${job.salarySupp ? ' / ' + job.salarySupp : ''}
                    </div>

                    <div class="job-info-row" style="font-weight:bold; color:#333; margin-top:4px;">
                        <span>📍</span> ${job.pref}${job.city ? ' ' + job.city : ''}
                    </div>
                    
                    <div class="job-info-row"><span>🏭</span> ${getCategoryName(job.category)}   <span>💼</span> ${job.type}</div>
                    
                    <div style="font-size:12px; color:#666; margin:8px 0; line-height:1.4;">
                        ${job.desc.length > 50 ? job.desc.substring(0, 50) + '...' : job.desc}
                    </div>

                    <div style="margin-top:4px;">${job.tags.slice(0,3).map(t => `<span class="tag">${t}</span>`).join('')}</div>
                    
                    <div class="job-card-actions">
                        <button type="button" class="btn btn-outline btn-card" onclick="event.stopPropagation(); app.router('detail', '${job.id}')">詳細</button>
                        <button type="button" class="btn btn-accent btn-card" onclick="event.stopPropagation(); app.router('form', '${job.id}')">応募する</button>
                    </div>
                </div>
            </div>
        `;
    },

    toggleKeep: async (id) => {
        const sid = String(id);
        if(app.state.user) {
            const ref = doc(db, "users", app.state.user.uid);
            if(app.state.userKeeps.includes(sid)) {
                await updateDoc(ref, { keeps: arrayRemove(sid) });
                app.toast("キープから削除しました");
            } else {
                await updateDoc(ref, { keeps: arrayUnion(sid) });
                app.toast("キープしました！");
            }
        } else {
            if(app.state.guestKeeps.includes(sid)) {
                app.state.guestKeeps = app.state.guestKeeps.filter(k => k !== sid);
                app.toast("キープから削除しました");
            } else {
                app.state.guestKeeps.push(sid);
                app.toast("キープしました！");
            }
            localStorage.setItem('factory_work_navi_guest_keeps', JSON.stringify(app.state.guestKeeps));
            app.renderHeader();
            document.querySelectorAll(`.keep-btn-${id}`).forEach(b => b.classList.toggle('active'));
            if(window.location.search.includes('mypage')) app.resolveUrlAndRender();
        }
    },

    handleTopSearch: () => {
        const prefText = document.getElementById('top-pref-display').innerText;
        const pref = prefText.includes('勤務地') ? '' : prefText.replace('▼','').replace('変更する >','').replace('📍','').trim();
        const category = Array.from(document.querySelectorAll('input[name="top-cat"]:checked')).map(c => c.value);
        const tag = Array.from(document.querySelectorAll('input[name="top-tag"]:checked')).map(t => t.value);
        const type = Array.from(document.querySelectorAll('input[name="top-type"]:checked')).map(t => t.value);
        app.state.filter.pref = pref;
        app.state.filter.category = category;
        app.state.filter.tag = tag;
        app.state.filter.type = type;
        app.router('list');
    },

    renderList: (target) => {
        app.state.searchLimit = 20;

        const { pref, sort, tag, category, type, salaryMin, monthlyMin, annualMin, city } = app.state.filter;
        
        const createChipsHtml = (p, cList, tList, tyList, sMin, mMin, aMin, cityList) => {
            let chips = [];
            if (p) chips.push(`<div class="filter-chip">📍 ${p} <div class="filter-chip-remove" onclick="event.stopPropagation(); app.removeFilter('pref', '${p}')">×</div></div>`);
            
            if(cityList && cityList.length > 0) {
                cityList.forEach(ct => chips.push(`<div class="filter-chip">🏘️ ${ct} <div class="filter-chip-remove" onclick="event.stopPropagation(); app.removeFilter('city', '${ct}')">×</div></div>`));
            }

            if(cList) cList.forEach(c => chips.push(`<div class="filter-chip">🏭 ${getCategoryName(c)} <div class="filter-chip-remove" onclick="event.stopPropagation(); app.removeFilter('category', '${c}')">×</div></div>`));
            if(tyList) tyList.forEach(t => chips.push(`<div class="filter-chip">💼 ${t} <div class="filter-chip-remove" onclick="event.stopPropagation(); app.removeFilter('type', '${t}')">×</div></div>`));
            if(tList) tList.forEach(t => chips.push(`<div class="filter-chip">🏷️ ${t} <div class="filter-chip-remove" onclick="event.stopPropagation(); app.removeFilter('tag', '${t}')">×</div></div>`));
            
            if(sMin) chips.push(`<div class="filter-chip">💴 時給${sMin}円以上 <div class="filter-chip-remove" onclick="event.stopPropagation(); app.removeFilter('salaryMin', '')">×</div></div>`);
            if(mMin) chips.push(`<div class="filter-chip">💴 月収${mMin}万円以上 <div class="filter-chip-remove" onclick="event.stopPropagation(); app.removeFilter('monthlyMin', '')">×</div></div>`);
            if(aMin) chips.push(`<div class="filter-chip">💴 年収${aMin}万円以上 <div class="filter-chip-remove" onclick="event.stopPropagation(); app.removeFilter('annualMin', '')">×</div></div>`);

            return chips.length > 0 ? `<div class="active-filter-area"><span class="active-filter-label">条件:</span>${chips.join('')}</div>` : '';
        };
        target.innerHTML = `
            <div class="page-header-simple"><button class="back-btn" onclick="app.router('top')">＜</button><div class="page-header-title">求人検索</div><div style="width:40px;"></div></div>
            <div class="sticky-search-header"><div class="filter-bar"><button type="button" class="filter-toggle-btn" onclick="app.openConditionModal(true)">⚡️ 条件を詳しく絞り込む</button></div><div id="chip-container">${createChipsHtml(pref, category, tag, type, salaryMin, monthlyMin, annualMin, city)}</div></div>
            <div class="sort-area"><div id="result-count" class="result-count"></div><select id="sort-order" style="border:none; color:#666;" onchange="app.updateFilterSingle('sort', this.value)"><option value="new">新着順</option><option value="salary">給与順</option></select></div>
            <div id="list-container" class="job-list"></div>`;
        document.getElementById('sort-order').value = sort;
        app.renderListItems();
    },

    renderListItems: () => {
        const container = document.getElementById('list-container');
        const { pref, tag, category, sort, type, salaryMin, monthlyMin, annualMin, city } = app.state.filter;
        let res = JOBS_DATA.filter(j => {
            if (pref && j.pref !== pref) return false;
            if (city && city.length > 0 && !city.includes(j.city)) return false;

            if (tag && tag.length > 0 && !tag.every(t => j.tags.includes(t))) return false;
            if (category && category.length > 0 && !category.includes(j.category)) return false;
            if (type && type.length > 0 && !type.includes(j.type)) return false;
            
            if (salaryMin && j.salaryVal < parseInt(salaryMin)) return false;
            if (monthlyMin && j.monthlyVal < parseInt(monthlyMin)) return false;
            if (annualMin && j.annualVal < parseInt(annualMin)) return false;

            return true;
        });
        if(sort==='salary') res.sort((a,b)=>b.salaryVal-a.salaryVal); else res.sort((a,b)=>b.idNum-a.idNum);
        
        document.getElementById('result-count').innerHTML = `検索結果：<span>${res.length}</span>件`;

        const currentLimit = app.state.searchLimit || 20;
        const displayedItems = res.slice(0, currentLimit);
        
        const listHtml = displayedItems.length ? displayedItems.map(job => app.createJobCard(job)).join('') : '<p class="text-center mt-4">該当する求人がありません</p>';
        
        let moreBtnHtml = '';
        if (res.length > currentLimit) {
            const remaining = res.length - currentLimit;
            moreBtnHtml = `
                <div style="text-align:center; margin: 20px 0 40px;">
                    <button onclick="app.loadMore()" style="background:#fff; border:1px solid #ccc; padding:10px 30px; border-radius:30px; font-weight:bold; color:#333; box-shadow:0 2px 4px rgba(0,0,0,0.1);">
                        続きを見る (${remaining}件) ▼
                    </button>
                </div>`;
        }

        container.innerHTML = listHtml + moreBtnHtml;
    },

    loadMore: () => {
        app.state.searchLimit = (app.state.searchLimit || 20) + 20;
        app.renderListItems();
    },

    renderDetail: (target, id) => {
        const job = JOBS_DATA.find(j => String(j.id) === String(id));
        if (!job) { target.innerHTML = '<p class="text-center mt-4">求人が見つかりません</p>'; return; }
        const isKeep = app.state.user ? app.state.userKeeps.includes(String(job.id)) : app.state.guestKeeps.includes(String(job.id));
        const appliedList = app.state.user ? (app.state.user.applied || []) : (app.state.guestApplied || []);
        const isApplied = appliedList.includes(String(job.id));
        
        const cleanId = String(job.id).trim();
        const fallback = getFallbackImage(job);
        let imagesHtml = `<img src="${R2_DOMAIN}/${cleanId}_1.jpg" class="detail-img-full" style="flex:0 0 100%; scroll-snap-align: start;" onerror="this.onerror=null;this.src='${fallback}'">`;
        imagesHtml += `<img src="${R2_DOMAIN}/${cleanId}_2.jpg" class="detail-img-full" style="flex:0 0 100%; scroll-snap-align: start;" onerror="this.style.display='none'">`;
        imagesHtml += `<img src="${R2_DOMAIN}/${cleanId}_3.jpg" class="detail-img-full" style="flex:0 0 100%; scroll-snap-align: start;" onerror="this.style.display='none'">`;

        target.innerHTML = `
            <div style="position:relative;">
                <button class="back-btn" style="position:absolute; top:10px; left:10px; background:rgba(255,255,255,0.8); border-radius:50%; z-index:10;" onclick="app.router('list')">＜</button>
                <div style="display:flex; overflow-x:auto; scroll-snap-type:x mandatory; -webkit-overflow-scrolling:touch;">
                    ${imagesHtml}
                </div>
            </div>
            <div class="detail-header"><div class="detail-tags">${job.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div><div class="detail-company">${job.company}</div><div class="detail-title">${job.title}</div></div>
            
            <div class="detail-tabs"><div class="detail-tab-item active" onclick="app.switchDetailTab(0)">募集要項</div><div class="detail-tab-item" onclick="app.switchDetailTab(1)">応募・選考情報</div></div>
            
            <div class="detail-padding">
                <div id="tab-info" class="tab-content">
                    <div class="detail-summary-card">
                        <div class="summary-row"><span class="summary-icon">💴</span><span class="summary-val highlight">${job.salary}</span></div>
                        <div class="summary-row" style="align-items:flex-start">
                            <span class="summary-icon">📍</span>
                            <div style="flex:1">
                                <div style="font-weight:bold; font-size:1.1em; margin-bottom:4px; line-height:1.4;">${job.pref}${job.city ? ' ' + job.city : ''}</div>
                                <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.pref + (job.city || ''))}" target="_blank" style="display:inline-block; font-size:12px; color:#0056b3; text-decoration:none; background:#e3f2fd; padding:2px 8px; border-radius:4px;">📍 Googleマップで見る</a>
                            </div>
                        </div>
                        <div class="summary-row"><span class="summary-icon">🏭</span><span class="summary-val">${job.type}</span></div>
                    </div>
                    <div class="spec-header">仕事内容</div><div class="detail-description">${job.desc}</div>
                    
                    <div class="spec-header">PRポイント</div><div class="detail-description">${job.points || '特にありません'}</div>
                    <div class="spec-header">福利厚生</div><div class="detail-description">${job.benefits || '-'}</div>

                    <div class="spec-header">募集要項</div>
                    <div class="spec-container">
                        <div class="spec-row"><div class="spec-label">給与</div><div class="spec-value">${job.salary}</div></div>
                        <div class="spec-row"><div class="spec-label">給与詳細</div><div class="spec-value">${job.monthlyIncome}${job.salarySupp ? '\n' + job.salarySupp : ''}</div></div>
                        <div class="spec-row"><div class="spec-label">交通費</div><div class="spec-value">${job.transport || '全額支給'}</div></div>
                        <div class="spec-row"><div class="spec-label">勤務地</div><div class="spec-value">${job.pref}${job.city ? ' ' + job.city : ''}</div></div>
                        <div class="spec-row"><div class="spec-label">最寄駅</div><div class="spec-value">${job.station || '-'}</div></div>
                        <div class="spec-row"><div class="spec-label">勤務時間</div><div class="spec-value">${job.flow}</div></div>
                        <div class="spec-row"><div class="spec-label">休日・休暇</div><div class="spec-value">${job.holidays || '-'}</div></div>
                        <div class="spec-row"><div class="spec-label">雇用形態</div><div class="spec-value">${job.type}</div></div>
                        <div class="spec-row"><div class="spec-label">応募資格</div><div class="spec-value">${job.qualifications || '未経験歓迎'}</div></div>
                        <div class="spec-row"><div class="spec-label">寮・社宅</div><div class="spec-value">${job.dorm || '-'}</div></div>
                        <div class="spec-row"><div class="spec-label">寮の詳細</div><div class="spec-value">${job.dorm_desc || '-'}</div></div>
                    </div>
                </div>
                <div id="tab-feature" class="tab-content hidden">
                    <div class="spec-header">応募・選考</div>
                    <div class="spec-container"><div class="spec-row"><div class="spec-label">応募方法</div><div class="spec-value">${job.apply_flow || '-'}</div></div><div class="spec-row"><div class="spec-label">選考期間</div><div class="spec-value">${job.process || '-'}</div></div></div>
                </div>
            </div>
            <div class="fixed-cta"><button class="btn-fav ${isKeep?'active':''} keep-btn-${job.id}" onclick="app.toggleKeep('${job.id}')">♥</button>${isApplied ? `<button class="btn-apply-lg" style="background:#ccc; box-shadow:none; cursor:default;">応募済み</button>` : `<button class="btn-apply-lg" onclick="app.router('form', '${job.id}')">応募する</button>`}</div>
        `;
    },

    switchDetailTab: (idx) => {
        document.querySelectorAll('.detail-tab-item').forEach((b, i) => b.classList.toggle('active', i === idx));
        document.querySelectorAll('.tab-content').forEach((p, i) => p.classList.toggle(i === idx ? 'hidden' : 'hidden', i !== idx));
        document.querySelectorAll('.tab-content')[idx].classList.remove('hidden');
    },

    renderForm: (target) => {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id') || app.state.detailId; 
        const job = JOBS_DATA.find(j => String(j.id) === String(id));
        const p = app.state.userProfile || {}; 

        const currentYear = new Date().getFullYear();
        const years = Array.from({length: 60}, (_, i) => currentYear - 16 - i).map(y => `<option value="${y}">${y}年</option>`).join('');
        const months = Array.from({length: 12}, (_, i) => i + 1).map(m => `<option value="${String(m).padStart(2,'0')}">${m}月</option>`).join('');
        const days = Array.from({length: 31}, (_, i) => i + 1).map(d => `<option value="${String(d).padStart(2,'0')}">${d}日</option>`).join('');

        target.innerHTML = `
            <div class="page-header-simple"><button class="back-btn" onclick="app.back()">＜</button><div class="page-header-title">応募フォーム</div><div style="width:40px;"></div></div>
            <div style="padding:20px;">
                <p class="mb-4 font-bold">${job ? job.title : ''}</p>
                <div class="form-section">
                    <div class="form-section-title">応募者情報</div>
                    
                    <div class="form-group"><label class="form-label">氏名<span class="req">必須</span></label><input type="text" id="inp-name" class="form-input" value="${p.name || ''}" placeholder="例：工場 太郎"></div>
                    <div class="form-group"><label class="form-label">ふりがな<span class="req">必須</span></label><input type="text" id="inp-kana" class="form-input" value="${p.kana || ''}" placeholder="例：こうじょう たろう"></div>
                    <div class="form-group"><label class="form-label">メールアドレス<span style="color:#999;font-size:11px;margin-left:4px;">任意</span></label><input type="email" id="inp-email" class="form-input" value="${p.email || ''}"></div>
                    <div class="form-group"><label class="form-label">電話番号<span class="req">必須</span></label><input type="tel" id="inp-tel" class="form-input" value="${p.tel || ''}" placeholder="ハイフンなし"></div>
                    
                    <div class="form-group"><label class="form-label">生年月日<span class="req">必須</span></label>
                        <div style="display:flex; gap:8px;">
                            <select id="inp-dob-y" class="form-input" style="flex:2;"><option value="">年</option>${years}</select>
                            <select id="inp-dob-m" class="form-input" style="flex:1;"><option value="">月</option>${months}</select>
                            <select id="inp-dob-d" class="form-input" style="flex:1;"><option value="">日</option>${days}</select>
                        </div>
                    </div>

                    <div class="form-group"><label class="form-label">都道府県<span class="req">必須</span></label><select id="inp-pref" class="form-input"><option value="">選択してください</option>${PREFS.map(pr => `<option value="${pr}" ${p.pref===pr?'selected':''}>${pr}</option>`).join('')}</select></div>
                    <div class="form-group"><label class="form-label">町名・番地<span class="req">必須</span></label><input type="text" id="inp-city" class="form-input" value="${p.city || ''}" placeholder="例：〇〇市〇〇町1-2-3"></div>
                    <div class="form-group"><label class="form-label">建物名・部屋番号<span style="color:#999;font-size:11px;margin-left:4px;">任意</span></label><input type="text" id="inp-bldg" class="form-input" value="${p.bldg || ''}"></div>
                    <div class="form-group"><label class="form-label">性別<span style="color:#999;font-size:11px;margin-left:4px;">任意</span></label><div class="radio-group"><label class="radio-label"><input type="radio" name="gender" value="male" ${p.gender==='male'?'checked':''}> 男性</label><label class="radio-label"><input type="radio" name="gender" value="female" ${p.gender==='female'?'checked':''}> 女性</label></div></div>
                </div>
                
                <div style="font-size:12px; text-align:center; margin-bottom:16px;">
                    <span style="color:var(--primary-color); cursor:pointer; text-decoration:underline;" onclick="app.router('terms')">利用規約</span>
                    ・
                    <span style="color:var(--primary-color); cursor:pointer; text-decoration:underline;" onclick="app.router('privacy')">プライバシーポリシー</span>
                    <br>に同意して
                </div>
                
                <button class="btn btn-accent w-full" onclick="app.submitForm()">応募する</button>
            </div>`;
        
        app.restoreFormData();
        
        if (p.dob) {
            const [y, m, d] = p.dob.split('-');
            if(y) document.getElementById('inp-dob-y').value = y;
            if(m) document.getElementById('inp-dob-m').value = m;
            if(d) document.getElementById('inp-dob-d').value = d;
        } else {
            const temp = JSON.parse(sessionStorage.getItem('temp_form_data') || '{}');
            if(temp['inp-dob-y']) document.getElementById('inp-dob-y').value = temp['inp-dob-y'];
            if(temp['inp-dob-m']) document.getElementById('inp-dob-m').value = temp['inp-dob-m'];
            if(temp['inp-dob-d']) document.getElementById('inp-dob-d').value = temp['inp-dob-d'];
        }
    },

    submitForm: async () => {
        const requiredIds = ['inp-name', 'inp-kana', 'inp-tel', 'inp-pref', 'inp-city'];
        const y = document.getElementById('inp-dob-y').value;
        const m = document.getElementById('inp-dob-m').value;
        const d = document.getElementById('inp-dob-d').value;
        const dob = (y && m && d) ? `${y}-${m}-${d}` : '';

        let firstError = null;
        requiredIds.forEach(id => {
            const el = document.getElementById(id);
            el.classList.remove('input-error');
            if (!el.value.trim()) { 
                el.classList.add('input-error'); 
                if(!firstError) firstError = el;
            }
        });
        
        if (!dob) {
            if(!y) { document.getElementById('inp-dob-y').classList.add('input-error'); if(!firstError) firstError = document.getElementById('inp-dob-y'); }
            if(!m) { document.getElementById('inp-dob-m').classList.add('input-error'); if(!firstError) firstError = document.getElementById('inp-dob-m'); }
            if(!d) { document.getElementById('inp-dob-d').classList.add('input-error'); if(!firstError) firstError = document.getElementById('inp-dob-d'); }
        }

        if (firstError) { 
            alert("必須項目が入力されていません"); 
            firstError.scrollIntoView({behavior: "smooth", block: "center"});
            return; 
        }
        
        app.toast("送信中...");
        try {
            const params = new URLSearchParams(window.location.search);
            const jobId = params.get('id');
            const job = JOBS_DATA.find(j => String(j.id) === String(jobId));
            const uid = app.state.user ? app.state.user.uid : "guest";
            const userType = app.state.user ? '会員' : '非会員'; 
            
            const formData = {
                action: 'apply', 
                jobId, jobTitle: job ? job.title : "Unknown", userId: uid,
                name: document.getElementById('inp-name').value,
                kana: document.getElementById('inp-kana').value,
                email: document.getElementById('inp-email').value,
                tel: document.getElementById('inp-tel').value,
                dob: dob,
                pref: document.getElementById('inp-pref').value,
                city: document.getElementById('inp-city').value,
                bldg: document.getElementById('inp-bldg').value,
                gender: document.querySelector('input[name="gender"]:checked')?.value || '',
                userType: userType, 
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, "applications"), formData);
            
            if (app.state.user) {
                await updateDoc(doc(db, "users", uid), { applied: arrayUnion(jobId) });
            } else {
                app.state.guestApplied.push(jobId);
                localStorage.setItem('factory_work_navi_guest_applied', JSON.stringify(app.state.guestApplied));
            }

            app.sendToGas(formData);
            sessionStorage.removeItem('temp_form_data');
            
            alert("応募が完了しました。詳細につきまして担当のものからメールかお電話にてご連絡させていただきます。");
            app.router('list');
        } catch (e) { console.error(e); alert("エラー: " + e.message); }
    },

    renderAuthPage: (target, type) => {
        if(type === 'login') {
            target.innerHTML = `
                <div class="page-header-simple"><button class="back-btn" onclick="app.router('top')">＜</button><div class="page-header-title">ログイン</div><div style="width:40px;"></div></div>
                <div class="container" style="padding:20px;">
                    <input id="login-email" class="form-input mb-4" placeholder="メールアドレス">
                    <input id="login-pass" type="password" class="form-input mb-4" placeholder="パスワード">
                    <button class="btn btn-primary" onclick="app.login(document.getElementById('login-email').value.trim(), document.getElementById('login-pass').value.trim())">ログイン</button>
                    <p class="mt-4 text-center" onclick="app.router('register')">新規登録はこちら</p>
                </div>`;
        } else {
            const currentYear = new Date().getFullYear();
            const years = Array.from({length: 60}, (_, i) => currentYear - 16 - i).map(y => `<option value="${y}">${y}年</option>`).join('');
            const months = Array.from({length: 12}, (_, i) => i + 1).map(m => `<option value="${String(m).padStart(2,'0')}">${m}月</option>`).join('');
            const days = Array.from({length: 31}, (_, i) => i + 1).map(d => `<option value="${String(d).padStart(2,'0')}">${d}日</option>`).join('');

            target.innerHTML = `
                <div class="page-header-simple"><button class="back-btn" onclick="app.router('top')">＜</button><div class="page-header-title">無料会員登録</div><div style="width:40px;"></div></div>
                <div class="container" style="padding:16px;">
                    
                    <div style="background:#e3f2fd; padding:16px; border-radius:12px; margin-bottom:24px; text-align:center; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
                        <h3 style="color:#0056b3; font-weight:bold; margin-bottom:12px; font-size:18px;">＼ 1分で完了！無料登録 ／</h3>
                        <p style="font-size:12px; color:#555; margin-bottom:16px;">会員になると、便利な機能がすべて使えます！</p>
                        <div style="display:flex; justify-content:space-around;">
                            <div style="display:flex; flex-direction:column; align-items:center;">
                                <div style="background:white; width:50px; height:50px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:24px; box-shadow:0 2px 4px rgba(0,0,0,0.1);">📝</div>
                                <span style="font-size:10px; font-weight:bold; margin-top:6px;">応募が簡単</span>
                            </div>
                            <div style="display:flex; flex-direction:column; align-items:center;">
                                <div style="background:white; width:50px; height:50px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:24px; box-shadow:0 2px 4px rgba(0,0,0,0.1);">㊙️</div>
                                <span style="font-size:10px; font-weight:bold; margin-top:6px;">非公開求人</span>
                            </div>
                            <div style="display:flex; flex-direction:column; align-items:center;">
                                <div style="background:white; width:50px; height:50px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:24px; box-shadow:0 2px 4px rgba(0,0,0,0.1);">💌</div>
                                <span style="font-size:10px; font-weight:bold; margin-top:6px;">スカウト</span>
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <div class="form-section-title">基本情報</div>
                        <div class="form-group"><label class="form-label">氏名<span class="req">必須</span></label><input id="reg-name" class="form-input" placeholder="例：工場 太郎"></div>
                        <div class="form-group"><label class="form-label">ふりがな<span class="req">必須</span></label><input id="reg-kana" class="form-input" placeholder="例：こうじょう たろう"></div>
                        
                        <div class="form-group"><label class="form-label">生年月日<span class="req">必須</span></label>
                            <div style="display:flex; gap:8px;">
                                <select id="reg-dob-y" class="form-input" style="flex:2;"><option value="">年</option>${years}</select>
                                <select id="reg-dob-m" class="form-input" style="flex:1;"><option value="">月</option>${months}</select>
                                <select id="reg-dob-d" class="form-input" style="flex:1;"><option value="">日</option>${days}</select>
                            </div>
                        </div>

                        <div class="form-group"><label class="form-label">都道府県<span class="req">必須</span></label><select id="reg-pref" class="form-input"><option value="">選択してください</option>${PREFS.map(p => `<option value="${p}">${p}</option>`).join('')}</select></div>
                        <div class="form-group"><label class="form-label">町名・番地<span class="req">必須</span></label><input id="reg-city" class="form-input" placeholder="例：〇〇市〇〇町1-2-3"></div>
                        <div class="form-group"><label class="form-label">建物名・部屋番号<span style="color:#999;font-size:11px;margin-left:4px;">任意</span></label><input id="reg-bldg" class="form-input"></div>
                        <div class="form-group"><label class="form-label">性別<span style="color:#999;font-size:11px;margin-left:4px;">任意</span></label><div class="radio-group"><label class="radio-label"><input type="radio" name="gender" value="male" checked> 男性</label><label class="radio-label"><input type="radio" name="gender" value="female"> 女性</label></div></div>
                    </div>
                    <div class="form-section"><div class="form-section-title">連絡先・ログイン情報</div>
                        <div class="form-group"><label class="form-label">電話番号<span class="req">必須</span></label><input id="reg-tel" type="tel" class="form-input" placeholder="ハイフンなし"></div>
                        <div class="form-group"><label class="form-label">メールアドレス<span style="color:#999;font-size:11px;margin-left:4px;">任意</span></label><input id="reg-email" type="email" class="form-input" placeholder="sample@example.com"></div>
                        <div class="form-group"><label class="form-label">パスワード<span class="req">必須</span></label><input id="reg-pass" type="password" class="form-input" placeholder="8文字以上"></div>
                    </div>
                    
                    <div style="font-size:12px; text-align:center; margin-bottom:16px;">
                        <span style="color:var(--primary-color); cursor:pointer; text-decoration:underline;" onclick="app.router('terms')">利用規約</span>
                        ・
                        <span style="color:var(--primary-color); cursor:pointer; text-decoration:underline;" onclick="app.router('privacy')">プライバシーポリシー</span>
                        <br>に同意して
                    </div>

                    <button class="btn btn-register w-full" onclick="app.validateAndRegister()">登録する</button>
                </div>`;
            
            app.restoreFormData();
            const temp = JSON.parse(sessionStorage.getItem('temp_form_data') || '{}');
            if(temp['reg-dob-y']) document.getElementById('reg-dob-y').value = temp['reg-dob-y'];
            if(temp['reg-dob-m']) document.getElementById('reg-dob-m').value = temp['reg-dob-m'];
            if(temp['reg-dob-d']) document.getElementById('reg-dob-d').value = temp['reg-dob-d'];
        }
    },

    validateAndRegister: () => {
        const name = document.getElementById('reg-name');
        const kana = document.getElementById('reg-kana');
        const pref = document.getElementById('reg-pref');
        const city = document.getElementById('reg-city');
        const tel = document.getElementById('reg-tel');
        const pass = document.getElementById('reg-pass');
        
        const y = document.getElementById('reg-dob-y').value;
        const m = document.getElementById('reg-dob-m').value;
        const d = document.getElementById('reg-dob-d').value;
        const dob = (y && m && d) ? `${y}-${m}-${d}` : '';

        let firstError = null;
        [name, kana, pref, city, tel, pass].forEach(el => {
            el.classList.remove('input-error');
            if(!el.value.trim()) {
                el.classList.add('input-error');
                if(!firstError) firstError = el;
            }
        });
        
        if(!dob) {
            if(!y) { document.getElementById('reg-dob-y').classList.add('input-error'); if(!firstError) firstError = document.getElementById('reg-dob-y'); }
            if(!m) { document.getElementById('reg-dob-m').classList.add('input-error'); if(!firstError) firstError = document.getElementById('reg-dob-m'); }
            if(!d) { document.getElementById('reg-dob-d').classList.add('input-error'); if(!firstError) firstError = document.getElementById('reg-dob-d'); }
        }

        if(firstError) {
             alert("必須項目が入力されていません");
             firstError.scrollIntoView({behavior: "smooth", block: "center"});
             return; 
        }
        
        const data = {
            action: 'register', 
            name: name.value,
            kana: kana.value,
            dob: dob,
            pref: pref.value,
            city: city.value,
            bldg: document.getElementById('reg-bldg').value,
            tel: tel.value,
            email: document.getElementById('reg-email').value,
            password: pass.value,
            gender: document.querySelector('input[name="gender"]:checked')?.value || ''
        };
        app.register(data);
    },

    register: async (d) => { 
        try { 
            const u = await createUserWithEmailAndPassword(auth, d.email, d.password); 
            await updateProfile(u.user, { displayName: d.name }); 
            const userData = { ...d, keeps: [], applied: [], createdAt: serverTimestamp() };
            delete userData.password;
            delete userData.action;
            await setDoc(doc(db, "users", u.user.uid), userData);
            app.sendToGas(d);
            sessionStorage.removeItem('temp_form_data'); 
            
            app.toast("登録完了！"); 
            app.router('top'); 
        } catch (e) { console.error(e); alert("登録エラー: " + e.message); } 
    },
    
    back: () => { 
        if(window.history.length > 1) {
            window.history.back();
        } else {
            const params = new URLSearchParams(window.location.search);
            if(params.get('id')) app.router('list');
            else app.router('top');
        }
    },
    
    renderMypage: (target) => {
        if (!app.state.user) {
            const keepJobs = JOBS_DATA.filter(j => app.state.guestKeeps.includes(String(j.id)));
            const appliedJobs = JOBS_DATA.filter(j => app.state.guestApplied.includes(String(j.id)));
            const isKeepTab = app.state.mypageTab === 'keep';
            const displayJobs = isKeepTab ? keepJobs : appliedJobs;

            target.innerHTML = `
                <div class="mypage-header">
                    <h2 style="font-size:20px; font-weight:bold;">マイページ (ゲスト)</h2>
                    <p style="font-size:12px; margin-top:8px;">ログインすると履歴を保存できます</p>
                </div>
                <div style="padding:0 16px;">
                    <div class="mypage-tabs">
                        <div class="mypage-tab ${isKeepTab?'active':''}" onclick="app.switchMypageTab('keep')">キープ中 (${keepJobs.length})</div>
                        <div class="mypage-tab ${!isKeepTab?'active':''}" onclick="app.switchMypageTab('history')">応募履歴 (${appliedJobs.length})</div>
                    </div>
                    <div class="job-list">
                        ${displayJobs.length ? displayJobs.map(job => app.createJobCard(job)).join('') : '<p class="text-center mt-4">該当する求人はありません</p>'}
                    </div>
                </div>
                <div class="container" style="padding:20px; text-align:center;">
                    <button class="btn btn-primary" onclick="app.router('login')">ログインして機能を使う</button>
                </div>
            `;
        } else {
            const { userKeeps, user } = app.state;
            const appliedIds = user.applied || [];
            const isKeepTab = app.state.mypageTab === 'keep';
            const displayJobs = isKeepTab 
                ? JOBS_DATA.filter(j => userKeeps.includes(String(j.id)))
                : JOBS_DATA.filter(j => appliedIds.includes(String(j.id)));

            target.innerHTML = `
                <div class="mypage-header">
                    <h2 style="font-size:20px; font-weight:bold;">${user.name} さんのマイページ</h2>
                    <div style="margin-top:10px; font-size:12px; border:1px solid rgba(255,255,255,0.3); display:inline-block; padding:4px 10px; border-radius:15px; cursor:pointer;" onclick="app.logout()">ログアウト</div>
                </div>
                <div style="padding:0 16px;">
                    <div class="mypage-tabs">
                        <div class="mypage-tab ${isKeepTab?'active':''}" onclick="app.switchMypageTab('keep')">キープ中</div>
                        <div class="mypage-tab ${!isKeepTab?'active':''}" onclick="app.switchMypageTab('history')">応募履歴</div>
                    </div>
                    <div class="job-list">
                        ${displayJobs.length ? displayJobs.map(job => app.createJobCard(job)).join('') : '<p class="text-center mt-4">該当する求人はありません</p>'}
                    </div>
                </div>
            `;
        }
    },

    switchMypageTab: (tab) => {
        app.state.mypageTab = tab;
        app.renderMypage(document.getElementById('main-content'));
    },

    toast: (m) => { const e = document.getElementById('toast'); e.innerText = m; e.style.display = 'block'; setTimeout(() => e.style.display = 'none', 2000); },

    updateFilterSingle: (key, val) => { app.state.filter[key] = val; app.resolveUrlAndRender(); },

    closeConditionModal: () => {
        const cats = Array.from(document.querySelectorAll('input[name="top-cat"]:checked')).map(c => c.value);
        const tags = Array.from(document.querySelectorAll('input[name="top-tag"]:checked')).map(t => t.value);
        const types = Array.from(document.querySelectorAll('input[name="top-type"]:checked')).map(t => t.value);
        
        const salary = document.querySelector('select[name="filter-salary"]').value;
        const monthly = document.querySelector('select[name="filter-monthly"]').value;
        const annual = document.querySelector('select[name="filter-annual"]').value;

        app.state.filter.category = cats;
        app.state.filter.tag = tags;
        app.state.filter.type = types;
        app.state.filter.salaryMin = salary;
        app.state.filter.monthlyMin = monthly;
        app.state.filter.annualMin = annual;

        const btn = document.getElementById('top-condition-btn');
        if(btn) {
             const total = cats.length + tags.length + types.length + (salary?1:0) + (monthly?1:0) + (annual?1:0);
             btn.innerHTML = total > 0 ? `<span>🔍 職種・こだわり (${total}件)</span> <span style="color:var(--primary-color)">▼</span>` : `<span>🔍 職種・こだわり条件</span> <span style="color:var(--primary-color)">▼</span>`;
        }
        
        if (app.state.isModalSearchMode) {
             app.router('list');
        }
        document.getElementById('condition-modal').classList.remove('active');
    },
    
    closeRegionModal: () => document.getElementById('region-modal').classList.remove('active'),
    
    openRegionModal: () => { 
        document.getElementById('region-modal').classList.add('active'); 
        app.renderRegionStep1(); 
    },
    
    renderRegionStep1: () => { 
        document.getElementById('modal-title').innerText = "勤務地を選択"; 
        document.getElementById('modal-body').innerHTML = `<div class="region-grid">${REGIONS.map((r, i) => `<div class="region-btn" onclick="app.renderRegionStep2(${i})"><span class="icon">${r.icon}</span><span>${r.name}</span></div>`).join('')}</div>`; 
    },
    
    renderRegionStep2: (idx) => { 
        const r = REGIONS[idx]; 
        document.getElementById('modal-title').innerText = r.name; 
        document.getElementById('modal-body').innerHTML = `<div class="mb-4"><button class="btn btn-sm" onclick="app.renderRegionStep1()">戻る</button></div><div class="pref-grid">${r.prefs.map(p => `<div class="pref-item" onclick="app.renderRegionStep3('${p}')">${p}</div>`).join('')}</div>`; 
    },

    renderRegionStep3: (pref) => {
        const availableCities = [...new Set(JOBS_DATA.filter(j => j.pref === pref && j.city).map(j => j.city))].sort();
        
        document.getElementById('modal-title').innerText = `${pref}の市区町村`; 
        
        let html = `<div class="mb-4"><button class="btn btn-sm" onclick="app.renderRegionStep2(${REGIONS.findIndex(r => r.prefs.includes(pref))})">戻る</button></div>`;
        
        html += `<div style="margin-bottom:16px;">
            <button class="btn w-full" style="background:#e3f2fd; color:#0056b3; font-weight:bold; border:none;" onclick="app.selectCities('${pref}', [])">${pref}のすべてのエリア</button>
        </div>`;

        if (availableCities.length === 0) {
            html += `<p style="text-align:center; color:#666; padding:20px;">詳細エリア情報がありません</p>`;
        } else {
            html += `<div style="max-height:300px; overflow-y:auto; border:1px solid #eee; border-radius:8px; padding:10px;">
                ${availableCities.map(c => `
                    <label style="display:flex; align-items:center; padding:8px 0; border-bottom:1px solid #f0f0f0;">
                        <input type="checkbox" name="city-select" value="${c}" style="transform:scale(1.2); margin-right:10px;">
                        <span style="font-size:14px;">${c}</span>
                    </label>
                `).join('')}
            </div>
            <button class="btn btn-primary w-full mt-4" onclick="app.applyCitySelection('${pref}')">決定して検索</button>`;
        }

        document.getElementById('modal-body').innerHTML = html;
    },

    applyCitySelection: (pref) => {
        const checked = Array.from(document.querySelectorAll('input[name="city-select"]:checked')).map(el => el.value);
        app.selectCities(pref, checked);
    },

    selectCities: (pref, cities) => {
        app.state.filter.pref = pref;
        app.state.filter.city = cities; 
        
        app.closeRegionModal();
        
        const display = document.getElementById('top-pref-display');
        let label = pref;
        if(cities.length > 0) label += ` (${cities.length}エリア)`;
        if(display) {
            display.innerHTML = `<span>📍 ${label}</span> <span style="color:var(--primary-color)">▼</span>`;
        }
        
        const modalPrefDisplay = document.getElementById('condition-modal-pref-display');
        if(modalPrefDisplay) {
            modalPrefDisplay.innerHTML = `${label} <span style="color:var(--primary-color); font-size:12px; margin-left:8px;">変更する ></span>`;
        } else {
            const modal = document.getElementById('condition-modal');
            if(modal && modal.classList.contains('active')) {
                 app.openConditionModal(app.state.isModalSearchMode);
            }
        }

        const params = new URLSearchParams(window.location.search);
        if (params.get('page') === 'list') {
             app.resolveUrlAndRender();
        }
    },
    
    removeFilter: (type, val) => {
        if (type === 'pref') {
            app.state.filter.pref = '';
            app.state.filter.city = []; 
        }
        else if (type === 'city') {
            app.state.filter.city = app.state.filter.city.filter(c => c !== val);
        }
        else if (type === 'category') {
            app.state.filter.category = app.state.filter.category.filter(c => c !== val);
        }
        else if (type === 'tag') {
            app.state.filter.tag = app.state.filter.tag.filter(t => t !== val);
        }
        else if (type === 'type') {
            app.state.filter.type = app.state.filter.type.filter(t => t !== val);
        }
        else if (type === 'salaryMin') app.state.filter.salaryMin = '';
        else if (type === 'monthlyMin') app.state.filter.monthlyMin = '';
        else if (type === 'annualMin') app.state.filter.annualMin = '';

        app.resolveUrlAndRender();
    },

    updateModalChips: () => {
        const cats = Array.from(document.querySelectorAll('input[name="top-cat"]:checked')).map(c => ({val: c.value, label: getCategoryName(c.value)}));
        const tags = Array.from(document.querySelectorAll('input[name="top-tag"]:checked')).map(t => ({val: t.value, label: t.value}));
        const types = Array.from(document.querySelectorAll('input[name="top-type"]:checked')).map(t => ({val: t.value, label: t.value}));
        const container = document.getElementById('modal-active-chips');
        let html = '';
        cats.forEach(c => html += `<div class="filter-chip">🏭 ${c.label}</div>`);
        types.forEach(t => html += `<div class="filter-chip">💼 ${t.label}</div>`);
        tags.forEach(t => html += `<div class="filter-chip">🏷️ ${t.label}</div>`);
        container.innerHTML = html;
    },

    openConditionModal: (isSearch = false) => {
        app.state.isModalSearchMode = isSearch; 
        
        const modal = document.getElementById('condition-modal');
        const body = document.getElementById('condition-modal-body');
        const currentCats = app.state.filter.category || [];
        const currentTags = app.state.filter.tag || [];
        const currentTypes = app.state.filter.type || [];
        
        const currentSalary = app.state.filter.salaryMin || '';
        const currentMonthly = app.state.filter.monthlyMin || '';
        const currentAnnual = app.state.filter.annualMin || '';

        const decideBtn = document.getElementById('modal-decide-btn');
        if(decideBtn) {
            decideBtn.innerText = isSearch ? "この条件で決定して検索" : "この条件で決定";
        }
        
        let tagsHtml = "";
        for (const [groupName, tags] of Object.entries(TAG_GROUPS)) {
            tagsHtml += `<div class="cond-section"><div class="cond-head"><span class="cond-icon">🏷️</span>${groupName}</div><div class="cond-grid-modern">${tags.map(t => `<label class="check-btn"><input type="checkbox" name="top-tag" value="${t}" ${currentTags.includes(t)?'checked':''} onchange="app.updateModalChips()"><span>${t}</span></label>`).join('')}</div></div>`;
        }
        
        const currentPref = app.state.filter.pref || '';
        let prefLabel = currentPref || '選択されていません';
        if(app.state.filter.city && app.state.filter.city.length > 0) prefLabel += ` (${app.state.filter.city.length}エリア)`;

        const prefHtml = `
            <div class="cond-section">
                <div class="cond-head"><span class="cond-icon">📍</span>都道府県</div>
                <div id="condition-modal-pref-display" style="background:#f9f9f9; padding:12px; border-radius:8px; text-align:center; font-weight:bold; color:#555; cursor:pointer;" onclick="app.openRegionModal()">
                    ${prefLabel} <span style="color:var(--primary-color); font-size:12px; margin-left:8px;">変更する ></span>
                </div>
            </div>
        `;

        const typeHtml = `
            <div class="cond-section">
                <div class="cond-head"><span class="cond-icon">💼</span>雇用形態</div>
                <div class="cond-grid-modern">${EMP_TYPES.map(t => `<label class="check-btn"><input type="checkbox" name="top-type" value="${t}" ${currentTypes.includes(t)?'checked':''} onchange="app.updateModalChips()"><span>${t}</span></label>`).join('')}</div>
            </div>
        `;

        // ★★★ 給与選択ロジック（どれか1つを選択したら他をクリア） ★★★
        const salaryHtml = `
            <div class="cond-section">
                <div class="cond-head"><span class="cond-icon">💰</span>給与・収入（下限）</div>
                <div class="cond-grid-selects" style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px;">
                    <div>
                        <label style="font-size:11px; color:#666; display:block; margin-bottom:4px;">時給</label>
                        <select name="filter-salary" class="form-input" style="padding:8px;" onchange="document.querySelector('select[name=filter-monthly]').value=''; document.querySelector('select[name=filter-annual]').value='';">
                            <option value="">指定なし</option>
                            ${[1000,1100,1200,1300,1400,1500,1600,1800,2000].map(v => `<option value="${v}" ${currentSalary==v?'selected':''}>${v}円~</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="font-size:11px; color:#666; display:block; margin-bottom:4px;">月収(万)</label>
                        <select name="filter-monthly" class="form-input" style="padding:8px;" onchange="document.querySelector('select[name=filter-salary]').value=''; document.querySelector('select[name=filter-annual]').value='';">
                            <option value="">指定なし</option>
                            ${[20,23,25,28,30,35,40].map(v => `<option value="${v}" ${currentMonthly==v?'selected':''}>${v}万~</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="font-size:11px; color:#666; display:block; margin-bottom:4px;">年収(万)</label>
                        <select name="filter-annual" class="form-input" style="padding:8px;" onchange="document.querySelector('select[name=filter-salary]').value=''; document.querySelector('select[name=filter-monthly]').value='';">
                            <option value="">指定なし</option>
                            ${[300,350,400,450,500,600].map(v => `<option value="${v}" ${currentAnnual==v?'selected':''}>${v}万~</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>
        `;

        body.innerHTML = `${prefHtml}${salaryHtml}<div class="cond-section"><div class="cond-head"><span class="cond-icon">🏭</span>職種</div><div class="cond-grid-modern">${ALL_CATEGORIES.map(c => `<label class="check-btn"><input type="checkbox" name="top-cat" value="${c.id}" ${currentCats.includes(c.id)?'checked':''} onchange="app.updateModalChips()"><span>${c.name}</span></label>`).join('')}</div></div>${typeHtml}${tagsHtml}`;
        modal.classList.add('active');
        app.updateModalChips();
    }
};

window.app = app;

window.addEventListener('popstate', () => {
    app.resolveUrlAndRender();
});

window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        app.resolveUrlAndRender();
    }
});

document.addEventListener('DOMContentLoaded', app.init);
