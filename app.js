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
const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSiFBtN5piQfnnlcUtP_2_fVQgRClTvhw-MSMTPUMozsx_6W3-XkHNSnwjU8pRM91SKO6MXxinfo42k/pub?gid=0&single=true&output=csv"; 
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzrRdK1TXUJlZll4AbgNAoU33X3JiMJek8Z8ZpQhALxBCC3T7nfnN211M7TeS7tTfVW/exec"; 

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

// --- Utils ---
const getJobImage = (job) => {
    if (job.image1 && job.image1.startsWith('http')) return job.image1;
    const catId = job.category;
    // 安心感のある青系ベース + ポップなアクセント
    let color = '#0056b3'; let icon = '🏭';
    if(['light','clean'].includes(catId)) { color = '#28a745'; icon = '📦'; }
    else if(['assembly','metal','press'].includes(catId)) { color = '#0056b3'; icon = '🔧'; }
    else if(['logistics','fork','driver'].includes(catId)) { color = '#ff9800'; icon = '🚜'; }
    else if(['food'].includes(catId)) { color = '#e91e63'; icon = '🍱'; }
    
    const svg = `<svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${color}" fill-opacity="0.1"/>
        <circle cx="300" cy="200" r="120" fill="${color}" fill-opacity="0.2"/>
        <text x="50%" y="55%" font-family="Arial" font-size="120" text-anchor="middle" dy=".3em">${icon}</text>
    </svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
};

const getCategoryName = (id) => {
    const c = ALL_CATEGORIES.find(x => x.id === id);
    return c ? c.name : id;
};

let JOBS_DATA = [];

// Data Generation & CSV Parsing
const generateJobs = (count) => {
    const data = [];
    for (let i = 1; i <= count; i++) {
        const pref = REGIONS.flatMap(r=>r.prefs)[Math.floor(Math.random() * 47)];
        const cat = ALL_CATEGORIES[Math.floor(Math.random() * ALL_CATEGORIES.length)];
        const hourly = 1000 + Math.floor(Math.random() * 15) * 100;
        data.push({
            id: i,
            title: `【${pref}】${cat.name}募集！${hourly >= 1600 ? '高時給案件' : '未経験OK'}`,
            company: `${pref}マニュファクチャリング ${i}工場`,
            pref: pref, category: cat.id, salaryVal: hourly,
            salary: `時給 ${hourly.toLocaleString()}円〜`,
            salarySupp: "入社祝い金あり",
            monthlyIncome: `${Math.floor(hourly * 168 / 10000)}万円〜`,
            tags: ["未経験OK", "寮完備", "高収入"].slice(0, Math.floor(Math.random()*3)+1),
            type: "派遣社員",
            isNew: i <= 10,
            desc: "簡単なマニュアル作業です。未経験でも安心。",
            flow: "8:00〜17:00",
            holidays: "土日休み",
            benefits: "社会保険完備",
            apply_flow: "応募→面接→採用",
            process: "最短3日で入社",
            points: "大手企業で安定して働けます。"
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

// ===============================================
// Application Logic
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
            if (param && param.openAdvanced) setTimeout(() => app.openConditionModal(), 100);
        }
        else if (pageName === 'detail') { container.innerHTML = ''; app.renderDetail(container, app.state.detailId); }
        else if (pageName === 'register' || pageName === 'login') { container.innerHTML = ''; app.renderAuthPage(container, pageName); }
        else if (pageName === 'form') { container.innerHTML = ''; app.renderForm(container); }
        else if (pageName === 'mypage') { container.innerHTML = ''; app.renderMypage(container); }
        else if (pageName === 'privacy') { container.innerHTML = ''; app.renderPrivacy(container); }
        else if (pageName === 'terms') { container.innerHTML = ''; app.renderTerms(container); }
    },

    // --- Render Functions ---

    renderHeader: () => {
        const area = document.getElementById('header-nav-area');
        const keepCount = app.state.user ? app.state.userKeeps.length : app.state.guestKeeps.length;
        const badgeHtml = keepCount > 0 ? `<div class="badge">${keepCount}</div>` : '';
        
        if (app.state.user) {
            area.innerHTML = `
                <button class="header-icon-btn" onclick="app.router('list', {openAdvanced: true})">🔍</button>
                <button class="header-icon-btn" onclick="app.router('mypage')">👤${badgeHtml}</button>
            `;
        } else {
            // 新規登録を目立たせる（Pulse Animation）
            area.innerHTML = `
                <button class="header-icon-btn" onclick="app.router('mypage')">♥${badgeHtml}</button>
                <button class="header-icon-btn" style="font-size:12px; font-weight:bold; margin-right:4px;" onclick="app.router('login')">ログイン</button>
                <button class="btn-header-reg" onclick="app.router('register')">無料登録</button>
            `;
        }
    },

    renderTop: (target) => {
        const newJobs = JOBS_DATA.slice(0, 5);
        target.innerHTML = `
            <div class="hero-pop">
                <h1 class="hero-title">工場・製造業の<br>お仕事探しならここ！</h1>
                <p class="hero-sub">高収入・寮完備・未経験OKなど多数</p>
                <div class="search-card">
                    <div class="search-input-dummy" id="top-pref-display" onclick="app.openRegionModal()">
                        <div><span class="icon">📍</span><span id="top-pref-text">勤務地を選択</span></div> <span>▼</span>
                    </div>
                    <div class="search-input-dummy" id="top-condition-btn" onclick="app.openConditionModal()">
                        <div><span class="icon">🔍</span><span>職種・こだわり条件</span></div> <span>▼</span>
                    </div>
                    <button class="btn btn-primary w-full" style="margin-top:10px; box-shadow:none;" onclick="app.handleTopSearch()">この条件で検索する</button>
                </div>
            </div>

            <div class="section-title"><span>職種から探す</span><button class="section-more" onclick="app.router('list', {fromTop: true, category: [], openAdvanced: true})">もっと見る ></button></div>
            <div class="category-scroll">
                ${TOP_CATEGORIES.map(c => `<div class="cat-card" onclick="app.router('list', {fromTop: true, category: ['${c.id}']})"><span class="cat-icon">${c.icon}</span><span class="cat-name">${c.name}</span></div>`).join('')}
            </div>

            <div class="section-title"><span>人気のキーワード</span></div>
            <div style="padding:0 20px; display:flex; flex-wrap:wrap; gap:8px;">
                ${TAG_GROUPS["給与・特典"].slice(0,6).map(t => `<span class="tag-pill" style="padding:8px 12px; font-size:12px; background:white; border:1px solid #ddd;" onclick="app.router('list', {fromTop: true, tag: ['${t}']})">${t}</span>`).join('')}
            </div>

            <div class="section-title"><span>新着の求人</span></div>
            <div class="job-list">
                ${newJobs.map(job => app.createJobCard(job)).join('')}
            </div>
            
            <div class="text-center mt-4 mb-4" style="padding:20px;">
                <button class="btn btn-outline w-full" onclick="app.router('list', {clear: true})">すべての求人を見る</button>
            </div>

            ${!app.state.user ? `
            <div style="margin:20px 16px; padding:24px; background:linear-gradient(135deg, #0056b3 0%, #004494 100%); border-radius:20px; color:white; text-align:center; box-shadow:0 10px 20px rgba(0, 86, 179, 0.3);">
                <div style="font-size:18px; font-weight:900; margin-bottom:10px;">会員登録でもっと便利に！</div>
                <p style="font-size:13px; opacity:0.9; margin-bottom:20px; font-weight:bold;">キープ機能・応募履歴・スカウト機能などが<br>すべて無料で利用できます。</p>
                <button class="btn-header-reg" style="font-size:14px; padding:12px 30px;" onclick="app.router('register')">最短1分！無料で会員登録</button>
            </div>` : ''}

            <div style="padding:40px 20px; text-align:center; font-size:11px; color:#999;">
                <span onclick="app.router('terms')" style="margin-right:15px; text-decoration:underline;">利用規約</span>
                <span onclick="app.router('privacy')" style="text-decoration:underline;">プライバシーポリシー</span>
                <div style="margin-top:10px;">&copy; KOJO WORK NAVI.</div>
            </div>
        `;
    },

    handleTopSearch: () => {
        const prefText = document.getElementById('top-pref-text').innerText;
        const pref = prefText === '勤務地を選択' ? '' : prefText;
        const category = Array.from(document.querySelectorAll('input[name="top-cat"]:checked')).map(c => c.value);
        const tag = Array.from(document.querySelectorAll('input[name="top-tag"]:checked')).map(t => t.value);
        app.router('list', { fromTop: true, pref, category, tag });
    },

    renderList: (target) => {
        const { pref, sort, tag, category } = app.state.filter;
        
        // Chips with fixed remove button
        const createChipsHtml = (p, cList, tList) => {
            let chips = [];
            if (p) chips.push(`<div class="filter-chip">📍 ${p} <div class="chip-remove" onclick="event.stopPropagation(); app.removeFilter('pref', '${p}')">×</div></div>`);
            cList.forEach(c => chips.push(`<div class="filter-chip">🏭 ${getCategoryName(c)} <div class="chip-remove" onclick="event.stopPropagation(); app.removeFilter('category', '${c}')">×</div></div>`));
            tList.forEach(t => chips.push(`<div class="filter-chip">🏷️ ${t} <div class="chip-remove" onclick="event.stopPropagation(); app.removeFilter('tag', '${t}')">×</div></div>`));
            return chips.length > 0 ? `<div class="chip-container" id="chip-container">${chips.join('')}</div>` : '';
        };

        target.innerHTML = `
            <div class="sticky-filter">
                <div style="display:flex; gap:10px;">
                    <button class="btn btn-outline w-full" style="padding:8px; font-size:13px;" onclick="app.openConditionModal()">⚡️ 詳細条件を変更</button>
                    <select id="sort-order" style="border:1px solid #ddd; border-radius:8px; padding:0 8px; font-size:12px;" onchange="app.updateFilterSingle('sort', this.value)">
                        <option value="new">新着順</option>
                        <option value="salary">給与順</option>
                    </select>
                </div>
                ${createChipsHtml(pref, category, tag)}
            </div>
            <div style="padding:10px 16px; font-size:13px; font-weight:bold; color:#666;" id="result-count"></div>
            <div id="list-container" class="job-list" style="padding-bottom:100px; padding-top:10px;"></div>
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
        document.getElementById('result-count').innerText = `検索結果：${res.length}件`;
        container.innerHTML = res.length ? res.slice(0,50).map(job => app.createJobCard(job)).join('') : '<p class="text-center mt-4" style="color:#666;">条件に一致する求人がありません</p>';
    },

    createJobCard: (job) => {
        const isKeep = app.state.user 
            ? app.state.userKeeps.includes(String(job.id))
            : app.state.guestKeeps.includes(String(job.id));
        const isApplied = app.state.user?.applied?.includes(String(job.id));

        return `
        <div class="job-card" onclick="app.router('detail', ${job.id})">
            <div class="job-img-area">
                <img src="${getJobImage(job)}" class="job-img" loading="lazy">
                <div class="job-keep-btn ${isKeep?'active':''} keep-btn-${job.id}" onclick="event.stopPropagation(); app.toggleKeep(${job.id})">♥</div>
            </div>
            <div class="job-body">
                <div class="job-tags">
                    ${job.isNew ? '<span class="tag-pill new">NEW</span>' : ''}
                    ${isApplied ? '<span class="tag-pill" style="background:#333; color:white;">応募済</span>' : ''}
                    ${job.tags.slice(0,3).map(t=>`<span class="tag-pill">${t}</span>`).join('')}
                </div>
                <div class="job-title">${job.title}</div>
                <div class="job-meta-row"><span>📍</span> ${job.pref}</div>
                <div class="job-meta-row"><span>💴</span> <span class="job-salary">${job.salary}</span></div>
                <button class="btn-detail-card">詳細を見る</button>
            </div>
        </div>
        `;
    },

    // ★★★ Detail Page with Restored Tabs & Content ★★★
    renderDetail: (target, id) => {
        const job = JOBS_DATA.find(j => String(j.id) === String(id));
        if (!job) return;
        const isKeep = app.state.user ? app.state.userKeeps.includes(String(job.id)) : app.state.guestKeeps.includes(String(job.id));
        const isApplied = app.state.user?.applied?.includes(String(job.id));

        target.innerHTML = `
            <div class="detail-hero">
                <div class="detail-back" onclick="app.router('list')">＜</div>
                <img src="${getJobImage(job)}" class="detail-img">
            </div>
            <div class="detail-header">
                <div class="detail-company">${job.company}</div>
                <h1 class="detail-main-title">${job.title}</h1>
                <div class="job-tags">${job.tags.map(t=>`<span class="tag-pill">${t}</span>`).join('')}</div>
            </div>

            <div class="detail-tabs">
                <div class="tab-btn active" onclick="app.switchDetailTab(0)">募集要項</div>
                <div class="tab-btn" onclick="app.switchDetailTab(1)">特徴・選考</div>
            </div>

            <div class="detail-content">
                <div id="tab-0" class="tab-pane active">
                    <div class="info-box">
                         <div class="info-row"><div class="info-label">給与</div><div class="info-val" style="color:var(--danger); font-weight:bold;">${job.salary}</div></div>
                         <div class="info-row"><div class="info-label">勤務地</div><div class="info-val">${job.pref}</div></div>
                         <div class="info-row"><div class="info-label">雇用形態</div><div class="info-val">${job.type}</div></div>
                    </div>
                    
                    <div class="feature-box">
                        <div class="feature-title">仕事内容</div>
                        <div class="feature-text">${job.desc}</div>
                    </div>

                    <div class="feature-title" style="margin-top:30px;">詳細情報</div>
                    <div class="info-box" style="background:white; border:none; padding:0;">
                        <div class="info-row"><div class="info-label">月収例</div><div class="info-val">${job.monthlyIncome}</div></div>
                        <div class="info-row"><div class="info-label">勤務時間</div><div class="info-val">${job.flow}</div></div>
                        <div class="info-row"><div class="info-label">休日休暇</div><div class="info-val">${job.holidays}</div></div>
                        <div class="info-row"><div class="info-label">待遇</div><div class="info-val">${job.benefits}</div></div>
                    </div>
                </div>

                <div id="tab-1" class="tab-pane">
                    <div class="feature-box">
                        <div class="feature-title">PRポイント</div>
                        <div class="feature-text">${job.points || '特にありません'}</div>
                    </div>
                    <div class="feature-box">
                        <div class="feature-title">応募・選考フロー</div>
                        <div class="info-box">
                            <div class="info-row"><div class="info-label">応募方法</div><div class="info-val">${job.apply_flow}</div></div>
                            <div class="info-row"><div class="info-label">選考期間</div><div class="info-val">${job.process}</div></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="fixed-cta">
                <button class="btn-fav-lg ${isKeep?'active':''} keep-btn-${job.id}" onclick="app.toggleKeep(${job.id})">♥</button>
                ${isApplied 
                    ? `<button class="btn btn-primary w-full" style="background:#ccc; box-shadow:none; cursor:default;">応募済み</button>`
                    : `<button class="btn btn-accent w-full" onclick="app.state.detailId=${job.id}; app.router('form')">応募画面へ進む 🚀</button>`
                }
            </div>
        `;
    },

    switchDetailTab: (idx) => {
        document.querySelectorAll('.tab-btn').forEach((b, i) => b.classList.toggle('active', i === idx));
        document.querySelectorAll('.tab-pane').forEach((p, i) => p.classList.toggle('active', i === idx));
    },

    // --- Filter Modal Logic (Improved Layout) ---
    openConditionModal: () => { document.getElementById('condition-modal').classList.add('active'); app.renderConditionModalBody(); },
    
    renderConditionModalBody: () => {
        const body = document.getElementById('condition-modal-body');
        const makeSection = (title, items, name) => `
            <div class="cond-section">
                <div class="cond-title">${title}</div>
                <div class="cond-grid">
                    ${items.map(i => {
                         const val = typeof i === 'object' ? i.id : i;
                         const label = typeof i === 'object' ? i.name : i;
                         const checked = (name === 'top-cat' && app.state.filter.category.includes(val)) || (name === 'top-tag' && app.state.filter.tag.includes(val)) ? 'checked' : '';
                         return `<label class="cond-check-label"><input type="checkbox" name="${name}" value="${val}" ${checked}> ${label}</label>`;
                    }).join('')}
                </div>
            </div>
        `;

        let html = makeSection('🏭 職種を選択', ALL_CATEGORIES, 'top-cat');
        for (const [group, tags] of Object.entries(TAG_GROUPS)) {
            html += makeSection(`🏷️ ${group}`, tags, 'top-tag');
        }
        body.innerHTML = html;
        document.querySelector('#condition-modal .modal-footer').innerHTML = `<button class="btn btn-primary w-full" onclick="app.applyConditionModal()">この条件で決定</button>`;
    },

    applyConditionModal: () => {
        const cats = Array.from(document.querySelectorAll('input[name="top-cat"]:checked')).map(c => c.value);
        const tags = Array.from(document.querySelectorAll('input[name="top-tag"]:checked')).map(c => c.value);
        
        if (app.state.page === 'top') {
             // For Top Page, just update UI text
             const total = cats.length + tags.length;
             const btn = document.getElementById('top-condition-btn');
             if(btn) btn.innerHTML = `<div><span class="icon">🔍</span><span>${total > 0 ? total + '件選択中' : '職種・こだわり条件'}</span></div><span>▼</span>`;
        } else {
             // For List Page, apply filter
             app.state.filter.category = cats;
             app.state.filter.tag = tags;
             app.renderList(document.getElementById('main-content'));
        }
        document.getElementById('condition-modal').classList.remove('active');
    },

    closeConditionModal: () => document.getElementById('condition-modal').classList.remove('active'),

    // --- Standard Actions ---
    updateFilterSingle: (key, val) => { app.state.filter[key] = val; app.renderListItems(); },
    removeFilter: (type, val) => {
        if(type==='pref') app.state.filter.pref = '';
        if(type==='category') app.state.filter.category = app.state.filter.category.filter(c=>c!==val);
        if(type==='tag') app.state.filter.tag = app.state.filter.tag.filter(t=>t!==val);
        app.renderList(document.getElementById('main-content'));
    },
    toggleKeep: async (id) => {
        const idStr = String(id);
        const currentKeeps = app.state.user ? app.state.userKeeps : app.state.guestKeeps;
        const newStatus = !currentKeeps.includes(idStr);
        document.querySelectorAll(`.keep-btn-${id}`).forEach(btn => btn.classList.toggle('active', newStatus));
        
        if (app.state.user) {
            if(newStatus) app.state.userKeeps.push(idStr); else app.state.userKeeps = app.state.userKeeps.filter(k=>k!==idStr);
            await updateDoc(doc(db, "users", app.state.user.uid), { keeps: newStatus ? arrayUnion(idStr) : arrayRemove(idStr) });
        } else {
            if(newStatus) app.state.guestKeeps.push(idStr); else app.state.guestKeeps = app.state.guestKeeps.filter(k=>k!==idStr);
            localStorage.setItem('factory_work_navi_guest_keeps', JSON.stringify(app.state.guestKeeps));
            app.renderHeader();
        }
    },
    
    // Auth & Form Placeholders (UI only)
    renderForm: (target) => { 
        target.innerHTML = `<div class="glass-header"><button class="header-icon-btn" onclick="app.back()">＜</button><div style="font-weight:bold;">応募フォーム</div><div></div></div><div style="padding:20px;"><div class="form-box">入力フォーム（省略）</div></div>`; 
    },
    renderAuthPage: (target, type) => {
        target.innerHTML = `<div class="glass-header"><button class="header-icon-btn" onclick="app.router('top')">＜</button><div style="font-weight:bold;">${type==='login'?'ログイン':'会員登録'}</div><div></div></div><div style="padding:20px;"><div class="form-box">${type==='login'?'ログインフォーム':'登録フォーム'}</div></div>`;
    },
    renderMypage: (target) => {
        target.innerHTML = `<div style="padding:20px; text-align:center;">マイページ（省略）<br><button class="btn btn-outline" onclick="app.router('top')">戻る</button></div>`;
    },
    back: ()=>{ app.router(app.state.page==='detail'?'list':'top'); },

    // Helpers
    openRegionModal: () => { document.getElementById('region-modal').classList.add('active'); app.renderRegionStep1(); },
    closeRegionModal: () => document.getElementById('region-modal').classList.remove('active'),
    renderRegionStep1: () => {
        document.getElementById('modal-body').innerHTML = `<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">${REGIONS.map((r, i) => `<div class="btn btn-outline" style="flex-direction:column; padding:15px;" onclick="app.renderRegionStep2(${i})"><span style="font-size:20px;">${r.icon}</span><span>${r.name}</span></div>`).join('')}</div>`;
    },
    renderRegionStep2: (idx) => {
        const r = REGIONS[idx];
        document.getElementById('modal-body').innerHTML = `<button class="btn btn-sm btn-outline mb-4" onclick="app.renderRegionStep1()">戻る</button><div style="display:grid; grid-template-columns:repeat(3,1fr); gap:8px;">${r.prefs.map(p => `<div class="btn btn-outline" style="padding:8px; font-size:12px;" onclick="app.selectPref('${p}')">${p}</div>`).join('')}</div>`;
    },
    selectPref: (p) => {
        app.closeRegionModal();
        if (app.state.page === 'top') {
             document.getElementById('top-pref-text').innerText = p;
        } else {
             app.state.filter.pref = p;
             app.renderList(document.getElementById('main-content'));
        }
    }
};

window.app = app;
document.addEventListener('DOMContentLoaded', app.init);
