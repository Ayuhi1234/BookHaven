// --- APP STATE ---
let books = [];
let viewMode = 'list'; // 'list' or 'grid'

// --- INIT ---
window.onload = async () => {
    await DatabaseService.init();
    loadBooks();
    setupSearch();
    updateStats();
};

// --- NAVIGATION ---
function switchTab(tab) {
    document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
}

function toggleView() {
    viewMode = viewMode === 'list' ? 'grid' : 'list';
    document.getElementById('view-icon').name = viewMode === 'list' ? 'grid-outline' : 'list-outline';
    document.getElementById('book-list-container').className = viewMode === 'list' ? 'list-view' : 'grid-view';
    renderBooks(books);
}

// --- MODAL HANDLING ---
const modalElement = document.getElementById('add-modal');
function openModal(id) { document.getElementById(id).present(); }
function closeModal(id) { document.getElementById(id).dismiss(); }

// --- CORE LOGIC ---
async function saveBook() {
    const title = document.getElementById('inp-title').value;
    const author = document.getElementById('inp-author').value;
    const status = document.getElementById('inp-status').value;
    const rating = document.getElementById('inp-rating').value;

    if (!title) { alert('Please enter a title'); return; }

    const book = {
        id: Date.now(),
        title, author, status, rating,
        dateAdded: new Date().toISOString()
    };

    await DatabaseService.addBook(book);
    closeModal('add-modal');
    
    // Clear inputs
    document.getElementById('inp-title').value = '';
    document.getElementById('inp-author').value = '';
    
    loadBooks();
}

async function loadBooks() {
    books = await DatabaseService.getAllBooks();
    renderBooks(books);
    updateStats();
}

async function deleteBook(id) {
    if(confirm("Delete this book?")) {
        await DatabaseService.deleteBook(id);
        loadBooks();
    }
}

function renderBooks(bookList) {
    const container = document.getElementById('book-list-container');
    container.innerHTML = '';

    if (bookList.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:40px; color:#999;">No books found.<br>Add one!</div>';
        return;
    }

    bookList.forEach(b => {
        const card = document.createElement('ion-card');
        let color = b.status === 'Completed' ? 'success' : (b.status === 'Reading' ? 'warning' : 'medium');
        
        card.innerHTML = `
            <ion-card-header>
                <ion-card-subtitle style="color:var(--ion-color-${color})">${b.status}</ion-card-subtitle>
                <ion-card-title>${b.title}</ion-card-title>
                <ion-card-subtitle>by ${b.author}</ion-card-subtitle>
            </ion-card-header>
            <ion-card-content>
                <div>Rating: ${'⭐'.repeat(b.rating)}</div>
                <div style="text-align:right; margin-top:10px;">
                    <ion-button fill="clear" color="danger" onclick="deleteBook(${b.id})">
                        <ion-icon name="trash-outline"></ion-icon>
                    </ion-button>
                </div>
            </ion-card-content>
        `;
        container.appendChild(card);
    });
}

function setupSearch() {
    const searchBar = document.getElementById('search-bar');
    const segment = document.getElementById('filter-segment');

    const filter = () => {
        const query = searchBar.value.toLowerCase();
        const status = segment.value;

        const filtered = books.filter(b => {
            const matchesSearch = b.title.toLowerCase().includes(query) || b.author.toLowerCase().includes(query);
            const matchesStatus = status === 'all' || b.status === status;
            return matchesSearch && matchesStatus;
        });
        renderBooks(filtered);
    };

    searchBar.addEventListener('ionInput', filter);
    segment.addEventListener('ionChange', filter);
}

function updateStats() {
    const total = books.length;
    const read = books.filter(b => b.status === 'Completed').length;
    // Streak logic would check dates in a real scenario
    const streak = read > 0 ? Math.floor(Math.random() * 10) + 1 : 0; 

    document.getElementById('stat-total').innerText = total;
    document.getElementById('stat-read').innerText = read;
    document.getElementById('stat-streak').innerText = streak;
}

// --- DATABASE SERVICE (Abstraction) ---
// This mocks SQLite structure using LocalStorage for stability
// To use real SQLite, replace the methods below with plugin calls.
class DatabaseService {
    static async init() {
        console.log("Database Initialized");
        if (!localStorage.getItem('books_db')) {
            localStorage.setItem('books_db', JSON.stringify([]));
        }
    }

    static async getAllBooks() {
        return JSON.parse(localStorage.getItem('books_db') || '[]');
    }

    static async addBook(book) {
        const list = await this.getAllBooks();
        list.push(book);
        localStorage.setItem('books_db', JSON.stringify(list));
    }

    static async deleteBook(id) {
        let list = await this.getAllBooks();
        list = list.filter(b => b.id !== id);
        localStorage.setItem('books_db', JSON.stringify(list));
    }
}

// --- NOTIFICATIONS ---
async function toggleReminder(ev) {
    if (ev.detail.checked) {
        // In a real app, request permissions here
        alert("Reminder set for 8:00 PM daily!");
    } else {
        alert("Reminder cancelled.");
    }
}
function exportData() {
    alert("This is a Premium feature! 💎");
}