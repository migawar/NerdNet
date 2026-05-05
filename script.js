// Firebase Configuratie (Vervang dit met je eigen Firebase project settings later)
const firebaseConfig = {
  apiKey: "AIzaSyClp8sVjpWzSbXfdDNuddZQBM0BNRm_hLY",
  authDomain: "nerdnet-c98f4.firebaseapp.com",
  projectId: "nerdnet-c98f4",
  storageBucket: "nerdnet-c98f4.firebasestorage.app",
  messagingSenderId: "695745920210",
  appId: "1:695745920210:web:8dc909c4f27538f0dec10b",
  measurementId: "G-1L95L6KNTL"
};

// Initialiseer Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Globale state
let activeChatId = null;
let currentUserData = null;

// Wacht tot de DOM geladen is
document.addEventListener('DOMContentLoaded', () => {
    const navChats = document.getElementById('nav-chats');
    const addChatBtn = document.getElementById('add-chat-btn');
    const chatList = document.getElementById('chat-list');
    const chatScreen = document.getElementById('active-chat-screen');
    const closeChatBtn = document.getElementById('close-chat-btn');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const messageList = document.getElementById('message-list');

    // 1. Google Login & Gebruikersnaam check
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            const provider = new firebase.auth.GoogleAuthProvider();
            try {
                await auth.signInWithPopup(provider);
            } catch (err) {
                alert("Inloggen mislukt: " + err.message);
            }
        } else {
            // Check of gebruiker al een gebruikersnaam heeft in Firestore
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (!userDoc.exists) {
                const username = prompt('Kies een stoere gebruikersnaam:');
                if (username) {
                    await db.collection('users').doc(user.uid).set({
                        username: username,
                        email: user.email
                    });
                }
            }
            loadChats();
        }
    });

    // 2. Chats laden uit Firestore
    function loadChats() {
        db.collection('chats')
            .orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                chatList.innerHTML = '';
                snapshot.forEach(doc => {
                    const chat = doc.data();
                    const chatEl = document.createElement('div');
                    chatEl.className = 'chat-item';
                    chatEl.innerHTML = `
                        <h3>${chat.name}</h3>
                        <p>Leden: ${chat.participants.join(', ')}</p>
                    `;
                    chatEl.onclick = () => openChat(doc.id, chat.name);
                    chatList.appendChild(chatEl);
                });
            });
    }

    // 3. tiveChatId = chatId;
        document.getElementById('active-chat-title').innerText = chatName;
        chatScreen.style.display = 'flex';

        // Luister naar berichten in deze chat
        db.collection('chats').doc(chatId).collection('messages')
            .orderBy('createdAt', 'asc')
            .onSnapshot(snapshot => {
                messageList.innerHTML = '';
                snapshot.forEach(doc => {
                    const msg = doc.data();
                    const isMe = msg.senderId === auth.currentUser.uid;
                    const msgEl = document.createElement('div');
                    msgEl.className = `message ${isMe ? 'sent' : 'received'}`;
                    msgEl.innerHTML = `
                        <span class="sender">${isMe ? 'Jij' : msg.senderName}</span>
                        ${msg.text}
                    `;
                    messageList.appendChild(msgEl);
                });
                messageList.scrollTop = messageList.scrollHeight;
            });
    }

    // 4. Bericht versturen
    async function sendMessage() {
        const text = messageInput.value.trim();
        if (!text || !activeChatId) return;

        await db.collection('chats').doc(activeChatId).collection('messages').add({
            text: text,
            senderId: auth.currentUser.uid,
            senderName: currentUserData.username || 'Anoniem',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        messageInput.value = '';
    }

    sendBtn.onclick = sendMessage;
    messageInput.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };
    closeChatBtn.onclick = () => { chatScreen.style.display = 'none'; activeChatId = null; };

    // 5. Nieuwe chat toevoegen actie
    addChatBtn.addEventListener('click', async () => {
        if (!auth.currentUser) return;

        const chatName = prompt('Voer een naam in voor de nieuwe chat:');
        if (!chatName) return;

        const participantsInput = prompt('Voer de accounts in (gescheiden door een komma):');
        if (participantsInput) {
            const participants = participantsInput.split(',').map(p => p.trim());
            
            try {
                await db.collection('chats').add({
                    name: chatName,
                    participants: participants,
                    owner: auth.currentUser.uid,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log('Chat succesvol aangemaakt in Firebase!');
            } catch (err) {
                console.error("Fout bij aanmaken chat:", err);
            }
        }
    });
});
