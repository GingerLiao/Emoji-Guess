// IMPORTANT: REPLACE WITH YOUR FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyBkWrTsvDq1O50mHmIlJahpplKpA_5pnFw",
  authDomain: "emoji-c5e21.firebaseapp.com",
  databaseURL: "https://emoji-c5e21-default-rtdb.firebaseio.com",
  projectId: "emoji-c5e21",
  storageBucket: "emoji-c5e21.firebasestorage.app",
  messagingSenderId: "56957008856",
  appId: "1:56957008856:web:5987539bc2198b7b69d0ad"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// --- Global Variables and State ---
let allQuestions = [];
let currentUser = null;
let currentUsername = '訪客';
let isGuest = true;
let userListeners = []; // To store Firebase listeners for easy cleanup
let userStatusRef = null; // For presence system
let roomInvitesListener = null; // For listening to incoming room invites
let activeRoomInviteData = null; // Stores current active invite being shown on popup
let roomInviteTimeoutId = null; // For the 10s notification timeout
let roomInviteTimerIntervalId = null; // For the 1s countdown display

// Single Player State
let spCurrentQuestionIndex;
let spScore;
let spLives;
let spHintsLeft;
let spTimerInterval;
let spTimeLeft;
let spQuestions = [];
let spHighScore = 0;

// Multiplayer State
let currentRoomId = null;
let currentRoomData = null; // Holds the live data of the current room
let roomListener = null;    // Listener for the entire room object
let mpGameDataListener = null; // Listener specifically for gameData within a room
let mpTimerInterval = null;
let mpTimeLeft = 0;
const MP_TOTAL_QUESTIONS = 15;
const MAX_PLAYERS_PER_ROOM = 5;
const MP_MAX_HINTS_PER_PLAYER = 2;

// Friends State
let friendsList = {}; // { uid: username }
let friendStatuses = {}; // { uid: 'online_idle' | 'online_in_room_waiting' | 'online_in_game' | 'offline' }
let friendStatusListeners = {}; // Stores { friendUid: { ref: ..., callback: ... } }
let friendRequestsReceived = {}; // { uid: { senderUsername: username, timestamp: ... } }
let friendsListener = null;
let friendRequestsListener = null; // Keep this for friend request notifications
const sentRoomInvitesCooldown = {}; // { 'friendUid_roomId': timestamp }

// Friend Request Notification Popup Variables
let friendRequestNotificationPopup = null;
let friendRequestMessage = null;
let friendRequestTimerDisplay = null;
let acceptFriendRequestButton = null;
let declineFriendRequestButton = null;
let closeFriendRequestPopupButton = null;

let activeFriendRequestData = null; // Stores current active request being shown on popup
let friendRequestTimeoutId = null; // For the 10s notification timeout
let friendRequestTimerIntervalId = null; // For the 1s countdown display

// Leaderboard State
let leaderboardData = [];
let leaderboardListener = null;
let userRank = null;

// --- DOM Elements ---
const loadingOverlay = document.getElementById('loading-overlay');

const authPage = document.getElementById('auth-page');
const loginView = document.getElementById('login-view');
const registerView = document.getElementById('register-view');
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const loginButton = document.getElementById('login-button');
const guestLoginButton = document.getElementById('guest-login-button');
const showRegisterLink = document.getElementById('show-register-link');
const loginError = document.getElementById('login-error');
const registerUsernameInput = document.getElementById('register-username');
const registerEmailInput = document.getElementById('register-email');
const registerPasswordInput = document.getElementById('register-password');
const registerButton = document.getElementById('register-button');
const showLoginLink = document.getElementById('show-login-link');
const registerError = document.getElementById('register-error');

const currentUserInfoDiv = document.getElementById('current-user-info');
const userDisplay = document.getElementById('user-display');
const logoutButton = document.getElementById('logout-button');

const mainMenuPage = document.getElementById('main-menu');
const welcomeMessage = document.getElementById('welcome-message');
const singlePlayerButton = document.getElementById('single-player-button');
const multiplayerButton = document.getElementById('multiplayer-button');
const friendsButton = document.getElementById('friends-button');
const spHighScoreDisplay = document.getElementById('single-player-highscore-display');
const mainMenuLoginButton = document.getElementById('main-menu-login-button');

// New Leaderboard Elements
const leaderboardContainer = document.createElement('div');
leaderboardContainer.id = 'leaderboard-container';
const leaderboardList = document.createElement('ol');
leaderboardList.id = 'leaderboard-list';
const leaderboardTitle = document.createElement('h3');
leaderboardTitle.textContent = '單人模式排行榜';
leaderboardTitle.style.color = '#E0E0E0';
leaderboardTitle.style.marginBottom = '10px';
leaderboardContainer.appendChild(leaderboardTitle);
leaderboardContainer.appendChild(leaderboardList);

const spGameOverPage = document.getElementById('sp-game-over-page');
const spGameOverMessage = document.getElementById('sp-game-over-message');
const spFinalScoreDisplay = document.getElementById('sp-final-score-display');
const spReturnToMainMenuButton = document.getElementById('sp-return-to-main-menu-button');

const friendsPage = document.getElementById('friends-page');
const friendSearchInput = document.getElementById('friend-search-input');
const friendSearchResultsDiv = document.getElementById('friend-search-results');
const friendsListUl = document.getElementById('friends-list');
const noFriendsP = document.getElementById('no-friends');
const friendsBackButton = document.getElementById('friends-back-button');

const singlePlayerGamePage = document.getElementById('single-player-game');
const spCategory = document.getElementById('sp-category');
const spEmojis = document.getElementById('sp-emojis');
const spTimerDisplay = document.getElementById('sp-timer');
const spLivesDisplay = document.getElementById('sp-lives');
const spScoreDisplay = document.getElementById('sp-score');
const spAnswerInput = document.getElementById('sp-answer-input');
const spSubmitAnswerButton = document.getElementById('sp-submit-answer');
const spHintButton = document.getElementById('sp-hint-button');
const spHintText = document.getElementById('sp-hint-text');
const spMessage = document.getElementById('sp-message');
const spQuitButton = document.getElementById('sp-quit-button');

const multiplayerLobbyPage = document.getElementById('multiplayer-lobby');
const roomIdInput = document.getElementById('room-id-input');
const joinRoomButton = document.getElementById('join-room-button');
const createRoomButton = document.getElementById('create-room-button');
const inviteFriendInfoP = document.getElementById('invite-friend-info');
const lobbyBackButton = document.getElementById('lobby-back-button');
const lobbyMessageP = document.getElementById('lobby-message');

const multiplayerRoomPage = document.getElementById('multiplayer-room');
const roomTitle = document.getElementById('room-title');
const roomHostDisplay = document.getElementById('room-host');
const roomIdDisplayForInvite = document.getElementById('room-id-display-for-invite');
const playerListUl = document.getElementById('player-list');
const readyButton = document.getElementById('ready-button');
const startGameButton = document.getElementById('start-game-button');
const leaveRoomButton = document.getElementById('leave-room-button');
const roomMessageP = document.getElementById('room-message');
const mpInviteFriendButton = document.getElementById('mp-invite-friend-button');
const mpRoomFriendInviteListContainer = document.getElementById('mp-room-friend-invite-list-container');
const mpRoomFriendInviteListUl = document.getElementById('mp-room-friend-invite-list');

const multiplayerGamePage = document.getElementById('multiplayer-game');
const mpCategory = document.getElementById('mp-category');
const mpEmojis = document.getElementById('mp-emojis');
const mpTimerDisplay = document.getElementById('mp-timer');
const mpCurrentRoundDisplay = document.getElementById('mp-current-round');
const mpAnswerInput = document.getElementById('mp-answer-input');
const mpSubmitAnswerButton = document.getElementById('mp-submit-answer');
const mpHintButtonGame = document.getElementById('mp-hint-button-game');
const mpHintText = document.getElementById('mp-hint-text');
const mpMessage = document.getElementById('mp-message');
const mpPlayerScoresUl = document.getElementById('mp-player-scores');
const mpLeaderboardContainer = document.getElementById('mp-leaderboard-container');
const mpLeaderboardDiv = document.getElementById('mp-leaderboard');
const mpReturnToRoomButton = document.getElementById('mp-return-to-room-button');
const mpLeaveGameButton = document.getElementById('mp-leave-game-button');

// Room Invite Notification Popup Elements
const roomInviteNotificationPopup = document.getElementById('room-invite-notification-popup');
const roomInviteMessage = document.getElementById('room-invite-message');
const roomInviteTimerDisplay = document.getElementById('room-invite-timer');
const acceptRoomInviteButton = document.getElementById('accept-room-invite-button');
const declineRoomInviteButton = document.getElementById('decline-room-invite-button');
const roomInviteBannerCloseButton = document.getElementById('room-invite-banner-close-button'); // New close button

// Friend Request Notification Popup Elements (assuming it remains a modal)
friendRequestNotificationPopup = document.getElementById('friend-request-notification-popup');
friendRequestMessage = document.getElementById('friend-request-message');
friendRequestTimerDisplay = document.getElementById('friend-request-timer');
acceptFriendRequestButton = document.getElementById('accept-friend-request-button');
declineFriendRequestButton = document.getElementById('decline-friend-request-button');
closeFriendRequestPopupButton = document.getElementById('close-friend-request-popup');


// --- Utility Functions ---
function showLoading(message = "載入中...") {
    loadingOverlay.querySelector('p').textContent = message;
    loadingOverlay.classList.remove('hidden');
}
function hideLoading() {
    loadingOverlay.classList.add('hidden');
}

function showPage(pageElement) {
    authPage.classList.add('hidden');
    mainMenuPage.classList.add('hidden');
    friendsPage.classList.add('hidden');
    singlePlayerGamePage.classList.add('hidden');
    multiplayerLobbyPage.classList.add('hidden');
    multiplayerRoomPage.classList.add('hidden');
    multiplayerGamePage.classList.add('hidden');
    spGameOverPage.classList.add('hidden');

    if (pageElement) {
        pageElement.classList.remove('hidden');
    }
    window.scrollTo(0, 0);
}

