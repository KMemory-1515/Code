// ========== 用户管理 ==========
const USERS_KEY = 'todo_users';
const SAVED_ACCOUNTS_KEY = 'saved_accounts';
const AUTO_LOGIN_KEY = 'auto_login_user';

function getUsers() {
    const users = localStorage.getItem(USERS_KEY);
    if (users) return JSON.parse(users);
    const defaultUsers = { 'demo': { password: 'demo123', createdAt: new Date().toISOString() } };
    localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
    return defaultUsers;
}

function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// ========== 账号记忆功能 ==========
function getSavedAccounts() {
    const saved = localStorage.getItem(SAVED_ACCOUNTS_KEY);
    return saved ? JSON.parse(saved) : [];
}

function saveAccount(username) {
    let accounts = getSavedAccounts();
    if (!accounts.includes(username)) {
        accounts.unshift(username);
        if (accounts.length > 10) accounts = accounts.slice(0, 10);
        localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(accounts));
    }
}

function removeSavedAccount(username) {
    let accounts = getSavedAccounts();
    accounts = accounts.filter(acc => acc !== username);
    localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(accounts));
}

function clearAllSavedAccounts() {
    if (confirm('确定要清除所有保存的账号吗？')) {
        localStorage.removeItem(SAVED_ACCOUNTS_KEY);
        updateSavedAccountsSelect();
        showToast('已清除所有保存的账号', 'success');
    }
}

function updateSavedAccountsSelect() {
    const select = document.getElementById('savedAccountsSelect');
    if (!select) return;
    const accounts = getSavedAccounts();
    let html = '<option value="">-- 选择已保存账号 --</option>';
    accounts.forEach(acc => html += `<option value="${escapeHtml(acc)}">${escapeHtml(acc)}</option>`);
    select.innerHTML = html;
    const clearHint = document.getElementById('clearAccountsHint');
    if (clearHint) clearHint.style.display = accounts.length > 0 ? 'inline-block' : 'none';
}

function onSelectAccount() {
    const select = document.getElementById('savedAccountsSelect');
    const usernameInput = document.getElementById('loginUsername');
    if (select && usernameInput && select.value) {
        usernameInput.value = select.value;
        document.getElementById('loginPassword').focus();
    }
}

function getAutoLoginUser() {
    return localStorage.getItem(AUTO_LOGIN_KEY);
}

function setAutoLoginUser(username) {
    if (username) localStorage.setItem(AUTO_LOGIN_KEY, username);
    else localStorage.removeItem(AUTO_LOGIN_KEY);
}

function tryAutoLogin() {
    const autoUser = getAutoLoginUser();
    if (autoUser) {
        const users = getUsers();
        if (users[autoUser]) {
            localStorage.setItem('current_user', autoUser);
            localStorage.removeItem('is_guest');
            window.location.href = 'index.html';
            return true;
        } else setAutoLoginUser(null);
    }
    return false;
}

function initNewUserData(username) {
    const originalSetItem = localStorage.setItem.bind(localStorage);
    originalSetItem(`smart_todo_data_user_${username}`, JSON.stringify({ tasks: [], categories: [] }));
    originalSetItem(`weekly_data_user_${username}`, JSON.stringify({}));
    originalSetItem(`daily_tasks_user_${username}`, JSON.stringify([]));
    originalSetItem(`checkin_data_user_${username}`, JSON.stringify({ lastCheckinDate: null, streak: 0 }));
    originalSetItem(`fortune_data_user_${username}`, JSON.stringify({}));
    originalSetItem(`pomodoro_history_user_${username}`, JSON.stringify({}));
    originalSetItem(`weather_cache_user_${username}`, JSON.stringify({}));
    const today = new Date();
    const day = today.getDay();
    const diff = (day === 0 ? 6 : day - 1);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - diff);
    weekStart.setHours(0, 0, 0, 0);
    originalSetItem(`current_week_start_user_${username}`, weekStart.toISOString());
}

function registerUser(username, password) {
    const users = getUsers();
    if (!username || username.length < 3 || username.length > 20) {
        showToast('用户名长度应为3-20个字符', 'error');
        return false;
    }
    if (!password || password.length < 6) {
        showToast('密码长度至少6位', 'error');
        return false;
    }
    if (users[username]) {
        showToast('用户名已存在', 'error');
        return false;
    }
    users[username] = { password: password, createdAt: new Date().toISOString() };
    saveUsers(users);
    initNewUserData(username);
    showToast('注册成功！请登录', 'success');
    return true;
}

