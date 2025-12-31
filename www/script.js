// --- 1. FIREBASE CONFIG (USE YOUR KEYS) ---
const firebaseConfig = {
    apiKey: "AIzaSyBpvzufWwZy73C1RP924Ja7_Yefkmhc4Lo",
    authDomain: "bookhaven-club.firebaseapp.com",
    databaseURL: "https://bookhaven-club-default-rtdb.firebaseio.com",
    projectId: "bookhaven-club"
};

try {
    firebase.initializeApp(firebaseConfig);
    var auth = firebase.auth();
    var db = firebase.database();
} catch (e) { console.error(e); }

// --- 2. GLOBAL STATE ---
let currentUser = null;
let currentAuthMode = 'login';
let myBooks = [];
let currentFilter = 'all';
let readingGoal = 10;
let allPosts = [];

// --- 3. AUTHENTICATION ---
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'flex'; // FIXED: use flex for layout
        loadMyBooks();
        loadCommunity();
        loadMembers();
        initPoll(); // Start the poll
    } else {
        currentUser = null;
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('app-screen').style.display = 'none';
    }
});

function toggleAuth(mode) {
    currentAuthMode = mode;
    document.getElementById('signup-name-field').style.display = (mode === 'signup') ? 'block' : 'none';
    document.getElementById('btn-action').innerText = (mode === 'signup') ? 'Sign Up' : 'Log In';
    document.getElementById('auth-error').innerText = "";
}

function handleAuth() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    const name = document.getElementById('auth-name').value;
    const errorBox = document.getElementById('auth-error');

    if (currentAuthMode === 'login') {
        auth.signInWithEmailAndPassword(email, pass).catch(e => errorBox.innerText = e.message);
    } else {
        if(!name) return errorBox.innerText = "Name required!";
        auth.createUserWithEmailAndPassword(email, pass)
        .then((cred) => {
            db.ref('members/' + cred.user.uid).set({
                name: name, email: email, joined: Date.now(), booksRead: 0
            });
        }).catch(e => errorBox.innerText = e.message);
    }
}
function logout() { auth.signOut(); }

// --- 4. NAVIGATION & UI ---
window.onload = function() {
    const savedTheme = localStorage.getItem('bookhaven_theme');
    if(savedTheme === 'dark') { document.body.classList.add('dark'); document.getElementById('theme-icon').name = 'sunny'; }

    // Connect Tabs
    const mainTabs = document.getElementById('main-tabs');
    if(mainTabs) mainTabs.addEventListener('ionChange', (e) => switchTab(e.detail.value));
    
    // Connect Community Views
    const clubSeg = document.getElementById('club-segment');
    if(clubSeg) clubSeg.addEventListener('ionChange', (e) => switchClubView(e.detail.value));
};

function switchTab(tab) {
    document.getElementById('tab-library').style.display = 'none';
    document.getElementById('tab-club').style.display = 'none';
    document.getElementById('tab-' + tab).style.display = 'block';
}

function switchToClub() {
    // Helper to jump to club from "Buzz" widget
    document.getElementById('main-tabs').value = 'club';
    switchTab('club');
}

function switchClubView(view) {
    document.getElementById('view-feed').style.display = view === 'feed' ? 'block' : 'none';
    document.getElementById('view-poll').style.display = view === 'poll' ? 'block' : 'none';
    document.getElementById('view-members').style.display = view === 'members' ? 'block' : 'none';
}

function toggleTheme() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('bookhaven_theme', isDark ? 'dark' : 'light');
    document.getElementById('theme-icon').name = isDark ? 'sunny' : 'moon';
}

// --- 5. PRIVATE LIBRARY ---
function saveBook() {
    if(!currentUser) return;
    const title = document.getElementById('inp-title').value;
    const author = document.getElementById('inp-author').value;
    const image = document.getElementById('inp-image').value || 'https://via.placeholder.com/128x190';
    const link = document.getElementById('inp-link').value;
    const rating = document.getElementById('inp-rating').value || 0;

    if(title) {
        db.ref('users/' + currentUser.uid + '/books').push({ title, author, image, link, rating, done: false });
        db.ref('members/' + currentUser.uid + '/booksRead').transaction((c) => (c || 0) + 1);
        closeModal(); document.getElementById('inp-title').value = "";
    } else { alert("Title required!"); }
}

