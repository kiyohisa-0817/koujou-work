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

// ★★★ 設定済み (画像から読み取ったキー) ★★★
const firebaseConfig = {
    apiKey: "AIzaSyAFCTYH5-dRit6HCc9HVK82jeyz7T7BTrs",
    authDomain: "koujou-work-navi.firebaseapp.com",
    projectId: "koujou-work-navi",
    storageBucket: "koujou-work-navi.firebasestorage.app",
    messagingSenderId: "789923892236",
    appId: "1:789923892236:web:4a6586c835126cd3667229"
};

// Initialize Firebase
const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
const db = getFirestore(fbApp);

// ===============================================
// Config: GAS URL & CSV URL
// ===============================================
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzrRdK1TXUJlZll4AbgNAoU33X3JiMJek8Z8ZpQhALxBCC3T7nfnN211M7TeS7tTfVW/exec"; 
const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSiFBtN5piQfnnlcUtP_2_fVQgRClTvhw-MSMTPUMozsx_6W3-XkHNSnwjU8pRM91SKO6MXxinfo42k/pub?gid=0&single=true&output=csv"; 

// Constants
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

// ★★★ 変更：都道府県の並び順を北から南へ修正 ★★★
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
    let color = '#9C27B0', icon = '🏭';
    if(['light','clean'].includes(catId)) { color = '#4CAF50'; icon = '📦'; }
    else if(['assembly','metal','press','cast'].includes(catId)) { color = '#2196F3'; icon = '🔧'; }
    else if(['logistics','fork','driver'].includes(catId)) { color = '#FF9800'; icon = '🚜'; }
    else if(['operator','semicon','maintenance'].includes(catId)) { color = '#607D8B'; icon = '⚙️'; }
    else if(['food'].includes(catId)) { color = '#E91E63'; icon = '🍱'; }
    else if(['office','manage','cad','qa'].includes(catId)) { color = '#009688'; icon = '💻'; }
    const svg = `<svg width="600" height="400" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="${color}" fill-opacity="0.12"/><text x="50%" y="55%" font-family="Arial" font-size="120" text-anchor="middle" dy=".3em">${icon}</text></svg>`;
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
        const hasDorm = Math.random() > 0.4;
        if(hourly >= 1600 && !myTags.includes("高収入")) myTags.push("高収入");
        if(hasDorm && !myTags.includes("寮完備")) myTags.push("寮完備");
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
            dormDesc: hasDorm ? "家具家電付きワンルーム寮をご用意（即入寮可）" : "寮のご用意はありません",
            allowances: "交通費全額支給、残業手当あり",
            env: "20代〜50代まで幅広く活躍中。空調完備。",
            image1: "", image2: "", image3: "",
            industry: "自動車・輸送機器",
            transport: "交通費全額支給（規定あり）",
            station: `${pref}駅よりバス15分`,
            style: "立ち仕事、ライン作業",
            holidays: "土日休み（会社カレンダーによる）、GW、夏季、年末年始",
            qualifications: "未経験OK、学歴不問",
            points: "大手メーカーで安心！充実の研修制度あり。",
            apply_flow: "応募フォームより応募 → 面接（WEB可） → 採用",
            process: "最短3日で入社可能！",
            benefits: "社会保険完備、有給休暇、制服貸与"
        });
    }
    return data;
};

