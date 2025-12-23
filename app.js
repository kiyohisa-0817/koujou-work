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
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzrRdK1TXUJlZll4AbgNAoU33X3JiMJek8Z8ZpQhALxBCC3T7nfnN211M7TeS7tTfVW/exec"; 
const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSiFBtN5piQfnnlcUtP_2_fVQgRClTvhw-MSMTPUMozsx_6W3-XkHNSnwjU8pRM91SKO6MXxinfo42k/pub?gid=0&single=true&output=csv"; 

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

const TAG_GROUPS = {
    "給与・特典": ["高収入", "日払い可", "週払い可", "入社祝い金あり", "ボーナスあり", "寮費無料", "交通費全額支給"],
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

// --- Utils ---
const getJobImage = (job) => {
    if (job.image1 && job.image1.startsWith('http')) return job.image1;
    const catId = job.category;
    let color = '#4f46e5', icon = '🏭'; // Default primary color
    if(['light','clean'].includes(catId)) { color = '#10b981'; icon = '📦'; } // Success green
    else if(['assembly','metal','press','cast'].includes(catId)) { color = '#3b82f6'; icon = '🔧'; } // Blue
    else if(['logistics','fork','driver'].includes(catId)) { color = '#f97316'; icon = '🚜'; } // Orange
    else if(['operator','semicon','maintenance'].includes(catId)) { color = '#6b7280'; icon = '⚙️'; } // Gray
    else if(['food'].includes(catId)) { color = '#ec4899'; icon = '🍱'; } // Pink
    
    // Modern Gradient SVG Background
    const svg = `<svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:${color};stop-opacity:0.1" /><stop offset="100%" style="stop-color:${color};stop-opacity:0.3" /></linearGradient></defs>
        <rect width="100%" height="100%" fill="url(#grad)"/>
        <text x="50%" y="55%" font-family="Arial" font-size="120" text-anchor="middle" dy=".3em">${icon}</text>
    </svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
};

const getCategoryName = (id) => {
    const c = ALL_CATEGORIES.find(x => x.id === id);
    return c ? c.name : id;
};

let JOBS_DATA = [];

// --- Data Loaders ---
const generateJobs = (count) => {
    const data = [];
    for (let i = 1; i <= count; i++) {
        const pref = PREFS[Math.floor(Math.random() * PREFS.length)];
        const cat = ALL_CATEGORIES[Math.floor(Math.random() * ALL_CATEGORIES.length)];
        const shuffledTags = [...ALL_TAGS_FLAT].sort(() => 0.5 - Math.random());
        const myTags = shuffledTags.slice(0, Math.floor(Math.random() * 4) + 2);
        const hourly = 1000 + Math.floor(Math.random() * 15) * 100;
        data.push({
            id: i,
            title: `【${pref}】${cat.name}募集！${hourly >= 1600 ? '高時給案件！' : '未経験スタート応援！'}`,
            company: `${pref}マニュファクチャリング ${i}工場`,
            pref: pref, category: cat.id, salaryVal: hourly,
            salary: `時給 ${hourly.toLocaleString()}円〜`,
            salarySupp: "入社祝い金あり",
            monthlyIncome: `${Math.floor(hourly * 168 / 10000)}万円〜`,
            tags: [...new Set(myTags)],
            type: i % 4 === 0 ? "期間工" : "派遣社員",
            isNew: i <= 25,
            desc: `${pref}エリアの工場で${cat.name}を担当していただきます。マニュアル完備で安心。`,
            flow: "8:00 朝礼 → 作業開始 → 12:00 休憩 → 17:00 終了",
            holidays: "土日休み（会社カレンダーによる）",
            benefits: "社会保険完備、有給休暇、制服貸与",
            apply_flow: "応募フォームより応募 → 面接（WEB可） → 採用",
            process: "最短3日で入社可能！"
        });
    }
    return data;
};

const parseCSV = (text) => {
    const arr = [];
    let quote = false; 
    let col = 0, row = 0;
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
        headers.forEach((h, idx) => { job[h] = arr[i][idx] ? arr[i][idx].trim() : ''; });
        job.idNum = parseInt(job.id) || 0;
        job.salaryVal = parseInt(job.salary.replace(/[^0-9]/g, '')) || 1000;
        job.isNew = job.isNew === 'TRUE' || job.isNew === 'true';
        if(job.tags) job.tags = job.tags.split(/[\s|]+/).filter(t => t); else job.tags = [];
        jobs.push(job);
    }
    return jobs;
};

// ===============================================
// App Logic & UI Rendering
// ===============================================
const app = {
    state: {
        page: 'top',
        detailId: null,
        filter: { pref: '', tag: [], category: [], sort: 'new' },
        user: null,
        guestKeeps: [],
        mypageTab: 'keep'
    },

    init: async () => {
        const savedState = sessionStorage.getItem('fwn_state');
        if (savedState) {
            const parsed = JSON.parse(savedState);
            app.state.page = parsed.page;
            app.state.detailId = parsed.detailId;
            app.state.filter = parsed.filter || app.state.filter;
            app.state.mypageTab = parsed.mypageTab || 'keep';
        }
        
        const savedGuestKeeps = localStorage.getItem('factory_work_navi_guest_keeps');
        if (savedGuestKeeps) app.state.guestKeeps = JSON.parse(savedGuestKeeps);

        onAuthStateChanged(auth, (user) => {
            if (user) {
                app.state.user = { uid: user.uid, email: user.email, name: user.displayName || "ゲスト" };
                app.syncUserKeeps(user.uid);
            } else {
                app.state.user = null;
                app.state.userKeeps = [];
            }
            app.renderHeader();
            if(app.state.page) app.router(app.state.page, app.state.detailId, false);
        });

        // Data Loading
        if (GOOGLE_SHEET_CSV_URL) {
            try {
                const response = await fetch(GOOGLE_SHEET_CSV_URL);
                if (!response.ok) throw new Error('Network error');
                const text = await response.text();
                JOBS_DATA = parseCSV(text);
            } catch (e) {
                console.error("CSV Load Error:", e);
                JOBS_DATA = generateJobs(20);
            }
        }
        document.getElementById('loading-overlay').style.display = 'none';

        const urlParams = new URLSearchParams(window.location.search);
        const urlId = urlParams.get('id');
        if (urlId) {
            app.state.detailId = parseInt(urlId);
            app.router('detail', app.state.detailId, false);
        } else {
            app.router(app.state.page || 'top', app.state.detailId, false);
        }

        window.addEventListener('popstate', (event) => {
            const currentParams = new URLSearchParams(window.location.search);
            const currentId = currentParams.get('id');
            if (currentId) {
                app.state.detailId = parseInt(currentId);
                app.router('detail', app.state.detailId, false);
            } else {
                if (event.state && event.state.page) app.router(event.state.page, event.state.id, false);
                else app.router('top', null, false);
            }
        });
    },

    syncUserKeeps: (uid) => {
        const userRef = doc(db, "users", uid);
        onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                app.state.userKeeps = data.keeps || [];
                if(data.applied) app.state.user.applied = data.applied;
            } else {
                setDoc(userRef, { keeps: [], applied: [], email: app.state.user.email }, { merge: true });
                app.state.userKeeps = [];
            }
            if (app.state.page === 'list') app.renderList(document.getElementById('main-content'));
            if (app.state.page === 'detail') app.renderDetail(document.getElementById('main-content'), app.state.detailId);
            if (app.state.page === 'mypage') app.renderMypage(document.getElementById('main-content'));
            app.renderHeader();
        });
    },

    saveState: () => sessionStorage.setItem('fwn_state', JSON.stringify(app.state)),

    router: (pageName, param = null, addHistory = true) => {
        window.scrollTo(0, 0);
        app.state.page = pageName;
        if(pageName === 'detail') app.state.detailId = param;
        app.saveState();

        if (addHistory) {
            const newUrl = (pageName === 'detail' && param) ? `${window.location.pathname}?id=${param}` : window.location.pathname;
            window.history.pushState({page: pageName, id: param}, '', newUrl);
        }
        
        const container = document.getElementById('main-content');
        if (pageName === 'top') { container.innerHTML = ''; app.renderTop(container); }
        else if (pageName === 'list') {
            if (param && param.fromTop) {
                app.state.filter.pref = param.pref || '';
                app.state.filter.tag = param.tag || [];
                app.state.filter.category = param.category || [];
            }
            container.innerHTML = ''; 
            app.renderList(container);
            if (param && param.openAdvanced) setTimeout(() => app.toggleAdvancedSearch(true), 50);
        }
        else if (pageName === 'detail') { container.innerHTML = ''; app.renderDetail(container, app.state.detailId); }
        else if (pageName === 'register' || pageName === 'login') { container.innerHTML = ''; app.renderAuthPage(container, pageName); }
        else if (pageName === 'form') { container.innerHTML = ''; app.renderForm(container); }
        else if (pageName === 'mypage') { container.innerHTML = ''; app.renderMypage(container); }
        else if (pageName === 'privacy') { container.innerHTML = ''; app.renderPrivacy(container); }
        else if (pageName === 'terms') { container.innerHTML = ''; app.renderTerms(container); }
    },

    // ★★★ Modern Header Render ★★★
    renderHeader: () => {
        const area = document.getElementById('header-nav-area');
        const keepCount = app.state.user ? app.state.userKeeps.length : app.state.guestKeeps.length;
        const badgeHtml = keepCount > 0 ? `<div class="badge">${keepCount}</div>` : '';
        
        if (app.state.user) {
            area.innerHTML = `
                <button class="header-icon-btn" onclick="app.router('list', {openAdvanced: true})">
                    <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                </button>
                <button class="header-icon-btn" onclick="app.router('mypage')">
                    <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                    ${badgeHtml}
                </button>
            `;
        } else {
            area.innerHTML = `
                <button class="header-icon-btn" style="margin-right:-8px;" onclick="app.router('mypage')">
                   <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                   ${badgeHtml}
                </button>
                <button class="btn-header-reg" onclick="app.router('login')">ログイン</button>
            `;
        }
    },

    // ★★★ Modern Top Page Render ★★★
    renderTop: (target) => {
        const newJobs = JOBS_DATA.slice(0, 5);
        target.innerHTML = `
            <div class="hero-modern">
                <div class="hero-bg-decoration"></div>
                <h1 class="hero-title">工場・製造業の<br><span>理想の求人</span>が見つかる</h1>
                <p class="hero-sub">高収入・寮完備・未経験OKなど豊富な案件数</p>
                
                <div class="search-card">
                    <div class="search-row">
                        <button class="search-input-dummy" id="top-pref-display" onclick="app.openRegionModal()">
                            <span>📍 勤務地を選択</span> <span style="color:var(--primary)">▼</span>
                        </button>
                        <button class="search-input-dummy" id="top-condition-btn" onclick="app.openConditionModal()">
                            <span>🔍 職種・こだわり条件</span> <span style="color:var(--primary)">▼</span>
                        </button>
                    </div>
                    <button class="btn btn-primary" style="margin-top:12px; box-shadow:none;" onclick="app.handleTopSearch()">検索する</button>
                </div>
            </div>

            <div class="section-head">
                <div class="section-title">職種から探す</div>
                <div class="section-more" onclick="app.router('list', {openAdvanced: true, fromTop: true, category: []})">すべて見る ></div>
            </div>
            <div class="category-scroll">
                ${TOP_CATEGORIES.map(c => `
                    <div class="cat-card" onclick="app.router('list', {fromTop: true, category: ['${c.id}'], openAdvanced: true})">
                        <div class="cat-icon">${c.icon}</div>
                        <div class="cat-name">${c.name}</div>
                    </div>
                `).join('')}
            </div>

            <div class="section-head">
                <div class="section-title">人気のこだわり</div>
            </div>
            <div style="padding:0 20px; display:flex; flex-wrap:wrap; gap:8px;">
                ${TAG_GROUPS["給与・特典"].slice(0, 6).map(t => `<span class="tag-pill" style="font-size:12px; padding:8px 14px; background:white; border:1px solid #e5e7eb;" onclick="app.router('list', {fromTop: true, tag: ['${t}'], openAdvanced: true})">${t}</span>`).join('')}
            </div>

            <div class="section-head" style="margin-top:10px;">
                <div class="section-title">新着の求人</div>
            </div>
            <div class="job-list">
                ${newJobs.map(job => app.createJobCard(job)).join('')}
            </div>
            
            <div class="text-center mt-4 mb-4" style="padding:20px;">
                <button class="btn btn-outline" onclick="app.router('list', {clear: true})">すべての求人を見る</button>
            </div>

            ${!app.state.user ? `
            <div style="margin:20px; padding:24px; background:linear-gradient(135deg, #1f2937 0%, #111827 100%); border-radius:24px; color:white; text-align:center; box-shadow:0 10px 25px rgba(0,0,0,0.2);">
                <div style="font-size:18px; font-weight:bold; margin-bottom:8px;">会員登録で便利に！</div>
                <p style="font-size:12px; opacity:0.8; margin-bottom:16px;">キープ機能や応募履歴の保存が可能になります。</p>
                <button class="btn btn-register w-full" onclick="app.router('register')">無料で会員登録する</button>
            </div>
            ` : ''}

            <div style="padding:40px 20px; text-align:center; font-size:11px; color:#9ca3af;">
                <div style="display:flex; justify-content:center; gap:20px; margin-bottom:12px;">
                    <span onclick="app.router('terms')">利用規約</span>
                    <span onclick="app.router('privacy')">プライバシーポリシー</span>
                </div>
                &copy; KOJO WORK NAVI.
            </div>
        `;
    },

    handleTopSearch: () => {
        const prefText = document.getElementById('top-pref-display').innerText;
        const pref = prefText.includes('勤務地') ? '' : prefText.replace('📍 ', '').replace(' ▼','');
        const category = Array.from(document.querySelectorAll('input[name="top-cat"]:checked')).map(c => c.value);
        const tag = Array.from(document.querySelectorAll('input[name="top-tag"]:checked')).map(t => t.value);
        app.router('list', { fromTop: true, pref, category, tag });
    },

    // ★★★ Modern List Page Render ★★★
    renderList: (target) => {
        const { pref, sort, tag, category } = app.state.filter;
        
        // Chip HTML Generator
        const createChipsHtml = (p, cList, tList) => {
            let chips = [];
            if (p) chips.push(`<div class="filter-chip">📍 ${p} <div class="chip-close" onclick="app.removeFilter('pref', '${p}')">×</div></div>`);
            cList.forEach(c => chips.push(`<div class="filter-chip">🏭 ${getCategoryName(c)} <div class="chip-close" onclick="app.removeFilter('category', '${c}')">×</div></div>`));
            tList.forEach(t => chips.push(`<div class="filter-chip">🏷️ ${t} <div class="chip-close" onclick="app.removeFilter('tag', '${t}')">×</div></div>`));
            return chips.length > 0 ? `<div class="chips-area" id="chip-container">${chips.join('')}</div>` : '';
        };

        // Tags Checkbox HTML
        let tagsHtml = "";
        for (const [groupName, tags] of Object.entries(TAG_GROUPS)) {
            tagsHtml += `<p class="font-bold mb-2 mt-4" style="font-size:13px; color:var(--text-sub);">${groupName}</p><div class="checkbox-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">${tags.map(t => `<label class="checkbox-label" style="font-size:13px;"><input type="checkbox" name="tag" value="${t}" ${tag.includes(t)?'checked':''} onchange="app.updateFilterMulti()"> ${t}</label>`).join('')}</div>`;
        }

        target.innerHTML = `
            <div class="glass-header" style="position:sticky; top:0; z-index:900;">
                 <button class="header-icon-btn" onclick="app.router('top')">
                    <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
                 </button>
                 <div style="font-weight:700;">求人検索</div>
                 <div style="width:40px;"></div>
            </div>
            
            <div class="sticky-filter-header">
                <button class="filter-btn" onclick="app.toggleAdvancedSearch()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
                    条件を絞り込む
                </button>
                ${createChipsHtml(pref, category, tag)}
            </div>

            <div id="advanced-search" class="advanced-search-panel" style="display:none; padding:20px; background:white; border-bottom:1px solid #eee;">
               <p class="font-bold mb-2">都道府県</p>
               <div class="search-input-dummy mb-4" onclick="app.openRegionModal()" id="list-pref-display">${pref || '指定なし'}</div>
               
               <p class="font-bold mb-2">職種</p>
               <div class="checkbox-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                  ${ALL_CATEGORIES.map(c => `<label class="checkbox-label" style="font-size:13px;"><input type="checkbox" name="cat" value="${c.id}" ${category.includes(c.id)?'checked':''} onchange="app.updateFilterMulti()"> ${c.name}</label>`).join('')}
               </div>
               
               ${tagsHtml}
               
               <button class="btn btn-primary w-full mt-4" onclick="app.toggleAdvancedSearch(false)">この条件で検索</button>
            </div>

            <div style="padding:10px 20px; display:flex; justify-content:space-between; align-items:center;">
                <div id="result-count" style="font-weight:700; font-size:14px;"></div>
                <select id="sort-order" style="border:none; background:transparent; font-size:13px; font-weight:600;" onchange="app.updateFilterSingle('sort', this.value)">
                    <option value="new">新着順</option>
                    <option value="salary">給与が高い順</option>
                </select>
            </div>

            <div id="list-container" class="job-list" style="padding-bottom:100px;"></div>
        `;
        document.getElementById('sort-order').value = sort;
        app.renderListItems();
    },

    updateFilterSingle: (key, val) => {
        app.state.filter[key] = val;
        app.renderListItems();
    },

    updateFilterMulti: () => {
        app.state.filter.category = Array.from(document.querySelectorAll('input[name="cat"]:checked')).map(c=>c.value);
        app.state.filter.tag = Array.from(document.querySelectorAll('input[name="tag"]:checked')).map(c=>c.value);
        app.renderListItems(); // Re-render items but not the whole container
    },

    renderListItems: () => {
        const container = document.getElementById('list-container');
        const { pref, tag, category, sort } = app.state.filter;
        let res = JOBS_DATA.filter(j => {
            if (pref && j.pref !== pref) return false;
            if (tag.length > 0 && !tag.every(t => j.tags.includes(t))) return false;
            if (category.length > 0 && !category.includes(j.category)) return false;
            return true;
        });
        if(sort==='salary') res.sort((a,b)=>b.salaryVal-a.salaryVal); else res.sort((a,b)=>b.idNum-a.idNum);
        document.getElementById('result-count').innerHTML = `検索結果：<span style="color:var(--primary);">${res.length}</span>件`;
        container.innerHTML = res.length ? res.slice(0,50).map(job => app.createJobCard(job)).join('') : '<p class="text-center mt-4" style="color:#666;">該当する求人がありません</p>';
    },

    // ★★★ Modern Job Card Render ★★★
    createJobCard: (job) => {
        const isKeep = app.state.user 
            ? app.state.userKeeps.includes(String(job.id))
            : app.state.guestKeeps.includes(String(job.id));
        const isApplied = app.state.user?.applied?.includes(String(job.id));

        return `
        <div class="job-card" onclick="app.router('detail', ${job.id})">
            <div class="job-img-wrapper">
                <img src="${getJobImage(job)}" class="job-img" loading="lazy">
                <div class="job-keep-btn ${isKeep?'active':''} keep-btn-${job.id}" onclick="event.stopPropagation(); app.toggleKeep(${job.id})">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="${isKeep?'currentColor':'none'}" stroke="currentColor" stroke-width="2"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                </div>
            </div>
            <div class="job-body">
                <div class="job-tags">
                    ${job.isNew ? '<span class="tag-pill new">NEW</span>' : ''}
                    ${isApplied ? '<span class="tag-pill highlight">応募済</span>' : ''}
                    ${job.tags.slice(0,3).map(t=>`<span class="tag-pill">${t}</span>`).join('')}
                </div>
                <h3 class="job-title">${job.title}</h3>
                <div class="job-meta">
                    <div class="meta-row">
                        <span class="meta-icon">📍</span> ${job.pref}
                    </div>
                    <div class="meta-row">
                        <span class="meta-icon">💴</span> <span class="salary-bold">${job.salary}</span>
                    </div>
                </div>
            </div>
        </div>
        `;
    },

    // ★★★ Modern Detail Page Render ★★★
    renderDetail: (target, id) => {
        const job = JOBS_DATA.find(j => String(j.id) === String(id));
        if (!job) return;
        const isKeep = app.state.user 
            ? app.state.userKeeps.includes(String(job.id))
            : app.state.guestKeeps.includes(String(job.id));
        const isApplied = app.state.user?.applied?.includes(String(job.id));

        target.innerHTML = `
            <div class="detail-hero">
                <div class="back-btn-float" onclick="app.router('list')">
                    <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
                </div>
                <img src="${getJobImage(job)}" class="detail-img">
                <div class="detail-curve"></div>
            </div>

            <div class="detail-content">
                <div class="detail-header-card">
                    <span class="company-name">${job.company}</span>
                    <h1 class="detail-main-title">${job.title}</h1>
                    <div class="job-tags" style="justify-content:center;">${job.tags.map(t=>`<span class="tag-pill">${t}</span>`).join('')}</div>
                </div>

                <div class="info-card">
                    <div class="info-head">仕事内容</div>
                    <div style="font-size:14px; line-height:1.7; color:var(--text-main); white-space: pre-wrap;">${job.desc}</div>
                </div>

                <div class="info-card">
                    <div class="info-head">募集要項</div>
                    <div class="spec-grid">
                         <div class="spec-item"><div class="spec-icon">💴</div><div><div class="spec-label">給与</div><div class="spec-val" style="color:var(--primary); font-weight:700;">${job.salary}</div></div></div>
                         <div class="spec-item"><div class="spec-icon">📍</div><div><div class="spec-label">勤務地</div><div class="spec-val">${job.pref}</div></div></div>
                         <div class="spec-item"><div class="spec-icon">⏱️</div><div><div class="spec-label">勤務時間</div><div class="spec-val">${job.flow}</div></div></div>
                         <div class="spec-item"><div class="spec-icon">📅</div><div><div class="spec-label">休日</div><div class="spec-val">${job.holidays}</div></div></div>
                         <div class="spec-item"><div class="spec-icon">🏭</div><div><div class="spec-label">雇用形態</div><div class="spec-val">${job.type}</div></div></div>
                         <div class="spec-item"><div class="spec-icon">🎁</div><div><div class="spec-label">待遇・福利厚生</div><div class="spec-val">${job.benefits}</div></div></div>
                    </div>
                </div>

                <div class="info-card" style="margin-bottom:0;">
                    <div class="info-head">応募について</div>
                    <p style="font-size:14px;">${job.apply_flow}</p>
                </div>
            </div>

            <div class="fixed-bottom-bar">
                <button class="btn-fav-lg ${isKeep?'active':''} keep-btn-${job.id}" onclick="app.toggleKeep(${job.id})">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="${isKeep?'currentColor':'none'}" stroke="currentColor" stroke-width="2"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                </button>
                ${isApplied 
                    ? `<button class="btn btn-primary" style="background:#9ca3af; box-shadow:none; cursor:default; flex:1;">応募済み</button>`
                    : `<button class="btn btn-accent" style="flex:1;" onclick="app.state.detailId=${job.id}; app.router('form')">応募画面へ進む</button>`
                }
            </div>
        `;
    },

    renderForm: (target) => {
        const job = JOBS_DATA.find(j => String(j.id) === String(app.state.detailId));
        target.innerHTML = `
            <div class="glass-header">
                <button class="header-icon-btn" onclick="app.back()"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg></button>
                <div style="font-weight:700;">応募フォーム</div><div style="width:40px;"></div>
            </div>
            <div style="padding:20px;">
                <p class="mb-4 font-bold">${job ? job.title : ''}</p>
                <div class="form-box">
                    <div class="input-label">お名前 <span class="req">必須</span></div>
                    <input type="text" id="inp-name" class="input-field mb-4" value="${app.state.user ? app.state.user.name : ''}">
                    
                    <div class="input-label">電話番号 <span class="req">必須</span></div>
                    <input type="tel" id="inp-phone" class="input-field mb-4" value="${app.state.user ? app.state.user.tel || '' : ''}">
                    
                    <div class="input-label">メールアドレス</div>
                    <input type="email" id="inp-email" class="input-field mb-4" value="${app.state.user ? app.state.user.email : ''}">
                </div>
                <button class="btn btn-accent w-full" onclick="app.submitForm()">応募を完了する</button>
            </div>`;
    },

    renderAuthPage: (target, type) => {
        if(type === 'login') {
            target.innerHTML = `
                <div class="glass-header"><button class="header-icon-btn" onclick="app.router('top')"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg></button><div style="font-weight:700;">ログイン</div><div style="width:40px;"></div></div>
                <div class="container" style="padding:24px;">
                    <div class="form-box">
                        <input id="login-email" class="input-field mb-4" placeholder="メールアドレス">
                        <input id="login-pass" type="password" class="input-field mb-4" placeholder="パスワード">
                        <button class="btn btn-primary" onclick="app.login(document.getElementById('login-email').value.trim(), document.getElementById('login-pass').value.trim())">ログイン</button>
                    </div>
                    <p class="mt-4 text-center" style="font-size:13px; color:var(--primary); cursor:pointer;" onclick="app.router('register')">新規登録はこちら</p>
                </div>`;
        } else {
            // Simplified register for brevity in this response, keeps structure
            target.innerHTML = `
                <div class="glass-header"><button class="header-icon-btn" onclick="app.router('top')"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg></button><div style="font-weight:700;">無料会員登録</div><div style="width:40px;"></div></div>
                <div class="container" style="padding:24px;">
                    <div class="form-box">
                        <div class="input-label">お名前</div>
                        <input id="reg-name" class="input-field mb-4" placeholder="例：工場 太郎">
                        <div class="input-label">メールアドレス</div>
                        <input id="reg-email" type="email" class="input-field mb-4">
                        <div class="input-label">パスワード</div>
                        <input id="reg-pass" type="password" class="input-field mb-4" placeholder="8文字以上">
                        <div class="input-label">電話番号</div>
                        <input id="reg-tel" type="tel" class="input-field mb-4">
                        <button class="btn btn-register w-full" onclick="const d = app.getRegisterData(); if(!d.name || !d.email || !d.password) { alert('必須項目を入力してください'); return; } app.register(d);">登録してはじめる</button>
                    </div>
                </div>`;
        }
    },

    renderMypage: (target) => {
        const userName = app.state.user ? `${app.state.user.name} 様` : "ゲスト 様";
        const currentTab = app.state.mypageTab || 'keep'; 
        const keeps = app.state.user ? app.state.userKeeps : app.state.guestKeeps;
        const keepJobs = JOBS_DATA.filter(j => keeps.includes(String(j.id)));
        const appliedList = app.state.user && app.state.user.applied ? app.state.user.applied : [];
        const appliedJobs = JOBS_DATA.filter(j => appliedList.includes(String(j.id)));

        let contentHtml = '';
        if (currentTab === 'keep') {
             contentHtml = keepJobs.length ? keepJobs.map(j => app.createJobCard(j)).join('') : '<p class="text-center mt-4">キープした求人はありません</p>';
        } else {
             if (!app.state.user) {
                 contentHtml = '<p class="text-center mt-4">応募履歴を確認するにはログインが必要です</p>';
             } else {
                 contentHtml = appliedJobs.length ? appliedJobs.map(j => app.createJobCard(j)).join('') : '<p class="text-center mt-4">応募した求人はありません</p>';
             }
        }

        target.innerHTML = `
            <div style="background:var(--primary); color:white; padding:30px 20px 50px; border-radius:0 0 20px 20px; text-align:center;">
                <div style="font-size:18px; font-weight:700; margin-bottom:10px;">${userName}</div>
                ${app.state.user ? `<button class="btn btn-sm btn-outline" style="background:rgba(255,255,255,0.2); color:white; border:none;" onclick="app.logout()">ログアウト</button>` : `<button class="btn btn-sm btn-outline" style="background:white; color:var(--primary); border:none;" onclick="app.router('login')">ログイン / 新規登録</button>`}
            </div>
            <div style="padding:0 20px; margin-top:-30px;">
                <div style="display:flex; background:white; border-radius:12px; box-shadow:0 4px 6px rgba(0,0,0,0.05); padding:4px; margin-bottom:20px;">
                    <div style="flex:1; text-align:center; padding:10px; font-weight:700; border-radius:8px; cursor:pointer; font-size:13px; ${currentTab === 'keep' ? 'background:var(--primary); color:white;' : 'color:#666;'}" onclick="app.switchMypageTab('keep')">キープ</div>
                    <div style="flex:1; text-align:center; padding:10px; font-weight:700; border-radius:8px; cursor:pointer; font-size:13px; ${currentTab === 'applied' ? 'background:var(--primary); color:white;' : 'color:#666;'}" onclick="app.switchMypageTab('applied')">応募済み</div>
                </div>
                <div class="job-list">${contentHtml}</div>
            </div>
        `;
    },

    // --- Actions & Helpers ---
    switchMypageTab: (tabName) => { app.state.mypageTab = tabName; app.renderMypage(document.getElementById('main-content')); },
    
    login: async (email, pass) => {
        app.toast("ログイン中...");
        try {
            await signInWithEmailAndPassword(auth, email, pass);
            app.toast("ログインしました"); app.router('top');
        } catch (error) { console.error(error); alert("ログイン失敗: " + error.message); }
    },
    logout: async () => { await signOut(auth); app.toast("ログアウトしました"); app.router('top'); },
    
    register: async (userData) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
            const user = userCredential.user;
            await updateProfile(user, { displayName: userData.name });
            await setDoc(doc(db, "users", user.uid), { name: userData.name, email: userData.email, keeps: [], applied: [], createdAt: serverTimestamp() });
            
            // Send to GAS (Optional)
            if (GOOGLE_APPS_SCRIPT_URL && GOOGLE_APPS_SCRIPT_URL.startsWith('http')) {
                const formData = new FormData();
                formData.append('type', 'register');
                Object.keys(userData).forEach(k => formData.append(k, userData[k]));
                fetch(GOOGLE_APPS_SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: formData }).catch(e => console.log("GAS Error:", e));
            }
            app.toast("登録完了！"); app.router('top');
        } catch (error) { console.error(error); alert("登録エラー: " + error.message); }
    },

    submitForm: async () => {
        const name = document.getElementById('inp-name').value;
        const phone = document.getElementById('inp-phone').value;
        if (!name || !phone) { alert("お名前と電話番号は必須です"); return; }
        app.toast("送信中...");
        try {
            const jobId = String(app.state.detailId);
            const job = JOBS_DATA.find(j => String(j.id) === jobId);
            const uid = app.state.user ? app.state.user.uid : "guest";
            await addDoc(collection(db, "applications"), {
                jobId: jobId, jobTitle: job ? job.title : "不明", userId: uid,
                userName: name, userPhone: phone, createdAt: serverTimestamp()
            });
            if (app.state.user) await updateDoc(doc(db, "users", uid), { applied: arrayUnion(jobId) });
            alert("応募完了！連絡をお待ちください。");
            app.router('list');
        } catch (e) { console.error(e); alert("エラー: " + e.message); }
    },

    toggleKeep: async (id) => {
        const idStr = String(id);
        const currentKeeps = app.state.user ? app.state.userKeeps : app.state.guestKeeps;
        const isKept = currentKeeps.includes(idStr);
        const newStatus = !isKept;
        
        document.querySelectorAll(`.keep-btn-${id}`).forEach(btn => {
            if(newStatus) { btn.classList.add('active'); btn.querySelector('path').setAttribute('fill', 'currentColor'); }
            else { btn.classList.remove('active'); btn.querySelector('path').setAttribute('fill', 'none'); }
        });

        if (app.state.user) {
            if(newStatus) app.state.userKeeps.push(idStr); else app.state.userKeeps = app.state.userKeeps.filter(k => k !== idStr);
            const userRef = doc(db, "users", app.state.user.uid);
            await updateDoc(userRef, { keeps: newStatus ? arrayUnion(idStr) : arrayRemove(idStr) });
        } else {
            if(newStatus) app.state.guestKeeps.push(idStr); else app.state.guestKeeps = app.state.guestKeeps.filter(k => k !== idStr);
            localStorage.setItem('factory_work_navi_guest_keeps', JSON.stringify(app.state.guestKeeps));
            app.renderHeader();
        }
    },

    getRegisterData: () => {
        return {
            name: document.getElementById('reg-name').value,
            email: document.getElementById('reg-email').value,
            password: document.getElementById('reg-pass').value,
            tel: document.getElementById('reg-tel').value
        };
    },

    toggleAdvancedSearch: (force) => {
        const panel = document.getElementById('advanced-search');
        if(panel) panel.style.display = (force || panel.style.display === 'none') ? 'block' : 'none';
    },
    removeFilter: (type, val) => {
        if (type === 'pref') app.state.filter.pref = '';
        else if (type === 'category') {
            app.state.filter.category = app.state.filter.category.filter(c => c !== val);
            const el = document.querySelector(`input[name="cat"][value="${val}"]`);
            if(el) el.checked = false;
        }
        else if (type === 'tag') {
            app.state.filter.tag = app.state.filter.tag.filter(t => t !== val);
            const el = document.querySelector(`input[name="tag"][value="${val}"]`);
            if(el) el.checked = false;
        }
        app.updateFilterMulti();
    },
    
    // Modal & Render Helpers
    openRegionModal: () => { document.getElementById('region-modal').classList.add('active'); app.renderRegionStep1(); },
    closeRegionModal: () => document.getElementById('region-modal').classList.remove('active'),
    renderRegionStep1: () => {
        document.getElementById('modal-title').innerText = "勤務地を選択";
        document.getElementById('modal-body').innerHTML = `<div class="region-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">${REGIONS.map((r, i) => `<div class="btn btn-outline" style="flex-direction:column; padding:16px;" onclick="app.renderRegionStep2(${i})"><span style="font-size:24px;">${r.icon}</span><span>${r.name}</span></div>`).join('')}</div>`;
    },
    renderRegionStep2: (idx) => {
        const r = REGIONS[idx];
        document.getElementById('modal-title').innerText = r.name;
        document.getElementById('modal-body').innerHTML = `<div class="mb-4"><button class="btn btn-sm btn-outline" onclick="app.renderRegionStep1()">戻る</button></div><div class="pref-grid" style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px;">${r.prefs.map(p => `<div class="btn btn-outline btn-sm" onclick="app.selectPref('${p}')">${p}</div>`).join('')}</div>`;
    },
    selectPref: (p) => {
        app.closeRegionModal();
        if (app.state.page === 'top') document.getElementById('top-pref-display').innerHTML = `<span>📍 ${p}</span> <span style="color:var(--primary)">▼</span>`;
        else {
            app.state.filter.pref = p;
            document.getElementById('list-pref-display').innerText = p;
            app.updateFilterMulti();
        }
    },
    openConditionModal: () => { document.getElementById('condition-modal').classList.add('active'); app.renderConditionModalBody(); },
    renderConditionModalBody: () => {
        let tagsHtml = "";
        for (const [groupName, tags] of Object.entries(TAG_GROUPS)) {
            tagsHtml += `<p class="font-bold mb-2 mt-4" style="color:var(--text-sub); font-size:13px;">${groupName}</p><div class="checkbox-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">${tags.map(t => `<label class="checkbox-label" style="font-size:13px;"><input type="checkbox" name="top-tag" value="${t}"> ${t}</label>`).join('')}</div>`;
        }
        document.getElementById('condition-modal-body').innerHTML = `<p class="font-bold mb-2" style="color:var(--text-sub); font-size:13px;">職種</p><div class="checkbox-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">${ALL_CATEGORIES.map(c => `<label class="checkbox-label" style="font-size:13px;"><input type="checkbox" name="top-cat" value="${c.id}"> ${c.name}</label>`).join('')}</div>${tagsHtml}`;
    },
    closeConditionModal: () => {
        const cats = document.querySelectorAll('input[name="top-cat"]:checked').length;
        const tags = document.querySelectorAll('input[name="top-tag"]:checked').length;
        const total = cats + tags;
        const btn = document.getElementById('top-condition-btn');
        if(btn) btn.innerHTML = total > 0 ? `<span style="color:var(--primary); font-weight:bold;">${total}件選択中</span> <span style="color:var(--primary)">▼</span>` : `<span>🔍 職種・こだわり条件</span> <span style="color:var(--primary)">▼</span>`;
        document.getElementById('condition-modal').classList.remove('active');
    },

    back: ()=>{ app.router(app.state.page==='detail'?'list':'top'); },
    toast: (m) => { const e = document.getElementById('toast'); e.innerText = m; e.style.display = 'block'; setTimeout(() => e.style.display = 'none', 2000); }
};

window.app = app;
document.addEventListener('DOMContentLoaded', app.init);