function loadMyBooks() {
    if(!currentUser) return;
    db.ref('users/' + currentUser.uid + '/books').on('value', (snap) => {
        myBooks = [];
        let readCount = 0;
        snap.forEach(c => {
            const b = c.val();
            myBooks.push({ key: c.key, ...b });
            if(b.done) readCount++;
        });
        document.getElementById('read-val').innerText = readCount;
        let p = (readCount / readingGoal) * 100;
        if(p>100) p=100;
        document.getElementById('progress-bar').style.width = p + "%";
        renderBooks();
    });
}

function renderBooks() {
    const list = document.getElementById('book-list');
    list.innerHTML = '';
    const filtered = myBooks.filter(b => {
        if(currentFilter === 'all') return true;
        if(currentFilter === 'read') return b.done;
        return !b.done;
    });
    filtered.forEach(b => {
        const stars = b.rating > 0 ? `<div style="color:#ffc107;">${'★'.repeat(b.rating)}</div>` : '';
        const readBtn = b.link ? `<ion-button size="small" fill="outline" href="${b.link}" target="_blank">Read</ion-button>` : '';
        const item = document.createElement('ion-item');
        item.innerHTML = `
            <ion-thumbnail slot="start"><img src="${b.image}"></ion-thumbnail>
            <ion-label class="${b.done ? 'done-text' : ''}"><h2>${b.title}</h2><p>${b.author}</p>${stars}${readBtn}</ion-label>
            <ion-checkbox slot="end" ${b.done ? 'checked' : ''} onclick="toggleDone('${b.key}', ${b.done})"></ion-checkbox>
            <ion-button slot="end" fill="clear" color="danger" onclick="deleteBook('${b.key}')"><ion-icon name="trash"></ion-icon></ion-button>
        `;
        list.appendChild(item);
    });
}
function toggleDone(k, s) { db.ref('users/'+currentUser.uid+'/books/'+k).update({done: !s}); }
function deleteBook(k) { if(confirm("Delete?")) db.ref('users/'+currentUser.uid+'/books/'+k).remove(); }
function filterBooks(t) { currentFilter = t; renderBooks(); }
function editGoal() { const g = prompt("Goal:", readingGoal); if(g) { readingGoal=g; document.getElementById('goal-val').innerText=g; loadMyBooks(); } }
function surpriseMe() {
    const u = myBooks.filter(b => !b.done);
    if(u.length>0) alert(`🎲 Read: ${u[Math.floor(Math.random()*u.length)].title}`);
    else alert("No unread books!");
}

// --- 6. COMMUNITY (Interactive) ---
function sharePost() {
    if(!currentUser) return;
    const content = document.getElementById('post-content').value;
    const title = document.getElementById('post-book-title').value;
    const image = document.getElementById('post-book-image').value;
    const rating = document.getElementById('post-rating').value;

    db.ref('members/'+currentUser.uid).once('value').then(snap => {
        const name = snap.val() ? snap.val().name : "User";
        if(content && title) {
            db.ref("reviews").push({ user: name, content, title, image, rating, likes: 0, time: Date.now() });
            closePostModal(); alert("Posted!");
        } else alert("Search book first");
    });
}

function loadCommunity() {
    db.ref("reviews").limitToLast(30).on("value", (snap) => {
        allPosts = [];
        snap.forEach(c => allPosts.push({ key: c.key, ...c.val() }));
        renderFeed(allPosts);
        
        // Update "Buzz" Widget on Home Screen
        if(allPosts.length > 0) {
            const last = allPosts[allPosts.length - 1];
            document.getElementById('buzz-preview').innerHTML = `<b>${last.user}</b> just reviewed <i>${last.title}</i>: "${last.content.substring(0,30)}..."`;
        }
    });
}