// Robust CSV Parser
const parseCSV = (text) => {
    const arr = [];
    let quote = false; 
    let col = 0, row = 0;

    for (let c = 0; c < text.length; c++) {
        let cc = text[c], nc = text[c+1];
        arr[row] = arr[row] || [];
        arr[row][col] = arr[row][col] || '';

        if (cc == '"') {
            if (quote && nc == '"') { arr[row][col] += cc; ++c; }
            else { quote = !quote; }
        }
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
        headers.forEach((h, idx) => {
            job[h] = arr[i][idx] ? arr[i][idx].trim() : '';
        });
        
        job.idNum = parseInt(job.id) || 0;
        job.salaryVal = parseInt(job.salary.replace(/[^0-9]/g, '')) || 1000;
        job.isNew = job.isNew === 'TRUE' || job.isNew === 'true';
        if(job.tags) job.tags = job.tags.split(/[\s|]+/).filter(t => t);
        else job.tags = [];
        
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
        
        // Load Guest Keeps
        const savedGuestKeeps = localStorage.getItem('factory_work_navi_guest_keeps');
        if (savedGuestKeeps) {
            app.state.guestKeeps = JSON.parse(savedGuestKeeps);
        }

        // Firebase Auth State
        onAuthStateChanged(auth, (user) => {
            if (user) {
                app.state.user = {
                    uid: user.uid,
                    email: user.email,
                    name: user.displayName || "ゲスト"
                };
                app.syncUserKeeps(user.uid);
            } else {
                app.state.user = null;
                app.state.userKeeps = [];
            }
            app.renderHeader();
            if(app.state.page) app.router(app.state.page, app.state.detailId, false);
        });

        if(!document.getElementById('condition-modal')) {
            const modalHtml = `
                <div id="condition-modal" class="modal-overlay">
                    <div class="modal-content">
                        <div class="modal-header">
                            <span>詳細条件を設定</span>
                            <button class="modal-close" onclick="app.closeConditionModal()">×</button>
                        </div>
                        <div class="modal-body" id="condition-modal-body"></div>
                        <div class="modal-footer">
                            <button class="btn btn-primary" onclick="app.closeConditionModal()">この条件で決定</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }

        app.renderHeader();

        // Data Loading
        if (GOOGLE_SHEET_CSV_URL) {
            try {
                const response = await fetch(GOOGLE_SHEET_CSV_URL);
                if (!response.ok) throw new Error('Network response error');
                const text = await response.text();
                
                JOBS_DATA = parseCSV(text);
            } catch (e) {
                console.error("CSV Load Error:", e);
                JOBS_DATA = generateJobs(20);
            }
        }

        document.getElementById('loading-overlay').style.display = 'none';

        // URL Check
        const urlParams = new URLSearchParams(window.location.search);
        const urlId = urlParams.get('id');

        if (urlId) {
            app.state.detailId = parseInt(urlId);
            app.router('detail', app.state.detailId, false);
        } else {
            app.router(app.state.page || 'top', app.state.detailId, false);
        }

        // ★★★ 修正：「戻る」ボタンの挙動（popstate）をリロードではなく再描画に変更 ★★★
        window.addEventListener('popstate', (event) => {
            const currentParams = new URLSearchParams(window.location.search);
            const currentId = currentParams.get('id');
            
            if (currentId) {
                // URLにIDがある場合は詳細ページへ
                app.state.detailId = parseInt(currentId);
                app.router('detail', app.state.detailId, false);
            } else {
                // IDがない場合（履歴の状態stateがあればそれに従う、なければトップへ）
                if (event.state && event.state.page) {
                     app.router(event.state.page, event.state.id, false);
                } else {
                     app.router('top', null, false);
                }
            }
        });
    },

    syncUserKeeps: (uid) => {
        const userRef = doc(db, "users", uid);
        onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                app.state.userKeeps = data.keeps || [];
                if(data.applied) {
                    if(!app.state.user.applied) app.state.user.applied = [];
                    app.state.user.applied = data.applied;
                }
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
        if (pageName === 'detail') window.scrollTo(0, 0);
        else if (pageName === 'list' && param && param.fromTop) window.scrollTo(0, 0);
        else if (pageName !== 'detail' && pageName !== app.state.page) window.scrollTo(0, 0);

        app.state.page = pageName;
        if(pageName === 'detail') app.state.detailId = param;
        app.saveState();

        if (addHistory) {
            if (pageName === 'detail' && param) {
                const newUrl = `${window.location.pathname}?id=${param}`;
                window.history.pushState({page: pageName, id: param}, '', newUrl);
            } else {
                const newUrl = window.location.pathname;
                window.history.pushState({page: pageName}, '', newUrl);
            }
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
            if (param && param.openAdvanced) {
                setTimeout(() => app.toggleAdvancedSearch(true), 50);
            }
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
        const keepCount = app.state.user ? app.state.userKeeps.length : app.state.guestKeeps.length;
        const badgeHtml = keepCount > 0 ? `<span class="header-badge">${keepCount}</span>` : '';
        if (app.state.user) {
            area.innerHTML = `<div class="header-btn-icon" onclick="app.router('mypage')"><span class="icon">👤</span>マイページ${badgeHtml}</div><div class="header-btn-icon" onclick="app.router('list', {openAdvanced: true})"><span class="icon">🔍</span>さがす</div>`;
        } else {
            area.innerHTML = `<div class="header-btn-icon" onclick="app.router('mypage')"><span class="icon" style="color:#e91e63;">♥</span>キープ${badgeHtml}</div><span class="header-login-link" onclick="app.router('login')">ログイン</span><button class="btn-register-header" onclick="app.router('register')">無料会員登録</button>`;
        }
    },

    login: async (email, pass) => {
        app.toast("ログイン中...");
        try {
            await signInWithEmailAndPassword(auth, email, pass);
            app.toast("ログインしました");
            app.router('top');
        } catch (error) {
            console.error(error);
            alert("ログインに失敗しました: " + error.message);
        }
    },

    logout: async () => {
        await signOut(auth);
        app.toast("ログアウトしました");
        app.router('top');
    },

    register: async (userData) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
            const user = userCredential.user;
            await updateProfile(user, { displayName: userData.name });
            
            await setDoc(doc(db, "users", user.uid), {
                name: userData.name,
                email: userData.email,
                keeps: [],
                applied: [],
                createdAt: serverTimestamp()
            });

            if (GOOGLE_APPS_SCRIPT_URL && GOOGLE_APPS_SCRIPT_URL.startsWith('http')) {
                const formData = new FormData();
                formData.append('type', 'register');
                formData.append('name', userData.name);
                formData.append('email', userData.email);
                formData.append('password', userData.password); 
                formData.append('gender', userData.gender || '-');
                formData.append('pref', userData.pref || '-');
                formData.append('status', userData.status || '-');
                formData.append('tel', userData.tel || '-');

                fetch(GOOGLE_APPS_SCRIPT_URL, {
                    method: 'POST', mode: 'no-cors', body: formData
                }).catch(e => console.log("GAS Error:", e));
            }

            app.toast("登録完了しました！");
            app.router('top');
        } catch (error) {
            console.error(error);
            alert("登録エラー: " + error.message);
        }
    },

    submitForm: async () => {
        const name = document.getElementById('inp-name').value;
        const phone = document.getElementById('inp-phone').value;
        const email = document.getElementById('inp-email').value;
        
        if (!name || !phone) { alert("お名前と電話番号は必須です"); return; }
        
        app.toast("送信中...");

        try {
            const jobId = String(app.state.detailId);
            const job = JOBS_DATA.find(j => String(j.id) === jobId);
            const jobTitle = job ? job.title : "不明な求人";
            const uid = app.state.user ? app.state.user.uid : "guest";
            const memberType = app.state.user ? "会員" : "ゲスト";

            await addDoc(collection(db, "applications"), {
                jobId: jobId,
                jobTitle: jobTitle,
                userId: uid,
                memberType: memberType, 
                userName: name,
                userPhone: phone,
                userEmail: email,
                status: "unconfirmed",
                createdAt: serverTimestamp()
            });

            if (app.state.user) {
                const userRef = doc(db, "users", uid);
                await updateDoc(userRef, { applied: arrayUnion(jobId) });
            }

            if (GOOGLE_APPS_SCRIPT_URL && GOOGLE_APPS_SCRIPT_URL.startsWith('http')) {
                const formData = new FormData();
                formData.append('type', 'apply');
                formData.append('jobId', jobId);
                formData.append('jobTitle', jobTitle);
                formData.append('memberType', memberType); 
                formData.append('userName', name);
                formData.append('userPhone', phone);
                formData.append('userEmail', email);
                
                fetch(GOOGLE_APPS_SCRIPT_URL, {
                    method: 'POST', mode: 'no-cors', body: formData
                }).catch(e => console.log("GAS Error:", e));
            }

            alert("応募が完了しました！\n企業からの連絡をお待ちください。");
            app.router('list');

        } catch (e) {
            console.error(e);
            alert("エラーが発生しました: " + e.message);
        }
    },

    toggleKeep: async (id) => {
        const idStr = String(id);
        const currentKeeps = app.state.user ? app.state.userKeeps : app.state.guestKeeps;
        const isKept = currentKeeps.includes(idStr);
        const newStatus = !isKept;

        const btns = document.querySelectorAll(`.keep-btn-${id}`);
        btns.forEach(btn => {
            if(newStatus) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        if (app.state.user) {
            const userRef = doc(db, "users", app.state.user.uid);
            if(newStatus) app.state.userKeeps.push(idStr);
            else app.state.userKeeps = app.state.userKeeps.filter(k => k !== idStr);

            if (!newStatus) {
                await updateDoc(userRef, { keeps: arrayRemove(idStr) });
            } else {
                await updateDoc(userRef, { keeps: arrayUnion(idStr) });
            }
        } 
        else {
            if (newStatus) {
                app.state.guestKeeps.push(idStr);
            } else {
                app.state.guestKeeps = app.state.guestKeeps.filter(k => k !== idStr);
            }
            localStorage.setItem('factory_work_navi_guest_keeps', JSON.stringify(app.state.guestKeeps));
            
            app.renderHeader();
            if(app.state.page === 'mypage') app.renderMypage(document.getElementById('main-content'));
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
            <div class="mypage-header">
                <div class="mypage-user-name">${userName}</div>
                ${app.state.user ? `<div class="mypage-logout" onclick="app.logout()">ログアウト</div>` : `<div class="mypage-logout" onclick="app.router('login')">ログインして保存する</div>`}
            </div>
            <div style="padding:0 16px;">
                <div class="mypage-tabs">
                    <div class="mypage-tab ${currentTab === 'keep' ? 'active' : ''}" onclick="app.switchMypageTab('keep')">キープした求人</div>
                    <div class="mypage-tab ${currentTab === 'applied' ? 'active' : ''}" onclick="app.switchMypageTab('applied')">応募済みの求人</div>
                </div>
                <div class="job-list">${contentHtml}</div>
            </div>
        `;
    },

    switchMypageTab: (tabName) => {
        app.state.mypageTab = tabName;
        app.renderMypage(document.getElementById('main-content'));
    },

    renderTop: (target) => {
        const newJobs = JOBS_DATA.slice(0, 5);
        target.innerHTML = `
            <div class="hero">
                <h1>工場・製造業の求人なら<br>工場ワークナビ</h1>
                <p>全国からあなたにぴったりの職場を見つけよう！</p>
                <div class="search-box">
                    <div class="search-input-area">
                        <button class="search-input-btn" id="top-pref-display" onclick="app.openRegionModal()">勤務地を選択</button>
                        <button class="search-input-btn" id="top-condition-btn" onclick="app.openConditionModal()">職種・こだわり条件を選択</button>
                    </div>
                    <button class="btn-search" onclick="app.handleTopSearch()">検索</button>
                </div>
            </div>
            ${!app.state.user ? `<div class="benefit-area"><h3 class="text-center font-bold mb-4" style="color:var(--success-color);">＼ 会員登録でもっと便利に！ ／</h3><div class="benefit-grid"><div class="benefit-item"><span class="benefit-icon">㊙️</span>非公開求人<br>の閲覧</div><div class="benefit-item"><span class="benefit-icon">❤️</span>キープ機能<br>で比較</div><div class="benefit-item"><span class="benefit-icon">📝</span>Web履歴書<br>で即応募</div></div><button class="btn btn-register w-full" onclick="app.router('register')">最短1分！無料で会員登録する</button></div>` : ''}
            <div class="section-title">職種から探す</div>
            <div class="category-list">${TOP_CATEGORIES.map(c => `<div class="category-item" onclick="app.router('list', {fromTop: true, category: ['${c.id}'], openAdvanced: true})"><span class="category-icon">${c.icon}</span> ${c.name}</div>`).join('')}</div>
            <div class="text-center mt-4"><button class="btn-more-link" onclick="app.router('list', {openAdvanced: true, fromTop: true, category: []})">職種をもっと見る</button></div>
            <div style="clear:both;"></div>
            <div class="section-title">人気のこだわり</div>
            <div class="tag-cloud">${TAG_GROUPS["給与・特典"].slice(0, 8).map(t => `<span class="tag-pill" onclick="app.router('list', {fromTop: true, tag: ['${t}'], openAdvanced: true})">${t}</span>`).join('')}</div>
            <div class="text-center mt-4"><button class="btn-more-link" onclick="app.router('list', {openAdvanced: true, fromTop: true, tag: []})">こだわりをもっと見る</button></div>
            <div style="clear:both;"></div>
            <div class="section-title">新着求人</div>
            <div class="job-list">${newJobs.map(job => app.createJobCard(job)).join('')}</div>
            <div class="text-center mt-4 mb-4"><button class="btn btn-outline" style="width:90%" onclick="app.router('list', {clear: true})">すべての求人を見る</button></div>

            <div style="background:#fff; padding:30px 20px; text-align:center; border-top:1px solid #eee; margin-top:20px; padding-bottom: calc(30px + env(safe-area-inset-bottom));">
                <div style="font-size:12px; color:#666; margin-bottom:10px; display:flex; justify-content:center; gap:20px;">
                    <span style="cursor:pointer; text-decoration:underline;" onclick="app.router('terms')">利用規約</span>
                    <span style="cursor:pointer; text-decoration:underline;" onclick="app.router('privacy')">プライバシーポリシー</span>
                </div>
                <div style="font-size:11px; color:#999;">&copy; 株式会社Re.ACT</div>
            </div>
        `;
    },

    handleTopSearch: () => {
        const pref = document.getElementById('top-pref-display').innerText;
        const category = Array.from(document.querySelectorAll('input[name="top-cat"]:checked')).map(c => c.value);
        const tag = Array.from(document.querySelectorAll('input[name="top-tag"]:checked')).map(t => t.value);
        app.router('list', { fromTop: true, pref: pref === '勤務地を選択' ? '' : pref, category, tag });
    },

    renderList: (target) => {
        const { pref, sort, tag, category } = app.state.filter;
        const createChipsHtml = (p, cList, tList) => {
            let chips = [];
            if (p) chips.push(`<div class="filter-chip">📍 ${p} <div class="filter-chip-remove" onclick="app.removeFilter('pref', '${p}')">×</div></div>`);
            cList.forEach(c => chips.push(`<div class="filter-chip">🏭 ${getCategoryName(c)} <div class="filter-chip-remove" onclick="app.removeFilter('category', '${c}')">×</div></div>`));
            tList.forEach(t => chips.push(`<div class="filter-chip">🏷️ ${t} <div class="filter-chip-remove" onclick="app.removeFilter('tag', '${t}')">×</div></div>`));
            return chips.length > 0 ? `<div class="active-filter-area"><span class="active-filter-label">条件:</span>${chips.join('')}</div>` : '';
        };
        let tagsHtml = "";
        for (const [groupName, tags] of Object.entries(TAG_GROUPS)) {
            tagsHtml += `<div class="search-group-title">${groupName}</div><div class="checkbox-grid">${tags.map(t => `<label class="checkbox-label"><input type="checkbox" name="tag" value="${t}" ${tag.includes(t)?'checked':''} onchange="app.updateFilterMulti()"> ${t}</label>`).join('')}</div>`;
        }
        
        target.innerHTML = `
            <div class="page-header-simple">
                <button class="back-btn" onclick="app.router('top')">＜</button>
                <div class="page-header-title" style="margin-right:0;">求人検索</div>
                <div style="width:40px;"></div>
            </div>
            <div class="sticky-search-header">
                <div class="filter-bar">
                    <button class="filter-toggle-btn" onclick="app.toggleAdvancedSearch()">⚡️ 条件を詳しく絞り込む</button>
                </div>
                <div id="chip-container">${createChipsHtml(pref, category, tag)}</div>
            </div>
            <div id="advanced-search" class="advanced-search-panel">
                <div class="mb-4"><p class="font-bold mb-2" style="font-size:14px; color:var(--primary-color);">都道府県</p><div class="search-input-mock" onclick="app.openRegionModal()" id="list-pref-display">${pref || '指定なし'}</div></div>
                <p class="font-bold mb-2" style="font-size:14px; color:var(--primary-color);">職種</p><div class="checkbox-grid">${ALL_CATEGORIES.map(c => `<label class="checkbox-label"><input type="checkbox" name="cat" value="${c.id}" ${category.includes(c.id)?'checked':''} onchange="app.updateFilterMulti()"> ${c.name}</label>`).join('')}</div>
                <p class="font-bold mb-2 mt-4" style="font-size:14px; color:var(--primary-color);">こだわり条件</p>
                ${tagsHtml}
                <div class="apply-btn-wrapper"><button class="btn btn-accent w-full" style="padding:16px;" onclick="app.toggleAdvancedSearch(false)">この条件で検索 (<span id="btn-count">0</span>件)</button></div>
            </div>
            <div class="sort-area" style="padding: 10px 16px; background:#fff;"><div id="result-count" class="result-count"></div><select id="sort-order" style="border:none; color:#666; font-size:12px;" onchange="app.updateFilterSingle('sort', this.value)"><option value="new">新着順</option><option value="salary">給与順</option></select></div>
            <div id="list-container" class="job-list"></div>
        `;
        document.getElementById('sort-order').value = sort;
        app.renderListItems();
    },

    // ★★★ 追加：ソート機能用のフィルター更新関数 ★★★
    updateFilterSingle: (key, val) => {
        app.state.filter[key] = val;
        app.renderListItems();
    },

    updateFilterMulti: () => {
        app.state.filter.category = Array.from(document.querySelectorAll('input[name="cat"]:checked')).map(c=>c.value);
        app.state.filter.tag = Array.from(document.querySelectorAll('input[name="tag"]:checked')).map(c=>c.value);
        app.renderListItems();
        
        const { pref, category, tag } = app.state.filter;
        let chips = [];
        if (pref) chips.push(`<div class="filter-chip">📍 ${pref} <div class="filter-chip-remove" onclick="app.removeFilter('pref', '${pref}')">×</div></div>`);
        category.forEach(c => chips.push(`<div class="filter-chip">🏭 ${getCategoryName(c)} <div class="filter-chip-remove" onclick="app.removeFilter('category', '${c}')">×</div></div>`));
        tag.forEach(t => chips.push(`<div class="filter-chip">🏷️ ${t} <div class="filter-chip-remove" onclick="app.removeFilter('tag', '${t}')">×</div></div>`));
        
        const chipContainer = document.getElementById('chip-container');
        if(chipContainer) {
            chipContainer.innerHTML = chips.length > 0 ? `<div class="active-filter-area"><span class="active-filter-label">条件:</span>${chips.join('')}</div>` : '';
        }
    },

    renderListItems: () => {
        const container = document.getElementById('list-container');
        const btnCount = document.getElementById('btn-count');
        const { pref, tag, category, sort } = app.state.filter;
        let res = JOBS_DATA.filter(j => {
            if (pref && j.pref !== pref) return false;
            if (tag.length > 0 && !tag.every(t => j.tags.includes(t))) return false;
            if (category.length > 0 && !category.includes(j.category)) return false;
            return true;
        });
        if(sort==='salary') res.sort((a,b)=>b.salaryVal-a.salaryVal); else res.sort((a,b)=>b.idNum-a.idNum);
        document.getElementById('result-count').innerHTML = `検索結果：<span>${res.length}</span>件`;
        if(btnCount) btnCount.innerText = res.length;
        container.innerHTML = res.length ? res.slice(0,50).map(job => app.createJobCard(job)).join('') : '<p class="text-center mt-4">該当する求人がありません</p>';
    },

    createJobCard: (job) => {
        const isKeep = app.state.user 
            ? app.state.userKeeps.includes(String(job.id))
            : app.state.guestKeeps.includes(String(job.id));
        const isApplied = app.state.user?.applied?.includes(String(job.id));
        
        return `<div class="job-card" onclick="app.router('detail', ${job.id})">
            <div class="keep-mark ${isKeep?'active':''} keep-btn-${job.id}" onclick="event.stopPropagation(); app.toggleKeep(${job.id})">♥</div>
            <img src="${getJobImage(job)}" class="job-card-img">
            <div class="job-card-body">
                <div class="job-card-title">${job.title}</div>
                <div class="mb-2">${job.isNew?'<span class="tag new">NEW</span>':''}${isApplied?'<span class="tag applied">応募済み</span>':''}${job.tags.slice(0,4).map(t=>`<span class="tag">${t}</span>`).join('')}</div>
                <div class="job-info-row">📍 ${job.pref}</div>
                <div class="job-info-row">💴 <span class="salary-text">${job.salary}</span></div>
            </div>
            <div class="card-actions">
                <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); app.router('detail', ${job.id})">詳細</button>
                ${isApplied ? `<button class="btn btn-disabled btn-sm">応募済み</button>` : `<button class="btn btn-accent btn-sm" onclick="event.stopPropagation(); app.state.detailId=${job.id}; app.router('form')">応募</button>`}
            </div>
        </div>`;
    },

    renderDetail: (target, id) => {
        const job = JOBS_DATA.find(j => String(j.id) === String(id));
        if (!job) return;
        const isKeep = app.state.user 
            ? app.state.userKeeps.includes(String(job.id))
            : app.state.guestKeeps.includes(String(job.id));
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
                <div class="detail-tab-item active" onclick="app.switchDetailTab('info')">募集要項</div>
                <div class="detail-tab-item" onclick="app.switchDetailTab('feature')">特徴・選考</div>
            </div>

            <div class="detail-padding">
                <div id="tab-info" class="tab-content">
                    <div class="detail-summary-card">
                        <div class="summary-row"><div class="summary-icon">💴</div><div class="summary-val highlight">${job.salary}</div></div>
                        <div class="summary-row"><div class="summary-icon">📍</div><div class="summary-val">${job.pref}</div></div>
                        <div class="summary-row"><div class="summary-icon">🏭</div><div class="summary-val">${job.type}</div></div>
                    </div>
                    <div class="detail-section-title">仕事内容</div>
                    <div class="detail-text">${job.desc}</div>
                    <div class="detail-section-title">募集要項</div>
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">💰 給与</div>
                            <div class="info-value">${job.salary}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">💴 給与例・補足</div>
                            <div class="info-value">${job.monthlyIncome}${job.salarySupp ? '\n' + job.salarySupp : ''}</div>
                        </div>
                        <div class="info-item"><div class="info-label">🚌 交通費</div><div class="info-value">${job.transport || '-'}</div></div>
                        <div class="info-item"><div class="info-label">📍 勤務地</div><div class="info-value">${job.pref}</div></div>
                        <div class="info-item"><div class="info-label">🚉 最寄駅</div><div class="info-value">${job.station || '-'}</div></div>
                        <div class="info-item"><div class="info-label">🏭 雇用形態</div><div class="info-value">${job.type}</div></div>
                        <div class="info-item"><div class="info-label">⏱️ 勤務時間</div><div class="info-value">${job.flow}</div></div>
                        <div class="info-item"><div class="info-label">👕 勤務スタイル</div><div class="info-value">${job.style || '-'}</div></div>
                        <div class="info-item"><div class="info-label">📅 休日・休暇</div><div class="info-value">${job.holidays || '-'}</div></div>
                        <div class="info-item"><div class="info-label">🔰 応募資格</div><div class="info-value">${job.qualifications || '-'}</div></div>
                    </div>
                </div>
                
                <div id="tab-feature" class="tab-content hidden">
                    <div class="detail-section-title">おすすめポイント</div>
                    <div class="detail-text">${job.points || '特になし'}</div>
                    
                    <div class="detail-section-title">応募・選考について</div>
                    <div class="info-grid">
                        <div class="info-item"><div class="info-label">📝 応募方法</div><div class="info-value">${job.apply_flow || '-'}</div></div>
                        <div class="info-item"><div class="info-label">🔄 選考プロセス</div><div class="info-value">${job.process || '-'}</div></div>
                    </div>

                    <div class="detail-section-title">福利厚生</div>
                    <div class="detail-text">${job.benefits || '-'}</div>
                </div>
            </div>

            <div class="fixed-cta">
                <button class="btn-fav ${isKeep?'active':''} keep-btn-${job.id}" onclick="app.toggleKeep(${job.id})">♥</button>
                ${isApplied ? `<button class="btn-apply-lg" style="background:#ccc; box-shadow:none; cursor:default;">応募済み</button>` : `<button class="btn-apply-lg" onclick="app.router('form')">今すぐ応募する <span style="font-size:20px;">🚀</span></button>`}
            </div>
        `;
    },

    switchDetailTab: (tabName) => {
        document.querySelectorAll('.detail-tab-item').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
        
        if (tabName === 'info') {
            document.querySelector('.detail-tab-item:nth-child(1)').classList.add('active');
            document.getElementById('tab-info').classList.remove('hidden');
        } else {
            document.querySelector('.detail-tab-item:nth-child(2)').classList.add('active');
            document.getElementById('tab-feature').classList.remove('hidden');
        }
    },

    renderForm: (target) => {
        const job = JOBS_DATA.find(j => String(j.id) === String(app.state.detailId));
        target.innerHTML = `
            <div class="page-header-simple">
                <button class="back-btn" onclick="app.back()">＜</button>
                <div class="page-header-title">応募フォーム</div><div style="width:40px;"></div>
            </div>
            <div style="padding:16px;">
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
                    <div class="step-bar"><div class="step-item active"><div class="step-circle">1</div>入力</div><div class="step-item"><div class="step-circle">2</div>確認</div><div class="step-item"><div class="step-circle">3</div>完了</div></div>
                    <div class="form-section">
                        <div class="form-section-title">基本情報</div>
                        <div class="form-group"><label class="form-label">お名前<span class="req">必須</span></label><input id="reg-name" class="form-input" placeholder="例：工場 太郎"></div>
                        <div class="form-group"><label class="form-label">生年月日<span class="req">必須</span></label><div style="display:flex; gap:8px;"><select id="reg-year" class="form-input">${yearOpts}</select><select id="reg-month" class="form-input">${monthOpts}</select><select id="reg-day" class="form-input">${dayOpts}</select></div></div>
                        <div class="form-group"><label class="form-label">性別</label><div class="radio-group"><label class="radio-label"><input type="radio" name="gender" value="male" checked> 男性</label><label class="radio-label"><input type="radio" name="gender" value="female"> 女性</label></div></div>
                        <div class="form-group"><label class="form-label">お住まいの都道府県</label><select id="reg-pref" class="form-input"><option value="">選択してください</option>${PREFS.map(p=>`<option value="${p}">${p}</option>`).join('')}</select></div>
                        <div class="form-group"><label class="form-label">現在の就業状況</label><div class="radio-group"><label class="radio-label"><input type="radio" name="status" value="unemployed" checked> 離職中</label><label class="radio-label"><input type="radio" name="status" value="employed"> 在職中</label></div></div>
                    </div>
                    <div class="form-section"><div class="form-section-title">連絡先・ログイン情報</div><div class="form-group"><label class="form-label">電話番号<span class="req">必須</span></label><input id="reg-tel" type="tel" class="form-input" placeholder="09012345678"></div><div class="form-group"><label class="form-label">メールアドレス<span class="req">必須</span></label><input id="reg-email" type="email" class="form-input" placeholder="sample@example.com"></div><div class="form-group"><label class="form-label">パスワード<span class="req">必須</span></label><input id="reg-pass" type="password" class="form-input" placeholder="8文字以上"></div></div>
                    <button class="btn btn-register w-full" onclick="const d = app.getRegisterData(); if(!d.name || !d.email || !d.password) { alert('必須項目を入力してください'); return; } app.register(d);">登録してはじめる</button>
                </div>`;
        }
    },

    renderPrivacy: (target) => {
        target.innerHTML = `
            <div class="page-header-simple">
                <button class="back-btn" onclick="app.router('top')">＜</button>
                <div class="page-header-title">プライバシーポリシー</div>
                <div style="width:40px;"></div>
            </div>
            <div class="container" style="padding: 24px; background: #fff; min-height: 100vh;">
                <p class="mb-4" style="font-size:13px; color:#666;">
                    株式会社Re.ACT（以下「当社」）は、本ウェブサイト（以下「本サイト」）を利用される方の個人情報の重要性を認識し、以下の方針に基づき、個人情報の保護に努めます。
                </p>
                <div style="margin-bottom: 24px;">
                    <h3 class="font-bold mb-2" style="font-size:16px; border-left: 4px solid var(--primary-color); padding-left: 10px;">第1条（個人情報の取得）</h3>
                    <p style="font-size:14px; line-height:1.8; color:#333;">当社は、適法かつ公正な手段により、以下の個人情報を取得する場合があります。</p>
                    <ul style="font-size:14px; color:#333; margin-top:8px; padding-left:20px; list-style:disc;">
                        <li>氏名</li><li>メールアドレス</li><li>電話番号</li><li>お問い合わせ内容</li><li>アクセス情報、クッキー等の利用情報（個人を特定しない情報）</li>
                    </ul>
                </div>
                <div style="margin-bottom: 24px;">
                    <h3 class="font-bold mb-2" style="font-size:16px; border-left: 4px solid var(--primary-color); padding-left: 10px;">第2条（個人情報の利用目的）</h3>
                    <p style="font-size:14px; line-height:1.8; color:#333;">取得した個人情報は、以下の目的の範囲内で利用します。</p>
                    <ul style="font-size:14px; color:#333; margin-top:8px; padding-left:20px; list-style:disc;">
                        <li>お問い合わせへの対応</li><li>サービスの提供、運営、改善</li><li>必要に応じた連絡</li><li>法令の遵守および不正行為防止</li>
                    </ul>
                </div>
                <div style="margin-bottom: 24px;">
                    <h3 class="font-bold mb-2" style="font-size:16px; border-left: 4px solid var(--primary-color); padding-left: 10px;">第3条（個人情報の第三者提供）</h3>
                    <p style="font-size:14px; line-height:1.8; color:#333;">当社は、次の場合を除き、個人情報を第三者に開示または提供しません。</p>
                    <ul style="font-size:14px; color:#333; margin-top:8px; padding-left:20px; list-style:disc;">
                        <li>本人の同意がある場合</li><li>法令に基づく場合</li><li>人の生命、身体または財産の保護のために必要であり、本人の同意を得ることが困難な場合</li>
                    </ul>
                </div>
                <div style="margin-bottom: 24px;">
                    <h3 class="font-bold mb-2" style="font-size:16px; border-left: 4px solid var(--primary-color); padding-left: 10px;">第4条（個人情報の管理）</h3>
                    <p style="font-size:14px; line-height:1.8; color:#333;">当社は、個人情報の漏えい、滅失、改ざん、不正アクセス等を防止するため、適切な安全管理措置を講じます。</p>
                </div>
                <div style="margin-bottom: 24px;">
                    <h3 class="font-bold mb-2" style="font-size:16px; border-left: 4px solid var(--primary-color); padding-left: 10px;">第5条（クッキー等の利用）</h3>
                    <p style="font-size:14px; line-height:1.8; color:#333;">本サイトでは、サービス向上のため、クッキーやアクセス解析ツールを使用する場合があります。これらにより取得される情報は、個人を特定するものではありません。</p>
                </div>
                <div style="margin-bottom: 24px;">
                    <h3 class="font-bold mb-2" style="font-size:16px; border-left: 4px solid var(--primary-color); padding-left: 10px;">第6条（法令遵守）</h3>
                    <p style="font-size:14px; line-height:1.8; color:#333;">当社は、個人情報に関する日本の法令およびその他の規範を遵守します。</p>
                </div>
                <div style="margin-bottom: 40px;">
                    <h3 class="font-bold mb-2" style="font-size:16px; border-left: 4px solid var(--primary-color); padding-left: 10px;">第7条（お問い合わせ窓口）</h3>
                    <p style="font-size:14px; line-height:1.8; color:#333;">個人情報の取り扱いに関するお問い合わせは、下記までご連絡ください。</p>
                    <div style="background:#f8f9fa; padding:16px; border-radius:8px; margin-top:10px; border:1px solid #eee;">
                        <p style="font-size:14px; font-weight:bold;">株式会社Re.ACT</p>
                        <p style="font-size:13px; margin-top:4px;">代表者：首藤清久</p>
                        <p style="font-size:13px; margin-top:4px;">お問い合わせ：本サイトのお問い合わせフォームより</p>
                    </div>
                </div>
                <div class="text-center">
                    <button class="btn btn-outline" onclick="app.router('top')">トップページへ戻る</button>
                </div>
            </div>
        `;
    },

    renderTerms: (target) => {
        target.innerHTML = `
            <div class="page-header-simple">
                <button class="back-btn" onclick="app.router('top')">＜</button>
                <div class="page-header-title">利用規約</div>
                <div style="width:40px;"></div>
            </div>
            <div class="container" style="padding: 24px; background: #fff; min-height: 100vh;">
                <p class="mb-4" style="font-size:13px; color:#666;">
                    本利用規約（以下「本規約」）は、株式会社Re.ACT（以下「当社」）が運営する本サイトの利用条件を定めるものです。本サイトを利用するすべての方は、本規約に同意したものとみなします。
                </p>
                <div style="margin-bottom: 24px;">
                    <h3 class="font-bold mb-2" style="font-size:16px; border-left: 4px solid var(--primary-color); padding-left: 10px;">第1条（適用）</h3>
                    <p style="font-size:14px; line-height:1.8; color:#333;">本規約は、本サイトのすべての利用者に適用されます。</p>
                </div>
                <div style="margin-bottom: 24px;">
                    <h3 class="font-bold mb-2" style="font-size:16px; border-left: 4px solid var(--primary-color); padding-left: 10px;">第2条（利用条件）</h3>
                    <p style="font-size:14px; line-height:1.8; color:#333;">利用者は、本規約および関連する法令を遵守して本サイトを利用するものとします。</p>
                </div>
                <div style="margin-bottom: 24px;">
                    <h3 class="font-bold mb-2" style="font-size:16px; border-left: 4px solid var(--primary-color); padding-left: 10px;">第3条（禁止事項）</h3>
                    <p style="font-size:14px; line-height:1.8; color:#333;">利用者は、以下の行為を行ってはなりません。</p>
                    <ul style="font-size:14px; color:#333; margin-top:8px; padding-left:20px; list-style:disc;">
                        <li>法令または公序良俗に反する行為</li>
                        <li>当社または第三者の権利、利益を侵害する行為</li>
                        <li>本サイトの運営を妨害する行為</li>
                        <li>虚偽の情報を入力する行為</li>
                        <li>その他、当社が不適切と判断する行為</li>
                    </ul>
                </div>
                <div style="margin-bottom: 24px;">
                    <h3 class="font-bold mb-2" style="font-size:16px; border-left: 4px solid var(--primary-color); padding-left: 10px;">第4条（免責事項）</h3>
                    <p style="font-size:14px; line-height:1.8; color:#333;">当社は、本サイトの内容の正確性、完全性、有用性について保証するものではありません。<br>本サイトの利用により生じた損害について、当社は一切の責任を負いません。</p>
                </div>
                <div style="margin-bottom: 24px;">
                    <h3 class="font-bold mb-2" style="font-size:16px; border-left: 4px solid var(--primary-color); padding-left: 10px;">第5条（サービスの変更・停止）</h3>
                    <p style="font-size:14px; line-height:1.8; color:#333;">当社は、利用者への事前通知なく、本サイトの内容の変更、追加、停止、終了を行うことがあります。</p>
                </div>
                <div style="margin-bottom: 24px;">
                    <h3 class="font-bold mb-2" style="font-size:16px; border-left: 4px solid var(--primary-color); padding-left: 10px;">第6条（著作権）</h3>
                    <p style="font-size:14px; line-height:1.8; color:#333;">本サイトに掲載されている文章、画像、デザイン等の著作権は、当社または正当な権利者に帰属します。無断での転載、複製を禁止します。</p>
                </div>
                <div style="margin-bottom: 40px;">
                    <h3 class="font-bold mb-2" style="font-size:16px; border-left: 4px solid var(--primary-color); padding-left: 10px;">第7条（準拠法および管轄）</h3>
                    <p style="font-size:14px; line-height:1.8; color:#333;">本規約の解釈および適用は日本法に準拠し、本サイトに関する紛争については、日本の裁判所を専属的合意管轄とします。</p>
                </div>
                <div class="text-center">
                    <button class="btn btn-outline" onclick="app.router('top')">トップページへ戻る</button>
                </div>
            </div>
        `;
    },

    getRegisterData: () => {
        const genderEl = document.querySelector('input[name="gender"]:checked');
        const statusEl = document.querySelector('input[name="status"]:checked');
        return {
            name: document.getElementById('reg-name').value,
            email: document.getElementById('reg-email').value,
            password: document.getElementById('reg-pass').value,
            gender: genderEl ? genderEl.parentElement.innerText.trim() : '',
            pref: document.getElementById('reg-pref').value,
            status: statusEl ? statusEl.parentElement.innerText.trim() : '',
            tel: document.getElementById('reg-tel').value
        };
    },

    toggleAdvancedSearch: (force) => {
        const panel = document.getElementById('advanced-search');
        if(!panel) return;
        panel.classList.toggle('open', force);
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
    openRegionModal: () => { document.getElementById('region-modal').classList.add('active'); app.renderRegionStep1(); },
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
        app.closeRegionModal();
        if (app.state.page === 'top') document.getElementById('top-pref-display').innerText = p;
        else {
            app.state.filter.pref = p;
            document.getElementById('list-pref-display').innerText = p;
            app.updateFilterMulti();
        }
    },
    openConditionModal: () => {
        const modal = document.getElementById('condition-modal');
        const body = document.getElementById('condition-modal-body');
        let tagsHtml = "";
        for (const [groupName, tags] of Object.entries(TAG_GROUPS)) {
            tagsHtml += `<div class="search-group-title">${groupName}</div><div class="checkbox-grid">${tags.map(t => `<label class="checkbox-label"><input type="checkbox" name="top-tag" value="${t}"> ${t}</label>`).join('')}</div>`;
        }
        body.innerHTML = `<p class="font-bold mb-2" style="font-size:14px; color:var(--primary-color);">職種</p><div class="checkbox-grid">${ALL_CATEGORIES.map(c => `<label class="checkbox-label"><input type="checkbox" name="top-cat" value="${c.id}"> ${c.name}</label>`).join('')}</div><p class="font-bold mb-2 mt-4" style="font-size:14px; color:var(--primary-color);">こだわり条件</p>${tagsHtml}`;
        modal.classList.add('active');
    },
    closeConditionModal: () => {
        const cats = document.querySelectorAll('input[name="top-cat"]:checked').length;
        const tags = document.querySelectorAll('input[name="top-tag"]:checked').length;
        const total = cats + tags;
        const btn = document.getElementById('top-condition-btn');
        if(btn) btn.innerText = total > 0 ? `職種・こだわり (${total}件選択中)` : '職種・こだわり条件を選択';
        document.getElementById('condition-modal').classList.remove('active');
    },

    back: ()=>{ app.router(app.state.page==='detail'?'list':'top'); },
    toast: (m) => { const e = document.getElementById('toast'); e.innerText = m; e.style.display = 'block'; setTimeout(() => e.style.display = 'none', 2000); }
};

window.app = app;
document.addEventListener('DOMContentLoaded', app.init);
