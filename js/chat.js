// js/chat.js
class Chat {
    constructor() {
        this.channel = null;
        this.init();
    }

    async init() {
        await this.loadMessages();
        this.setupRealtime();
        this.setupEventListeners();
        this.scrollToBottom();
    }

    async loadMessages() {
        const { data } = await auth.supabase
            .from('chat_messages')
            .select('*, employes(nom)')
            .order('created_at', { ascending: true })
            .limit(100);

        if (data) {
            this.renderMessages(data);
        }
    }

    renderMessages(messages) {
        const container = document.getElementById('chat-messages');
        if (!container) return;

        container.innerHTML = messages.map(m => {
            const isMoi = m.employe_id === auth.currentUser.id;
            const date = new Date(m.created_at);
            const heure = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            
            return `
                <div class="chat-message ${isMoi ? 'moi' : 'autre'}">
                    ${!isMoi ? `<div class="auteur">${m.employes?.nom || 'Inconnu'}</div>` : ''}
                    <div>${m.message}</div>
                    <div class="heure">${heure}</div>
                </div>
            `;
        }).join('');
    }

    setupRealtime() {
        this.channel = auth.supabase
            .channel('chat')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages'
            }, (payload) => {
                this.appendMessage(payload.new);
            })
            .subscribe();
    }

    async appendMessage(msg) {
        const container = document.getElementById('chat-messages');
        if (!container) return;

        // Récupérer le nom de l'employé
        const { data } = await auth.supabase
            .from('employes')
            .select('nom')
            .eq('id', msg.employe_id)
            .single();

        const isMoi = msg.employe_id === auth.currentUser.id;
        const date = new Date(msg.created_at);
        const heure = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        const div = document.createElement('div');
        div.className = `chat-message ${isMoi ? 'moi' : 'autre'}`;
        div.innerHTML = `
            ${!isMoi ? `<div class="auteur">${data?.nom || 'Inconnu'}</div>` : ''}
            <div>${msg.message}</div>
            <div class="heure">${heure}</div>
        `;

        container.appendChild(div);
        this.scrollToBottom();
    }

    setupEventListeners() {
        document.getElementById('btn-send')?.addEventListener('click', () => this.sendMessage());
        document.getElementById('chat-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
    }

    async sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input?.value.trim();
        if (!message) return;

        await auth.supabase
            .from('chat_messages')
            .insert({
                employe_id: auth.currentUser.id,
                message: message
            });

        input.value = '';
    }

    scrollToBottom() {
        const container = document.getElementById('chat-messages');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (auth.isAuthenticated()) new Chat();
});