function renderFeed(posts) {
    const feed = document.getElementById('feed-list');
    feed.innerHTML = "";
    posts.reverse().forEach(p => {
        const stars = p.rating > 0 ? `<div style="color:#ffc107;">${'★'.repeat(p.rating)}</div>` : '';
        let commentsHtml = '';
        if(p.comments) {
            Object.values(p.comments).forEach(c => {
                commentsHtml += `<div style="font-size:12px; margin-top:5px; background:var(--ion-color-light); padding:5px; border-radius:4px;"><b>${c.user}:</b> ${c.text}</div>`;
            });
        }
        const card = document.createElement('ion-card');
        card.innerHTML = `
            <div style="display:flex; padding:10px;">
                <img src="${p.image}" style="width:50px; height:75px; object-fit:cover; margin-right:10px;">
                <div><h3 style="margin:0;">${p.title}</h3>${stars}<p style="font-size:12px;">${p.user}</p></div>
            </div>
            <ion-card-content>${p.content}</ion-card-content>
            <div style="border-top:1px solid #ddd; padding:5px; display:flex; justify-content:space-between;">
                <ion-button fill="clear" size="small" onclick="likePost('${p.key}', ${p.likes || 0})">
                    <ion-icon name="heart" slot="start"></ion-icon> ${p.likes || 0}
                </ion-button>
            </div>
            <div style="padding:10px; border-top:1px solid #ddd;">
                ${commentsHtml}
                <div style="display:flex; margin-top:10px;">
                    <input id="comment-${p.key}" placeholder="Reply..." style="flex:1; padding:5px; border:1px solid #ccc; border-radius:4px;">
                    <button onclick="addComment('${p.key}')" style="margin-left:5px;">Send</button>
                </div>
            </div>
        `;
        feed.appendChild(card);
    });
}
function likePost(k, l) { db.ref("reviews/"+k).update({likes: l+1}); }
function addComment(key) {
    const input = document.getElementById(`comment-${key}`);
    const text = input.value;
    if(!text) return;
    db.ref('members/' + currentUser.uid).once('value').then(snap => {
        const name = snap.val() ? snap.val().name : "User";
        db.ref(`reviews/${key}/comments`).push({ user: name, text: text });
        input.value = "";
    });
}

// --- 7. NEW: POLL SYSTEM ---
function initPoll() {
    // Define Poll Data
    const options = ["Sci-Fi", "Romance", "Mystery", "Non-Fiction"];
    const container = document.getElementById('poll-options');
    container.innerHTML = "";
    
    options.forEach(opt => {
        // Create option button
        const div = document.createElement('div');
        div.className = "poll-option";
        div.innerHTML = `<span>${opt}</span><span id="poll-count-${opt}">0</span>`;
        div.onclick = () => votePoll(opt);
        container.appendChild(div);
        
        // Listen for live counts
        db.ref('polls/genre/' + opt).on('value', (snap) => {
            document.getElementById(`poll-count-${opt}`).innerText = snap.val() || 0;
        });
    });
}

function votePoll(option) {
    db.ref('polls/genre/' + option).transaction(count => (count || 0) + 1);
    alert(`Voted for ${option}!`);
}

function loadMembers() {
    const list = document.getElementById('members-list');
    db.ref('members').on('value', (snap) => {
        list.innerHTML = "";
        snap.forEach(c => {
            const m = c.val();
            const d = new Date(m.joined).toLocaleDateString();
            const item = document.createElement('ion-item');
            item.innerHTML = `
                <ion-avatar slot="start" style="background:#eee; display:flex; align-items:center; justify-content:center;"><span>👤</span></ion-avatar>
                <ion-label><h2>${m.name}</h2><p>Joined: ${d}</p></ion-label>
                <ion-badge color="medium" slot="end">${m.booksRead || 0} Books</ion-badge>
            `;
            list.appendChild(item);
        });
    });
}

// Search & Helpers
document.getElementById('club-search').addEventListener('ionChange', (e) => {
    const q = e.detail.value.toLowerCase();
    renderFeed(allPosts.filter(p => p.title.toLowerCase().includes(q)));
});
async function searchBook(mode) {
    const id = mode === 'private' ? 'inp-search' : 'post-search';
    const q = document.getElementById(id).value;
    if(!q) return;
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}`);
    const d = await res.json();
    if(d.items) {
        const b = d.items[0].volumeInfo;
        const img = b.imageLinks ? b.imageLinks.thumbnail : '';
        if(mode==='private') {
            document.getElementById('inp-title').value = b.title;
            document.getElementById('inp-author').value = b.authors?b.authors[0]:'';
            document.getElementById('inp-image').value = img;
            document.getElementById('img-preview').innerHTML=`<img src="${img}" style="height:100px">`;
        } else {
            document.getElementById('post-book-title').value = b.title;
            document.getElementById('post-book-image').value = img;
            document.getElementById('post-preview').innerHTML=`<img src="${img}" style="height:80px">`;
        }
    }
}
function setRating(n, m) {
    document.getElementById(m==='private'?'inp-rating':'post-rating').value = n;
    const c = document.getElementById(m==='private'?'private-stars':'public-stars');
    let h=''; for(let i=1;i<=5;i++) h+=`<span onclick="setRating(${i},'${m}')">${i<=n?'★':'☆'}</span>`;
    c.innerHTML=h;
}
function openModal() { document.getElementById('add-modal').present(); setRating(0,'private'); }
function closeModal() { document.getElementById('add-modal').dismiss(); }
function openPostModal() { document.getElementById('post-modal').present(); setRating(0,'public'); }
function closePostModal() { document.getElementById('post-modal').dismiss(); }