function displayMessage(element, message, isError = true) {
    if (!element) return;
    element.textContent = message;
    if (isError) {
        element.className = 'error-message'; 
    } else {
        element.className = 'success-message'; 
    }
    element.classList.remove('hidden'); 
}
function clearMessage(element) {
    if (!element) return;
    element.textContent = '';
    element.classList.add('hidden'); 
    element.className = 'message-area'; 
}

function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

async function detachUserFirebaseListeners() {
    userListeners.forEach(listener => {
        if (listener.ref && listener.eventType && listener.callback) {
            listener.ref.off(listener.eventType, listener.callback);
        }
    });
    userListeners = [];

    if (userStatusRef) {
        await userStatusRef.onDisconnect().cancel();
        await userStatusRef.set('offline');
        userStatusRef = null;
    }

    if (roomInvitesListener && currentUser) {
        db.ref(`room_invites/${currentUser.uid}`).off('value', roomInvitesListener);
        roomInvitesListener = null;
    }

    if (friendRequestsListener && currentUser) {
         db.ref(`users/${currentUser.uid}/friend_invites_received`).off('value', friendRequestsListener);
    }
    friendRequestsListener = null;


    Object.values(friendStatusListeners).forEach(listenerInfo => {
        if (listenerInfo && listenerInfo.ref && listenerInfo.callback) {
            listenerInfo.ref.off('value', listenerInfo.callback);
        }
    });
    friendStatusListeners = {};

    if (roomListener && roomListener.roomId) {
        db.ref(`rooms/${roomListener.roomId}`).off('value', roomListener.callback);
        roomListener = null;
    }
    if (mpGameDataListener && mpGameDataListener.roomId) {
        db.ref(`rooms/${mpGameDataListener.roomId}/gameData`).off('value', mpGameDataListener.callback);
        mpGameDataListener = null;
    }

    if (friendsListener && currentUser) {
        db.ref(`users/${currentUser.uid}/friends`).off('value', friendsListener);
    }
    friendsListener = null;
}


// --- Load Questions ---
async function loadQuestions() {
    showLoading("正在載入題目...");
    try {
        const response = await fetch('question_data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        allQuestions = data.questions;
        console.log("題目載入完成!");
    } catch (error) {
        console.error("無法載入題目:", error);
        if (loginError && !loginError.classList.contains('hidden')) { 
            displayMessage(loginError, "無法載入遊戲題目，請稍後再試", true);
        } else if (welcomeMessage) { 
            displayMessage(welcomeMessage, "無法載入遊戲題目，請稍後再試", true);
        }
        allQuestions = [];
    } finally {
        hideLoading();
    }
}

// --- User Presence System ---
async function updateUserStatus(status) {
    if (currentUser && userStatusRef) {
        try {
            await userStatusRef.set(status);
        } catch (err) {
            console.error("Error setting user status:", err);
        }
    }
}

async function initializePresenceSystem() {
    if (!currentUser || userStatusRef) return;

    userStatusRef = db.ref(`/users/${currentUser.uid}/status`);
    const connectedRef = db.ref('.info/connected');

    const presenceCallback = async (snap) => {
        if (snap.val() === true) {
            try {
                await userStatusRef.onDisconnect().set('offline');
                if (currentRoomId && currentRoomData) {
                    if (currentRoomData.status === 'playing') {
                        await updateUserStatus('online_in_game');
                    } else {
                        await updateUserStatus('online_in_room_waiting');
                    }
                } else {
                    await updateUserStatus('online_idle');
                }
            } catch (err) {
                console.error("Error setting up onDisconnect or initial status:", err);
            }
        }
    };
    connectedRef.on('value', presenceCallback);
    userListeners.push({ ref: connectedRef, eventType: 'value', callback: presenceCallback });
}


// --- Authentication ---
auth.onAuthStateChanged(async user => {
    showLoading("正在驗證使用者...");
    await detachUserFirebaseListeners();

    if (user) {
        currentUser = user;
        isGuest = false;
        try {
            const usernameSnapshot = await db.ref(`users/${user.uid}/profile/username`).once('value');
            currentUsername = usernameSnapshot.val() || '玩家';

            userDisplay.textContent = `你好, ${currentUsername}`;
            currentUserInfoDiv.classList.remove('hidden');
            multiplayerButton.disabled = false;
            friendsButton.disabled = false;
            mainMenuLoginButton.classList.add('hidden');

            await initializePresenceSystem();
            initializeRoomInviteListener();
            initializeFriendRequestListener(); 
            await loadUserHighScore();
            initializeFriendsSystem(); 

            showPage(mainMenuPage);
            welcomeMessage.textContent = `歡迎回來, ${currentUsername}!`;

        } catch (error) {
            console.error("取得使用者資料失敗:", error);
            displayMessage(loginError, "無法取得使用者資料", true);
            auth.signOut();
        }
    } else {
        currentUser = null;
        currentUsername = '訪客';
        isGuest = true;
        userDisplay.textContent = '';
        currentUserInfoDiv.classList.add('hidden');
        multiplayerButton.disabled = true;
        friendsButton.disabled = true;
        mainMenuLoginButton.classList.remove('hidden');

        loadGuestHighScore();
        showPage(authPage);
        loginView.classList.remove('hidden');
        registerView.classList.add('hidden');
        clearMessage(loginError);
        clearMessage(registerError);
    }
    hideLoading();
});

mainMenuLoginButton.addEventListener('click', () => {
    showPage(authPage);
});

showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginView.classList.add('hidden');
    registerView.classList.remove('hidden');
    clearMessage(loginError);
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerView.classList.add('hidden');
    loginView.classList.remove('hidden');
    clearMessage(registerError);
});

loginButton.addEventListener('click', () => {
    const email = loginEmailInput.value;
    const password = loginPasswordInput.value;
    clearMessage(loginError);
    if (!email || !password) {
        displayMessage(loginError, "請輸入 Email 和密碼");
        return;
    }
    showLoading("登入中...");
    auth.signInWithEmailAndPassword(email, password)
        .catch(error => {
            displayMessage(loginError, `登入失敗`);
            console.error("Login error:", error);
        })
        .finally(hideLoading);
});

registerButton.addEventListener('click', async () => {
    const username = registerUsernameInput.value.trim();
    const email = registerEmailInput.value.trim();
    const password = registerPasswordInput.value;
    clearMessage(registerError);

    if (!username || !email || !password) {
        displayMessage(registerError, "所有欄位均為必填");
        return;
    }
    if (username.length < 2 || username.length > 10) {
        displayMessage(registerError, "使用者名稱必須是 2-10 個字元");
        return;
    }
    if (password.length < 6) {
        displayMessage(registerError, "密碼至少需要 6 個字元");
        return;
    }

    showLoading("註冊中...");
    try {
        const usernameSnapshot = await db.ref(`usernames/${username}`).once('value');
        if (usernameSnapshot.exists()) {
            displayMessage(registerError, "此使用者名稱已被使用");
            hideLoading();
            return;
        }

        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        const userProfileData = {
            username: username,
            email: user.email
        };
        const updates = {};
        updates[`users/${user.uid}/profile`] = userProfileData;
        updates[`users/${user.uid}/status`] = 'online_idle';
        updates[`usernames/${username}`] = user.uid;

        await db.ref().update(updates);
        console.log("註冊成功!");
    } catch (error) {
        displayMessage(registerError, `註冊失敗: ${mapAuthError(error.code)}`);
        console.error("Register error:", error);
    } finally {
        hideLoading();
    }
});

logoutButton.addEventListener('click', async () => {
    showLoading("登出中...");
    if (userStatusRef) {
        await userStatusRef.set('offline').catch(err => console.warn("Could not set status to offline on logout:", err));
    }
    if (currentRoomId) {
        await leaveMultiplayerRoom(false);
    }
    auth.signOut()
        .then(() => {
            sessionStorage.removeItem('guestHighScore');
            spHighScore = 0;
            updateSpHighScoreDisplay();
            console.log("使用者已登出");
        })
        .catch(error => {
            console.error("登出錯誤:", error);
            currentUser = null; currentUsername = '訪客'; isGuest = true;
            showPage(authPage);
        })
        .finally(hideLoading);
});

guestLoginButton.addEventListener('click', () => {
    isGuest = true;
    currentUser = null;
    currentUsername = '訪客';
    showPage(mainMenuPage);
    welcomeMessage.textContent = '歡迎, 訪客!';
    multiplayerButton.disabled = true;
    friendsButton.disabled = true;
    mainMenuLoginButton.classList.remove('hidden');
    currentUserInfoDiv.classList.add('hidden');
    loadGuestHighScore();
});

function mapAuthError(errorCode) {
    switch (errorCode) {
        case 'auth/invalid-email': return 'Email 格式無效';
        case 'auth/user-disabled': return '此帳號已被禁用';
        case 'auth/user-not-found': return '找不到此 Email 的使用者';
        case 'auth/wrong-password': return '密碼錯誤';
        case 'auth/email-already-in-use': return '此 Email 已經被註冊';
        case 'auth/weak-password': return '密碼強度不足 (至少6位數)';
        case 'auth/operation-not-allowed': return 'Email/密碼登入方式未啟用';
        default: return `發生未知錯誤 (${errorCode})`;
    }
}

// --- Main Menu Navigation ---
singlePlayerButton.addEventListener('click', () => {
    if (allQuestions.length === 0) {
        displayMessage(welcomeMessage, "題目尚未載入完成，請稍候", true);
        return;
    }
    startSinglePlayerGame();
});

multiplayerButton.addEventListener('click', () => {
    if (!isGuest && currentUser) {
        showPage(multiplayerLobbyPage);
        clearMessage(lobbyMessageP);
        inviteFriendInfoP.classList.add('hidden');
    }else {
        alert("請先登入才能使用多人模式"); 
        return;
    }
});

friendsButton.addEventListener('click', () => {
    if (!isGuest && currentUser) {
        showPage(friendsPage);
        renderFriendsList();
        friendSearchResultsDiv.innerHTML = '';
        friendSearchInput.value = '';
    } else {
        alert("請先登入才能使用好友列表");
        return;
    }
});

friendsBackButton.addEventListener('click', () => showPage(mainMenuPage));
lobbyBackButton.addEventListener('click', () => showPage(mainMenuPage));
spReturnToMainMenuButton.addEventListener('click', () => showPage(mainMenuPage));

