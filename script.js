// ========== 用户系统 - 数据隔离核心 ==========
const CURRENT_USER_KEY = 'current_user';
const IS_GUEST_KEY = 'is_guest';

// 保存原始 localStorage 方法
const ORIGINAL_GET = localStorage.getItem.bind(localStorage);
const ORIGINAL_SET = localStorage.setItem.bind(localStorage);
const ORIGINAL_REMOVE = localStorage.removeItem.bind(localStorage);

// 需要隔离的存储键列表
const ISOLATED_KEYS = [
    'smart_todo_data',
    'weekly_data',
    'current_week_start',
    'daily_tasks',
    'checkin_data',
    'fortune_data',
    'pomodoro_history',
    'weather_cache'
];

// 获取当前用户
function getCurrentUser() {
    return ORIGINAL_GET(CURRENT_USER_KEY);
}

// 是否访客
function isGuest() {
    return ORIGINAL_GET(IS_GUEST_KEY) === 'true';
}

// 获取用户专属存储键名
function getUserStorageKey(baseKey) {
    const user = getCurrentUser();
    if (!user) return baseKey;
    return `${baseKey}_user_${user}`;
}

// 检查 key 是否需要隔离
function isIsolatedKey(key) {
    return ISOLATED_KEYS.includes(key);
}

// 获取实际的存储 key
function getActualKey(key) {
    if (isIsolatedKey(key)) {
        return getUserStorageKey(key);
    }
    return key;
}

// 替换全局 localStorage 方法
localStorage.getItem = function(key) {
    return ORIGINAL_GET(getActualKey(key));
};

localStorage.setItem = function(key, value) {
    return ORIGINAL_SET(getActualKey(key), value);
};

localStorage.removeItem = function(key) {
    return ORIGINAL_REMOVE(getActualKey(key));
};

// 原始方法别名（用于需要绕过隔离的地方）
const ORIGINAL_LOCAL_STORAGE = {
    getItem: ORIGINAL_GET,
    setItem: ORIGINAL_SET,
    removeItem: ORIGINAL_REMOVE
};

function isUserLoggedIn() {
    return !!getCurrentUser();
}

// 退出登录
function logout() {
    if (confirm('确定要退出登录吗？')) {
        ORIGINAL_REMOVE(CURRENT_USER_KEY);
        ORIGINAL_REMOVE(IS_GUEST_KEY);
        window.location.reload();
    }
}

// 为用户初始化空数据
function initUserData(username) {
    ORIGINAL_SET(`smart_todo_data_user_${username}`, JSON.stringify({ tasks: [], categories: [] }));
    ORIGINAL_SET(`weekly_data_user_${username}`, JSON.stringify({}));
    ORIGINAL_SET(`daily_tasks_user_${username}`, JSON.stringify([]));
    ORIGINAL_SET(`checkin_data_user_${username}`, JSON.stringify({ lastCheckinDate: null, streak: 0 }));
    ORIGINAL_SET(`fortune_data_user_${username}`, JSON.stringify({}));
    ORIGINAL_SET(`pomodoro_history_user_${username}`, JSON.stringify({}));
    ORIGINAL_SET(`weather_cache_user_${username}`, JSON.stringify({}));
    
    const today = new Date();
    const day = today.getDay();
    const diff = (day === 0 ? 6 : day - 1);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - diff);
    weekStart.setHours(0, 0, 0, 0);
    ORIGINAL_SET(`current_week_start_user_${username}`, weekStart.toISOString());
}

// 确保当前用户有完整的数据结构
function ensureUserDataExists() {
    const user = getCurrentUser();
    if (!user) return;
    
    const userTaskKey = `smart_todo_data_user_${user}`;
    const existingData = ORIGINAL_GET(userTaskKey);
    
    if (!existingData) {
        console.log(`初始化新用户数据: ${user}`);
        initUserData(user);
    } else {
        console.log(`加载已有用户数据: ${user}`);
        
        // 检查并补充缺失的数据结构
        const weeklyKey = `weekly_data_user_${user}`;
        if (!ORIGINAL_GET(weeklyKey)) ORIGINAL_SET(weeklyKey, JSON.stringify({}));
        
        const dailyKey = `daily_tasks_user_${user}`;
        if (!ORIGINAL_GET(dailyKey)) ORIGINAL_SET(dailyKey, JSON.stringify([]));
        
        const checkinKey = `checkin_data_user_${user}`;
        if (!ORIGINAL_GET(checkinKey)) ORIGINAL_SET(checkinKey, JSON.stringify({ lastCheckinDate: null, streak: 0 }));
        
        const fortuneKey = `fortune_data_user_${user}`;
        if (!ORIGINAL_GET(fortuneKey)) ORIGINAL_SET(fortuneKey, JSON.stringify({}));
        
        const pomodoroKey = `pomodoro_history_user_${user}`;
        if (!ORIGINAL_GET(pomodoroKey)) ORIGINAL_SET(pomodoroKey, JSON.stringify({}));
        
        const weatherKey = `weather_cache_user_${user}`;
        if (!ORIGINAL_GET(weatherKey)) ORIGINAL_SET(weatherKey, JSON.stringify({}));
        
        const weekStartKey = `current_week_start_user_${user}`;
        if (!ORIGINAL_GET(weekStartKey)) {
            const today = new Date();
            const day = today.getDay();
            const diff = (day === 0 ? 6 : day - 1);
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - diff);
            weekStart.setHours(0, 0, 0, 0);
            ORIGINAL_SET(weekStartKey, weekStart.toISOString());
        }
    }
}

// ========== 数据存储变量 ==========
let tasks = [];
let categories = [];
let currentFilter = "all";
let currentFortune = null;
let isFlipped = false;
let showFutureOnly = false;
let currentView = 'list';

let checkinData = {
    lastCheckinDate: null,
    streak: 0
};

let weeklyData = {};
let currentWeekStart = null;
let dailyTasks = [];

const fortunes = [
    { level: "大吉", levelKey: "daiji", message: "万事如意，诸事顺遂", advice: "今天适合开启重要项目" },
    { level: "小吉", levelKey: "xiaoji", message: "好事将近，小确幸相伴", advice: "保持积极心态" },
    { level: "中平", levelKey: "zhongping", message: "平平淡淡，稳步前进", advice: "适合处理日常事务" },
    { level: "凶", levelKey: "xiong", message: "诸事稍有不顺", advice: "重要决定暂缓" },
    { level: "大凶", levelKey: "daxiong", message: "运势低迷", advice: "宜静不宜动" }
];

const commonEmojis = ["💼", "📚", "🏠", "💪", "🎮", "🎵", "✈️", "❤️", "💰", "🏥", "🎨", "📖", "🍔", "🏃", "💤", "🎓", "💻", "📱", "🌴", "🎉", "⚽", "🐱", "🌸", "⭐", "🔥", "💡"];

// ========== 辅助函数 ==========
function getTodayDateStr() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function formatDate(dateStr) {
    if (!dateStr) return "无日期";
    const parts = dateStr.split('-');
    return `${parts[1]}/${parts[2]}`;
}

function isFutureDate(dateStr) {
    if (!dateStr) return false;
    const today = getTodayDateStr();
    return dateStr > today;
}

function showToast(message, type = "info") {
    let toastContainer = document.getElementById("toastContainer");
    if (!toastContainer) {
        toastContainer = document.createElement("div");
        toastContainer.id = "toastContainer";
        toastContainer.className = "toast-container";
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement("div");
    toast.className = `toast-message toast-${type}`;
    toast.innerText = message;
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = "fadeOut 0.3s ease forwards";
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
    }, 2000);
}

function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>]/g, function(m) {
        if(m === '&') return '&amp;';
        if(m === '<') return '&lt;';
        if(m === '>') return '&gt;';
        return m;
    });
}

// ========== 类型管理核心函数 ==========
function saveToLocal() {
    const actualKey = getActualKey("smart_todo_data");
    ORIGINAL_SET(actualKey, JSON.stringify({ tasks, categories }));
}

function loadFromLocal() {
    const user = getCurrentUser();
    console.log("loadFromLocal - 当前用户:", user);
    
    const actualKey = getActualKey("smart_todo_data");
    const stored = ORIGINAL_GET(actualKey);
    console.log("loadFromLocal - 读取到的数据key:", actualKey);
    console.log("loadFromLocal - 读取到的数据:", stored);
    
    if (stored) {
        const data = JSON.parse(stored);
        tasks = data.tasks || [];
        categories = data.categories || [];
        
        tasks.forEach(task => {
            if (!task.time) task.time = "";
            if (task.estimatedDuration === undefined) task.estimatedDuration = null;
            if (task.priority === undefined) task.priority = 2;
        });
    } else {
        tasks = [];
        categories = [];
    }
    
    console.log("loadFromLocal - 加载后 tasks 数量:", tasks.length);
    console.log("loadFromLocal - 加载后 categories 数量:", categories.length);
}

function getCategoryEmoji(name) {
    const cat = categories.find(c => c.name === name);
    return cat ? cat.emoji : "📌";
}

// ========== 每日任务管理 ==========
function saveDailyTasks() {
    const actualKey = getActualKey("daily_tasks");
    ORIGINAL_SET(actualKey, JSON.stringify(dailyTasks));
}

function loadDailyTasks() {
    const actualKey = getActualKey("daily_tasks");
    const stored = ORIGINAL_GET(actualKey);
    if (stored) {
        dailyTasks = JSON.parse(stored);
    } else {
        dailyTasks = [];
    }
}

