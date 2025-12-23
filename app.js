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
    let color = '#0056b3', icon = '🏭';
    if(['light','clean'].includes(catId)) { color = '#28a745'; icon = '📦'; }
    else if(['assembly','metal','press'].includes(catId)) { color = '#0056b3'; icon = '🔧'; }
    else if(['logistics','fork','driver'].includes(catId)) { color = '#ff9800'; icon = '🚜'; }
    else if(['food'].includes(catId)) { color = '#e91e63'; icon = '🍱'; }
    const svg = `<svg width="600" height="400" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="${color}" fill-opacity="0.1"/><text x="50%" y="55%" font-family="Arial" font-size="120" text-anchor="middle" dy=".3em">${icon}</text></svg>`;
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
            flow: "8:00〜17:00 (実働8h)",
            holidays: "土日休み（会社カレンダーによる）",
            benefits: "社会保険完備、有給休暇、制服貸与",
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
        headers.forEach((h, idx) => { job[h] = arr[i][idx] ? arr[i][idx].trim() : ''; });
        job.idNum = parseInt(job.id) || 0;
        job.salaryVal = parseInt(job.salary.replace(/[^0-9]/g, '')) || 1000;
        job.isNew = job.isNew === 'TRUE' || job.isNew === 'true';
        if(job.tags) job.tags = job.tags.split(/[\s|]+/).filter(t => t); else job.tags = [];
        jobs.push(job);
    }
    return jobs;
};