// --- High Score Handling ---
async function loadUserHighScore() {
    if (currentUser) {
        try {
            const snapshot = await db.ref(`users/${currentUser.uid}/singlePlayerHighScore`).once('value');
            spHighScore = snapshot.val() || 0;
        } catch (error) {
            console.error("讀取最高分失敗:", error);
            spHighScore = 0;
        }
        updateSpHighScoreDisplay();
    }
}
async function saveUserHighScore(score) {
    if (currentUser && score > spHighScore) {
        spHighScore = score;
        try {
            await db.ref(`users/${currentUser.uid}/singlePlayerHighScore`).set(spHighScore);
        } catch (error) {
            console.error("儲存最高分失敗:", error);
        }
        updateSpHighScoreDisplay();
    }
}
function loadGuestHighScore() {
    spHighScore = parseInt(sessionStorage.getItem('guestHighScore')) || 0;
    updateSpHighScoreDisplay();
}
function saveGuestHighScore(score) {
    if (score > spHighScore) {
        spHighScore = score;
        sessionStorage.setItem('guestHighScore', spHighScore.toString());
        updateSpHighScoreDisplay();
    }
}
function updateSpHighScoreDisplay() {
    spHighScoreDisplay.textContent = `個人歷史最高紀錄: ${spHighScore}`;
}


// --- Single Player Game Logic ---
function startSinglePlayerGame() {
    spQuestions = shuffleArray(allQuestions);
    spCurrentQuestionIndex = 0;
    spScore = 0;
    spLives = 3;
    spHintsLeft = 3;
    clearMessage(spMessage);
    spHintText.classList.add('hidden');
    spHintText.textContent = '';
    spAnswerInput.disabled = false;
    spSubmitAnswerButton.disabled = false;
    spHintButton.disabled = false;
    updateSpUi();
    loadNextSpQuestion();
    showPage(singlePlayerGamePage);
    updateUserStatus('online_in_game');
}

function updateSpUi() {
    spScoreDisplay.textContent = `Point: ${spScore}`;
    spLivesDisplay.textContent = `${'❤️'.repeat(spLives)}`; 
    spHintButton.textContent = `提示 (${spHintsLeft})`;
    spHintButton.disabled = spHintsLeft <= 0 || !spHintText.classList.contains('hidden');
}

function loadNextSpQuestion() {
    if (spCurrentQuestionIndex >= spQuestions.length) {
        endSinglePlayerGame("恭喜你完成了所有題目！");
        return;
    }
    if (spLives <= 0) {
        return;
    }

    const question = spQuestions[spCurrentQuestionIndex];
    spCategory.textContent = `分類: ${question.category}`;
    spEmojis.textContent = question.emojis;
    spAnswerInput.value = '';
    spAnswerInput.focus();
    spHintText.classList.add('hidden');
    spHintText.textContent = '';
    clearMessage(spMessage);
    spHintButton.disabled = spHintsLeft <= 0;

    spTimeLeft = 40;
    spTimerDisplay.textContent = `⏳: ${spTimeLeft}`;
    clearInterval(spTimerInterval);
    spTimerInterval = setInterval(() => {
        spTimeLeft--;
        spTimerDisplay.textContent = `⏳: ${spTimeLeft}`;
        if (spTimeLeft <= 0) {
            clearInterval(spTimerInterval);
            displayMessage(spMessage, `時間到！`, true);
            handleSpIncorrectAnswer(true);
        }
    }, 1000);
}

function handleSpCorrectAnswer() {
    clearInterval(spTimerInterval);
    const bonusScore = Math.floor(spTimeLeft / 2);
    spScore += 10 + bonusScore;
    displayMessage(spMessage, `答對了！加 ${10 + bonusScore} 分`, false);
    spCurrentQuestionIndex++;
    updateSpUi();
    setTimeout(loadNextSpQuestion, 2000);
}

function handleSpIncorrectAnswer(isTimeout = false) {
    spLives--;
    updateSpUi();

    if (!isTimeout) {
        displayMessage(spMessage, `答錯了！`, true);
    }

    if (spLives <= 0) {
        clearInterval(spTimerInterval);
        endSinglePlayerGame("遊戲結束！");
    } else {
        clearInterval(spTimerInterval);
        spCurrentQuestionIndex++;
        setTimeout(loadNextSpQuestion, 2500);
    }
}

spSubmitAnswerButton.addEventListener('click', () => {
    if (spLives <= 0 || spCurrentQuestionIndex >= spQuestions.length) return;
    const userAnswer = spAnswerInput.value.trim();
    if (!userAnswer) {
        displayMessage(spMessage, "請輸入答案", true);
        return;
    }
    clearMessage(spMessage);
    const correctAnswer = spQuestions[spCurrentQuestionIndex].answer;
    if (userAnswer === correctAnswer) {
        handleSpCorrectAnswer();
    } else {
        handleSpIncorrectAnswer();
    }
});
spAnswerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') spSubmitAnswerButton.click();
});

spHintButton.addEventListener('click', () => {
    if (spHintsLeft > 0 && spHintText.classList.contains('hidden')) {
        const question = spQuestions[spCurrentQuestionIndex];
        spHintText.textContent = `提示: ${question.hint}`;
        spHintText.classList.remove('hidden');
        spHintsLeft--;
        updateSpUi();
        spHintButton.disabled = true;
    }
});

async function endSinglePlayerGame(message) {
    clearInterval(spTimerInterval);
    await updateUserStatus('online_idle');
    showPage(spGameOverPage);
    spGameOverMessage.textContent = message;
    spFinalScoreDisplay.textContent = `你的總分是: ${spScore}`;
    if (isGuest) saveGuestHighScore(spScore);
    else saveUserHighScore(spScore);
}

spQuitButton.addEventListener('click', async () => {
    clearInterval(spTimerInterval);
    if (confirm("確定要結束目前遊戲並返回主選單嗎？")) {
        await updateUserStatus('online_idle');
        showPage(mainMenuPage);
    }
});

// --- Friends System ---
async function performFriendSearch() {
    const searchTerm = friendSearchInput.value.trim();
    friendSearchResultsDiv.innerHTML = '';

    if (!searchTerm) {
        friendSearchResultsDiv.innerHTML = '<p class="error-message" style="color: #FFB6C1; margin-top: 10px;">請輸入使用者名稱進行搜尋</p>';
        return;
    }
    if (searchTerm === currentUsername) {
        friendSearchResultsDiv.innerHTML = '<p class="message-area" style="color: #E0E0E0; margin-top: 10px;">你不能加自己為好友</p>';
        return;
    }
    if (!auth.currentUser) {
        friendSearchResultsDiv.innerHTML = '<p class="error-message" style="color: #FFB6C1; margin-top: 10px;">您似乎尚未登入，請重新登入後再試</p>';
        return;
    }

    showLoading("搜尋中...");
    try {
        const usernameSnapshot = await db.ref(`usernames/${searchTerm}`).once('value');
        if (usernameSnapshot.exists()) {
            const targetUid = usernameSnapshot.val();
            if (friendsList[targetUid]) {
                friendSearchResultsDiv.innerHTML = `<p class="message-area" style="color: #E0E0E0; margin-top: 10px;">${searchTerm} 已經是你的好友了</p>`;
            } else {
                const sentInviteSnapshot = await db.ref(`users/${currentUser.uid}/friend_invites_sent/${targetUid}`).once('value');
                const receivedInviteSnapshot = await db.ref(`users/${currentUser.uid}/friend_invites_received/${targetUid}`).once('value');

                if (sentInviteSnapshot.exists() && sentInviteSnapshot.val().status === 'pending'){
                     friendSearchResultsDiv.innerHTML = `<p class="message-area" style="color: #E0E0E0; margin-top: 10px;">已向 ${searchTerm} 發送好友邀請`;
                } else if (receivedInviteSnapshot.exists() && receivedInviteSnapshot.val().status === 'pending'){
                     friendSearchResultsDiv.innerHTML = `<p class="message-area" style="color: #E0E0E0; margin-top: 10px;">你已收到 ${searchTerm} 的好友邀請，請至通知查看</p>`;
                }
                else {
                    friendSearchResultsDiv.innerHTML = `
                        <div class="search-result-container">
                            <span class="search-result-text">找到使用者: ${searchTerm}</span>
                            <button class="add-friend-button" data-uid="${targetUid}" data-username="${searchTerm}">加為好友</button>
                        </div>`;
                }
            }
        } else {
            friendSearchResultsDiv.innerHTML = `<p class="error-message" style="color: #FFB6C1; margin-top: 10px;">找不到使用者 "${searchTerm}"</p>`;
        }
    } catch (error) {
        console.error("搜尋使用者錯誤:", error);
        if (error.code === "PERMISSION_DENIED") {
            friendSearchResultsDiv.innerHTML = `<p class="error-message" style="color: #FFB6C1; margin-top: 10px;">搜尋使用者時發生權限問題</p>`;
        } else {
            friendSearchResultsDiv.innerHTML = `<p class="error-message" style="color: #FFB6C1; margin-top: 10px;">搜尋時發生錯誤</p>`;
        }
    } finally {
        hideLoading();
    }
}

function initializeFriendsSystem() {
    if (!currentUser || friendsListener) return;

    clearFriendsUI();

    if (friendSearchInput) {
        friendSearchInput.removeEventListener('keypress', handleFriendSearchKeypress); 
        friendSearchInput.addEventListener('keypress', handleFriendSearchKeypress);
    }


    const friendsRef = db.ref(`users/${currentUser.uid}/friends`);
    friendsListener = friendsRef.on('value', snapshot => {
        const newFriendsList = snapshot.val() || {};
        Object.keys(friendsList).forEach(oldFriendUid => {
            if (!newFriendsList[oldFriendUid] && friendStatusListeners[oldFriendUid]) {
                friendStatusListeners[oldFriendUid].ref.off('value', friendStatusListeners[oldFriendUid].callback);
                delete friendStatusListeners[oldFriendUid];
                delete friendStatuses[oldFriendUid];
            }
        });
        friendsList = newFriendsList;
        renderFriendsList();
        Object.keys(friendsList).forEach(friendUid => {
            if (friendStatusListeners[friendUid]) {
                friendStatusListeners[friendUid].ref.off('value', friendStatusListeners[friendUid].callback);
            }
            const friendStatusRef = db.ref(`users/${friendUid}/status`);
            const callback = friendStatusRef.on('value', statusSnap => {
                friendStatuses[friendUid] = statusSnap.val() || 'offline';
                if (!friendsPage.classList.contains('hidden')) renderFriendsList();
                if (!multiplayerRoomPage.classList.contains('hidden') && !mpRoomFriendInviteListContainer.classList.contains('hidden')) {
                    renderMpRoomFriendInviteList();
                }
            });
            friendStatusListeners[friendUid] = { ref: friendStatusRef, callback: callback };
        });
        if (currentRoomId && currentRoomData && currentRoomData.host === currentUser.uid && !mpRoomFriendInviteListContainer.classList.contains('hidden')) {
            renderMpRoomFriendInviteList();
        }
    }, error => console.error("Error fetching friends:", error));
    userListeners.push({ ref: friendsRef, eventType: 'value', callback: friendsListener });
}