function generateDailyTaskInstances() {
    const today = getTodayDateStr();
    
    for (const daily of dailyTasks) {
        const todayExists = tasks.some(t => t.parentId === daily.id && t.date === today);
        if (!todayExists) {
            const newId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id), 0) + 1 : 1;
            tasks.push({
                id: newId,
                text: daily.text,
                category: daily.category,
                completed: false,
                date: today,
                repeat: "daily",
                parentId: daily.id,
                time: "",
                estimatedDuration: null,
                priority: 2
            });
        }
        
        for (let i = 1; i <= 7; i++) {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + i);
            const futureDateStr = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}-${String(futureDate.getDate()).padStart(2, '0')}`;
            
            const exists = tasks.some(t => t.parentId === daily.id && t.date === futureDateStr);
            if (!exists) {
                const newId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id), 0) + 1 : 1;
                tasks.push({
                    id: newId,
                    text: daily.text,
                    category: daily.category,
                    completed: false,
                    date: futureDateStr,
                    repeat: "daily",
                    parentId: daily.id,
                    time: "",
                    estimatedDuration: null,
                    priority: 2
                });
            }
        }
    }
}

function deleteDailyTask(parentId) {
    dailyTasks = dailyTasks.filter(d => d.id !== parentId);
    tasks = tasks.filter(t => t.parentId !== parentId);
    saveDailyTasks();
    saveToLocal();
    renderDailyTaskList();
    updateAllUI();
}

function renderDailyTaskList() {
    const container = document.getElementById("dailyTaskList");
    if (!container) return;
    
    if (dailyTasks.length === 0) {
        container.innerHTML = '<div class="empty-category">暂无每日重复任务，添加任务时选择"每日重复"即可</div>';
        return;
    }
    
    let html = "";
    dailyTasks.forEach(task => {
        html += `
            <div class="category-card" style="justify-content: space-between; width: calc(33.33% - 12px);">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="category-emoji">${getCategoryEmoji(task.category)}</span>
                    <span class="category-name">${escapeHtml(task.text)} <span style="font-size: 10px; color: #888;">(每日重复)</span></span>
                    <span style="font-size: 11px; color: #888;">${task.category}</span>
                </div>
                <button class="delete-daily-btn" data-id="${task.id}" style="background: #dc3545; color: white; border: none; padding: 2px 8px; border-radius: 12px; cursor: pointer; font-size: 11px;">删除</button>
            </div>
        `;
    });
    container.innerHTML = html;
    
    document.querySelectorAll('.delete-daily-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            if (confirm("删除后，所有未完成的该任务副本也将被删除，确定吗？")) {
                deleteDailyTask(id);
            }
        });
    });
}

function openDailyTaskModal() {
    const modal = document.getElementById("dailyTaskModal");
    const listContainer = document.getElementById("dailyTaskManageList");
    
    if (dailyTasks.length === 0) {
        listContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;">暂无每日重复任务</div>';
    } else {
        let html = "";
        dailyTasks.forEach(task => {
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #eee;">
                    <div>
                        <span style="font-size: 16px;">${getCategoryEmoji(task.category)}</span>
                        <span style="margin-left: 10px;">${escapeHtml(task.text)}</span>
                        <span style="margin-left: 10px; font-size: 12px; color: #888;">${task.category}</span>
                        <span style="margin-left: 10px; font-size: 11px; background: #e3f2fd; padding: 2px 8px; border-radius: 12px;">每日重复</span>
                    </div>
                    <button class="delete-daily-manage-btn" data-id="${task.id}" style="background: #dc3545; color: white; border: none; padding: 4px 12px; border-radius: 6px; cursor: pointer;">删除</button>
                </div>
            `;
        });
        listContainer.innerHTML = html;
        
        document.querySelectorAll('.delete-daily-manage-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                if (confirm("删除后，所有未完成的该任务副本也将被删除，确定吗？")) {
                    deleteDailyTask(id);
                    openDailyTaskModal();
                }
            });
        });
    }
    
    modal.style.display = "block";
}

function closeDailyTaskModal() {
    document.getElementById("dailyTaskModal").style.display = "none";
}

// ========== 打卡功能 ==========
function loadCheckinData() {
    const actualKey = getActualKey("checkin_data");
    const stored = ORIGINAL_GET(actualKey);
    const today = new Date().toDateString();
    
    if (stored) {
        const data = JSON.parse(stored);
        const lastDate = data.lastCheckinDate;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();
        
        if (lastDate === yesterdayStr) {
            checkinData.streak = data.streak;
        } else if (lastDate === today) {
            checkinData.streak = data.streak;
        } else {
            checkinData.streak = 0;
        }
        checkinData.lastCheckinDate = data.lastCheckinDate;
    } else {
        checkinData = { lastCheckinDate: null, streak: 0 };
    }
    
    updateCheckinUI();
    const streakSpan = document.getElementById("streakCount");
    if (streakSpan) streakSpan.innerText = checkinData.streak;
}

function saveCheckinData() {
    const actualKey = getActualKey("checkin_data");
    ORIGINAL_SET(actualKey, JSON.stringify(checkinData));
}

function updateCheckinUI() {
    const today = new Date().toDateString();
    const hasCheckedToday = (checkinData.lastCheckinDate === today);
    const checkinStatus = document.getElementById("checkinStatus");
    const checkinBtn = document.getElementById("checkinBtn");
    const checkinCard = document.getElementById("checkinCard");
    
    if (hasCheckedToday) {
        if (checkinStatus) checkinStatus.innerHTML = '<span class="status-text checked">✅ 已打卡</span>';
        if (checkinBtn) checkinBtn.disabled = true;
        if (checkinBtn) checkinBtn.classList.add("disabled");
        if (checkinCard) checkinCard.classList.add("checked");
    } else {
        if (checkinStatus) checkinStatus.innerHTML = '<span class="status-text">⭕ 未打卡</span>';
        if (checkinBtn) checkinBtn.disabled = false;
        if (checkinBtn) checkinBtn.classList.remove("disabled");
        if (checkinCard) checkinCard.classList.remove("checked");
    }
}

function doCheckin() {
    const today = new Date().toDateString();
    
    if (checkinData.lastCheckinDate === today) {
        showToast("今天已经打卡过了！明天再来吧~", "info");
        return;
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    
    if (checkinData.lastCheckinDate === yesterdayStr) {
        checkinData.streak++;
    } else {
        checkinData.streak = 1;
    }
    
    checkinData.lastCheckinDate = today;
    saveCheckinData();
    updateCheckinUI();
    const streakSpan = document.getElementById("streakCount");
    if (streakSpan) streakSpan.innerText = checkinData.streak;
    showToast(`🎉 打卡成功！连续打卡 ${checkinData.streak} 天`, "success");
}

// ========== 运势功能 ==========
function getRandomFortune() {
    const randomIndex = Math.floor(Math.random() * fortunes.length);
    return { ...fortunes[randomIndex] };
}

function renderFortuneBack(fortune) {
    const fortuneBack = document.getElementById("fortuneBack");
    if (!fortuneBack) return;
    if (!fortune) {
        fortuneBack.innerHTML = `<div class="fortune-level">?</div><div class="fortune-message">点击卡片查看今日运势</div>`;
        return;
    }
    fortuneBack.innerHTML = `
        <div class="fortune-level ${fortune.levelKey}">${fortune.level}</div>
        <div class="fortune-message">${fortune.message}</div>
        <div class="fortune-advice">💡 ${fortune.advice}</div>
    `;
}

function flipCard() {
    if (isFlipped) return;
    
    if (!currentFortune) {
        currentFortune = getRandomFortune();
        renderFortuneBack(currentFortune);
        saveFortuneToLocal();
    }
    
    const fortuneModule = document.querySelector(".fortune-module");
    if (fortuneModule) fortuneModule.classList.add("flipped");
    isFlipped = true;
    saveFortuneToLocal();
}

function resetFortune() {
    const fortuneModule = document.querySelector(".fortune-module");
    
    if (isFlipped && fortuneModule) {
        fortuneModule.classList.remove("flipped");
        isFlipped = false;
    }
    
    setTimeout(() => {
        currentFortune = getRandomFortune();
        renderFortuneBack(currentFortune);
        
        setTimeout(() => {
            if (fortuneModule) fortuneModule.classList.add("flipped");
            isFlipped = true;
            saveFortuneToLocal();
        }, 100);
    }, 300);
}

function saveFortuneToLocal() {
    if (currentFortune) {
        const actualKey = getActualKey("fortune_data");
        ORIGINAL_SET(actualKey, JSON.stringify({
            fortune: currentFortune,
            isFlipped: isFlipped,
            date: new Date().toDateString()
        }));
    }
}

function loadFortuneFromLocal() {
    const actualKey = getActualKey("fortune_data");
    const stored = ORIGINAL_GET(actualKey);
    const today = new Date().toDateString();
    const fortuneModule = document.querySelector(".fortune-module");
    
    if (stored) {
        const data = JSON.parse(stored);
        
        if (data.date === today && data.fortune) {
            currentFortune = data.fortune;
            isFlipped = data.isFlipped;
            renderFortuneBack(currentFortune);
            if (isFlipped && fortuneModule) {
                fortuneModule.classList.add("flipped");
            } else if (fortuneModule) {
                fortuneModule.classList.remove("flipped");
            }
        } else {
            currentFortune = null;
            isFlipped = false;
            renderFortuneBack(null);
            if (fortuneModule) fortuneModule.classList.remove("flipped");
        }
    } else {
        currentFortune = null;
        isFlipped = false;
        renderFortuneBack(null);
        if (fortuneModule) fortuneModule.classList.remove("flipped");
    }
}

// ========== 每周待办完成趋势图功能 ==========
function getWeekStartDate(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day === 0 ? 6 : day - 1);
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function getWeekEndDate(weekStart) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    return d;
}

function getWeekDates(weekStart) {
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        dates.push(date);
    }
    return dates;
}

function getWeekdayName(index) {
    const names = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    return names[index];
}