// --- App ---
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
            // Load based on URL initially
            const currentParams = new URLSearchParams(window.location.search);
            const currentId = currentParams.get('id');
            if(currentId) {
                app.router('detail', parseInt(currentId), false);
            } else {
                app.router(app.state.page || 'top', app.state.detailId, false);
            }
        });

        // Initialize Modals if not present
        if(!document.getElementById('condition-modal')) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="condition-modal" class="modal-overlay">
                    <div class="modal-content">
                        <div class="modal-header">
                            <span>詳細条件を設定</span>
                            <button class="modal-close" onclick="app.closeConditionModal()">×</button>
                        </div>
                        <div id="modal-active-chips" class="modal-chip-bar"></div>
                        <div class="modal-body" id="condition-modal-body"></div>
                        <div class="modal-footer">
                            <button class="btn btn-primary" onclick="app.closeConditionModal()">この条件で決定</button>
                        </div>
                    </div>
                </div>
            `);
        }
        if(!document.getElementById('region-modal')) {
            document.body.insertAdjacentHTML('beforeend', `
                <div id="region-modal" class="modal-overlay">
                    <div class="modal-content">
                        <div class="modal-header">
                            <span id="modal-title">勤務地を選択</span>
                            <button class="modal-close" onclick="window.app.closeRegionModal()">×</button>
                        </div>
                        <div class="modal-body" id="modal-body"></div>
                    </div>
                </div>
            `);
        }

        app.renderHeader();

        // ★★★ FIX: Initialize History State ★★★
        const initialParams = new URLSearchParams(window.location.search);
        const initialId = initialParams.get('id');
        const initialState = {
            page: initialId ? 'detail' : 'top',
            id: initialId ? parseInt(initialId) : null
        };
        window.history.replaceState(initialState, '', window.location.href);

        // Load Data
        if (GOOGLE_SHEET_CSV_URL) {
            try {
                const response = await fetch(GOOGLE_SHEET_CSV_URL);
                if (!response.ok) throw new Error('Network error');
                const text = await response.text();
                JOBS_DATA = parseCSV(text);
            } catch (e) {
                console.error("CSV Error:", e);
                JOBS_DATA = generateJobs(20);
            }
        }
        document.getElementById('loading-overlay').style.display = 'none';

        // ★★★ FIX: Strongest Popstate Handling ★★★
        // Assign directly to onpopstate to ensure priority and avoid conflicts
        window.onpopstate = (event) => {
            // Slight delay to allow browser to finish updating location
            setTimeout(() => {
                const params = new URLSearchParams(window.location.search);
                const id = params.get('id');
                
                // 1. Trust URL first
                if (id) {
                    app.router('detail', parseInt(id), false);
                    return;
                }

                // 2. Fallback to state or Top
                if (event.state && event.state.page) {
                    app.router(event.state.page, event.state.id, false);
                } else {
                    app.router('top', null, false);
                }
            }, 10);
        };
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
        }
        else if (pageName === 'detail') { container.innerHTML = ''; app.renderDetail(container, app.state.detailId); }
        else if (pageName === 'register' || pageName === 'login') { container.innerHTML = ''; app.renderAuthPage(container, pageName); }
        else if (pageName === 'form') { container.innerHTML = ''; app.renderForm(container); }
        else if (pageName === 'mypage') { container.innerHTML = ''; app.renderMypage(container); }
        else if (pageName === 'privacy') { container.innerHTML = ''; app.renderPrivacy(container); }
        else if (pageName === 'terms') { container.innerHTML = ''; app.renderTerms(container); }
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
            // Heart icon routes to mypage for guest keeps as well
            area.innerHTML = `<div class="header-btn-icon" onclick="app.router('mypage')"><span class="icon" style="color:#e91e63;">♥</span>キープ${badgeHtml}</div><span class="header-login-link" onclick="app.router('login')">ログイン</span><button class="btn-register-header" onclick="app.router('register')">無料会員登録</button>`;
        }
    },

    renderTop: (target) => {
        const newJobs = JOBS_DATA.slice(0, 5);
        target.innerHTML = `
            <div class="hero">
                <h1>工場・製造業の求人なら<br>工場ワークNAVi</h1>
                <p>全国からあなたにぴったりの職場を見つけよう！</p>
                <div class="search-box">
                    <div class="search-input-area">
                        <button class="search-input-btn" id="top-pref-display" onclick="app.openRegionModal()">勤務地を選択<span>▼</span></button>
                        <button class="search-input-btn" id="top-condition-btn" onclick="app.openConditionModal()">職種・こだわり条件を選択<span>▼</span></button>
                    </div>
                    <button class="btn-search" onclick="app.handleTopSearch()">検索</button>
                </div>
            </div>
            ${!app.state.user ? `<div class="benefit-area"><h3 class="text-center font-bold mb-4" style="color:var(--success-color);">＼ 会員登録でもっと便利に！ ／</h3><div class="benefit-grid"><div class="benefit-item"><span class="benefit-icon">㊙️</span>非公開求人<br>の閲覧</div><div class="benefit-item"><span class="benefit-icon">❤️</span>キープ機能<br>で比較</div><div class="benefit-item"><span class="benefit-icon">📝</span>Web履歴書<br>で即応募</div></div><button class="btn btn-register w-full" onclick="app.router('register')">最短1分！無料で会員登録する</button></div>` : ''}
            
            <div class="section-title">職種から探す</div>
            <div class="category-list">${TOP_CATEGORIES.map(c => `<div class="category-item" onclick="app.router('list', {fromTop: true, category: ['${c.id}']})"><span class="category-icon">${c.icon}</span> ${c.name}</div>`).join('')}</div>
            <div class="text-center mt-4 clearfix-container"><button class="btn-more-link" onclick="app.openConditionModal()">職種をもっと見る</button></div>
            
            <div class="section-title">人気のこだわり</div>
            <div class="tag-cloud">${TAG_GROUPS["給与・特典"].slice(0, 8).map(t => `<span class="tag-pill" onclick="app.router('list', {tag: ['${t}']})">${t}</span>`).join('')}</div>
            <div class="text-center mt-4 clearfix-container"><button class="btn-more-link" onclick="app.openConditionModal()">こだわりをもっと見る</button></div>
            
            <div class="section-title">新着求人</div>
            <div class="job-list">${newJobs.map(job => app.createJobCard(job)).join('')}</div>
            
            <div style="background:#fff; padding:30px 20px; text-align:center; border-top:1px solid #eee; margin-top:40px; padding-bottom: calc(30px + env(safe-area-inset-bottom));">
                <div style="font-size:12px; color:#666; margin-bottom:10px; display:flex; justify-content:center; gap:20px;">
                    <span style="cursor:pointer; text-decoration:underline;" onclick="app.router('terms')">利用規約</span>
                    <span style="cursor:pointer; text-decoration:underline;" onclick="app.router('privacy')">プライバシーポリシー</span>
                </div>
                <div style="font-size:11px; color:#999;">&copy; 工場ワーク NAVi</div>
            </div>
        `;
    },

    createJobCard: (job) => {
        const isKeep = app.state.user ? app.state.userKeeps.includes(String(job.id)) : app.state.guestKeeps.includes(String(job.id));
        return `
            <div class="job-card" onclick="app.router('detail', ${job.id})">
                <div style="position:relative;">
                    <img src="${getJobImage(job)}" class="job-card-img" loading="lazy">
                    <div class="keep-mark ${isKeep?'active':''} keep-btn-${job.id}" onclick="event.stopPropagation(); app.toggleKeep(${job.id})">♥</div>
                </div>
                <div class="job-card-body">
                    <div class="job-card-title">${job.title}</div>
                    <div class="job-info-row"><span style="margin-right:8px">💴</span><span class="salary-text">${job.salary}</span></div>
                    <div class="job-info-row"><span>📍</span> ${job.pref} &nbsp; <span>🏭</span> ${getCategoryName(job.category)}</div>
                    <div style="margin-top:8px;">${job.tags.slice(0,3).map(t => `<span class="tag">${t}</span>`).join('')}</div>
                    <div class="job-card-actions">
                        <button class="btn btn-outline btn-card" onclick="event.stopPropagation(); app.router('detail', ${job.id})">詳細</button>
                        <button class="btn btn-accent btn-card" onclick="event.stopPropagation(); app.router('detail', ${job.id}); setTimeout(()=>app.router('form'), 100);">応募する</button>
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
            if(app.state.page === 'mypage') app.renderMypage(document.getElementById('main-content'));
        }
    },

    handleTopSearch: () => {
        const prefText = document.getElementById('top-pref-display').innerText;
        const pref = prefText.includes('勤務地') ? '' : prefText.replace('▼','').replace('変更する >','').trim();
        const category = Array.from(document.querySelectorAll('input[name="top-cat"]:checked')).map(c => c.value);
        const tag = Array.from(document.querySelectorAll('input[name="top-tag"]:checked')).map(t => t.value);
        app.router('list', { fromTop: true, pref, category, tag });
    },

    renderList: (target) => {
        const { pref, sort, tag, category } = app.state.filter;
        const createChipsHtml = (p, cList, tList) => {
            let chips = [];
            if (p) chips.push(`<div class="filter-chip">📍 ${p} <div class="filter-chip-remove" onclick="event.stopPropagation(); app.removeFilter('pref', '${p}')">×</div></div>`);
            cList.forEach(c => chips.push(`<div class="filter-chip">🏭 ${getCategoryName(c)} <div class="filter-chip-remove" onclick="event.stopPropagation(); app.removeFilter('category', '${c}')">×</div></div>`));
            tList.forEach(t => chips.push(`<div class="filter-chip">🏷️ ${t} <div class="filter-chip-remove" onclick="event.stopPropagation(); app.removeFilter('tag', '${t}')">×</div></div>`));
            return chips.length > 0 ? `<div class="active-filter-area"><span class="active-filter-label">条件:</span>${chips.join('')}</div>` : '';
        };
        
        target.innerHTML = `
            <div class="page-header-simple"><button class="back-btn" onclick="app.router('top')">＜</button><div class="page-header-title">求人検索</div><div style="width:40px;"></div></div>
            <div class="sticky-search-header">
                <div class="filter-bar"><button class="filter-toggle-btn" onclick="app.openConditionModal()">⚡️ 条件を詳しく絞り込む</button></div>
                <div id="chip-container">${createChipsHtml(pref, category, tag)}</div>
            </div>
            <div class="sort-area"><div id="result-count" class="result-count"></div><select id="sort-order" style="border:none; color:#666;" onchange="app.updateFilterSingle('sort', this.value)"><option value="new">新着順</option><option value="salary">給与順</option></select></div>
            <div id="list-container" class="job-list"></div>
        `;
        document.getElementById('sort-order').value = sort;
        app.renderListItems();
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
        document.getElementById('result-count').innerHTML = `検索結果：<span>${res.length}</span>件`;
        container.innerHTML = res.length ? res.slice(0,50).map(job => app.createJobCard(job)).join('') : '<p class="text-center mt-4">該当する求人がありません</p>';
    },

    renderDetail: (target, id) => {
        const job = JOBS_DATA.find(j => String(j.id) === String(id));
        if (!job) return;
        const isKeep = app.state.user ? app.state.userKeeps.includes(String(job.id)) : app.state.guestKeeps.includes(String(job.id));
        const isApplied = app.state.user?.applied?.includes(String(job.id));
        
        target.innerHTML = `
            <div style="position:relative;">
                <button class="back-btn" style="position:absolute; top:10px; left:10px; background:rgba(255,255,255,0.8); border-radius:50%; z-index:10;" onclick="app.router('list')">＜</button>
                <img src="${getJobImage(job)}" class="detail-img-full">
            </div>
            <div class="detail-header">
                <div class="detail-tags">${job.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>
                <div class="detail-company">${job.company}</div>
                <div class="detail-title">${job.title}</div>
            </div>
            
            <div class="detail-tabs">
                <div class="detail-tab-item active" onclick="app.switchDetailTab(0)">募集要項</div>
                <div class="detail-tab-item" onclick="app.switchDetailTab(1)">特徴・選考</div>
            </div>

            <div class="detail-padding">
                <div id="tab-info" class="tab-content">
                    <div class="detail-summary-card">
                        <div class="summary-row"><span class="summary-icon">💴</span><span class="summary-val highlight">${job.salary}</span></div>
                        <div class="summary-row"><span class="summary-icon">📍</span><span class="summary-val">${job.pref}</span></div>
                        <div class="summary-row"><span class="summary-icon">🏭</span><span class="summary-val">${job.type}</span></div>
                    </div>
                    <div class="spec-header">仕事内容</div>
                    <div class="detail-description">${job.desc}</div>
                    
                    <div class="spec-header">募集要項</div>
                    <div class="spec-container">
                        <div class="spec-row"><div class="spec-label">給与</div><div class="spec-value">${job.salary}</div></div>
                        <div class="spec-row"><div class="spec-label">給与詳細</div><div class="spec-value">${job.monthlyIncome}${job.salarySupp ? '\n' + job.salarySupp : ''}</div></div>
                        <div class="spec-row"><div class="spec-label">交通費</div><div class="spec-value">${job.transport || '全額支給'}</div></div>
                        <div class="spec-row"><div class="spec-label">勤務地</div><div class="spec-value">${job.pref}</div></div>
                        <div class="spec-row"><div class="spec-label">最寄駅</div><div class="spec-value">${job.station || '-'}</div></div>
                        <div class="spec-row"><div class="spec-label">勤務時間</div><div class="spec-value">${job.flow}</div></div>
                        <div class="spec-row"><div class="spec-label">休日・休暇</div><div class="spec-value">${job.holidays || '-'}</div></div>
                        <div class="spec-row"><div class="spec-label">雇用形態</div><div class="spec-value">${job.type}</div></div>
                        <div class="spec-row"><div class="spec-label">応募資格</div><div class="spec-value">${job.qualifications || '未経験歓迎'}</div></div>
                    </div>
                </div>
                
                <div id="tab-feature" class="tab-content hidden">
                    <div class="spec-header">PRポイント</div>
                    <div class="detail-description">${job.points || '特にありません'}</div>
                    
                    <div class="spec-header">福利厚生</div>
                    <div class="detail-description">${job.benefits || '-'}</div>

                    <div class="spec-header">応募・選考</div>
                    <div class="spec-container">
                        <div class="spec-row"><div class="spec-label">応募方法</div><div class="spec-value">${job.apply_flow || '-'}</div></div>
                        <div class="spec-row"><div class="spec-label">選考期間</div><div class="spec-value">${job.process || '-'}</div></div>
                    </div>
                </div>
            </div>

            <div class="fixed-cta">
                <button class="btn-fav ${isKeep?'active':''} keep-btn-${job.id}" onclick="app.toggleKeep(${job.id})">♥</button>
                ${isApplied ? `<button class="btn-apply-lg" style="background:#ccc; box-shadow:none; cursor:default;">応募済み</button>` : `<button class="btn-apply-lg" onclick="app.router('form')">今すぐ応募する 🚀</button>`}
            </div>
        `;
    },

    switchDetailTab: (idx) => {
        document.querySelectorAll('.detail-tab-item').forEach((b, i) => b.classList.toggle('active', i === idx));
        document.querySelectorAll('.tab-content').forEach((p, i) => p.classList.toggle(i === idx ? 'hidden' : 'hidden', i !== idx));
        document.querySelectorAll('.tab-content')[idx].classList.remove('hidden');
    },

    renderForm: (target) => {
        const job = JOBS_DATA.find(j => String(j.id) === String(app.state.detailId));
        target.innerHTML = `
            <div class="page-header-simple"><button class="back-btn" onclick="app.back()">＜</button><div class="page-header-title">応募フォーム</div><div style="width:40px;"></div></div>
            <div style="padding:20px;">
                <p class="mb-4 font-bold">${job ? job.title : ''}</p>
                <div class="form-section">
                    <div class="form-section-title">応募者情報</div>
                    <div class="form-group"><label class="form-label">お名前<span class="req">必須</span></label><input type="text" id="inp-name" class="form-input" value="${app.state.user ? app.state.user.name : ''}"></div>
                    <div class="form-group"><label class="form-label">電話番号<span class="req">必須</span></label><input type="tel" id="inp-phone" class="form-input" value="${app.state.user ? app.state.user.tel || '' : ''}"></div>
                    <div class="form-group"><label class="form-label">メールアドレス</label><input type="email" id="inp-email" class="form-input" value="${app.state.user ? app.state.user.email : ''}"></div>
                </div>
                <button class="btn btn-accent w-full" onclick="app.submitForm()">上記の内容で応募する</button>
            </div>`;
    },

    submitForm: async () => {
        const nameEl = document.getElementById('inp-name');
        const phoneEl = document.getElementById('inp-phone');
        let isValid = true;

        [nameEl, phoneEl].forEach(el => el.classList.remove('input-error'));

        if (!nameEl.value.trim()) { nameEl.classList.add('input-error'); isValid = false; }
        if (!phoneEl.value.trim()) { phoneEl.classList.add('input-error'); isValid = false; }

        if (!isValid) { alert("未入力の必須項目があります"); return; }
        
        app.toast("送信中...");
        try {
            const jobId = String(app.state.detailId);
            const job = JOBS_DATA.find(j => String(j.id) === jobId);
            const uid = app.state.user ? app.state.user.uid : "guest";
            await addDoc(collection(db, "applications"), {
                jobId, jobTitle: job ? job.title : "Unknown", userId: uid,
                userName: nameEl.value, userPhone: phoneEl.value, createdAt: serverTimestamp()
            });
            if (app.state.user) await updateDoc(doc(db, "users", uid), { applied: arrayUnion(jobId) });
            alert("応募完了！"); app.router('list');
        } catch (e) { console.error(e); alert("エラー: " + e.message); }
    },

    renderMypage: (target) => {
        if (!app.state.user) {
            // Guest View (Keeps only)
            const keepJobs = JOBS_DATA.filter(j => app.state.guestKeeps.includes(String(j.id)));
            target.innerHTML = `
                <div class="mypage-header">
                    <h2 style="font-size:20px; font-weight:bold;">マイページ (ゲスト)</h2>
                    <p style="font-size:12px; margin-top:8px;">ログインすると応募履歴も確認できます</p>
                </div>
                <div style="padding:0 16px;">
                    <div class="mypage-tabs">
                        <div class="mypage-tab active">キープ中 (${keepJobs.length})</div>
                        <div class="mypage-tab" style="opacity:0.5;">応募履歴</div>
                    </div>
                    <div class="job-list">
                        ${keepJobs.length ? keepJobs.map(job => app.createJobCard(job)).join('') : '<p class="text-center mt-4">キープ中の求人はありません</p>'}
                    </div>
                </div>
                <div class="container" style="padding:20px; text-align:center;">
                    <button class="btn btn-primary" onclick="app.router('login')">ログインして機能を使う</button>
                </div>
            `;
        } else {
            // User View
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
            const yearOpts = Array.from({length: 50}, (_, i) => 2005 - i).map(y => `<option value="${y}">${y}年</option>`).join('');
            const monthOpts = Array.from({length: 12}, (_, i) => i + 1).map(m => `<option value="${m}">${m}月</option>`).join('');
            const dayOpts = Array.from({length: 31}, (_, i) => i + 1).map(d => `<option value="${d}">${d}日</option>`).join('');
            target.innerHTML = `
                <div class="page-header-simple"><button class="back-btn" onclick="app.router('top')">＜</button><div class="page-header-title">無料会員登録</div><div style="width:40px;"></div></div>
                <div class="container" style="padding:16px;">
                    <div class="form-section">
                        <div class="form-section-title">基本情報</div>
                        <div class="form-group"><label class="form-label">お名前<span class="req">必須</span></label><input id="reg-name" class="form-input" placeholder="例：工場 太郎"></div>
                        <div class="form-group"><label class="form-label">生年月日<span class="req">必須</span></label><div style="display:flex; gap:8px;"><select id="reg-year" class="form-input">${yearOpts}</select><select id="reg-month" class="form-input">${monthOpts}</select><select id="reg-day" class="form-input">${dayOpts}</select></div></div>
                        <div class="form-group"><label class="form-label">性別</label><div class="radio-group"><label class="radio-label"><input type="radio" name="gender" value="male" checked> 男性</label><label class="radio-label"><input type="radio" name="gender" value="female"> 女性</label></div></div>
                    </div>
                    <div class="form-section"><div class="form-section-title">連絡先・ログイン情報</div><div class="form-group"><label class="form-label">電話番号<span class="req">必須</span></label><input id="reg-tel" type="tel" class="form-input" placeholder="09012345678"></div><div class="form-group"><label class="form-label">メールアドレス<span class="req">必須</span></label><input id="reg-email" type="email" class="form-input" placeholder="sample@example.com"></div><div class="form-group"><label class="form-label">パスワード<span class="req">必須</span></label><input id="reg-pass" type="password" class="form-input" placeholder="8文字以上"></div></div>
                    <button class="btn btn-register w-full" onclick="app.validateAndRegister()">登録してはじめる</button>
                </div>`;
        }
    },

    validateAndRegister: () => {
        const reqIds = ['reg-name', 'reg-tel', 'reg-email', 'reg-pass'];
        let isValid = true;
        reqIds.forEach(id => {
            const el = document.getElementById(id);
            el.classList.remove('input-error');
            if(!el.value.trim()) { el.classList.add('input-error'); isValid = false; }
        });
        if(!isValid) { alert("未入力の必須項目があります"); return; }
        app.register(app.getRegisterData());
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
        app.renderList(document.getElementById('main-content'));
    },

    updateModalChips: () => {
        const cats = Array.from(document.querySelectorAll('input[name="top-cat"]:checked')).map(c => ({val: c.value, label: getCategoryName(c.value)}));
        const tags = Array.from(document.querySelectorAll('input[name="top-tag"]:checked')).map(t => ({val: t.value, label: t.value}));
        const container = document.getElementById('modal-active-chips');
        let html = '';
        cats.forEach(c => html += `<div class="filter-chip">🏭 ${c.label}</div>`);
        tags.forEach(t => html += `<div class="filter-chip">🏷️ ${t.label}</div>`);
        container.innerHTML = html;
    },

    openConditionModal: () => {
        const modal = document.getElementById('condition-modal');
        const body = document.getElementById('condition-modal-body');
        const currentCats = app.state.page === 'list' ? (app.state.filter.category || []) : [];
        const currentTags = app.state.page === 'list' ? (app.state.filter.tag || []) : [];
        
        let tagsHtml = "";
        for (const [groupName, tags] of Object.entries(TAG_GROUPS)) {
            tagsHtml += `<div class="cond-section"><div class="cond-head"><span class="cond-icon">🏷️</span>${groupName}</div><div class="cond-grid-modern">${tags.map(t => `<label class="check-btn"><input type="checkbox" name="top-tag" value="${t}" ${currentTags.includes(t)?'checked':''} onchange="app.updateModalChips()"><span>${t}</span></label>`).join('')}</div></div>`;
        }
        
        const currentPref = app.state.page === 'list' ? app.state.filter.pref : '';
        const prefHtml = `
            <div class="cond-section">
                <div class="cond-head"><span class="cond-icon">📍</span>都道府県</div>
                <div style="background:#f9f9f9; padding:12px; border-radius:8px; text-align:center; font-weight:bold; color:#555; cursor:pointer;" onclick="app.openRegionModal()">
                    ${currentPref || '選択されていません'} <span style="color:var(--primary-color); font-size:12px; margin-left:8px;">変更する ></span>
                </div>
            </div>
        `;

        body.innerHTML = `${prefHtml}<div class="cond-section"><div class="cond-head"><span class="cond-icon">🏭</span>職種</div><div class="cond-grid-modern">${ALL_CATEGORIES.map(c => `<label class="check-btn"><input type="checkbox" name="top-cat" value="${c.id}" ${currentCats.includes(c.id)?'checked':''} onchange="app.updateModalChips()"><span>${c.name}</span></label>`).join('')}</div></div>${tagsHtml}`;
        modal.classList.add('active');
        app.updateModalChips();
    },

    closeConditionModal: () => {
        const cats = Array.from(document.querySelectorAll('input[name="top-cat"]:checked')).map(c => c.value);
        const tags = Array.from(document.querySelectorAll('input[name="top-tag"]:checked')).map(t => t.value);
        if (app.state.page === 'top') {
            const btn = document.getElementById('top-condition-btn');
            if(btn) btn.innerHTML = (cats.length+tags.length) > 0 ? `<span>🔍 職種・こだわり (${cats.length+tags.length}件)</span> <span style="color:var(--primary-color)">▼</span>` : `<span>🔍 職種・こだわり条件</span> <span style="color:var(--primary-color)">▼</span>`;
        } else if (app.state.page === 'list') {
            app.state.filter.category = cats; app.state.filter.tag = tags;
            app.renderList(document.getElementById('main-content'));
        }
        document.getElementById('condition-modal').classList.remove('active');
    },

    updateFilterSingle: (key, val) => { app.state.filter[key] = val; app.renderListItems(); },
    
    openRegionModal: () => { 
        document.getElementById('region-modal').classList.add('active'); 
        app.renderRegionStep1(); 
    },
    closeRegionModal: () => document.getElementById('region-modal').classList.remove('active'),
    
    renderRegionStep1: () => { 
        document.getElementById('modal-title').innerText = "勤務地を選択"; 
        document.getElementById('modal-body').innerHTML = `<div class="region-grid">${REGIONS.map((r, i) => `<div class="region-btn" onclick="app.renderRegionStep2(${i})"><span class="icon">${r.icon}</span><span>${r.name}</span></div>`).join('')}</div>`; 
    },
    
    renderRegionStep2: (idx) => { 
        const r = REGIONS[idx]; 
        document.getElementById('modal-title').innerText = r.name; 
        document.getElementById('modal-body').innerHTML = `<div class="mb-4"><button class="btn btn-sm" onclick="app.renderRegionStep1()">戻る</button></div><div class="pref-grid">${r.prefs.map(p => `<div class="pref-item" onclick="app.selectPref('${p}')">${p}</div>`).join('')}</div>`; 
    },
    
    selectPref: (p) => {
        const condModal = document.getElementById('condition-modal');
        if(condModal && condModal.classList.contains('active')) {
            app.closeRegionModal();
            app.state.filter.pref = p;
            app.openConditionModal();
        } else {
            app.state.filter.pref = p;
            app.closeRegionModal();
            if (app.state.page === 'top') {
                const display = document.getElementById('top-pref-display');
                if(display) display.innerHTML = `<span>📍 ${p}</span> <span style="color:var(--primary-color)">▼</span>`;
            } else {
                app.renderList(document.getElementById('main-content'));
            }
        }
    },

    login: async (email, pass) => { app.toast("ログイン中..."); try { await signInWithEmailAndPassword(auth, email, pass); app.toast("ログインしました"); app.router('top'); } catch (error) { console.error(error); alert("ログイン失敗: " + error.message); } },
    logout: async () => { await signOut(auth); app.toast("ログアウトしました"); app.router('top'); },
    register: async (d) => { try { const u = await createUserWithEmailAndPassword(auth, d.email, d.password); await updateProfile(u.user, { displayName: d.name }); await setDoc(doc(db, "users", u.user.uid), { name: d.name, email: d.email, keeps: [], applied: [], createdAt: serverTimestamp() }); app.toast("登録完了！"); app.router('top'); } catch (e) { console.error(e); alert("登録エラー: " + e.message); } },
    getRegisterData: () => ({ name: document.getElementById('reg-name').value, email: document.getElementById('reg-email').value, password: document.getElementById('reg-pass').value }),
    
    // ★★★ FIX: Use history.back() correctly ★★★
    back: () => { 
        if(window.history.length > 1) {
            window.history.back();
        } else {
            app.router(app.state.page==='detail'?'list':'top');
        }
    },
    
    toast: (m) => { const e = document.getElementById('toast'); e.innerText = m; e.style.display = 'block'; setTimeout(() => e.style.display = 'none', 2000); }
};

window.app = app;
document.addEventListener('DOMContentLoaded', app.init);