async function handleFriendSearchKeypress(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        await performFriendSearch();
    }
}


function clearFriendsUI() {
    friendsListUl.innerHTML = '';
    friendSearchResultsDiv.innerHTML = '';
    if(noFriendsP) noFriendsP.classList.remove('hidden');
}

friendsPage.addEventListener('click', async (e) => {
    if (e.target.classList.contains('add-friend-button')) {
        const targetUid = e.target.dataset.uid;
        const targetUsername = e.target.dataset.username;
        await sendFriendRequest(targetUid, targetUsername);
        e.target.disabled = true;
        e.target.textContent = '已發送';
        e.target.style.backgroundColor = "#555";
        e.target.style.color = "#aaa";
    }
    else if (e.target.classList.contains('accept-request-button')) {
        const senderUid = e.target.dataset.uid;
        const senderUsername = e.target.dataset.username;
        await acceptFriendRequest(senderUid, senderUsername);
        renderFriendsList(); 
    }
    else if (e.target.classList.contains('decline-request-button')) {
        const senderUid = e.target.dataset.uid;
        await declineFriendRequest(senderUid);
        renderFriendsList(); 
    }
    else if (e.target.classList.contains('remove-friend-button-friends-page')) {
        const friendUid = e.target.dataset.uid;
        const friendUsername = friendsList[friendUid]; 
        if (confirm(`確定要移除好友 ${friendUsername} 嗎？`)) {
            await removeFriend(friendUid);
        }
    }
});

