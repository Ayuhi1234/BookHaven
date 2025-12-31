// ==========================================
// 1. FIREBASE CONFIGURATION
// ==========================================

// I put your SPECIFIC keys here. This is ready to run.
const firebaseConfig = {
  apiKey: "AIzaSyBpvzufWwZy73C1RP924Ja7_Yefkmhc4Lo",
  authDomain: "bookhaven-club.firebaseapp.com",
  
  // ✅ CORRECT URL (Ends in .firebaseio.com)
  databaseURL: "https://bookhaven-club-default-rtdb.firebaseio.com",
  
  projectId: "bookhaven-club",
  storageBucket: "bookhaven-club.firebasestorage.app",
  messagingSenderId: "1013891660638",
  appId: "1:1013891660638:web:81a4adcd74f6e9c7822dcf",
  measurementId: "G-DQ06ZQ13D4"
};

// Initialize the Cloud Connection
try {
  firebase.initializeApp(firebaseConfig);
  var db = firebase.database(); // Connect to Realtime Database
  console.log("Connected to Book Club ☁️");
} catch (error) {
  console.error("Firebase Error:", error);
  alert("Database connection failed. Check console.");
}


// ==========================================
// 2. APP STARTUP
// ==========================================

let books = JSON.parse(localStorage.getItem('bookhaven_db')) || [];

window.onload = function() {
    loadBooks();       // Load your private books
    listenToClub();    // Load shared stories
};


// ==========================================
// 3. NAVIGATION & UI
// ==========================================

function switchTab(tab) {
    document.getElementById('tab-library').style.display = 'none';
    document.getElementById('tab-club').style.display = 'none';
    document.getElementById('tab-' + tab).style.display = 'block';
}

function openModal() { document.getElementById('add-modal').present(); }
function closeModal() { document.getElementById('add-modal').dismiss(); }
function openPostModal() { document.getElementById('post-modal').present(); }
function closePostModal() { document.getElementById('post-modal').dismiss(); }


// ==========================================
// 4. PRIVATE LIBRARY LOGIC
// ==========================================

function saveBook() {
    const title = document.getElementById('inp-title').value;
    const author = document.getElementById('inp-author').value;

    if(title) {
        books.push({
            id: Date.now(),
            title: title,
            author: author,
            done: false
        });
        localStorage.setItem('bookhaven_db', JSON.stringify(books));
        closeModal();
        loadBooks();
        document.getElementById('inp-title').value = "";
        document.getElementById('inp-author').value = "";
    } else {
        alert("Please enter a title!");
    }
}

function loadBooks() {
    const list = document.getElementById('book-list');
    list.innerHTML = '';
    let readCount = 0;

    books.forEach(book => {
        if(book.done) readCount++;
        const item = document.createElement('ion-item');
        item.innerHTML = `
            <ion-checkbox slot="start" ${book.done ? 'checked' : ''} onclick="toggleDone(${book.id})"></ion-checkbox>
            <ion-label>
                <h2>${book.title}</h2>
                <p>${book.author}</p>
            </ion-label>
            <ion-button fill="clear" color="danger" slot="end" onclick="deleteBook(${book.id})">
                <ion-icon name="trash"></ion-icon>
            </ion-button>
        `;
        list.appendChild(item);
    });

    document.getElementById('total-count').innerText = books.length;
    document.getElementById('read-count').innerText = readCount;
}

function toggleDone(id) {
    const book = books.find(b => b.id === id);
    book.done = !book.done;
    localStorage.setItem('bookhaven_db', JSON.stringify(books));
    loadBooks();
}

function deleteBook(id) {
    if(confirm("Delete this book?")) {
        books = books.filter(b => b.id !== id);
        localStorage.setItem('bookhaven_db', JSON.stringify(books));
        loadBooks();
    }
}


// ==========================================
// 5. BOOK CLUB LOGIC (Shared Database)
// ==========================================

function sharePost() {
    const user = document.getElementById('post-user').value;
    const book = document.getElementById('post-book').value;
    const content = document.getElementById('post-content').value;

    if(user && content) {
        // Send to Firebase
        db.ref("reviews").push({
            user: user,
            book: book,
            content: content,
            time: Date.now()
        }).then(() => {
            alert("Posted to Club! 🎉");
            closePostModal();
            document.getElementById('post-content').value = "";
        }).catch((error) => {
            alert("Error posting: " + error.message);
        });
    } else {
        alert("Please enter your Name and a Review!");
    }
}

function listenToClub() {
    const feed = document.getElementById('feed-list');
    
    // Listen for new posts
    db.ref("reviews").limitToLast(20).on("value", (snapshot) => {
        feed.innerHTML = "";
        const reviews = [];
        
        snapshot.forEach((child) => {
            reviews.push(child.val());
        });
        
        // Show newest first
        reviews.reverse().forEach((post) => {
            const date = new Date(post.time).toLocaleDateString();
            const card = document.createElement('ion-card');
            card.innerHTML = `
                <ion-card-header>
                    <ion-card-subtitle>${post.user} • ${date}</ion-card-subtitle>
                    <ion-card-title>📖 ${post.book}</ion-card-title>
                </ion-card-header>
                <ion-card-content style="color:#333;">
                    "${post.content}"
                </ion-card-content>
            `;
            feed.appendChild(card);
        });

        if(reviews.length === 0) {
            feed.innerHTML = "<p style='text-align:center; margin-top:30px; opacity:0.6;'>No stories yet. Be the first! ✍️</p>";
        }
    });
}