class ContactManager {
    constructor() {
        this.contacts = this.loadContacts();
        this.currentDeleteId = null;
        this.activeToasts = [];
        this.initializeEventListeners();
        this.renderContacts();
        this.updateContactCount();
    }

    loadContacts() {
        try {
            const stored = localStorage.getItem('contacts');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading contacts:', error);
            localStorage.removeItem('contacts');
            return [];
        }
    }

    saveContacts() {
        try {
            localStorage.setItem('contacts', JSON.stringify(this.contacts));
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                this.showWarning('Storage quota exceeded. Please delete some contacts.');
                console.error('localStorage quota exceeded:', error);
            } else {
                console.error('Error saving contacts:', error);
            }
        }
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2);
    }

    initializeEventListeners() {

        document.getElementById('createBtn').addEventListener('click', () => {
            this.addContact();
        });

        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchContacts(e.target.value);
        });

        document.getElementById('deleteAllBtn').addEventListener('click', () => {
            if (this.contacts.length > 0) {
                const deleteAllModalEl = document.getElementById('deleteAllModal');
                let deleteAllModal = bootstrap.Modal.getInstance(deleteAllModalEl);
                if (!deleteAllModal) {
                    deleteAllModal = new bootstrap.Modal(deleteAllModalEl);
                }
                deleteAllModal.show();
            }
        });

        document.getElementById('confirmDeleteAllBtn').addEventListener('click', () => {
            this.deleteAllContacts();
            bootstrap.Modal.getInstance(document.getElementById('deleteAllModal')).hide();
        });

        document.getElementById('saveEditBtn').addEventListener('click', () => {
            this.saveEdit();
        });

        document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
            this.confirmDelete();
        });
    }

    addContact() {
        const name = document.getElementById('name').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const email = document.getElementById('email').value.trim();
        const address = document.getElementById('address').value.trim();
        const imageUrl = document.getElementById('imageUrl').value.trim();

        if (!name || !phone || !email || !address || !imageUrl) {
            this.showWarning('Kindly fill all fields');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showWarning('Please enter a valid email address');
            return;
        }

        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        if (!phoneRegex.test(phone) || phone.replace(/\D/g, '').length < 7) {
            this.showWarning('Please enter a valid phone number');
            return;
        }

        try {
            new URL(imageUrl);
        } catch {
            this.showWarning('Please enter a valid image URL');
            return;
        }

        const contact = {
            id: this.generateId(),
            name,
            phone,
            email,
            address,
            imageUrl,
            blocked: false
        };

        this.contacts.push(contact);
        this.saveContacts();
        this.renderContacts();
        this.clearForm();
        this.updateContactCount();
        this.showToast('Contact added successfully!');
    }

    clearForm() {
        document.getElementById('name').value = '';
        document.getElementById('phone').value = '';
        document.getElementById('email').value = '';
        document.getElementById('address').value = '';
        document.getElementById('imageUrl').value = '';
    }

    showWarning(message) {
        const warningMsg = document.getElementById('warningMsg');
        warningMsg.textContent = message;
        warningMsg.style.display = 'block';
        setTimeout(() => {
            warningMsg.style.display = 'none';
        }, 3000);
    }

    renderContacts(contactsToRender = this.contacts) {
        const grid = document.getElementById('contactsGrid');
        const emptyState = document.getElementById('emptyState');
        const searchQuery = document.getElementById('searchInput').value;
        
        if (contactsToRender.length === 0) {
            grid.innerHTML = '';
            emptyState.style.display = 'block';
            
            const emptyStateTitle = emptyState.querySelector('h3');
            const emptyStateText = emptyState.querySelector('p');
            
            if (searchQuery && this.contacts.length > 0) {
                emptyStateTitle.textContent = 'No Contacts Found';
                emptyStateText.textContent = `No contacts match "${searchQuery}"`;
            } else {
                emptyStateTitle.textContent = 'No Contacts Found';
                emptyStateText.textContent = 'Start by adding your first contact above';
            }
        } else {
            emptyState.style.display = 'none';
            grid.innerHTML = contactsToRender.map(contact => this.createContactCard(contact)).join('');
            
            this.attachCardEventListeners();
        }

        this.updateDeleteAllButton();
    }

    createContactCard(contact) {
        const blockedClass = contact.blocked ? 'blocked' : '';
        const blockButtonText = contact.blocked ? 'Unblock' : 'Block';
        const blockButtonIcon = contact.blocked ? 'fa-unlock' : 'fa-ban';
        const blockButtonClass = contact.blocked ? 'btn-success' : 'btn-warning';
        const escapedImageUrl = this.escapeHtml(contact.imageUrl);

        return `
            <div class="col-md-6 col-lg-4">
                <div class="contact-card ${blockedClass}" data-contact-id="${this.escapeHtml(contact.id)}">
                    <div class="contact-image-container">
                        <img src="${escapedImageUrl}" 
                             alt="${this.escapeHtml(contact.name)}" 
                             class="contact-image"
                             loading="lazy"
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                             onload="this.nextElementSibling.style.display='none';">
                        <div class="contact-image-placeholder" style="display: none;">
                            <i class="fas fa-user"></i>
                        </div>
                    </div>
                    <div class="contact-info">
                        <h5>Contact Card</h5>
                        <p><strong>Name:</strong> ${this.escapeHtml(contact.name)}</p>
                        <p><strong>Address:</strong> ${this.escapeHtml(contact.address)}</p>
                        <p><strong>Number:</strong> ${this.escapeHtml(contact.phone)}</p>
                        <p><strong>Email:</strong> ${this.escapeHtml(contact.email)}</p>
                    </div>
                    <div class="contact-actions">
                        <button class="btn btn-primary btn-edit" data-action="edit" aria-label="Edit contact ${this.escapeHtml(contact.name)}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-danger btn-delete" data-action="delete" aria-label="Delete contact ${this.escapeHtml(contact.name)}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                        <button class="btn ${blockButtonClass} btn-block" data-action="block" aria-label="${blockButtonText} contact ${this.escapeHtml(contact.name)}">
                            <i class="fas ${blockButtonIcon}"></i> ${blockButtonText}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

  
    attachCardEventListeners() {
        document.querySelectorAll('.contact-card').forEach(card => {
            const contactId = card.dataset.contactId;
            
            const editBtn = card.querySelector('[data-action="edit"]');
            const deleteBtn = card.querySelector('[data-action="delete"]');
            const blockBtn = card.querySelector('[data-action="block"]');
            
            if (editBtn) {
                editBtn.onclick = () => this.editContact(contactId);
            }
            if (deleteBtn) {
                deleteBtn.onclick = () => this.deleteContact(contactId);
            }
            if (blockBtn) {
                blockBtn.onclick = () => this.toggleBlock(contactId);
            }
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    editContact(id) {
        const contact = this.contacts.find(c => c.id === id);
        if (!contact) return;

        document.getElementById('editId').value = contact.id;
        document.getElementById('editName').value = contact.name;
        document.getElementById('editPhone').value = contact.phone;
        document.getElementById('editEmail').value = contact.email;
        document.getElementById('editAddress').value = contact.address;
        document.getElementById('editImageUrl').value = contact.imageUrl;

        const editModalEl = document.getElementById('editModal');
        let editModal = bootstrap.Modal.getInstance(editModalEl);
        if (!editModal) {
            editModal = new bootstrap.Modal(editModalEl);
        }
        editModal.show();
    }

    saveEdit() {
        const id = document.getElementById('editId').value;
        const name = document.getElementById('editName').value.trim();
        const phone = document.getElementById('editPhone').value.trim();
        const email = document.getElementById('editEmail').value.trim();
        const address = document.getElementById('editAddress').value.trim();
        const imageUrl = document.getElementById('editImageUrl').value.trim();

        if (!name || !phone || !email || !address || !imageUrl) {
            this.showWarning('Please fill in all fields');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showWarning('Please enter a valid email address');
            return;
        }

        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        if (!phoneRegex.test(phone) || phone.replace(/\D/g, '').length < 7) {
            this.showWarning('Please enter a valid phone number');
            return;
        }

        try {
            new URL(imageUrl);
        } catch {
            this.showWarning('Please enter a valid image URL');
            return;
        }

        const contactIndex = this.contacts.findIndex(c => c.id === id);
        if (contactIndex !== -1) {
            this.contacts[contactIndex] = {
                ...this.contacts[contactIndex],
                name,
                phone,
                email,
                address,
                imageUrl
            };

            this.saveContacts();

            const searchQuery = document.getElementById('searchInput').value;
            if (searchQuery) {
                this.searchContacts(searchQuery);
            } else {
                this.renderContacts();
            }
            
            bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
            this.showToast('Contact updated successfully!');
        }
    }

    deleteContact(id) {
        this.currentDeleteId = id;
        const deleteModalEl = document.getElementById('deleteModal');
        let deleteModal = bootstrap.Modal.getInstance(deleteModalEl);
        if (!deleteModal) {
            deleteModal = new bootstrap.Modal(deleteModalEl);
        }
        deleteModal.show();
    }

    confirmDelete() {
        if (this.currentDeleteId) {
            this.contacts = this.contacts.filter(c => c.id !== this.currentDeleteId);
            this.saveContacts();

            document.getElementById('searchInput').value = '';
            this.renderContacts();
            this.updateContactCount();
            this.currentDeleteId = null;
            bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
            this.showToast('Contact deleted successfully!');
        }
    }

    deleteAllContacts() {
        this.contacts = [];
        this.saveContacts();
        this.renderContacts();
        this.updateContactCount();
        document.getElementById('searchInput').value = '';
        this.showToast('All contacts deleted!');
    }

    toggleBlock(id) {
        const contact = this.contacts.find(c => c.id === id);
        if (contact) {
            contact.blocked = !contact.blocked;
            this.saveContacts();
            
            const searchQuery = document.getElementById('searchInput').value;
            if (searchQuery) {
                this.searchContacts(searchQuery);
            } else {
                this.renderContacts();
            }
            
            const status = contact.blocked ? 'blocked' : 'unblocked';
            this.showToast(`Contact ${status} successfully!`);
        }
    }

    searchContacts(query) {
        const filtered = this.contacts.filter(contact =>
            contact.name.toLowerCase().includes(query.toLowerCase())
        );
        this.renderContacts(filtered);
    }

    updateContactCount() {
        const count = this.contacts.length;
        document.getElementById('contactCountBadge').textContent = count;
    }

    updateDeleteAllButton() {
        const deleteAllBtn = document.getElementById('deleteAllBtn');
        deleteAllBtn.disabled = this.contacts.length === 0;
    }


    showToast(message) {
        
        if (this.activeToasts.length >= 3) {
            const oldestToast = this.activeToasts.shift();
            if (oldestToast && oldestToast.parentNode) {
                oldestToast.remove();
            }
        }

        
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'polite');
        
       
        const topPosition = 20 + (this.activeToasts.length * 70);
        
        toast.style.cssText = `
            position: fixed;
            top: ${topPosition}px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5);
            z-index: 9999;
            animation: slideIn 0.3s ease;
            font-weight: 500;
            transition: top 0.3s ease;
        `;

        document.body.appendChild(toast);
        this.activeToasts.push(toast);

        const toastRef = toast;
        
        setTimeout(() => {
            if (toastRef.parentNode) {
                toastRef.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    if (toastRef.parentNode) {
                        toastRef.remove();
                    }

                    const index = this.activeToasts.indexOf(toastRef);
                    if (index > -1) {
                        this.activeToasts.splice(index, 1);
                    }
                }, 300);
            }
        }, 2000);
    }
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

let contactManager;
document.addEventListener('DOMContentLoaded', () => {
    contactManager = new ContactManager();
});