function loginUser(username, password, saveAccountFlag = true, autoLoginFlag = false) {
    const users = getUsers();
    if (!username || !password) {
        showToast('请输入用户名和密码', 'error');
        return false;
    }
    const user = users[username];
    if (!user || user.password !== password) {
        showToast('用户名或密码错误', 'error');
        return false;
    }
    if (saveAccountFlag) saveAccount(username);
    else removeSavedAccount(username);
    if (autoLoginFlag) setAutoLoginUser(username);
    else setAutoLoginUser(null);
    localStorage.setItem('current_user', username);
    localStorage.removeItem('is_guest');
    showToast('登录成功！正在跳转...', 'success');
    setTimeout(() => { window.location.href = 'index.html'; }, 500);
    return true;
}

function guestLogin() {
    const guestId = 'guest_' + Date.now();
    localStorage.setItem('current_user', guestId);
    localStorage.setItem('is_guest', 'true');
    setAutoLoginUser(null);
    initNewUserData(guestId);
    window.location.href = 'index.html';
}

function showToast(message, type = 'info') {
    let toast = document.getElementById('toastMsg');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toastMsg';
        toast.className = 'toast-message';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `toast-message ${type}`;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 2500);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function showLoginForm() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    if (loginForm) loginForm.style.display = 'block';
    if (registerForm) registerForm.style.display = 'none';
    updateSavedAccountsSelect();
}

function showRegisterForm() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'block';
}

function checkAlreadyLoggedIn() {
    const currentUser = localStorage.getItem('current_user');
    if (currentUser && window.location.pathname.includes('login.html')) {
        if (getAutoLoginUser()) window.location.href = 'index.html';
    }
}

// ========== 删除账户功能 ==========
function deleteAccount(username, password) {
    const users = getUsers();
    if (!username) { showToast('请先输入用户名', 'error'); return false; }
    const user = users[username];
    if (!user) { showToast('用户不存在', 'error'); return false; }
    if (user.password !== password) { showToast('密码错误', 'error'); return false; }
    if (!confirm(`⚠️ 确定要永久删除账户 "${username}" 吗？\n\n此操作将清除该账户的所有数据，且无法恢复！`)) return false;
    
    const isolatedKeys = ['smart_todo_data', 'weekly_data', 'current_week_start', 'daily_tasks', 'checkin_data', 'fortune_data', 'pomodoro_history', 'weather_cache'];
    isolatedKeys.forEach(key => { localStorage.removeItem(`${key}_user_${username}`); });
    delete users[username];
    saveUsers(users);
    removeSavedAccount(username);
    if (getAutoLoginUser() === username) setAutoLoginUser(null);
    const currentUser = localStorage.getItem('current_user');
    if (currentUser === username) { localStorage.removeItem('current_user'); localStorage.removeItem('is_guest'); }
    showToast(`账户 "${username}" 已永久删除`, 'success');
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    updateSavedAccountsSelect();
    return true;
}

function openDeleteModal() {
    const usernameInput = document.getElementById('loginUsername');
    if (!usernameInput) return;
    const username = usernameInput.value.trim();
    if (!username) { showToast('请先在用户名框中输入要删除的账户名', 'error'); return; }
    const modal = document.getElementById('deleteAccountModal');
    if (!modal) return;
    document.getElementById('deletePassword').value = '';
    modal.style.display = 'block';
    modal.dataset.targetUsername = username;
}

function closeDeleteModal() {
    const modal = document.getElementById('deleteAccountModal');
    if (modal) modal.style.display = 'none';
}

function executeDelete() {
    const modal = document.getElementById('deleteAccountModal');
    if (!modal) return;
    const username = modal.dataset.targetUsername;
    const password = document.getElementById('deletePassword').value;
    if (!password) { showToast('请输入密码确认删除', 'error'); return; }
    if (deleteAccount(username, password)) closeDeleteModal();
}