function getDateStr(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function checkAndResetWeeklyData() {
    const today = new Date();
    const thisWeekStart = getWeekStartDate(today);
    const actualKey = getActualKey("current_week_start");
    const storedWeekStart = ORIGINAL_GET(actualKey);
    
    if (storedWeekStart) {
        const savedWeekStart = new Date(storedWeekStart);
        if (savedWeekStart.getTime() !== thisWeekStart.getTime()) {
            weeklyData = {};
            const weeklyActualKey = getActualKey("weekly_data");
            ORIGINAL_SET(weeklyActualKey, JSON.stringify(weeklyData));
            ORIGINAL_SET(actualKey, thisWeekStart.toISOString());
            currentWeekStart = thisWeekStart;
            renderWeeklyTable();
            updateWeekRangeDisplay();
        } else {
            currentWeekStart = savedWeekStart;
        }
    } else {
        ORIGINAL_SET(actualKey, thisWeekStart.toISOString());
        currentWeekStart = thisWeekStart;
    }
}

function saveWeeklyData() {
    const actualKey = getActualKey("weekly_data");
    ORIGINAL_SET(actualKey, JSON.stringify(weeklyData));
}

function loadWeeklyData() {
    const actualKey = getActualKey("weekly_data");
    const stored = ORIGINAL_GET(actualKey);
    if (stored) {
        weeklyData = JSON.parse(stored);
    } else {
        weeklyData = {};
    }
    checkAndResetWeeklyData();
    renderWeeklyTable();
    updateWeekRangeDisplay();
    updateHeatmapLastUpdate();
}

function getDayCompletedCount(dateStr) {
    const tasksForDate = tasks.filter(t => t.date === dateStr && t.completed);
    return tasksForDate.length;
}

function updateDayData(dateStr, count) {
    weeklyData[dateStr] = count;
    saveWeeklyData();
    renderWeeklyTable();
    updateWeekRangeDisplay();
    updateHeatmapLastUpdate();
}

function autoRecordToday() {
    const todayStr = getTodayDateStr();
    const todayCompleted = tasks.filter(t => t.date === todayStr && t.completed).length;
    const today = new Date();
    const weekStart = getWeekStartDate(today);
    const weekEnd = getWeekEndDate(weekStart);
    
    if (today >= weekStart && today <= weekEnd) {
        if (weeklyData[todayStr] !== todayCompleted) {
            weeklyData[todayStr] = todayCompleted;
            saveWeeklyData();
            renderWeeklyTable();
            updateWeekRangeDisplay();
            updateHeatmapLastUpdate();
        }
    }
}

function getCountClass(count) {
    if (count === 0) return 'count-0';
    if (count <= 3) return 'count-1-3';
    if (count <= 5) return 'count-4-5';
    if (count <= 8) return 'count-6-8';
    return 'count-9-plus';
}

function getStatusInfo(count, totalTasks) {
    if (totalTasks === 0) return { text: '无任务', class: 'status-none' };
    if (count === totalTasks) return { text: '已完成', class: 'status-completed' };
    return { text: '未完成', class: 'status-pending' };
}

function renderWeeklyTable() {
    const tbody = document.getElementById("weeklyTableBody");
    if (!tbody) return;
    
    const weekDates = getWeekDates(currentWeekStart);
    const todayStr = getTodayDateStr();
    let html = "";
    
    weekDates.forEach((date, index) => {
        const dateStr = getDateStr(date);
        const completedCount = getDayCompletedCount(dateStr);
        let totalTasksForDay = tasks.filter(t => t.date === dateStr).length;
        const countClass = getCountClass(completedCount);
        const statusInfo = getStatusInfo(completedCount, totalTasksForDay);
        const isToday = (dateStr === todayStr);
        const rowClass = isToday ? 'today-row' : '';
        const displayDate = `${date.getMonth() + 1}/${date.getDate()}`;
        
        html += `
            <tr class="${rowClass}">
                <td class="weekday-name">${getWeekdayName(index)}</td>
                <td class="weekday-date">${displayDate}</td>
                <td class="completed-count">
                    <span class="count-badge ${countClass}">${completedCount}</span>
                    <span class="total-divider">/</span>
                    <span class="total-tasks">${totalTasksForDay}</span>
                </td>
                <td>
                    <span class="status-badge ${statusInfo.class}">${statusInfo.text}</span>
                </td>
                <td>
                    <button class="edit-day-btn" data-date="${dateStr}" data-count="${completedCount}">编辑</button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    
    document.querySelectorAll('.edit-day-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const date = btn.dataset.date;
            const count = parseInt(btn.dataset.count);
            openEditModalForDate(date, count);
        });
    });
}

function openEditModalForDate(date, currentCount) {
    const modal = document.getElementById("heatmapModal");
    const dateInput = document.getElementById("heatmapDate");
    const countInput = document.getElementById("heatmapCount");
    
    if (dateInput) dateInput.value = date;
    if (countInput) countInput.value = currentCount;
    if (modal) modal.style.display = "block";
}

function updateWeekRangeDisplay() {
    const weekStart = currentWeekStart;
    const weekEnd = getWeekEndDate(weekStart);
    const startStr = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
    const endStr = `${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;
    const year = weekStart.getFullYear();
    
    const weekRangeSpan = document.getElementById("weekRange");
    if (weekRangeSpan) {
        weekRangeSpan.innerText = `${year}.${startStr} - ${year}.${endStr}`;
    }
}

function updateHeatmapLastUpdate() {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const updateSpan = document.getElementById("updateDate");
    if (updateSpan) updateSpan.innerText = dateStr;
}

function openHeatmapModal() {
    const todayStr = getTodayDateStr();
    const currentCount = getDayCompletedCount(todayStr);
    openEditModalForDate(todayStr, currentCount);
}

function closeHeatmapModal() {
    const modal = document.getElementById("heatmapModal");
    if (modal) modal.style.display = "none";
}

function saveHeatmapDataEntry() {
    const date = document.getElementById("heatmapDate").value;
    let count = parseInt(document.getElementById("heatmapCount").value);
    
    if (!date) {
        alert("请选择日期");
        return;
    }
    if (isNaN(count)) count = 0;
    if (count < 0) count = 0;
    
    const selectedDate = new Date(date);
    const weekStart = currentWeekStart;
    const weekEnd = getWeekEndDate(weekStart);
    
    if (selectedDate < weekStart || selectedDate > weekEnd) {
        if (confirm("选择的日期不在本周内，是否要切换到该周的数据？")) {
            const newWeekStart = getWeekStartDate(selectedDate);
            currentWeekStart = newWeekStart;
            const weekStartActualKey = getActualKey("current_week_start");
            ORIGINAL_SET(weekStartActualKey, newWeekStart.toISOString());
            loadWeeklyData();
        }
        return;
    }
    
    updateDayData(date, count);
    closeHeatmapModal();
    showToast(`已记录 ${date} 的完成任务数：${count} 个`, "success");
}

function resetWeekData() {
    if (confirm("确定要重置本周所有数据吗？此操作不可恢复。")) {
        const weekDates = getWeekDates(currentWeekStart);
        weekDates.forEach(date => {
            const dateStr = getDateStr(date);
            delete weeklyData[dateStr];
        });
        const actualKey = getActualKey("weekly_data");
        ORIGINAL_SET(actualKey, JSON.stringify(weeklyData));
        renderWeeklyTable();
        updateWeekRangeDisplay();
        updateHeatmapLastUpdate();
        showToast("本周数据已重置", "success");
    }
}

function updateWeeklyFromTasks() {
    autoRecordToday();
}

// ========== UI 更新函数 ==========
function updateCategorySelect() {
    const select = document.getElementById("categorySelect");
    if (!select) return;
    
    if (categories.length === 0) {
        select.innerHTML = '<option value="">-- 请先添加类型 --</option>';
        return;
    }
    let html = "";
    categories.forEach(cat => {
        html += `<option value="${escapeHtml(cat.name)}">${cat.emoji} ${escapeHtml(cat.name)}</option>`;
    });
    select.innerHTML = html;
}

function updateFilterTabs() {
    const container = document.getElementById("filterTabs");
    if (!container) return;
    
    if (categories.length === 0) {
        container.innerHTML = '<span style="color:#999;">暂无类型</span>';
        return;
    }
    let html = `<button class="filter-btn ${currentFilter === 'all' ? 'active' : ''}" data-filter="all">📋 全部</button>`;
    categories.forEach(cat => {
        html += `<button class="filter-btn ${currentFilter === cat.name ? 'active' : ''}" data-filter="${escapeHtml(cat.name)}">${cat.emoji} ${escapeHtml(cat.name)}</button>`;
    });
    container.innerHTML = html;
    
    document.querySelectorAll('.filter-tabs .filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-tabs .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            
            if (currentView === 'list') {
                renderTodoList();
            } else {
                renderMatrixView();
            }
        });
    });
}

function renderCategoryList() {
    const container = document.getElementById("categoryList");
    if (!container) return;
    
    if (categories.length === 0) {
        container.innerHTML = '<div class="empty-category">✨ 暂无类型，点击"新建类型"创建</div>';
        return;
    }
    let html = "";
    categories.forEach(cat => {
        html += `<div class="category-card"><span class="category-emoji">${cat.emoji}</span><span class="category-name">${escapeHtml(cat.name)}</span></div>`;
    });
    container.innerHTML = html;
}

function updateEditCategorySelect() {
    const select = document.getElementById("editCategorySelect");
    if (!select) return;
    
    if (categories.length === 0) {
        select.innerHTML = '<option value="">-- 暂无类型 --</option>';
        return;
    }
    let html = '<option value="">-- 请选择类型 --</option>';
    categories.forEach(cat => {
        html += `<option value="${escapeHtml(cat.name)}">${cat.emoji} ${escapeHtml(cat.name)}</option>`;
    });
    select.innerHTML = html;
    
    select.onchange = () => {
        const selectedName = select.value;
        if (selectedName) {
            const category = categories.find(c => c.name === selectedName);
            if (category) {
                const editName = document.getElementById("editCategoryName");
                const editEmoji = document.getElementById("editCategoryEmoji");
                const editPreview = document.getElementById("editEmojiPreview");
                const editWarning = document.getElementById("editWarning");
                if (editName) editName.value = category.name;
                if (editEmoji) editEmoji.value = category.emoji;
                if (editPreview) editPreview.innerText = category.emoji;
                if (editWarning) editWarning.style.display = "block";
            }
        } else {
            const editName = document.getElementById("editCategoryName");
            const editEmoji = document.getElementById("editCategoryEmoji");
            const editPreview = document.getElementById("editEmojiPreview");
            const editWarning = document.getElementById("editWarning");
            if (editName) editName.value = "";
            if (editEmoji) editEmoji.value = "📌";
            if (editPreview) editPreview.innerText = "📌";
            if (editWarning) editWarning.style.display = "none";
        }
    };
}

function updateStats() {
    const todayStr = getTodayDateStr();
    const todayTasks = tasks.filter(t => t.date === todayStr);
    const total = todayTasks.length;
    const completed = todayTasks.filter(t => t.completed).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    
    const totalCountSpan = document.getElementById("totalCount");
    const completedCountSpan = document.getElementById("completedCount");
    const percentCountSpan = document.getElementById("percentCount");
    const progressFill = document.getElementById("progressFill");
    
    if (totalCountSpan) totalCountSpan.innerText = total;
    if (completedCountSpan) completedCountSpan.innerText = completed;
    if (percentCountSpan) percentCountSpan.innerText = percent;
    if (progressFill) progressFill.style.width = percent + "%";
    
    let totalEstimated = 0;
    let completedEstimated = 0;
    todayTasks.forEach(task => {
        if (task.estimatedDuration) {
            totalEstimated += task.estimatedDuration;
            if (task.completed) {
                completedEstimated += task.estimatedDuration;
            }
        }
    });
    
    const totalEstimatedSpan = document.getElementById("totalEstimatedTime");
    const completedEstimatedSpan = document.getElementById("completedEstimatedTime");
    if (totalEstimatedSpan) totalEstimatedSpan.innerText = totalEstimated;
    if (completedEstimatedSpan) completedEstimatedSpan.innerText = completedEstimated;
    
    const statsContainer = document.getElementById("categoryStats");
    if (!statsContainer) return;
    
    if (categories.length === 0) {
        statsContainer.innerHTML = '<div style="color:#999;">暂无类型</div>';
        return;
    }
    let html = "";
    categories.forEach(cat => {
        const count = todayTasks.filter(t => t.category === cat.name).length;
        html += `<div class="category-stat-item">${cat.emoji} ${cat.name}: ${count}</div>`;
    });
    statsContainer.innerHTML = html;
}

function formatDateTime(dateStr, timeStr) {
    if (!dateStr) return "无日期";
    const parts = dateStr.split('-');
    const dateDisplay = `${parts[1]}/${parts[2]}`;
    if (timeStr && timeStr !== "00:00") {
        return `${dateDisplay} ${timeStr}`;
    }
    return dateDisplay;
}

function getTaskTimestamp(task) {
    if (!task.date) return 0;
    const time = task.time && task.time !== "" ? task.time : "23:59:59";
    return new Date(`${task.date}T${time}`).getTime();
}

function formatDuration(minutes) {
    if (!minutes || minutes === 0) return "";
    if (minutes < 60) {
        return `${minutes}分钟`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
        return `${hours}小时`;
    }
    return `${hours}小时${mins}分钟`;
}

// ========== 渲染待办列表 ==========
function renderTodoList() {
    const container = document.getElementById("todoList");
    if (!container) return;
    
    const todayStr = getTodayDateStr();
    
    let filtered = tasks.filter(t => t.date && t.date === todayStr);
    
    if (currentFilter !== "all") {
        filtered = filtered.filter(t => t.category === currentFilter);
    }
    
    filtered.sort((a, b) => {
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }
        return (a.priority || 2) - (b.priority || 2);
    });
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state">✨ 今日暂无待办事项</div>';
        return;
    }
    
    let html = "";
    filtered.forEach(task => {
        const completedClass = task.completed ? "completed" : "";
        const displayText = task.repeat === "daily" ? `${escapeHtml(task.text)} (每日)` : escapeHtml(task.text);
        const timeTag = task.time && task.time !== "" ? `<span class="task-time">🕐 ${task.time}</span>` : "";
        const durationTag = task.estimatedDuration ? `<span class="task-duration">⏱️ ${formatDuration(task.estimatedDuration)}</span>` : "";
        
        let priorityTag = '';
        const priority = task.priority || 2;
        if (priority === 1) priorityTag = '<span class="priority-badge priority-1">🔴 紧急重要</span>';
        else if (priority === 2) priorityTag = '<span class="priority-badge priority-2">🟡 重要不紧急</span>';
        else if (priority === 3) priorityTag = '<span class="priority-badge priority-3">🟢 紧急不重要</span>';
        else priorityTag = '<span class="priority-badge priority-4">⚪ 不重要不紧急</span>';
        
        html += `
            <div class="todo-item" style="${!task.completed && priority === 1 ? 'border-left: 3px solid #dc3545; background: #fff5f5;' : ''}" data-id="${task.id}">
                <div class="todo-info">
                    <input type="checkbox" class="todo-check" ${task.completed ? "checked" : ""} data-id="${task.id}">
                    <span class="todo-text ${completedClass}">${displayText}</span>
                    ${priorityTag}
                    ${timeTag}
                    ${durationTag}
                    <span class="todo-category">${getCategoryEmoji(task.category)} ${escapeHtml(task.category)}</span>
                </div>
                <div class="todo-actions">
                    <button class="edit-task-btn" data-id="${task.id}">✏️ 编辑</button>
                    <button class="delete-task-btn" data-id="${task.id}">删除</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
    
    bindTodoListEvents();
}

// ========== 更新所有UI ==========
function updateAllUI() {
    updateCategorySelect();
    updateFilterTabs();
    renderCategoryList();
    renderDailyTaskList();
    updateEditCategorySelect();
    updateStats();
    
    if (currentView === 'list') {
        renderTodoList();
    } else {
        renderMatrixView();
    }
    
    renderFutureTasks();
    updateWeeklyFromTasks();
    updatePomodoroOnTaskChange();
}

// ========== 类型操作 ==========
function openAddModal() {
    const nameInput = document.getElementById("addCategoryName");
    const emojiInput = document.getElementById("addCategoryEmoji");
    const previewSpan = document.getElementById("addEmojiPreview");
    if (nameInput) nameInput.value = "";
    if (emojiInput) emojiInput.value = "📌";
    if (previewSpan) previewSpan.innerText = "📌";
    
    const modal = document.getElementById("addCategoryModal");
    if (modal) modal.style.display = "block";
}

function closeAddModal() {
    const modal = document.getElementById("addCategoryModal");
    if (modal) modal.style.display = "none";
    
    const picker = document.getElementById("addEmojiPicker");
    if (picker) picker.style.display = "none";
}

function addCategory() {
    const nameInput = document.getElementById("addCategoryName");
    const emojiInput = document.getElementById("addCategoryEmoji");
    
    const name = nameInput ? nameInput.value.trim() : "";
    let emoji = emojiInput ? emojiInput.value.trim() : "";
    
    if (!name) { alert("请输入类型名称"); return; }
    if (!emoji) emoji = "📌";
    if (categories.some(c => c.name === name)) { alert(`类型 "${name}" 已存在`); return; }
    categories.push({ name, emoji });
    closeAddModal();
    saveToLocal();
    updateAllUI();
}

function openEditModal() {
    if (categories.length === 0) { alert("暂无类型可修改"); return; }
    
    const select = document.getElementById("editCategorySelect");
    const nameInput = document.getElementById("editCategoryName");
    const emojiInput = document.getElementById("editCategoryEmoji");
    const previewSpan = document.getElementById("editEmojiPreview");
    const warningBox = document.getElementById("editWarning");
    
    if (select) select.value = "";
    if (nameInput) nameInput.value = "";
    if (emojiInput) emojiInput.value = "📌";
    if (previewSpan) previewSpan.innerText = "📌";
    if (warningBox) warningBox.style.display = "none";
    
    const modal = document.getElementById("editCategoryModal");
    if (modal) modal.style.display = "block";
}

function closeEditModal() {
    const modal = document.getElementById("editCategoryModal");
    if (modal) modal.style.display = "none";
}

function editCategory() {
    const select = document.getElementById("editCategorySelect");
    const selectedName = select ? select.value : "";
    if (!selectedName) { alert("请选择要修改的类型"); return; }
    
    const nameInput = document.getElementById("editCategoryName");
    const emojiInput = document.getElementById("editCategoryEmoji");
    
    let newName = nameInput ? nameInput.value.trim() : "";
    let newEmoji = emojiInput ? emojiInput.value.trim() : "";
    
    if (!newName) { alert("请输入新名称"); return; }
    if (!newEmoji) newEmoji = "📌";
    if (newName !== selectedName && categories.some(c => c.name === newName)) {
        alert(`类型 "${newName}" 已存在`);
        return;
    }
    
    const category = categories.find(c => c.name === selectedName);
    if (category) { category.name = newName; category.emoji = newEmoji; }
    tasks.forEach(task => { if (task.category === selectedName) task.category = newName; });
    if (currentFilter === selectedName) currentFilter = newName;
    
    closeEditModal();
    saveToLocal();
    updateAllUI();
    showToast(`修改成功：${newEmoji} ${newName}`, "success");
}

function deleteCategory() {
    const select = document.getElementById("editCategorySelect");
    const selectedName = select ? select.value : "";
    if (!selectedName) { alert("请选择要删除的类型"); return; }
    
    const count = tasks.filter(t => t.category === selectedName).length;
    let msg = `确定删除类型 "${selectedName}"？`;
    if (count > 0) msg = `类型 "${selectedName}" 下有 ${count} 个任务，删除后任务也会被删除，确定吗？`;
    if (!confirm(msg)) return;
    
    tasks = tasks.filter(t => t.category !== selectedName);
    categories = categories.filter(c => c.name !== selectedName);
    if (currentFilter === selectedName) currentFilter = "all";
    
    closeEditModal();
    saveToLocal();
    updateAllUI();
}

// ========== 编辑任务功能 ==========
let currentEditTaskId = null;

function openEditTaskModal(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    currentEditTaskId = taskId;
    
    const idInput = document.getElementById("editTaskId");
    const textInput = document.getElementById("editTaskText");
    const dateInput = document.getElementById("editTaskDate");
    const timeSelect = document.getElementById("editTaskTimeSelect");
    const durationSelect = document.getElementById("editTaskDurationSelect");
    const prioritySelect = document.getElementById("editTaskPrioritySelect");
    
    if (idInput) idInput.value = taskId;
    if (textInput) textInput.value = task.text;
    if (dateInput) dateInput.value = task.date || getTodayDateStr();
    if (timeSelect) timeSelect.value = task.time || "";
    if (durationSelect) durationSelect.value = task.estimatedDuration || "";
    if (prioritySelect) prioritySelect.value = task.priority || 2;
    
    const categorySelect = document.getElementById("editTaskCategorySelect");
    if (categorySelect) {
        categorySelect.innerHTML = '<option value="">-- 请选择类型 --</option>';
        categories.forEach(cat => {
            const selected = task.category === cat.name ? 'selected' : '';
            categorySelect.innerHTML += `<option value="${escapeHtml(cat.name)}" ${selected}>${cat.emoji} ${escapeHtml(cat.name)}</option>`;
        });
    }
    
    const warningBox = document.getElementById("editTaskWarning");
    if (dateInput && warningBox) {
        dateInput.onchange = function() {
            warningBox.style.display = this.value !== task.date ? 'block' : 'none';
        };
    }
    
    const modal = document.getElementById("editTaskModal");
    if (modal) modal.style.display = "block";
}

function closeEditTaskModal() {
    const modal = document.getElementById("editTaskModal");
    if (modal) modal.style.display = "none";
    currentEditTaskId = null;
}

function saveEditTask() {
    if (!currentEditTaskId) return;
    
    const task = tasks.find(t => t.id === currentEditTaskId);
    if (!task) return;
    
    const textInput = document.getElementById("editTaskText");
    const categorySelect = document.getElementById("editTaskCategorySelect");
    const dateInput = document.getElementById("editTaskDate");
    const timeSelect = document.getElementById("editTaskTimeSelect");
    const durationSelect = document.getElementById("editTaskDurationSelect");
    const prioritySelect = document.getElementById("editTaskPrioritySelect");
    
    const newText = textInput ? textInput.value.trim() : "";
    if (!newText) {
        showToast("任务内容不能为空", "error");
        return;
    }
    
    const newCategory = categorySelect ? categorySelect.value : "";
    if (!newCategory) {
        showToast("请选择类型", "error");
        return;
    }
    
    const newDate = dateInput ? dateInput.value : "";
    if (!newDate) {
        showToast("请选择日期", "error");
        return;
    }
    
    const newTime = timeSelect ? timeSelect.value : "";
    const newDuration = durationSelect ? durationSelect.value : "";
    const newPriority = prioritySelect ? parseInt(prioritySelect.value) : 2;
    
    task.text = newText;
    task.category = newCategory;
    task.date = newDate;
    task.time = newTime;
    task.estimatedDuration = newDuration ? parseInt(newDuration) : null;
    task.priority = newPriority;
    
    saveToLocal();
    closeEditTaskModal();
    updateAllUI();
    updateWeeklyFromTasks();
    showToast("任务已更新", "success");
}

// ========== 任务操作 ==========
function addTask() {
    const textInput = document.getElementById("taskInput");
    const text = textInput ? textInput.value.trim() : "";
    if (!text) { alert("请输入待办内容"); return; }
    if (categories.length === 0) { alert("请先添加类型"); openAddModal(); return; }
    
    const categorySelect = document.getElementById("categorySelect");
    const category = categorySelect ? categorySelect.value : "";
    if (!category) { alert("请选择类型"); return; }
    
    let taskDate = document.getElementById("taskDate") ? document.getElementById("taskDate").value : "";
    if (!taskDate) taskDate = getTodayDateStr();
    
    const taskTime = document.getElementById("taskTimeSelect") ? document.getElementById("taskTimeSelect").value : "";
    const duration = document.getElementById("taskDurationSelect") ? document.getElementById("taskDurationSelect").value : "";
    const estimatedDuration = duration ? parseInt(duration) : null;
    const repeat = document.getElementById("repeatSelect") ? document.getElementById("repeatSelect").value : "none";
    const prioritySelect = document.getElementById("prioritySelect");
    const priority = prioritySelect ? parseInt(prioritySelect.value) : 2;
    
    const maxId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) : 0;
    const newId = maxId + 1;
    
    if (repeat === "daily") {
        const dailyId = Date.now();
        dailyTasks.push({
            id: dailyId,
            text: text,
            category: category
        });
        saveDailyTasks();
        
        for (let i = 0; i <= 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            
            tasks.push({
                id: newId + i,
                text: text,
                category: category,
                completed: false,
                date: dateStr,
                time: taskTime,
                estimatedDuration: estimatedDuration,
                priority: priority,
                repeat: "daily",
                parentId: dailyId
            });
        }
    } else {
        tasks.push({
            id: newId,
            text: text,
            category: category,
            completed: false,
            date: taskDate,
            time: taskTime,
            estimatedDuration: estimatedDuration,
            priority: priority,
            repeat: "none"
        });
    }
    
    if (textInput) textInput.value = "";
    const dateInput = document.getElementById("taskDate");
    if (dateInput) dateInput.value = getTodayDateStr();
    const timeSelect = document.getElementById("taskTimeSelect");
    if (timeSelect) timeSelect.value = "";
    const durationSelect = document.getElementById("taskDurationSelect");
    if (durationSelect) durationSelect.value = "";
    const prioritySel = document.getElementById("prioritySelect");
    if (prioritySel) prioritySel.value = "2";
    
    saveToLocal();
    updateAllUI();
    updateWeeklyFromTasks();
    showToast("任务添加成功", "success");
}

function clearCompleted() {
    const todayStr = getTodayDateStr();
    tasks = tasks.filter(t => !(t.date === todayStr && t.completed));
    saveToLocal();
    updateAllUI();
    updateWeeklyFromTasks();
    showToast("已清除今日已完成任务", "success");
}

function exportData() {
    const dataStr = JSON.stringify({ tasks, categories, weeklyData, dailyTasks }, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `todo_backup_${new Date().toISOString().slice(0,19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("导出成功", "success");
}

function resetAll() {
    if (confirm("重置将清空所有数据，确定吗？")) {
        tasks = [];
        categories = [];
        currentFilter = "all";
        weeklyData = {};
        dailyTasks = [];
        
        const resetKeys = [
            'smart_todo_data',
            'weekly_data',
            'current_week_start',
            'daily_tasks',
            'checkin_data',
            'fortune_data',
            'pomodoro_history',
            'weather_cache'
        ];
        
        resetKeys.forEach(key => {
            const actualKey = getActualKey(key);
            ORIGINAL_REMOVE(actualKey);
        });
        
        saveToLocal();
        updateAllUI();
        renderWeeklyTable();
        updateWeekRangeDisplay();
        updateHeatmapLastUpdate();
        showToast("所有数据已重置", "success");
    }
}

// ========== 视图切换 ==========
function switchView(view) {
    currentView = view;
    const listView = document.getElementById('todoList');
    const matrixView = document.getElementById('matrixView');
    const listBtn = document.getElementById('listViewBtn');
    const matrixBtn = document.getElementById('matrixViewBtn');
    
    if (view === 'list') {
        if (listView) listView.style.display = 'block';
        if (matrixView) matrixView.style.display = 'none';
        if (listBtn) listBtn.classList.add('active');
        if (matrixBtn) matrixBtn.classList.remove('active');
        renderTodoList();
    } else {
        if (listView) listView.style.display = 'none';
        if (matrixView) matrixView.style.display = 'block';
        if (listBtn) listBtn.classList.remove('active');
        if (matrixBtn) matrixBtn.classList.add('active');
        renderMatrixView();
    }
}

// ========== 四象限视图 ==========
function renderMatrixView() {
    const todayStr = getTodayDateStr();
    let todayTasks = tasks.filter(t => t.date === todayStr);
    
    if (currentFilter !== "all") {
        todayTasks = todayTasks.filter(t => t.category === currentFilter);
    }
    
    const quadrants = { 1: [], 2: [], 3: [], 4: [] };
    
    todayTasks.forEach(task => {
        const priority = task.priority || 2;
        quadrants[priority].push(task);
    });
    
    for (let i = 1; i <= 4; i++) {
        quadrants[i].sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            const timeA = getTaskTimestamp(a);
            const timeB = getTaskTimestamp(b);
            return timeA - timeB;
        });
    }
    
    for (let i = 1; i <= 4; i++) {
        const container = document.getElementById(`quadrant${i}Tasks`);
        if (!container) continue;
        
        const tasksInQuadrant = quadrants[i];
        
        if (tasksInQuadrant.length === 0) {
            container.innerHTML = '<div class="empty-quadrant">✨ 暂无任务</div>';
            continue;
        }
        
        let html = '';
        tasksInQuadrant.forEach(task => {
            const completedClass = task.completed ? "completed" : "";
            const displayText = task.repeat === "daily" ? `${escapeHtml(task.text)} (每日)` : escapeHtml(task.text);
            const timeTag = task.time && task.time !== "" ? `<span class="matrix-task-time">🕐 ${task.time}</span>` : "";
            
            html += `
                <div class="matrix-task-item" data-id="${task.id}">
                    <div class="matrix-task-info">
                        <input type="checkbox" class="matrix-task-check" ${task.completed ? "checked" : ""} data-id="${task.id}">
                        <span class="matrix-task-text ${completedClass}">${displayText}</span>
                        ${timeTag}
                        <span class="matrix-task-category">${getCategoryEmoji(task.category)} ${escapeHtml(task.category)}</span>
                    </div>
                    <div>
                        <button class="matrix-edit-btn" data-id="${task.id}">✏️</button>
                        <button class="matrix-delete-btn" data-id="${task.id}">🗑️</button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    }
    
    bindMatrixEvents();
}

function bindMatrixEvents() {
    document.querySelectorAll('.matrix-task-check').forEach(cb => {
        cb.removeEventListener('change', handleMatrixCheckChange);
        cb.addEventListener('change', handleMatrixCheckChange);
    });
    
    document.querySelectorAll('.matrix-delete-btn').forEach(btn => {
        btn.removeEventListener('click', handleMatrixDelete);
        btn.addEventListener('click', handleMatrixDelete);
    });
    
    document.querySelectorAll('.matrix-edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(btn.dataset.id);
            openEditTaskModal(id);
        });
    });
}

function handleMatrixCheckChange(e) {
    const id = parseInt(e.target.dataset.id);
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveToLocal();
        updateStats();
        renderTodoList();
        renderMatrixView();
        updateWeeklyFromTasks();
    }
}

function handleMatrixDelete(e) {
    const id = parseInt(e.target.closest('.matrix-delete-btn').dataset.id);
    tasks = tasks.filter(t => t.id !== id);
    saveToLocal();
    updateStats();
    renderTodoList();
    renderMatrixView();
    updateWeeklyFromTasks();
    showToast("任务已删除", "success");
}

function bindTodoListEvents() {
    document.querySelectorAll('.todo-check').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const id = parseInt(e.target.dataset.id);
            const task = tasks.find(t => t.id === id);
            if (task) {
                task.completed = !task.completed;
                saveToLocal();
                updateStats();
                renderTodoList();
                renderFutureTasks();
                updateWeeklyFromTasks();
            }
        });
    });
    
    document.querySelectorAll('.delete-task-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(btn.dataset.id);
            tasks = tasks.filter(t => t.id !== id);
            saveToLocal();
            updateStats();
            renderTodoList();
            renderFutureTasks();
            updateWeeklyFromTasks();
        });
    });
    
    document.querySelectorAll('.edit-task-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            openEditTaskModal(id);
        });
    });
}

// ========== Emoji面板 ==========
function renderEmojiPickers() {
    const addPicker = document.getElementById("addEmojiPicker");
    const editPicker = document.getElementById("editEmojiPicker");
    let html = "";
    commonEmojis.forEach(emoji => { html += `<span class="emoji-option" data-emoji="${emoji}">${emoji}</span>`; });
    if (addPicker) addPicker.innerHTML = html;
    if (editPicker) editPicker.innerHTML = html;
    
    document.querySelectorAll('#addEmojiPicker .emoji-option').forEach(el => {
        el.addEventListener('click', () => {
            const emojiInput = document.getElementById("addCategoryEmoji");
            const previewSpan = document.getElementById("addEmojiPreview");
            if (emojiInput) emojiInput.value = el.dataset.emoji;
            if (previewSpan) previewSpan.innerText = el.dataset.emoji;
            if (addPicker) addPicker.style.display = "none";
        });
    });
    document.querySelectorAll('#editEmojiPicker .emoji-option').forEach(el => {
        el.addEventListener('click', () => {
            const emojiInput = document.getElementById("editCategoryEmoji");
            const previewSpan = document.getElementById("editEmojiPreview");
            if (emojiInput) emojiInput.value = el.dataset.emoji;
            if (previewSpan) previewSpan.innerText = el.dataset.emoji;
            if (editPicker) editPicker.style.display = "none";
        });
    });
}

// ========== 设置默认日期 ==========
function setDefaultDate() {
    const dateInput = document.getElementById("taskDate");
    if (dateInput) {
        dateInput.value = getTodayDateStr();
    }
}

// ========== 初始化用户菜单 ==========
function initUserMenu() {
    const usernameDisplay = document.getElementById('usernameDisplay');
    const dropdownUsername = document.getElementById('dropdownUsername');
    const guestBadge = document.getElementById('guestBadge');
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userMenu = document.getElementById('userMenu');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (!usernameDisplay) return;
    
    const currentUser = getCurrentUser();
    const guest = isGuest();
    
    if (currentUser) {
        let displayName = currentUser;
        if (guest) {
            displayName = '访客';
            if (guestBadge) guestBadge.style.display = 'inline-block';
        } else {
            if (guestBadge) guestBadge.style.display = 'none';
        }
        usernameDisplay.textContent = displayName;
        if (dropdownUsername) dropdownUsername.textContent = currentUser;
    } else {
        usernameDisplay.textContent = '未登录';
        if (guestBadge) guestBadge.style.display = 'none';
    }
    
    if (userMenuBtn && userMenu) {
        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userMenu.classList.toggle('open');
        });
        
        document.addEventListener('click', () => {
            userMenu.classList.remove('open');
        });
        
        userMenu.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}

// ========== 事件绑定 ==========
function bindEvents() {
    const addBtn = document.getElementById("addBtn");
    if (addBtn) addBtn.addEventListener("click", addTask);
    
    const clearBtn = document.getElementById("clearCompletedBtn");
    if (clearBtn) clearBtn.addEventListener("click", clearCompleted);
    
    const exportBtn = document.getElementById("exportBtn");
    if (exportBtn) exportBtn.addEventListener("click", exportData);
    
    const resetBtn = document.getElementById("resetDataBtn");
    if (resetBtn) resetBtn.addEventListener("click", resetAll);
    
    const openAddBtn = document.getElementById("openAddCategoryBtn");
    if (openAddBtn) openAddBtn.addEventListener("click", openAddModal);
    
    const confirmAddBtn = document.getElementById("confirmAddCategoryBtn");
    if (confirmAddBtn) confirmAddBtn.addEventListener("click", addCategory);
    
    const cancelAddBtn = document.getElementById("cancelAddModalBtn");
    if (cancelAddBtn) cancelAddBtn.addEventListener("click", closeAddModal);
    
    const closeAddSpan = document.querySelector(".close-add-modal");
    if (closeAddSpan) closeAddSpan.addEventListener("click", closeAddModal);
    
    const openEditBtn = document.getElementById("openEditCategoryBtn");
    if (openEditBtn) openEditBtn.addEventListener("click", openEditModal);
    
    const confirmEditBtn = document.getElementById("confirmEditCategoryBtn");
    if (confirmEditBtn) confirmEditBtn.addEventListener("click", editCategory);
    
    const deleteCategoryBtn = document.getElementById("deleteCategoryInEditBtn");
    if (deleteCategoryBtn) deleteCategoryBtn.addEventListener("click", deleteCategory);
    
    const cancelEditBtn = document.getElementById("cancelEditModalBtn");
    if (cancelEditBtn) cancelEditBtn.addEventListener("click", closeEditModal);
    
    const closeEditSpan = document.querySelector(".close-edit-modal");
    if (closeEditSpan) closeEditSpan.addEventListener("click", closeEditModal);
    
    const addToggleBtn = document.getElementById("addToggleEmojiPickerBtn");
    if (addToggleBtn) {
        addToggleBtn.addEventListener("click", () => {
            const picker = document.getElementById("addEmojiPicker");
            if (picker) picker.style.display = picker.style.display === "flex" ? "none" : "flex";
        });
    }
    
    const editToggleBtn = document.getElementById("editToggleEmojiPickerBtn");
    if (editToggleBtn) {
        editToggleBtn.addEventListener("click", () => {
            const picker = document.getElementById("editEmojiPicker");
            if (picker) picker.style.display = picker.style.display === "flex" ? "none" : "flex";
        });
    }
    
    const taskInput = document.getElementById("taskInput");
    if (taskInput) {
        taskInput.addEventListener("keypress", (e) => { if (e.key === "Enter") addTask(); });
    }
    
    const fortuneCard = document.getElementById("fortuneCard");
    if (fortuneCard) fortuneCard.addEventListener("click", flipCard);
    
    const resetFortuneBtn = document.getElementById("resetFortuneBtn");
    if (resetFortuneBtn) resetFortuneBtn.addEventListener("click", resetFortune);
    
    const checkinBtn = document.getElementById("checkinBtn");
    if (checkinBtn) checkinBtn.addEventListener("click", doCheckin);
    
    const manualRecordBtn = document.getElementById("manualRecordBtn");
    if (manualRecordBtn) manualRecordBtn.addEventListener("click", openHeatmapModal);
    
    const resetWeekBtn = document.getElementById("resetWeekBtn");
    if (resetWeekBtn) resetWeekBtn.addEventListener("click", resetWeekData);
    
    const confirmHeatmapBtn = document.getElementById("confirmHeatmapBtn");
    if (confirmHeatmapBtn) confirmHeatmapBtn.addEventListener("click", saveHeatmapDataEntry);
    
    const cancelHeatmapBtn = document.getElementById("cancelHeatmapBtn");
    if (cancelHeatmapBtn) cancelHeatmapBtn.addEventListener("click", closeHeatmapModal);
    
    const closeHeatmapSpan = document.querySelector(".close-heatmap-modal");
    if (closeHeatmapSpan) closeHeatmapSpan.addEventListener("click", closeHeatmapModal);
    
    const manageDailyBtn = document.getElementById("manageDailyTasksBtn");
    if (manageDailyBtn) manageDailyBtn.addEventListener("click", openDailyTaskModal);
    
    const closeDailyModal = document.querySelector(".close-daily-modal");
    if (closeDailyModal) closeDailyModal.addEventListener("click", closeDailyTaskModal);
    
    const closeDailyModalBtn = document.getElementById("closeDailyModalBtn");
    if (closeDailyModalBtn) closeDailyModalBtn.addEventListener("click", closeDailyTaskModal);
    
    const closeEditTaskModalSpan = document.querySelector(".close-edit-task-modal");
    if (closeEditTaskModalSpan) closeEditTaskModalSpan.addEventListener("click", closeEditTaskModal);
    
    const cancelEditTaskBtn = document.getElementById("cancelEditTaskBtn");
    if (cancelEditTaskBtn) cancelEditTaskBtn.addEventListener("click", closeEditTaskModal);
    
    const confirmEditTaskBtn = document.getElementById("confirmEditTaskBtn");
    if (confirmEditTaskBtn) confirmEditTaskBtn.addEventListener("click", saveEditTask);
    
    const listViewBtn = document.getElementById('listViewBtn');
    if (listViewBtn) listViewBtn.addEventListener('click', () => switchView('list'));
    
    const matrixViewBtn = document.getElementById('matrixViewBtn');
    if (matrixViewBtn) matrixViewBtn.addEventListener('click', () => switchView('matrix'));
    
    window.addEventListener("click", (e) => {
        const addModal = document.getElementById("addCategoryModal");
        const editModal = document.getElementById("editCategoryModal");
        const heatmapModal = document.getElementById("heatmapModal");
        const dailyModal = document.getElementById("dailyTaskModal");
        const editTaskModal = document.getElementById("editTaskModal");
        
        if (e.target === addModal) closeAddModal();
        if (e.target === editModal) closeEditModal();
        if (e.target === heatmapModal) closeHeatmapModal();
        if (e.target === dailyModal) closeDailyTaskModal();
        if (e.target === editTaskModal) closeEditTaskModal();
    });
}

function updateCurrentDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const weekday = weekdays[now.getDay()];
    const dateSpan = document.getElementById("currentDate");
    if (dateSpan) dateSpan.innerText = `${year}.${month}.${day} ${weekday}`;
}

// ========== 未来任务时间线模块 ==========
function getWeekdayFromDate(dateStr) {
    const date = new Date(dateStr);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekdays[date.getDay()];
}

function getDaysRemaining(dateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(dateStr);
    targetDate.setHours(0, 0, 0, 0);
    const diffTime = targetDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function renderFutureTasks() {
    const container = document.getElementById("futureTasksList");
    if (!container) return;
    
    const today = getTodayDateStr();
    const futureTasksMap = new Map();
    
    tasks.forEach(task => {
        if (task.date && task.date > today && !task.completed && task.repeat !== "daily") {
            if (!futureTasksMap.has(task.date)) {
                futureTasksMap.set(task.date, []);
            }
            futureTasksMap.get(task.date).push(task);
        }
    });
    
    const sortedDates = Array.from(futureTasksMap.keys()).sort();
    
    if (sortedDates.length === 0) {
        container.innerHTML = '<div class="empty-future-state">✨ 暂无未来任务，添加任务时选择未来的日期即可</div>';
        return;
    }
    
    let html = "";
    sortedDates.forEach(dateStr => {
        const tasksForDate = futureTasksMap.get(dateStr);
        tasksForDate.sort((a, b) => (a.time || "00:00").localeCompare(b.time || "00:00"));
        
        const weekday = getWeekdayFromDate(dateStr);
        const daysRemaining = getDaysRemaining(dateStr);
        let dayText = "";
        if (daysRemaining === 1) dayText = "明天";
        else if (daysRemaining === 2) dayText = "后天";
        else dayText = `${daysRemaining}天后`;
        
        html += `
            <div class="future-date-group" data-date="${dateStr}">
                <div class="future-date-header">
                    <span class="future-date-icon">📅</span>
                    <span class="future-date-text">${formatDate(dateStr)}</span>
                    <span class="future-date-weekday">${weekday}</span>
                    <span style="font-size: 11px; color: #e67700; background: #fff3e0; padding: 2px 8px; border-radius: 20px;">${dayText}</span>
                </div>
                <div class="future-tasks-list">
        `;
        
        tasksForDate.forEach(task => {
            const completedClass = task.completed ? "completed" : "";
            const timeTag = task.time && task.time !== "" ? `<span style="font-size: 11px; color: #888;">🕐 ${task.time}</span>` : "";
            const durationTag = task.estimatedDuration ? `<span style="font-size: 11px; background: #f0e6ff; padding: 2px 8px; border-radius: 15px; color: #7c3aed;">⏱️ ${formatDuration(task.estimatedDuration)}</span>` : "";
            
            html += `
                <div class="future-task-item" data-id="${task.id}">
                    <div class="future-task-info">
                        <input type="checkbox" class="future-task-check" ${task.completed ? "checked" : ""} data-id="${task.id}">
                        <span class="future-task-text ${completedClass}">${escapeHtml(task.text)}</span>
                        ${timeTag}
                        ${durationTag}
                        <span class="future-task-category">${getCategoryEmoji(task.category)} ${escapeHtml(task.category)}</span>
                    </div>
                    <div>
                        <button class="future-edit-btn" data-id="${task.id}">✏️</button>
                        <button class="future-delete-btn" data-id="${task.id}">🗑️</button>
                    </div>
                </div>
            `;
        });
        
        html += `</div></div>`;
    });
    
    container.innerHTML = html;
    
    document.querySelectorAll('.future-task-check').forEach(cb => {
        cb.addEventListener('change', (e) => {
            e.stopPropagation();
            const id = parseInt(e.target.dataset.id);
            const task = tasks.find(t => t.id === id);
            if (task) {
                task.completed = !task.completed;
                saveToLocal();
                updateStats();
                renderTodoList();
                renderFutureTasks();
                updateWeeklyFromTasks();
            }
        });
    });
    
    document.querySelectorAll('.future-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            tasks = tasks.filter(t => t.id !== id);
            saveToLocal();
            updateStats();
            renderTodoList();
            renderFutureTasks();
            updateWeeklyFromTasks();
            showToast("任务已删除", "success");
        });
    });
    
    document.querySelectorAll('.future-edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            openEditTaskModal(id);
        });
    });
}

// ========== 天气功能 ==========
let isLocating = false;

const weatherCodeMap = {
    0: { desc: "晴朗", icon: "☀️" },
    1: { desc: "基本晴朗", icon: "🌤️" },
    2: { desc: "局部多云", icon: "⛅" },
    3: { desc: "多云", icon: "☁️" },
    45: { desc: "雾", icon: "🌫️" },
    48: { desc: "雾", icon: "🌫️" },
    51: { desc: "小雨", icon: "🌦️" },
    53: { desc: "中雨", icon: "🌧️" },
    55: { desc: "大雨", icon: "🌧️" },
    56: { desc: "冻雨", icon: "🌧️" },
    57: { desc: "强冻雨", icon: "🌧️" },
    61: { desc: "小雨", icon: "🌦️" },
    63: { desc: "中雨", icon: "🌧️" },
    65: { desc: "大雨", icon: "🌧️" },
    66: { desc: "冻雨", icon: "🌧️" },
    67: { desc: "强冻雨", icon: "🌧️" },
    71: { desc: "小雪", icon: "❄️" },
    73: { desc: "中雪", icon: "❄️" },
    75: { desc: "大雪", icon: "❄️" },
    77: { desc: "雪粒", icon: "❄️" },
    80: { desc: "阵雨", icon: "🌦️" },
    81: { desc: "中阵雨", icon: "🌧️" },
    82: { desc: "强阵雨", icon: "🌧️" },
    85: { desc: "阵雪", icon: "❄️" },
    86: { desc: "强阵雪", icon: "❄️" },
    95: { desc: "雷雨", icon: "⛈️" },
    96: { desc: "雷雨伴冰雹", icon: "⛈️" },
    99: { desc: "强雷雨伴冰雹", icon: "⛈️" }
};

function getWeatherInfo(code) {
    const info = weatherCodeMap[code];
    return info || { desc: "未知", icon: "🌡️" };
}

function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('浏览器不支持地理定位'));
            return;
        }
        
        const timeoutId = setTimeout(() => reject(new Error('定位超时')), 10000);
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                clearTimeout(timeoutId);
                resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude });
            },
            (error) => {
                clearTimeout(timeoutId);
                let errorMsg = '定位失败';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMsg = '请允许定位权限';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMsg = '无法获取位置信息';
                        break;
                    case error.TIMEOUT:
                        errorMsg = '定位超时';
                        break;
                }
                reject(new Error(errorMsg));
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
    });
}

async function fetchWeatherByCoords(latitude, longitude) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`;
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        
        if (data && data.current_weather) {
            const current = data.current_weather;
            const weatherInfo = getWeatherInfo(current.weathercode);
            return {
                temperature: Math.round(current.temperature),
                windspeed: current.windspeed,
                weatherDesc: weatherInfo.desc,
                weatherEmoji: weatherInfo.icon,
                weatherCode: current.weathercode
            };
        }
        return null;
    } catch (error) {
        console.error('获取天气失败:', error);
        return null;
    }
}

async function getCityName(latitude, longitude) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=zh-CN`, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error('逆地理编码失败');
        
        const data = await response.json();
        let city = '';
        if (data.address) {
            city = data.address.city || data.address.town || data.address.village || data.address.county || data.address.state || '';
        }
        return city || `${latitude.toFixed(1)}, ${longitude.toFixed(1)}`;
    } catch (error) {
        console.error('获取城市名失败:', error);
        return `${latitude.toFixed(1)}, ${longitude.toFixed(1)}`;
    }
}

function updateWeatherUI(weather, locationName) {
    const weatherLoading = document.getElementById('weatherLoading');
    const weatherContent = document.getElementById('weatherContent');
    const tempEl = document.getElementById('weatherTemp');
    const descEl = document.getElementById('weatherDesc');
    const locationEl = document.getElementById('weatherLocation');
    const detailEl = document.getElementById('weatherDetail');
    const weatherCard = document.getElementById('weatherCard');
    
    if (!weather) {
        if (weatherLoading) {
            weatherLoading.style.display = 'flex';
            weatherLoading.innerHTML = '<span class="weather-icon">⚠️</span><span>天气加载失败</span>';
        }
        if (weatherContent) weatherContent.style.display = 'none';
        return;
    }
    
    if (weatherLoading) weatherLoading.style.display = 'none';
    if (weatherContent) weatherContent.style.display = 'flex';
    
    if (tempEl) tempEl.innerHTML = `${weather.temperature}°C`;
    if (descEl) descEl.innerHTML = `${weather.weatherEmoji} ${weather.weatherDesc}`;
    
    let displayLocation = locationName || '当前位置';
    if (displayLocation.length > 10) displayLocation = displayLocation.substring(0, 8) + '..';
    if (locationEl) locationEl.innerHTML = `📍 ${displayLocation}`;
    if (detailEl) detailEl.innerHTML = `<span>💨 ${weather.windspeed} km/h</span>`;
    
    if (weatherCard) {
        const temp = weather.temperature;
        if (temp >= 28) weatherCard.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
        else if (temp >= 20) weatherCard.style.background = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
        else if (temp >= 10) weatherCard.style.background = 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)';
        else if (temp >= 0) weatherCard.style.background = 'linear-gradient(135deg, #5ee7df 0%, #b490ca 100%)';
        else weatherCard.style.background = 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)';
    }
}

async function loadWeather() {
    const weatherLoading = document.getElementById('weatherLoading');
    const weatherContent = document.getElementById('weatherContent');
    
    if (isLocating) return;
    isLocating = true;
    
    if (weatherLoading) {
        weatherLoading.style.display = 'flex';
        weatherLoading.innerHTML = '<span class="weather-icon">📍</span><span>获取位置中...</span>';
    }
    if (weatherContent) weatherContent.style.display = 'none';
    
    try {
        const actualKey = getActualKey('weather_cache');
        const cached = ORIGINAL_GET(actualKey);
        if (cached) {
            const cacheData = JSON.parse(cached);
            if (Date.now() - cacheData.timestamp < 30 * 60 * 1000) {
                updateWeatherUI(cacheData.weather, cacheData.locationName);
                isLocating = false;
                return;
            }
        }
        
        const location = await getUserLocation();
        if (weatherLoading) weatherLoading.innerHTML = '<span class="weather-icon">☁️</span><span>获取天气...</span>';
        
        const [weather, cityName] = await Promise.all([
            fetchWeatherByCoords(location.latitude, location.longitude),
            getCityName(location.latitude, location.longitude)
        ]);
        
        if (weather) {
            updateWeatherUI(weather, cityName);
            const actualKey = getActualKey('weather_cache');
            ORIGINAL_SET(actualKey, JSON.stringify({ weather, locationName: cityName, timestamp: Date.now() }));
        } else {
            throw new Error('天气数据为空');
        }
    } catch (error) {
        console.error('加载天气失败:', error);
        if (weatherLoading) {
            weatherLoading.innerHTML = '<span class="weather-icon">⚠️</span><span>加载失败，点击刷新</span>';
        }
        const actualKey = getActualKey('weather_cache');
        const cached = ORIGINAL_GET(actualKey);
        if (cached) {
            const cacheData = JSON.parse(cached);
            updateWeatherUI(cacheData.weather, cacheData.locationName);
            showToast('使用缓存天气数据', 'info');
        }
    } finally {
        isLocating = false;
    }
}

function refreshWeather() {
    const actualKey = getActualKey('weather_cache');
    ORIGINAL_REMOVE(actualKey);
    loadWeather();
    showToast('正在重新定位...', 'info');
}

function initWeather() {
    loadWeather();
    const refreshBtn = document.getElementById('refreshWeatherBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', refreshWeather);
}

// ========== 番茄钟功能 ==========
let pomodoroTimer = null;
let pomodoroTimeLeft = 25 * 60;
let pomodoroRunning = false;
let pomodoroCurrentTaskId = null;

function loadTodayPomodoroCount() {
    const today = getTodayDateStr();
    const actualKey = getActualKey("pomodoro_history");
    const stored = ORIGINAL_GET(actualKey);
    let history = stored ? JSON.parse(stored) : {};
    const todayCount = history[today] || 0;
    const countSpan = document.getElementById("todayPomodoroCount");
    if (countSpan) countSpan.innerText = todayCount;
    return todayCount;
}

function savePomodoroCount() {
    const today = getTodayDateStr();
    const actualKey = getActualKey("pomodoro_history");
    const stored = ORIGINAL_GET(actualKey);
    let history = stored ? JSON.parse(stored) : {};
    history[today] = (history[today] || 0) + 1;
    ORIGINAL_SET(actualKey, JSON.stringify(history));
    loadTodayPomodoroCount();
}

function updatePomodoroDisplay() {
    const timerEl = document.getElementById("pomodoroTimer");
    if (!timerEl) return;
    const minutes = Math.floor(pomodoroTimeLeft / 60);
    const seconds = pomodoroTimeLeft % 60;
    timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function finishPomodoro() {
    if (pomodoroTimer) clearInterval(pomodoroTimer);
    pomodoroRunning = false;
    
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.frequency.value = 880;
        gainNode.gain.value = 0.3;
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 1);
        oscillator.stop(audioCtx.currentTime + 1);
    } catch(e) { console.log("无法播放提示音"); }
    
    showToast("🍅 番茄钟完成！休息一下吧~", "success");
    savePomodoroCount();
    
    if (pomodoroCurrentTaskId) {
        const task = tasks.find(t => t.id === pomodoroCurrentTaskId);
        if (task && !task.completed && confirm(`番茄钟已完成！是否将任务「${task.text}」标记为完成？`)) {
            task.completed = true;
            saveToLocal();
            updateAllUI();
            showToast(`✅ 任务「${task.text}」已完成`, "success");
        }
    }
    
    pomodoroCurrentTaskId = null;
    updateTaskSelectVisibility();
    
    const startBtn = document.getElementById("pomodoroStartBtn");
    const pauseBtn = document.getElementById("pomodoroPauseBtn");
    if (startBtn) startBtn.style.display = "inline-block";
    if (pauseBtn) pauseBtn.style.display = "none";
}

function startPomodoro() {
    if (pomodoroRunning) return;
    if (pomodoroTimeLeft <= 0) resetPomodoro();
    pomodoroRunning = true;
    pomodoroTimer = setInterval(() => {
        if (pomodoroTimeLeft <= 1) finishPomodoro();
        else { pomodoroTimeLeft--; updatePomodoroDisplay(); }
    }, 1000);
    
    const startBtn = document.getElementById("pomodoroStartBtn");
    const pauseBtn = document.getElementById("pomodoroPauseBtn");
    if (startBtn) startBtn.style.display = "none";
    if (pauseBtn) pauseBtn.style.display = "inline-block";
}

function pausePomodoro() {
    if (!pomodoroRunning) return;
    if (pomodoroTimer) clearInterval(pomodoroTimer);
    pomodoroRunning = false;
    
    const startBtn = document.getElementById("pomodoroStartBtn");
    const pauseBtn = document.getElementById("pomodoroPauseBtn");
    if (startBtn) startBtn.style.display = "inline-block";
    if (pauseBtn) pauseBtn.style.display = "none";
}

function resetPomodoro() {
    if (pomodoroTimer) clearInterval(pomodoroTimer);
    pomodoroRunning = false;
    const customTimeInput = document.getElementById("pomodoroCustomTime");
    const customTime = customTimeInput ? parseInt(customTimeInput.value) : 25;
    pomodoroTimeLeft = (isNaN(customTime) ? 25 : customTime) * 60;
    updatePomodoroDisplay();
    
    const startBtn = document.getElementById("pomodoroStartBtn");
    const pauseBtn = document.getElementById("pomodoroPauseBtn");
    if (startBtn) startBtn.style.display = "inline-block";
    if (pauseBtn) pauseBtn.style.display = "none";
}

function setCustomPomodoroTime() {
    const customTimeInput = document.getElementById("pomodoroCustomTime");
    let minutes = customTimeInput ? parseInt(customTimeInput.value) : 25;
    if (isNaN(minutes) || minutes < 1) minutes = 25;
    if (minutes > 120) minutes = 120;
    if (customTimeInput) customTimeInput.value = minutes;
    
    const timeDisplay = document.getElementById("timeDisplayValue");
    if (timeDisplay) timeDisplay.innerText = minutes;
    
    if (!pomodoroRunning) {
        pomodoroTimeLeft = minutes * 60;
        updatePomodoroDisplay();
        showToast(`已设置为 ${minutes} 分钟`, "success");
    } else {
        showToast("请先暂停再进行设置", "info");
    }
}

function decreasePomodoroTime() {
    if (pomodoroRunning) { showToast("请先暂停再进行设置", "info"); return; }
    const customTimeInput = document.getElementById("pomodoroCustomTime");
    let currentVal = customTimeInput ? parseInt(customTimeInput.value) : 25;
    if (isNaN(currentVal)) currentVal = 25;
    if (currentVal > 1) {
        currentVal--;
        if (customTimeInput) customTimeInput.value = currentVal;
        const timeDisplay = document.getElementById("timeDisplayValue");
        if (timeDisplay) timeDisplay.innerText = currentVal;
        pomodoroTimeLeft = currentVal * 60;
        updatePomodoroDisplay();
    }
}

function increasePomodoroTime() {
    if (pomodoroRunning) { showToast("请先暂停再进行设置", "info"); return; }
    const customTimeInput = document.getElementById("pomodoroCustomTime");
    let currentVal = customTimeInput ? parseInt(customTimeInput.value) : 25;
    if (isNaN(currentVal)) currentVal = 25;
    if (currentVal < 120) {
        currentVal++;
        if (customTimeInput) customTimeInput.value = currentVal;
        const timeDisplay = document.getElementById("timeDisplayValue");
        if (timeDisplay) timeDisplay.innerText = currentVal;
        pomodoroTimeLeft = currentVal * 60;
        updatePomodoroDisplay();
    }
}

function updatePomodoroTaskList() {
    const taskList = document.getElementById("pomodoroTaskList");
    if (!taskList) return;
    const todayStr = getTodayDateStr();
    const todayUnfinishedTasks = tasks.filter(t => t.date === todayStr && !t.completed && t.repeat !== "daily");
    let html = '<option value="">-- 选择任务（可选）--</option>';
    todayUnfinishedTasks.forEach(task => { html += `<option value="${task.id}">${escapeHtml(task.text)}</option>`; });
    taskList.innerHTML = html;
}

function updateTaskSelectVisibility() {
    const selectContainer = document.getElementById("pomodoroTaskSelect");
    if (!selectContainer) return;
    const todayStr = getTodayDateStr();
    const hasUnfinishedTasks = tasks.some(t => t.date === todayStr && !t.completed && t.repeat !== "daily");
    selectContainer.style.display = hasUnfinishedTasks ? "block" : "none";
}

function onPomodoroTaskChange() {
    const taskList = document.getElementById("pomodoroTaskList");
    const taskId = taskList ? taskList.value : null;
    pomodoroCurrentTaskId = taskId ? parseInt(taskId) : null;
}

function initPomodoro() {
    loadTodayPomodoroCount();
    pomodoroTimeLeft = 25 * 60;
    updatePomodoroDisplay();
    
    const customTimeInput = document.getElementById("pomodoroCustomTime");
    if (customTimeInput) customTimeInput.value = 25;
    const timeDisplay = document.getElementById("timeDisplayValue");
    if (timeDisplay) timeDisplay.innerText = 25;
    
    updatePomodoroTaskList();
    updateTaskSelectVisibility();
    
    const startBtn = document.getElementById("pomodoroStartBtn");
    const pauseBtn = document.getElementById("pomodoroPauseBtn");
    const resetBtn = document.getElementById("pomodoroResetBtn");
    const setBtn = document.getElementById("pomodoroSetBtn");
    const decreaseBtn = document.getElementById("pomodoroDecreaseBtn");
    const increaseBtn = document.getElementById("pomodoroIncreaseBtn");
    const taskList = document.getElementById("pomodoroTaskList");
    
    if (startBtn) startBtn.addEventListener("click", startPomodoro);
    if (pauseBtn) pauseBtn.addEventListener("click", pausePomodoro);
    if (resetBtn) resetBtn.addEventListener("click", resetPomodoro);
    if (setBtn) setBtn.addEventListener("click", setCustomPomodoroTime);
    if (decreaseBtn) decreaseBtn.addEventListener("click", decreasePomodoroTime);
    if (increaseBtn) increaseBtn.addEventListener("click", increasePomodoroTime);
    if (taskList) taskList.addEventListener("change", onPomodoroTaskChange);
}

function updatePomodoroOnTaskChange() {
    updatePomodoroTaskList();
    updateTaskSelectVisibility();
}

// ========== 今日诗词 ==========
function loadDailyPoem() {
    const poemLineEl = document.getElementById('poemLine');
    const poemAuthorEl = document.getElementById('poemAuthor');
    if (!poemLineEl) return;
    
    poemLineEl.textContent = '';
    poemLineEl.classList.remove('typing');
    if (poemAuthorEl) poemAuthorEl.textContent = '';
    if (poemAuthorEl) poemAuthorEl.classList.remove('fade-in');
    poemLineEl.textContent = '正在寻访佳句...';
    poemLineEl.classList.add('poem-loading');
    
    if (typeof jinrishici !== 'undefined') {
        jinrishici.load(function(result) {
            const content = result.data.content;
            const dynasty = result.data.origin.dynasty;
            const author = result.data.origin.author;
            const title = result.data.origin.title;
            
            poemLineEl.classList.remove('poem-loading');
            poemLineEl.textContent = '';
            setTimeout(() => {
                poemLineEl.textContent = content;
                poemLineEl.classList.add('typing');
                const typingDuration = Math.min(content.length * 60, 2000);
                setTimeout(() => {
                    if (poemAuthorEl) poemAuthorEl.textContent = `${dynasty} · ${author}《${title}》`;
                    if (poemAuthorEl) poemAuthorEl.classList.add('fade-in');
                }, typingDuration);
            }, 50);
        }, function(err) {
            console.error('诗词加载失败:', err);
            poemLineEl.classList.remove('poem-loading', 'typing');
            poemLineEl.textContent = '今日无诗，静待佳句';
            if (poemAuthorEl) poemAuthorEl.textContent = '明日再来';
            if (poemAuthorEl) poemAuthorEl.classList.add('fade-in');
        });
    } else {
        const fallbackContent = '采菊东篱下，悠然见南山';
        poemLineEl.classList.remove('poem-loading');
        poemLineEl.textContent = '';
        setTimeout(() => {
            poemLineEl.textContent = fallbackContent;
            poemLineEl.classList.add('typing');
            setTimeout(() => {
                if (poemAuthorEl) poemAuthorEl.textContent = '魏晋 · 陶渊明《饮酒》';
                if (poemAuthorEl) poemAuthorEl.classList.add('fade-in');
            }, Math.min(fallbackContent.length * 60, 2000));
        }, 50);
    }
}

function resetPoemAnimation() {
    const poemLineEl = document.getElementById('poemLine');
    if (poemLineEl && poemLineEl.classList.contains('typing')) loadDailyPoem();
}

window.addEventListener('focus', resetPoemAnimation);

// ========== 初始化 ==========
function init() {
    ensureUserDataExists();
    initUserMenu();
    loadFromLocal();
    loadDailyTasks();
    loadFortuneFromLocal();
    loadCheckinData();
    loadWeeklyData();
    generateDailyTaskInstances();
    saveToLocal();
    updateAllUI();
    bindEvents();
    renderEmojiPickers();
    autoRecordToday();
    updateCurrentDate();
    setDefaultDate();
    initWeather();
    initPomodoro();
}

init();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(loadDailyPoem, 500); });
} else {
    setTimeout(loadDailyPoem, 500);
}

// ========== 账号快速切换功能 ==========

// 获取所有已注册用户
function getAllRegisteredUsers() {
    const usersStr = ORIGINAL_GET('todo_users');
    if (usersStr) {
        const users = JSON.parse(usersStr);
        return Object.keys(users);
    }
    return [];
}

// 切换账号
function switchToAccount(username) {
    if (!username) return;
    const users = getAllRegisteredUsers();
    if (!users.includes(username)) {
        showToast('用户不存在', 'error');
        return;
    }
    if (confirm(`确定要切换到账号 "${username}" 吗？页面将会刷新。`)) {
        ORIGINAL_SET('current_user', username);
        ORIGINAL_REMOVE('is_guest');
        window.location.reload();
    }
}

// 更新用户菜单，添加快速切换账号列表
function updateUserMenuWithSwitch() {
    const userDropdown = document.getElementById('userDropdown');
    if (!userDropdown) return;
    
    const currentUser = getCurrentUser();
    const allUsers = getAllRegisteredUsers();
    
    const userInfoDiv = userDropdown.querySelector('.user-info');
    const divider = userDropdown.querySelector('.dropdown-divider');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (!userInfoDiv || !divider || !logoutBtn) return;
    
    // 移除已有的切换账号区域
    const existingSwitchSection = userDropdown.querySelector('.switch-account-section');
    if (existingSwitchSection) existingSwitchSection.remove();
    
    // 如果已注册用户数量 <= 1，不显示切换区域
    if (allUsers.length <= 1) return;
    
    const switchSection = document.createElement('div');
    switchSection.className = 'switch-account-section';
    switchSection.style.cssText = 'border-top: 1px solid #f0f0f0; margin-top: 4px;';
    
    const title = document.createElement('div');
    title.textContent = '快速切换账号';
    title.style.cssText = 'padding: 8px 16px; font-size: 11px; color: #999; border-bottom: 1px solid #f0f0f0;';
    switchSection.appendChild(title);
    
    const otherUsers = allUsers.filter(u => u !== currentUser);
    const displayUsers = otherUsers.slice(0, 5);
    
    displayUsers.forEach(user => {
        const switchBtn = document.createElement('button');
        switchBtn.className = 'dropdown-item switch-account-item';
        switchBtn.innerHTML = `🔄 ${escapeHtml(user)}`;
        switchBtn.style.fontSize = '12px';
        switchBtn.addEventListener('click', () => switchToAccount(user));
        switchSection.appendChild(switchBtn);
    });
    
    if (displayUsers.length === 0 && otherUsers.length > 0) {
        const moreHint = document.createElement('div');
        moreHint.textContent = `还有 ${otherUsers.length} 个其他账号...`;
        moreHint.style.cssText = 'padding: 8px 16px; font-size: 11px; color: #aaa; text-align: center;';
        switchSection.appendChild(moreHint);
    }
    
    // 添加访客模式入口
    const guestDivider = document.createElement('div');
    guestDivider.style.cssText = 'height: 1px; background: #f0f0f0; margin: 4px 0;';
    switchSection.appendChild(guestDivider);
    
    const guestModeBtn = document.createElement('button');
    guestModeBtn.className = 'dropdown-item';
    guestModeBtn.innerHTML = '👋 访客模式';
    guestModeBtn.style.color = '#17a2b8';
    guestModeBtn.addEventListener('click', () => {
        if (confirm('切换到访客模式会创建一个临时账号，当前账号数据不会丢失，确定要进入访客模式吗？')) {
            const guestId = 'guest_' + Date.now();
            ORIGINAL_SET('current_user', guestId);
            ORIGINAL_SET('is_guest', 'true');
            ORIGINAL_SET(`smart_todo_data_user_${guestId}`, JSON.stringify({ tasks: [], categories: [] }));
            ORIGINAL_SET(`weekly_data_user_${guestId}`, JSON.stringify({}));
            ORIGINAL_SET(`daily_tasks_user_${guestId}`, JSON.stringify([]));
            ORIGINAL_SET(`checkin_data_user_${guestId}`, JSON.stringify({ lastCheckinDate: null, streak: 0 }));
            ORIGINAL_SET(`fortune_data_user_${guestId}`, JSON.stringify({}));
            ORIGINAL_SET(`pomodoro_history_user_${guestId}`, JSON.stringify({}));
            ORIGINAL_SET(`weather_cache_user_${guestId}`, JSON.stringify({}));
            window.location.reload();
        }
    });
    switchSection.appendChild(guestModeBtn);
    
    userDropdown.insertBefore(switchSection, logoutBtn);
}

// 替换原来的用户菜单初始化函数
function initUserMenuWithSwitch() {
    const usernameDisplay = document.getElementById('usernameDisplay');
    const dropdownUsername = document.getElementById('dropdownUsername');
    const guestBadge = document.getElementById('guestBadge');
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userMenu = document.getElementById('userMenu');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (!usernameDisplay) return;
    
    const currentUser = getCurrentUser();
    const guest = isGuest();
    
    if (currentUser) {
        let displayName = currentUser;
        if (guest) {
            displayName = '访客';
            if (guestBadge) guestBadge.style.display = 'inline-block';
        } else {
            if (guestBadge) guestBadge.style.display = 'none';
        }
        usernameDisplay.textContent = displayName;
        if (dropdownUsername) dropdownUsername.textContent = currentUser;
    } else {
        usernameDisplay.textContent = '未登录';
        if (guestBadge) guestBadge.style.display = 'none';
    }
    
    if (userMenuBtn && userMenu) {
        // 移除旧事件，重新绑定
        const newBtn = userMenuBtn.cloneNode(true);
        userMenuBtn.parentNode.replaceChild(newBtn, userMenuBtn);
        
        newBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userMenu.classList.toggle('open');
            updateUserMenuWithSwitch();
        });
        
        document.addEventListener('click', () => userMenu.classList.remove('open'));
        userMenu.addEventListener('click', (e) => e.stopPropagation());
    }
    
    if (logoutBtn) {
        const newLogoutBtn = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
        newLogoutBtn.addEventListener('click', logout);
    }
}

// 覆盖原函数并重新初始化
window.initUserMenu = initUserMenuWithSwitch;

// 重新初始化用户菜单（页面加载后）
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (typeof initUserMenuWithSwitch === 'function') {
                initUserMenuWithSwitch();
            }
        }, 100);
    });
} else {
    setTimeout(() => {
        if (typeof initUserMenuWithSwitch === 'function') {
            initUserMenuWithSwitch();
        }
    }, 100);
}