async function sendFriendRequest(targetUid, targetUsername) {
    if (!currentUser || currentUser.uid === targetUid) return;
    showLoading("正在發送好友邀請...");
    const currentUserUid = currentUser.uid;
    const currentUserUsername = currentUsername;

    const existingRequestSnapshot = await db.ref(`users/${targetUid}/friend_invites_received/${currentUserUid}`).once('value');
    if (existingRequestSnapshot.exists() && existingRequestSnapshot.val().status === 'pending') {
        displayMessage(friendSearchResultsDiv, `已向 ${targetUsername} 發送好友邀請`, false);
        hideLoading();
        return;
    }
    if (friendsList[targetUid]) {
        displayMessage(friendSearchResultsDiv, `${targetUsername} 已經是你的好友了`, false);
        hideLoading();
        return;
    }

    const updates = {};
    updates[`/users/${targetUid}/friend_invites_received/${currentUserUid}`] = {
        senderUsername: currentUserUsername,
        status: "pending", 
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    updates[`/users/${currentUserUid}/friend_invites_sent/${targetUid}`] = {
        receiverUsername: targetUsername,
        status: "pending",
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    try {
        await db.ref().update(updates);
        displayMessage(friendSearchResultsDiv, `已向 ${targetUsername} 發送好友邀請！</p>`, false);
    } catch (error) {
        console.error("發送好友邀請失敗:", error);
        displayMessage(friendSearchResultsDiv, `<p class="error-message" style="color: #FFB6C1; margin-top: 10px;">發送邀請失敗</p>`, true);
    } finally {
        hideLoading();
    }
}

async function acceptFriendRequest(senderUid, senderUsername) {
    if (!currentUser) return;
    showLoading("正在接受好友邀請...");
    const currentUserUid = currentUser.uid;
    const currentUserUsername = currentUsername;
    const updates = {};
    updates[`/users/${currentUserUid}/friends/${senderUid}`] = senderUsername;
    updates[`/users/${senderUid}/friends/${currentUserUid}`] = currentUserUsername; 
    updates[`/users/${currentUserUid}/friend_invites_received/${senderUid}`] = null; 
    updates[`/users/${senderUid}/friend_invites_sent/${currentUserUid}`] = { status: 'accepted', timestamp: firebase.database.ServerValue.TIMESTAMP }; 
    try {
        await db.ref().update(updates);
        console.log(`已接受 ${senderUsername} 的好友邀請`);
    } catch (error) {
        console.error("接受好友邀請失敗:", error);
        alert("接受邀請失敗");
    } finally {
        hideLoading();
    }
}

async function declineFriendRequest(senderUid) {
    if (!currentUser) return;
    showLoading("正在拒絕好友邀請...");
    const currentUserUid = currentUser.uid;
    const updates = {};
    updates[`/users/${currentUserUid}/friend_invites_received/${senderUid}`] = null; 
    updates[`/users/${senderUid}/friend_invites_sent/${currentUser.uid}`] = { status: 'declined', timestamp: firebase.database.ServerValue.TIMESTAMP }; 
    try {
        await db.ref().update(updates);
        console.log("已拒絕好友邀請");
    } catch (error) {
        console.error("拒絕好友邀請失敗:", error);
        alert("拒絕邀請失敗");
    } finally {
        hideLoading();
    }
}

async function removeFriend(friendUid) {
    if (!currentUser) return;
    showLoading("正在移除好友...");
    const currentUserUid = currentUser.uid;
    const updates = {};
    updates[`/users/${currentUserUid}/friends/${friendUid}`] = null;
    updates[`/users/${friendUid}/friends/${currentUserUid}`] = null;
    if (friendStatusListeners[friendUid]) {
        friendStatusListeners[friendUid].ref.off('value', friendStatusListeners[friendUid].callback);
        delete friendStatusListeners[friendUid];
        delete friendStatuses[friendUid];
    }
    try {
        await db.ref().update(updates);
        console.log("已移除好友");
    } catch (error) {
        console.error("移除好友失敗:", error);
        alert("移除好友失敗");
    } finally {
        hideLoading();
    }
}

function renderFriendsList() {
    friendsListUl.innerHTML = '';
    let hasFriends = false;
    let hasFriendRequests = false;

    Object.entries(friendRequestsReceived).forEach(([senderUid, requestData]) => {
        hasFriendRequests = true;
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="friend-info">
                <span class="friend-name">${requestData.senderUsername} 邀請你成為好友</span>
            </div>
            <div>
                <button class="accept-request-button" data-uid="${senderUid}" data-username="${requestData.senderUsername}" style="background-color: #D2A679; color: #2D2D2D; border: none; padding: 6px 12px; border-radius: 15px; font-size: 0.8em; cursor: pointer;">接受</button>
                <button class="decline-request-button" data-uid="${senderUid}" style="background-color: #FFB6C1; color: #2D2D2D; border: none; padding: 6px 12px; border-radius: 15px; font-size: 0.8em; cursor: pointer;">拒絕</button>
            </div>
        `;
        friendsListUl.appendChild(li);
    });

    Object.entries(friendsList).forEach(([uid, username]) => {
        hasFriends = true;
        const status = friendStatuses[uid] || 'offline';
        let statusText = '離線';
        let statusClass = 'status-offline';
        if (status === 'online_idle') { statusText = '空閒'; statusClass = 'status-idle'; }
        else if (status === 'online_in_room_waiting') { statusText = '房間中'; statusClass = 'status-in-room'; }
        else if (status === 'online_in_game') { statusText = '遊戲中'; statusClass = 'status-in-game'; }

        const li = document.createElement('li');
        li.innerHTML = `
            <div class="friend-info">
                <span class="friend-name">${username}</span>
                <span class="friend-status ${statusClass}">${statusText}</span>
            </div>
            <button class="remove-friend-button-friends-page" data-uid="${uid}">×</button>
        `;
        friendsListUl.appendChild(li);
    });

    if (!hasFriends && !hasFriendRequests) {
        if(noFriendsP) noFriendsP.classList.remove('hidden');
    } else {
        if(noFriendsP) noFriendsP.classList.add('hidden');
    }
}

// --- Multiplayer Lobby Logic ---
createRoomButton.addEventListener('click', async () => {
    if (isGuest || !currentUser) {
        displayMessage(lobbyMessageP, "請先登入才能創建房間", true);
        return;
    }
    showLoading("正在創建房間...");
    clearMessage(lobbyMessageP);
    const newRoomId = db.ref('rooms').push().key;
    const initialRoomData = {
        host: currentUser.uid,
        hostUsername: currentUsername,
        status: 'waiting',
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        players: {
            [currentUser.uid]: {
                username: currentUsername, score: 0, ready: false, hintsLeft: MP_MAX_HINTS_PER_PLAYER
            }
        }
    };
    try {
        await db.ref(`rooms/${newRoomId}`).set(initialRoomData);
        console.log("房間創建成功:", newRoomId);
        await joinMultiplayerRoom(newRoomId);
        inviteFriendInfoP.classList.remove('hidden');
    } catch (error) {
        console.error("創建房間失敗:", error);
        displayMessage(lobbyMessageP, "創建房間失敗: " + error.message, true);
    } finally {
        hideLoading();
    }
});

joinRoomButton.addEventListener('click', async () => {
    const roomIdToJoin = roomIdInput.value.trim();
    clearMessage(lobbyMessageP);
    if (!roomIdToJoin) {
        displayMessage(lobbyMessageP, "請輸入房間 ID", true);
        return;
    }
    if (isGuest || !currentUser) {
        displayMessage(lobbyMessageP, "請先登入才能加入房間", true);
        return;
    }
    showLoading("正在加入房間...");
    await joinMultiplayerRoom(roomIdToJoin);
});

async function joinMultiplayerRoom(roomIdToJoin) {
    const roomRef = db.ref(`rooms/${roomIdToJoin}`);
    try {
        const snapshot = await roomRef.once('value');
        if (!snapshot.exists()) {
            displayMessage(lobbyMessageP, "房間不存在！", true);
            hideLoading(); return;
        }
        const roomDataSnapshot = snapshot.val();
        const playerCount = roomDataSnapshot.players ? Object.keys(roomDataSnapshot.players).length : 0;

        if (playerCount >= MAX_PLAYERS_PER_ROOM && (!roomDataSnapshot.players || !roomDataSnapshot.players[currentUser.uid])) {
            displayMessage(lobbyMessageP, "房間已滿！", true); hideLoading(); return;
        }
        if (roomDataSnapshot.status === 'playing' && (!roomDataSnapshot.players || !roomDataSnapshot.players[currentUser.uid])) {
            displayMessage(lobbyMessageP, "遊戲已開始，無法中途加入！", true); hideLoading(); return;
        }
         if (roomDataSnapshot.status === 'finished' && (!roomDataSnapshot.players || !roomDataSnapshot.players[currentUser.uid])) {
            displayMessage(lobbyMessageP, "此房間的遊戲已結束", true); hideLoading(); return;
        }

        if (!roomDataSnapshot.players || !roomDataSnapshot.players[currentUser.uid]) {
            const currentPlayersInRoom = roomDataSnapshot.players ? Object.keys(roomDataSnapshot.players).length : 0;
            if (currentPlayersInRoom >= MAX_PLAYERS_PER_ROOM) {
                 displayMessage(lobbyMessageP, "房間已滿！(加入時檢查)", true); hideLoading(); return;
            }
            await roomRef.child(`players/${currentUser.uid}`).set({
                username: currentUsername, score: 0, ready: false, hintsLeft: MP_MAX_HINTS_PER_PLAYER
            });
            console.log("玩家已加入房間:", currentUser.uid);
        }

        currentRoomId = roomIdToJoin;
        await updateUserStatus('online_in_room_waiting');
        showPage(multiplayerRoomPage);
        if(roomTitle) roomTitle.textContent = `房間ID: ${currentRoomId}`; 
        if(roomIdDisplayForInvite) roomIdDisplayForInvite.textContent = currentRoomId; 
        clearMessage(roomMessageP);

        if (roomListener && roomListener.roomId && roomListener.roomId !== currentRoomId) {
            db.ref(`rooms/${roomListener.roomId}`).off('value', roomListener.callback);
        }
        if (!roomListener || roomListener.roomId !== currentRoomId) {
            roomListener = {
                roomId: currentRoomId,
                callback: roomRef.on('value', async snapshot => {
                    if (!snapshot.exists()) {
                        if (currentRoomId === roomIdToJoin) {
                            alert("房間已解散或不存在");
                            await cleanupAndLeaveRoomState(true);
                        }
                        return;
                    }
                    currentRoomData = snapshot.val();
                    await updateMultiplayerRoomUI(currentRoomData);
                    if (currentRoomData.status === 'playing' && multiplayerGamePage.classList.contains('hidden')) {
                        startMultiplayerGameView(currentRoomData);
                    } else if (currentRoomData.status === 'waiting' && !multiplayerRoomPage.classList.contains('hidden')) {
                        mpLeaderboardContainer.classList.add('hidden');
                        mpMessage.textContent = '';
                        mpAnswerInput.value = '';
                        mpAnswerInput.disabled = false;
                        resetMultiplayerGamePageUI();
                        mpRoomFriendInviteListContainer.classList.add('hidden');
                    } else if (currentRoomData.status === 'finished' && !multiplayerGamePage.classList.contains('hidden')) {
                        if (currentRoomData.gameData && currentRoomData.players) {
                            displayMpLeaderboard(currentRoomData.players, currentRoomData.gameData.questions.length);
                        }
                    }
                }, async error => {
                    console.error("監聽房間時發生錯誤:", error);
                    displayMessage(roomMessageP, "與房間的連線發生問題", true);
                    await cleanupAndLeaveRoomState(true);
                })
            };
        }
    } catch (error) {
        console.error("加入房間失敗:", error);
        displayMessage(lobbyMessageP, "加入房間失敗: " + error.message, true);
        currentRoomId = null;
    } finally {
        hideLoading();
    }
}

async function updateMultiplayerRoomUI(data) {
    if (!data || !currentUser) return;

    if(roomHostDisplay) roomHostDisplay.textContent = data.hostUsername || 'N/A';
    playerListUl.innerHTML = '';
    let allReady = true;
    let playerCount = 0;
    let isCurrentUserInRoom = false;

    if (data.players) {
        Object.entries(data.players).forEach(([uid, playerData]) => {
            playerCount++;
            if (uid === currentUser.uid) isCurrentUserInRoom = true;
            const li = document.createElement('li');
            li.textContent = `${playerData.username}`;
            const statusSpan = document.createElement('span');
            statusSpan.textContent = playerData.ready ? '已準備' : '未準備';
            statusSpan.className = playerData.ready ? 'ready-status' : 'not-ready-status'; 
            li.appendChild(statusSpan);
            playerListUl.appendChild(li);
            if (!playerData.ready) allReady = false;
        });
    }

    if (!isCurrentUserInRoom && currentRoomId) {
        console.warn("Current user not found in room players list. Leaving room state.");
        alert("您已不在房間");
        await cleanupAndLeaveRoomState(true);
        return;
    }

    const isHost = currentUser.uid === data.host;
    if (isHost) {
        startGameButton.classList.remove('hidden');
        startGameButton.disabled = !allReady || playerCount < 2; 
        mpInviteFriendButton.classList.remove('hidden');
    } else {
        startGameButton.classList.add('hidden');
        mpInviteFriendButton.classList.add('hidden');
        mpRoomFriendInviteListContainer.classList.add('hidden');
    }

    if (currentUser && data.players && data.players[currentUser.uid]) {
        const myPlayerData = data.players[currentUser.uid];
        readyButton.textContent = myPlayerData.ready ? '取消準備' : '準備';
        readyButton.disabled = data.status === 'playing';
    } else {
        readyButton.disabled = true;
    }

    if (currentUser && data) {
        if (data.status === 'playing') await updateUserStatus('online_in_game');
        else if (data.status === 'waiting' || data.status === 'finished') await updateUserStatus('online_in_room_waiting');
    }
}

mpInviteFriendButton.addEventListener('click', () => {
    if (currentRoomData && currentRoomData.host === currentUser.uid) {
        mpRoomFriendInviteListContainer.classList.toggle('hidden');
        if (!mpRoomFriendInviteListContainer.classList.contains('hidden')) {
            renderMpRoomFriendInviteList();
        }
    }
});

async function renderMpRoomFriendInviteList() {
    mpRoomFriendInviteListUl.innerHTML = '';
    if (Object.keys(friendsList).length === 0) {
        const li = document.createElement('li');
        li.textContent = '你目前沒有好友可邀請';
        li.style.textAlign = 'center'; 
        li.style.padding = '10px'; 
        mpRoomFriendInviteListUl.appendChild(li);
        return;
    }

    for (const friendUid in friendsList) {
        const friendUsername = friendsList[friendUid];
        const status = friendStatuses[friendUid] || 'offline';
        let statusText = '離線';
        let statusClass = 'status-offline';
        let canInvite = false;

        if (status === 'online_idle') {
            statusText = '空閒';
            statusClass = 'status-idle';
            canInvite = true;
        } else if (status === 'online_in_room_waiting') { 
            statusText = '房間中';
            statusClass = 'status-in-room'; 
        } else if (status === 'online_in_game') {
            statusText = '遊戲中';
            statusClass = 'status-in-game'; 
        }

        const li = document.createElement('li');
        const friendInfoDiv = document.createElement('div');
        friendInfoDiv.className = 'friend-invite-info'; 

        const nameSpan = document.createElement('span');
        nameSpan.className = 'friend-name'; 
        nameSpan.textContent = friendUsername;

        const statusSpanElement = document.createElement('span');
        statusSpanElement.className = `friend-status ${statusClass}`; 
        statusSpanElement.textContent = statusText;

        friendInfoDiv.appendChild(nameSpan);
        friendInfoDiv.appendChild(statusSpanElement);
        li.appendChild(friendInfoDiv);

        const inviteButton = document.createElement('button');
        inviteButton.textContent = '邀請';
        inviteButton.classList.add('invite-button-in-list'); 
        inviteButton.classList.add('send-room-invite-button'); 
        inviteButton.dataset.friendUid = friendUid;
        inviteButton.dataset.friendUsername = friendUsername;
        inviteButton.disabled = !canInvite; 

        const cooldownKey = `${friendUid}_${currentRoomId}`;
        if (sentRoomInvitesCooldown[cooldownKey] && (Date.now() - sentRoomInvitesCooldown[cooldownKey] < 10000)) {
            inviteButton.disabled = true;
            inviteButton.textContent = '已邀請';
        }
        li.appendChild(inviteButton);
        mpRoomFriendInviteListUl.appendChild(li);
    }
}


multiplayerRoomPage.addEventListener('click', async (e) => {
    if (e.target.classList.contains('send-room-invite-button')) {
        const friendUid = e.target.dataset.friendUid;
        const friendUsername = e.target.dataset.friendUsername;
        if (currentRoomId && currentUser && currentUsername) {
            const cooldownKey = `${friendUid}_${currentRoomId}`;
            if (sentRoomInvitesCooldown[cooldownKey] && (Date.now() - sentRoomInvitesCooldown[cooldownKey] < 10000)) {
                alert("邀請太頻繁，請稍候10秒再試"); return;
            }
            showLoading(`正在邀請 ${friendUsername}...`);
            const inviteData = {
                roomId: currentRoomId,
                roomName: (currentRoomData ? currentRoomData.hostUsername : currentUsername) + "的房間",
                inviterUid: currentUser.uid,
                inviterUsername: currentUsername,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                status: "pending"
            };
            const invitePathKey = `${currentUser.uid}_${currentRoomId}`;
            try {
                await db.ref(`room_invites/${friendUid}/${invitePathKey}`).set(inviteData);
                sentRoomInvitesCooldown[cooldownKey] = Date.now();
                e.target.disabled = true;
                e.target.textContent = '已邀請';
                setTimeout(() => {
                    const stillExistsButton = document.querySelector(`button[data-friend-uid="${friendUid}"].send-room-invite-button`);
                    if (stillExistsButton && !mpRoomFriendInviteListContainer.classList.contains('hidden')) {
                        stillExistsButton.disabled = false;
                        stillExistsButton.textContent = '邀請';
                        delete sentRoomInvitesCooldown[cooldownKey];
                    }
                }, 10000);
                alert(`已向 ${friendUsername} 發送房間邀請！`);
            } catch (error) {
                console.error("發送房間邀請失敗:", error);
                alert("發送房間邀請失敗");
            } finally {
                hideLoading();
            }
        }
    }
});

readyButton.addEventListener('click', () => {
    if (!currentUser || !currentRoomId || !currentRoomData || !currentRoomData.players || !currentRoomData.players[currentUser.uid] || currentRoomData.status === 'playing') {
        displayMessage(roomMessageP, "無法更新準備狀態", true); return;
    }
    const myCurrentReadyStatus = currentRoomData.players[currentUser.uid].ready;
    db.ref(`rooms/${currentRoomId}/players/${currentUser.uid}/ready`).set(!myCurrentReadyStatus)
        .catch(err => {
            console.error("更新準備狀態失敗:", err);
            displayMessage(roomMessageP, "更新準備狀態失敗", true);
        });
});

startGameButton.addEventListener('click', async () => {
    if (!currentUser || !currentRoomData || currentUser.uid !== currentRoomData.host || !currentRoomId) {
        displayMessage(roomMessageP, "只有房主可以開始遊戲", true); return;
    }
    if (Object.keys(currentRoomData.players).length < 2) { 
        displayMessage(roomMessageP, "至少需要2位玩家才能開始遊戲", true); return;
    }
    showLoading("正在開始遊戲...");
    try {
        let gameQuestions = shuffleArray(allQuestions).slice(0, MP_TOTAL_QUESTIONS);
        const initialGameData = {
            questions: gameQuestions, currentQuestionIndex: 0, currentRoundStartTime: null, answeredBy: null,
        };
        const updates = {};
        updates[`rooms/${currentRoomId}/status`] = 'playing';
        updates[`rooms/${currentRoomId}/gameData`] = initialGameData;
        Object.keys(currentRoomData.players).forEach(uid => {
            updates[`rooms/${currentRoomId}/players/${uid}/score`] = 0;
            updates[`rooms/${currentRoomId}/players/${uid}/ready`] = false;
            updates[`rooms/${currentRoomId}/players/${uid}/hintsLeft`] = MP_MAX_HINTS_PER_PLAYER;
        });
        await db.ref().update(updates);
        console.log("遊戲已由房主開始");
        mpRoomFriendInviteListContainer.classList.add('hidden');
    } catch (error) {
        console.error("開始遊戲失敗:", error);
        displayMessage(roomMessageP, "開始遊戲失敗: " + error.message, true);
    } finally {
        hideLoading();
    }
});

leaveRoomButton.addEventListener('click', () => {
    if (confirm("確定要離開房間嗎？")) {
        leaveMultiplayerRoom(true);
    }
});

async function cleanupAndLeaveRoomState(navigateToMainMenu = true) {
    if (roomListener && roomListener.roomId) {
        db.ref(`rooms/${roomListener.roomId}`).off('value', roomListener.callback);
        roomListener = null;
    }
    if (mpGameDataListener && mpGameDataListener.roomId) {
        db.ref(`rooms/${mpGameDataListener.roomId}/gameData`).off('value', mpGameDataListener.callback);
        mpGameDataListener = null;
    }
    clearInterval(mpTimerInterval);
    currentRoomId = null;
    currentRoomData = null;
    playerListUl.innerHTML = '';
    startGameButton.classList.add('hidden');
    readyButton.textContent = '準備';
    mpInviteFriendButton.classList.add('hidden');
    mpRoomFriendInviteListContainer.classList.add('hidden');
    resetMultiplayerGamePageUI();
    await updateUserStatus('online_idle');
    if (navigateToMainMenu) showPage(mainMenuPage);
}

async function leaveMultiplayerRoom(navigateToMainMenu = true) {
    if (!currentRoomId || !currentUser) {
        await cleanupAndLeaveRoomState(navigateToMainMenu); return;
    }
    showLoading("正在離開房間...");
    const roomRef = db.ref(`rooms/${currentRoomId}`);
    const localCurrentRoomId = currentRoomId;
    try {
        await roomRef.transaction(room => {
            if (room) {
                if (room.players && room.players[currentUser.uid]) {
                    if (room.host === currentUser.uid) return null;
                    else {
                        delete room.players[currentUser.uid];
                        if (Object.keys(room.players).length === 0) return null;
                    }
                }
            }
            return room;
        });
        console.log("成功離開房間或房間已解散");
    } catch (error) {
        console.error("離開房間時出錯:", error);
        alert("離開房間時出錯");
    } finally {
        if (localCurrentRoomId === currentRoomId) {
            await cleanupAndLeaveRoomState(navigateToMainMenu);
        } else if (!currentRoomId && navigateToMainMenu) {
             await updateUserStatus('online_idle');
             showPage(mainMenuPage);
        }
        hideLoading();
    }
}

// --- Multiplayer Game Logic ---
function startMultiplayerGameView(roomData) {
    if (!roomData || !roomData.gameData) {
        console.error("無法開始多人遊戲視圖，缺少房間或遊戲資料");
        alert("無法載入遊戲，房間資料不完整");
        leaveMultiplayerRoom(true); return;
    }
    showPage(multiplayerGamePage);
    resetMultiplayerGamePageUI();
    updateUserStatus('online_in_game');
    const gameDataRef = db.ref(`rooms/${currentRoomId}/gameData`);
    if (mpGameDataListener && mpGameDataListener.roomId && mpGameDataListener.roomId !== currentRoomId) {
        db.ref(`rooms/${mpGameDataListener.roomId}/gameData`).off('value', mpGameDataListener.callback);
    }
    if (!mpGameDataListener || mpGameDataListener.roomId !== currentRoomId) {
        mpGameDataListener = {
            roomId: currentRoomId,
            callback: gameDataRef.on('value', snapshot => {
                const gameData = snapshot.val();
                if (gameData && currentRoomData && currentRoomData.players) {
                    updateMpGameUI(gameData, currentRoomData.players);
                } else if (!gameData && currentRoomData && currentRoomData.status === 'waiting') {
                    console.log("遊戲資料已清除，返回房間");
                    updateUserStatus('online_in_room_waiting');
                    showPage(multiplayerRoomPage);
                } else if (!gameData && currentRoomData && currentRoomData.status === 'finished') {
                     if (currentRoomData.players) displayMpLeaderboard(currentRoomData.players, MP_TOTAL_QUESTIONS);
                }
            }, error => {
                console.error("監聽遊戲數據時發生錯誤:", error);
                displayMessage(mpMessage, "遊戲連線錯誤", true);
                leaveMultiplayerRoom(true);
            })
        };
    }
}

function resetMultiplayerGamePageUI() {
    mpLeaderboardContainer.classList.add('hidden');
    mpAnswerInput.disabled = false;
    mpSubmitAnswerButton.disabled = false;
    mpMessage.textContent = '';
    mpAnswerInput.value = '';
    mpCategory.classList.remove('hidden');
    mpEmojis.classList.remove('hidden');
    mpTimerDisplay.classList.remove('hidden');
    mpCurrentRoundDisplay.classList.remove('hidden');
    mpAnswerInput.classList.remove('hidden');
    mpSubmitAnswerButton.classList.remove('hidden');
    mpPlayerScoresUl.classList.remove('hidden'); 
    document.getElementById('mp-player-scores-sidebar').classList.remove('hidden'); 
    mpHintText.classList.add('hidden');
    mpHintButtonGame.classList.remove('hidden');
    mpHintButtonGame.disabled = false;
}

function updateMpGameUI(gameData, playersData) {
    if (!gameData || !gameData.questions || typeof gameData.currentQuestionIndex === 'undefined') {
        if (currentRoomData && currentRoomData.status === 'finished' && playersData) {
            displayMpLeaderboard(playersData, gameData && gameData.questions ? gameData.questions.length : MP_TOTAL_QUESTIONS);
        } else if (currentRoomData && currentRoomData.status === 'waiting') {
            if (!multiplayerRoomPage.classList.contains('hidden')) {/* Already on room page */ }
            else { updateUserStatus('online_in_room_waiting'); showPage(multiplayerRoomPage); }
        }
        return;
    }

    const questionIndex = gameData.currentQuestionIndex;
    const totalQs = gameData.questions.length;
    mpCurrentRoundDisplay.textContent = `第 ${questionIndex + 1} / ${totalQs} 題`;

    if (questionIndex >= totalQs) {
        if (currentRoomData.host === currentUser.uid && currentRoomData.status !== 'finished') {
            db.ref(`rooms/${currentRoomId}/status`).set('finished');
        }
        displayMpLeaderboard(playersData, totalQs); return;
    }

    mpCategory.classList.remove('hidden'); mpEmojis.classList.remove('hidden');
    mpTimerDisplay.classList.remove('hidden'); mpCurrentRoundDisplay.classList.remove('hidden');
    mpAnswerInput.classList.remove('hidden'); mpSubmitAnswerButton.classList.remove('hidden');
    mpPlayerScoresUl.classList.remove('hidden'); 
    document.getElementById('mp-player-scores-sidebar').classList.remove('hidden'); 
    mpLeaderboardContainer.classList.add('hidden'); mpHintButtonGame.classList.remove('hidden');

    const question = gameData.questions[questionIndex];
    mpCategory.textContent = `分類: ${question.category}`;
    mpEmojis.textContent = question.emojis;
    mpHintText.textContent = `提示: ${question.hint}`;
    clearMessage(mpMessage);

    const currentPlayerHintsLeft = (playersData && playersData[currentUser.uid]) ? playersData[currentUser.uid].hintsLeft : 0;
    mpHintButtonGame.textContent = `提示 (${currentPlayerHintsLeft})`;
    mpHintButtonGame.disabled = currentPlayerHintsLeft <= 0 || !mpHintText.classList.contains('hidden');

    clearInterval(mpTimerInterval);
    mpAnswerInput.disabled = !!gameData.answeredBy;

    if (gameData.answeredBy) {
        mpTimerDisplay.textContent = `⏳: --`;
        const winnerUsername = (playersData && playersData[gameData.answeredBy.uid]) ? playersData[gameData.answeredBy.uid].username : (gameData.answeredBy.username || '某玩家');
        displayMessage(mpMessage, `${winnerUsername} 答對了!`, false);
        mpHintText.classList.add('hidden');
        mpHintButtonGame.disabled = true;
        if (currentUser.uid === currentRoomData.host) {
            setTimeout(() => advanceToNextMpQuestion(true), 2500);
        }
    } else {
        if (gameData.currentRoundStartTime) {
            const serverTimeOffset = 0;
            const roundStartTime = gameData.currentRoundStartTime;
            const elapsedSeconds = Math.floor((Date.now() - roundStartTime + serverTimeOffset) / 1000);
            mpTimeLeft = Math.max(0, 40 - elapsedSeconds);
            mpTimerDisplay.textContent = `⏳: ${mpTimeLeft}`;
            mpTimerInterval = setInterval(() => {
                mpTimeLeft--;
                mpTimerDisplay.textContent = `⏳: ${mpTimeLeft}`;
                if (mpTimeLeft <= 0) {
                    clearInterval(mpTimerInterval);
                    if (currentUser.uid === currentRoomData.host && currentRoomData.gameData && !currentRoomData.gameData.answeredBy) {
                        displayMessage(mpMessage, `時間到！`, true);
                        advanceToNextMpQuestion(false);
                    }
                }
            }, 1000);
        } else {
            mpTimerDisplay.textContent = `⏳: 40`;
            if (currentUser.uid === currentRoomData.host) {
                db.ref(`rooms/${currentRoomId}/gameData/currentRoundStartTime`).set(firebase.database.ServerValue.TIMESTAMP);
            }
        }
        if (!mpAnswerInput.disabled) { mpAnswerInput.value = ''; mpAnswerInput.focus(); }
    }

    mpPlayerScoresUl.innerHTML = '';
    if (playersData) {
        Object.values(playersData).sort((a,b) => (b.score || 0) - (a.score || 0)).forEach(player => {
            const li = document.createElement('li');
            li.textContent = `${player.username}: ${player.score || 0}`;
            mpPlayerScoresUl.appendChild(li);
        });
    }
}

mpHintButtonGame.addEventListener('click', () => {
    if (!currentUser || !currentRoomId || !currentRoomData || !currentRoomData.players || !currentRoomData.gameData || !currentRoomData.players[currentUser.uid]) return;
    const myPlayerData = currentRoomData.players[currentUser.uid];
    if (myPlayerData && myPlayerData.hintsLeft > 0 && mpHintText.classList.contains('hidden')) {
        mpHintText.classList.remove('hidden');
        const newHintsLeft = myPlayerData.hintsLeft - 1;
        db.ref(`rooms/${currentRoomId}/players/${currentUser.uid}/hintsLeft`).set(newHintsLeft)
            .catch(error => console.error("Error updating hints left:", error));
        mpHintButtonGame.disabled = true;
    }
});

mpSubmitAnswerButton.addEventListener('click', () => {
    const userAnswer = mpAnswerInput.value.trim();
    if (!userAnswer || !currentRoomId || !currentRoomData || !currentRoomData.gameData || !currentRoomData.gameData.questions) {
        displayMessage(mpMessage, "無法提交答案", true);
        return;
    }
    const gameData = currentRoomData.gameData;
    if (gameData.answeredBy) { displayMessage(mpMessage, "這題已經被回答了！", true); return; }
    if (mpTimeLeft <= 0 && !gameData.answeredBy) { displayMessage(mpMessage, "時間已經到了！", true); return; }

    const question = gameData.questions[gameData.currentQuestionIndex];
    if (userAnswer === question.answer) {
        clearInterval(mpTimerInterval);
        const answerRef = db.ref(`rooms/${currentRoomId}/gameData/answeredBy`);
        answerRef.transaction(currentAnsweredByData => {
            if (currentAnsweredByData === null) {
                return { uid: currentUser.uid, username: currentUsername, time: firebase.database.ServerValue.TIMESTAMP };
            } return;
        }, (error, committed, snapshot) => {
            if (error) { console.error("搶答 Transaction 失敗:", error); displayMessage(mpMessage, "搶答時發生錯誤", true); }
            else if (committed && snapshot.exists()) {
                const awardedPoints = 10 + Math.floor(mpTimeLeft / 2);
                db.ref(`rooms/${currentRoomId}/players/${currentUser.uid}/score`).transaction(currentScore => (currentScore || 0) + awardedPoints);
            } else { displayMessage(mpMessage, "手太慢了，被別人搶先了！", true); }
        });
    } else {
        displayMessage(mpMessage, "答錯了，再試一次！", true);
        mpAnswerInput.value = ''; mpAnswerInput.focus();
    }
});
mpAnswerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') mpSubmitAnswerButton.click();
});

async function advanceToNextMpQuestion(answeredCorrectly) {
    if (!currentUser || !currentRoomData || currentUser.uid !== currentRoomData.host || !currentRoomId || !currentRoomData.gameData) return;
    let nextQuestionIndex = currentRoomData.gameData.currentQuestionIndex + 1;
    const updates = {};
    if (nextQuestionIndex >= currentRoomData.gameData.questions.length) {
        updates[`rooms/${currentRoomId}/status`] = 'finished';
        updates[`rooms/${currentRoomId}/gameData/currentQuestionIndex`] = nextQuestionIndex;
        if (!currentRoomData.gameData.answeredBy) {
             updates[`rooms/${currentRoomId}/gameData/answeredBy`] = { uid: "timeout", username: "時間到" };
        }
        updates[`rooms/${currentRoomId}/gameData/currentRoundStartTime`] = null;
    } else {
        updates[`rooms/${currentRoomId}/gameData/currentQuestionIndex`] = nextQuestionIndex;
        updates[`rooms/${currentRoomId}/gameData/answeredBy`] = null;
        updates[`rooms/${currentRoomId}/gameData/currentRoundStartTime`] = null;
    }
    try { await db.ref().update(updates); console.log("房主已推進到下一題或結束遊戲"); }
    catch (error) { console.error("推進題目失敗:", error); displayMessage(mpMessage, "處理下一題時發生錯誤", true); }
}

function displayMpLeaderboard(playersData, totalQuestions) {
    clearInterval(mpTimerInterval);
    mpAnswerInput.disabled = true; mpSubmitAnswerButton.disabled = true; mpHintButtonGame.classList.add('hidden');
    mpCategory.classList.add('hidden'); mpEmojis.classList.add('hidden');
    mpTimerDisplay.classList.add('hidden'); mpCurrentRoundDisplay.classList.add('hidden');
    mpAnswerInput.classList.add('hidden'); mpSubmitAnswerButton.classList.add('hidden');
    mpPlayerScoresUl.classList.add('hidden'); 
    document.getElementById('mp-player-scores-sidebar').classList.add('hidden'); 
    mpHintText.classList.add('hidden');

    const sortedPlayers = Object.values(playersData || {}).sort((a, b) => (b.score || 0) - (a.score || 0));
    let leaderboardHtml = `<h3 style="color: #FFFFFF; margin-bottom: 10px; text-align: center;">遊戲結束 - 共 ${totalQuestions} 題</h3>`;
    leaderboardHtml += '<table style="width: 100%; color: #E0E0E0; border-collapse: collapse;"><thead><tr><th style="border: 1px solid #555; padding: 8px; background-color: #383838;">排名</th><th style="border: 1px solid #555; padding: 8px; background-color: #383838;">玩家</th><th style="border: 1px solid #555; padding: 8px; background-color: #383838;">分數</th></tr></thead><tbody>';
    sortedPlayers.forEach((player, index) => {
        leaderboardHtml += `<tr><td style="border: 1px solid #555; padding: 8px; text-align: center;">${index + 1}</td><td style="border: 1px solid #555; padding: 8px;">${player.username}</td><td style="border: 1px solid #555; padding: 8px; text-align: center;">${player.score || 0}</td></tr>`;
    });
    leaderboardHtml += '</tbody></table>';
    mpLeaderboardDiv.innerHTML = leaderboardHtml;
    mpLeaderboardContainer.classList.remove('hidden');
}

mpReturnToRoomButton.addEventListener('click', async () => {
    if (!currentRoomId || !currentRoomData || !currentUser) return;
    showLoading("正在返回房間...");
    await updateUserStatus('online_in_room_waiting');
    if (currentUser.uid === currentRoomData.host) {
        const updates = {};
        updates[`rooms/${currentRoomId}/status`] = 'waiting';
        updates[`rooms/${currentRoomId}/gameData`] = null;
        if (currentRoomData.players) {
            Object.keys(currentRoomData.players).forEach(uid => {
                updates[`rooms/${currentRoomId}/players/${uid}/ready`] = false;
                updates[`rooms/${currentRoomId}/players/${uid}/hintsLeft`] = MP_MAX_HINTS_PER_PLAYER;
            });
        }
        try { await db.ref().update(updates); showPage(multiplayerRoomPage); }
        catch (error) { console.error("返回房間並重設失敗:", error); alert("返回房間失敗"); }
        finally { hideLoading(); }
    } else {
        showPage(multiplayerRoomPage); hideLoading();
    }
    resetMultiplayerGamePageUI();
});

mpLeaveGameButton.addEventListener('click', () => {
    if (confirm("確定要離開遊戲並返回主選單嗎？")) {
        leaveMultiplayerRoom(true);
    }
});

// --- Room Invite Notification Logic ---
function initializeRoomInviteListener() {
    if (!currentUser || roomInvitesListener) return;
    const invitesRef = db.ref(`room_invites/${currentUser.uid}`);
    roomInvitesListener = invitesRef.on('value', snapshot => {
        const invites = snapshot.val();
        if (invites) {
            const pendingInvites = Object.entries(invites).filter(([key, invite]) => invite.status === 'pending');
            if (pendingInvites.length > 0) {
                pendingInvites.sort((a, b) => b[1].timestamp - a[1].timestamp);
                const [latestInviteKey, latestInvite] = pendingInvites[0];
                if (!activeRoomInviteData || activeRoomInviteData.inviteKey !== latestInviteKey) {
                    if (roomInviteNotificationPopup.classList.contains('visible')) { // Check for .visible
                        hideRoomInvitePopup(); // Hide current before showing new
                    }
                    showRoomInvitePopup(latestInvite, latestInviteKey);
                }
            } else {
                // No pending invites, or the active one is no longer pending
                if (activeRoomInviteData && (!invites[activeRoomInviteData.inviteKey] || invites[activeRoomInviteData.inviteKey].status !== 'pending')) {
                    hideRoomInvitePopup();
                }
            }
        } else { // No invites at all for the user
            hideRoomInvitePopup();
        }
    });
}

function showRoomInvitePopup(invite, inviteKey) {
    if (friendRequestNotificationPopup && !friendRequestNotificationPopup.classList.contains('hidden')) {
        // Assuming friend request is a modal and should be hidden if a room invite banner appears
        // Or, decide on prioritization logic (e.g., only show one type at a time)
        // For now, let's assume room invite takes precedence or they can overlap if styled correctly.
        // Given the slide-down nature, it might be okay to overlap or briefly hide the other.
    }

    if (currentRoomId && currentRoomId !== invite.roomId) {
        db.ref(`room_invites/${currentUser.uid}/${inviteKey}`).update({ status: 'declined_busy' }); return;
    }
    if (currentRoomId && currentRoomId === invite.roomId) {
        db.ref(`room_invites/${currentUser.uid}/${inviteKey}`).update({ status: 'accepted_already_in_room' }); return;
    }
    activeRoomInviteData = {
        roomId: invite.roomId, inviterUid: invite.inviterUid, inviteKey: inviteKey,
        inviterUsername: invite.inviterUsername, roomName: invite.roomName
    };
    roomInviteMessage.textContent = `${invite.inviterUsername} 邀請你加入房間 "${invite.roomName || invite.roomId}"！`;
    roomInviteNotificationPopup.classList.add('visible'); // Use .visible to trigger slide-down

    let timeLeft = 10;
    roomInviteTimerDisplay.textContent = `自動關閉於 ${timeLeft} 秒...`;
    if (roomInviteTimerIntervalId) clearInterval(roomInviteTimerIntervalId);
    roomInviteTimerIntervalId = setInterval(() => {
        timeLeft--;
        roomInviteTimerDisplay.textContent = `自動關閉於 ${timeLeft} 秒...`;
        if (timeLeft <= 0) {
            clearInterval(roomInviteTimerIntervalId);
            if (activeRoomInviteData && activeRoomInviteData.inviteKey === inviteKey && roomInviteNotificationPopup.classList.contains('visible')) {
                const inviteRef = db.ref(`room_invites/${currentUser.uid}/${inviteKey}`);
                inviteRef.once('value', snapshot => { // Check current status before updating
                    if (snapshot.exists() && snapshot.val().status === 'pending') {
                        inviteRef.update({ status: 'expired' });
                    }
                });
                hideRoomInvitePopup();
            }
        }
    }, 1000);

    if (roomInviteTimeoutId) clearTimeout(roomInviteTimeoutId);
    // The interval now handles the timeout logic more explicitly with UI updates
}

function hideRoomInvitePopup() {
    roomInviteNotificationPopup.classList.remove('visible'); // Use .visible to trigger slide-up
    activeRoomInviteData = null; // Clear active data when hiding
    clearTimeout(roomInviteTimeoutId); roomInviteTimeoutId = null;
    clearInterval(roomInviteTimerIntervalId); roomInviteTimerIntervalId = null;
}

acceptRoomInviteButton.addEventListener('click', async () => {
    if (activeRoomInviteData && currentUser) {
        const { roomId, inviteKey } = activeRoomInviteData;
        // No need to clear timers here, hideRoomInvitePopup will do it
        showLoading("正在加入房間...");
        try {
            await db.ref(`room_invites/${currentUser.uid}/${inviteKey}`).update({ status: 'accepted' });
            hideRoomInvitePopup(); // This will clear timers and active data
            await joinMultiplayerRoom(roomId);
        } catch (error) {
            console.error("接受房間邀請失敗:", error); alert("接受邀請時發生錯誤");
            hideLoading(); 
            hideRoomInvitePopup(); // Ensure it's hidden on error too
        }
    }
});

declineRoomInviteButton.addEventListener('click', async () => {
    if (activeRoomInviteData && currentUser) {
        const { inviteKey } = activeRoomInviteData;
        try {
            await db.ref(`room_invites/${currentUser.uid}/${inviteKey}`).update({ status: 'declined' });
        } catch (error) { console.error("拒絕房間邀請失敗:", error); }
        finally { 
            hideRoomInvitePopup(); // This will clear timers and active data
        }
    }
});

// Event listener for the new close button on the banner
if (roomInviteBannerCloseButton) {
    roomInviteBannerCloseButton.addEventListener('click', async () => {
        if (activeRoomInviteData && currentUser) {
            const { inviteKey } = activeRoomInviteData;
            // Treat manual close as a decline
            try {
                await db.ref(`room_invites/${currentUser.uid}/${inviteKey}`).update({ status: 'declined_by_user_close' }); // Or just 'declined'
            } catch (error) { console.error("關閉房間邀請通知失敗:", error); }
            finally {
                hideRoomInvitePopup();
            }
        } else {
            hideRoomInvitePopup(); // If no active data, just hide
        }
    });
}


// --- Friend Request Notification Logic ---
function initializeFriendRequestListener() {
    if (!currentUser || friendRequestsListener) return;
    const requestsRef = db.ref(`users/${currentUser.uid}/friend_invites_received`);
    if (friendRequestsListener) requestsRef.off('value', friendRequestsListener); 
    friendRequestsListener = requestsRef.on('value', snapshot => {
        const newRequests = snapshot.val() || {};
        friendRequestsReceived = newRequests; 

        const pendingRequests = Object.entries(newRequests).filter(([key, req]) => req.status === 'pending');

        if (pendingRequests.length > 0) {
            pendingRequests.sort((a, b) => b[1].timestamp - a[1].timestamp);
            const [latestRequestSenderUid, latestRequestData] = pendingRequests[0];

            if (!activeFriendRequestData || activeFriendRequestData.senderUid !== latestRequestSenderUid) {
                if (friendRequestNotificationPopup && !friendRequestNotificationPopup.classList.contains('hidden')) {
                    hideFriendRequestPopup();
                }
                showFriendRequestPopup(latestRequestData, latestRequestSenderUid); 
            }
        } else {
            hideFriendRequestPopup();
        }
    }, error => console.error("Error fetching friend requests:", error));
    userListeners.push({ ref: requestsRef, eventType: 'value', callback: friendRequestsListener });
}

function showFriendRequestPopup(requestData, senderUid) {
    if (!friendRequestNotificationPopup) return; 

    if (requestData.status !== 'pending') {
        hideFriendRequestPopup();
        return;
    }

    // If a room invite banner is active, decide on behavior.
    // For now, let's assume the friend request modal can show "under" or after the banner is gone.
    // Or, prevent showing if banner is visible:
    // if (roomInviteNotificationPopup.classList.contains('visible')) {
    //     return;
    // }

    activeFriendRequestData = {
        senderUid: senderUid,
        senderUsername: requestData.senderUsername,
        requestData: requestData 
    };

    friendRequestMessage.textContent = `${requestData.senderUsername} 邀請你成為好友！`;
    friendRequestNotificationPopup.classList.remove('hidden'); // This is for the modal style

    let timeLeft = 10;
    friendRequestTimerDisplay.textContent = `自動關閉於 ${timeLeft} 秒...`;
    if (friendRequestTimerIntervalId) clearInterval(friendRequestTimerIntervalId);
    friendRequestTimerIntervalId = setInterval(() => {
        timeLeft--;
        friendRequestTimerDisplay.textContent = `自動關閉於 ${timeLeft} 秒...`;
        if (timeLeft <= 0) {
            clearInterval(friendRequestTimerIntervalId);
            if (activeFriendRequestData && activeFriendRequestData.senderUid === senderUid) {
                db.ref(`users/${currentUser.uid}/friend_invites_received/${senderUid}`).update({ status: 'expired' });
                hideFriendRequestPopup();
            }
        }
    }, 1000);

    if (friendRequestTimeoutId) clearTimeout(friendRequestTimeoutId);
    friendRequestTimeoutId = setTimeout(() => {
    }, 10000);
}

function hideFriendRequestPopup() {
    if (!friendRequestNotificationPopup) return; 
    friendRequestNotificationPopup.classList.add('hidden');
    activeFriendRequestData = null;
    clearTimeout(friendRequestTimeoutId);
    friendRequestTimeoutId = null;
    clearInterval(friendRequestTimerIntervalId);
    friendRequestTimerIntervalId = null;
}

if (acceptFriendRequestButton) {
    acceptFriendRequestButton.addEventListener('click', async () => {
        if (activeFriendRequestData && currentUser) {
            const { senderUid, senderUsername } = activeFriendRequestData;
            await acceptFriendRequest(senderUid, senderUsername);
            hideFriendRequestPopup();
        }
    });
}

if (declineFriendRequestButton) {
    declineFriendRequestButton.addEventListener('click', async () => {
        if (activeFriendRequestData && currentUser) {
            const { senderUid } = activeFriendRequestData;
            await declineFriendRequest(senderUid);
            hideFriendRequestPopup();
        }
    });
}

if (closeFriendRequestPopupButton) {
    closeFriendRequestPopupButton.addEventListener('click', () => {
        if (activeFriendRequestData && currentUser) {
            const { senderUid } = activeFriendRequestData;
            db.ref(`users/${currentUser.uid}/friend_invites_received/${senderUid}`).update({ status: 'dismissed_by_user' });
        }
        hideFriendRequestPopup();
    });
}


// --- Initial Page Load ---
document.addEventListener('DOMContentLoaded', async () => {
    showLoading("正在載入遊戲...");
    // Ensure the notification banner is hidden by default (though CSS transform handles this)
    if(roomInviteNotificationPopup) {
        roomInviteNotificationPopup.classList.remove('visible'); 
    }
    await loadQuestions();
    const authPageIsVisible = authPage && !authPage.classList.contains('hidden');
    if (allQuestions.length === 0 && authPageIsVisible && loginError) {
         displayMessage(loginError, "警告：題目資料未能成功載入，部分功能可能受限", true);
    }
});