// ========== 事件绑定 ==========
function bindEvents() {
    document.getElementById('doLoginBtn')?.addEventListener('click', () => {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        const saveAccountFlag = document.getElementById('saveAccountCheckbox').checked;
        const autoLoginFlag = document.getElementById('autoLoginCheckbox').checked;
        loginUser(username, password, saveAccountFlag, autoLoginFlag);
    });
    
    document.getElementById('doRegisterBtn')?.addEventListener('click', () => {
        const username = document.getElementById('regUsername').value.trim();
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('regConfirmPassword').value;
        if (password !== confirmPassword) { showToast('两次输入的密码不一致', 'error'); return; }
        if (registerUser(username, password)) {
            showLoginForm();
            document.getElementById('loginUsername').value = username;
            document.getElementById('loginPassword').value = '';
            document.getElementById('saveAccountCheckbox').checked = true;
        }
    });
    
    document.getElementById('showRegisterBtn')?.addEventListener('click', showRegisterForm);
    document.getElementById('showLoginBtn')?.addEventListener('click', showLoginForm);
    document.getElementById('guestBtn')?.addEventListener('click', guestLogin);
    document.getElementById('savedAccountsSelect')?.addEventListener('change', onSelectAccount);
    document.getElementById('clearAccountsHint')?.addEventListener('click', clearAllSavedAccounts);
    
    document.getElementById('loginUsername')?.addEventListener('input', () => {
        const select = document.getElementById('savedAccountsSelect');
        if (select) select.value = '';
    });
    
    document.getElementById('loginPassword')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('doLoginBtn')?.click();
    });
    document.getElementById('regConfirmPassword')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('doRegisterBtn')?.click();
    });
    
    // 删除账户事件
    document.getElementById('showDeleteAccountBtn')?.addEventListener('click', openDeleteModal);
    document.querySelector('.close-delete-modal')?.addEventListener('click', closeDeleteModal);
    document.getElementById('cancelDeleteBtn')?.addEventListener('click', closeDeleteModal);
    document.getElementById('confirmDeleteBtn')?.addEventListener('click', executeDelete);
    window.addEventListener('click', (e) => { if (e.target === document.getElementById('deleteAccountModal')) closeDeleteModal(); });
}

// 打字机效果函数
async function typeText(element, text, speed = 80) {
    return new Promise((resolve) => {
        let index = 0;
        element.textContent = '';
        element.classList.remove('loading');
        
        function type() {
            if (index < text.length) {
                element.textContent += text.charAt(index);
                index++;
                setTimeout(type, speed);
            } else {
                resolve();
            }
        }
        
        type();
    });
}

// 获取一言（Hitokoto）API - 带打字机效果
async function loadHitokoto() {
    const hitokotoText = document.getElementById('hitokotoText');
    const hitokotoFrom = document.getElementById('hitokotoFrom');
    const cursor = document.getElementById('cursor');
    
    if (!hitokotoText) return;
    
    // 显示加载状态
    hitokotoText.textContent = '正在加载一言...';
    hitokotoText.classList.add('loading');
    if (hitokotoFrom) hitokotoFrom.classList.remove('show');
    
    try {
        // 请求一言API，c: 'f' 表示动漫句子，可省略或更换参数
        const response = await fetch('https://v1.hitokoto.cn/?c=f&encode=json');
        if (!response.ok) throw new Error('网络响应失败');
        
        const data = await response.json();
        const sentence = data.hitokoto;
        
        // 清除加载状态
        hitokotoText.classList.remove('loading');
        
        // 打字机效果
        await typeText(hitokotoText, `“${sentence}”`, 70);
        
        // 打字完成后隐藏光标并显示出处
        if (cursor) cursor.classList.add('hidden');
        
        // 构建出处信息并淡入显示
        let fromText = '';
        if (data.from_who) fromText += data.from_who;
        if (data.from) {
            if (fromText) fromText += ' · ';
            fromText += `《${data.from}》`;
        }
        
        if (hitokotoFrom) {
            hitokotoFrom.textContent = fromText || '佚名';
            setTimeout(() => {
                hitokotoFrom.classList.add('show');
            }, 100);
        }
        
    } catch (error) {
        console.error('获取一言失败:', error);
        
        // 备用句子
        const fallbackSentences = [
            '行到水穷处，坐看云起时。',
            '专注当下，便是最好的修行。',
            '每一个任务都是向目标迈进的一步。',
            '千里之行，始于足下。',
            '今日事，今日毕。'
        ];
        const randomSentence = fallbackSentences[Math.floor(Math.random() * fallbackSentences.length)];
        
        hitokotoText.classList.remove('loading');
        await typeText(hitokotoText, `“${randomSentence}”`, 70);
        
        if (cursor) cursor.classList.add('hidden');
        if (hitokotoFrom) {
            hitokotoFrom.textContent = '智能待办 · 每日寄语';
            setTimeout(() => {
                hitokotoFrom.classList.add('show');
            }, 100);
        }
    }
}

function init() {
    checkAlreadyLoggedIn();
    updateSavedAccountsSelect();
    const saveAccountCheckbox = document.getElementById('saveAccountCheckbox');
    if (saveAccountCheckbox) {
        saveAccountCheckbox.checked = true;
    }

    loadHitokoto();

    bindEvents();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();