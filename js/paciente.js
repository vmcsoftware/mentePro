// Paciente.js - Gerenciamento de pacientes para mentePro
class PatientManager {
    constructor() {
        this.patients = [];
        this.currentPatient = null;
        this.isLoading = false;
        this.unsubscribe = null; // Para listeners do Firebase
    }

    // Inicializar o gerenciador de pacientes
    async init() {
        try {
            this.setupEventListeners();
            await this.loadPatients();
            this.renderPatientsList();
        } catch (error) {
            console.error('Erro ao inicializar PatientManager:', error);
            this.showAlert('Erro ao carregar dados dos pacientes.', 'error');
        }
    }

    // Configurar event listeners
    setupEventListeners() {
        // Form de novo paciente
        const patientForm = document.getElementById('patientForm');
        if (patientForm) {
            patientForm.addEventListener('submit', (e) => this.handlePatientSubmit(e));
        }

        // Busca de pacientes
        const searchInput = document.getElementById('searchPatients');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }

        // Filtros
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.applyFilters());
        }

        // Botão de exportar
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportPatients());
        }
    }

    // Carregar pacientes do Firebase
    async loadPatients() {
        this.setLoading(true);
        
        try {
            if (window.firebaseConfig && window.firebaseConfig.isInitialized) {
                // Usar listener em tempo real do Firebase
                this.unsubscribe = window.firebaseConfig.listenToCollection(
                    'patients', 
                    (patients) => {
                        console.log(`${patients.length} pacientes carregados do Firebase`);
                        this.patients = patients;
                        this.renderPatientsList();
                        this.updateStats();
                    }
                );
            } else {
                // Modo demo - usar dados locais
                this.patients = await this.getDemoPatients();
                console.log(`${this.patients.length} pacientes carregados (modo demo)`);
                this.renderPatientsList();
                this.updateStats();
            }
        } catch (error) {
            console.error('Erro ao carregar pacientes:', error);
            this.showAlert('Erro ao carregar pacientes: ' + error.message, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    // Adicionar novo paciente
    async addPatient(patientData) {
        this.setLoading(true);
        
        try {
            // Validar dados
            const validationError = this.validatePatientData(patientData);
            if (validationError) {
                throw new Error(validationError);
            }

            // Preparar dados para salvar
            const patient = {
                ...patientData,
                status: 'active',
                consultations: [],
                notes: []
            };

            if (window.firebaseConfig && window.firebaseConfig.isInitialized) {
                // Salvar no Firebase
                const result = await window.firebaseConfig.addDocument('patients', patient);
                console.log('Paciente adicionado ao Firebase:', result.id);
                this.showAlert('Paciente cadastrado com sucesso!', 'success');
                
                // Analytics
                if (window.firebaseConfig.analytics) {
                    window.firebaseConfig.analytics.logEvent('patient_created', {
                        method: 'form'
                    });
                }
            } else {
                // Modo demo
                patient.id = 'demo-' + Date.now();
                patient.createdAt = new Date();
                this.patients.unshift(patient);
                this.renderPatientsList();
                this.updateStats();
                this.showAlert('Paciente cadastrado com sucesso! (Demo)', 'success');
            }

            // Limpar formulário
            this.clearForm();
            
        } catch (error) {
            console.error('Erro ao adicionar paciente:', error);
            this.showAlert('Erro ao cadastrar paciente: ' + error.message, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    // Atualizar paciente
    async updatePatient(patientId, patientData) {
        this.setLoading(true);
        
        try {
            const validationError = this.validatePatientData(patientData);
            if (validationError) {
                throw new Error(validationError);
            }

            if (window.firebaseConfig && window.firebaseConfig.isInitialized) {
                await window.firebaseConfig.updateDocument('patients', patientId, patientData);
                console.log('Paciente atualizado no Firebase:', patientId);
                this.showAlert('Paciente atualizado com sucesso!', 'success');
            } else {
                // Modo demo
                const index = this.patients.findIndex(p => p.id === patientId);
                if (index !== -1) {
                    this.patients[index] = { ...this.patients[index], ...patientData, updatedAt: new Date() };
                    this.renderPatientsList();
                    this.updateStats();
                    this.showAlert('Paciente atualizado com sucesso! (Demo)', 'success');
                }
            }
        } catch (error) {
            console.error('Erro ao atualizar paciente:', error);
            this.showAlert('Erro ao atualizar paciente: ' + error.message, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    // Deletar paciente
    async deletePatient(patientId) {
        if (!confirm('Tem certeza que deseja excluir este paciente? Esta ação não pode ser desfeita.')) {
            return;
        }

        this.setLoading(true);
        
        try {
            if (window.firebaseConfig && window.firebaseConfig.isInitialized) {
                await window.firebaseConfig.deleteDocument('patients', patientId);
                console.log('Paciente deletado do Firebase:', patientId);
                this.showAlert('Paciente excluído com sucesso!', 'success');
            } else {
                // Modo demo
                this.patients = this.patients.filter(p => p.id !== patientId);
                this.renderPatientsList();
                this.updateStats();
                this.showAlert('Paciente excluído com sucesso! (Demo)', 'success');
            }
        } catch (error) {
            console.error('Erro ao deletar paciente:', error);
            this.showAlert('Erro ao excluir paciente: ' + error.message, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    // Buscar paciente
    async searchPatient(query) {
        try {
            if (window.firebaseConfig && window.firebaseConfig.isInitialized) {
                // Buscar no Firebase (implementar busca por nome, email, etc.)
                const results = await window.firebaseConfig.queryDocuments(
                    'patients', 
                    'name', 
                    '>=', 
                    query
                );
                return results;
            } else {
                // Modo demo - busca local
                return this.patients.filter(patient => 
                    patient.name.toLowerCase().includes(query.toLowerCase()) ||
                    patient.email.toLowerCase().includes(query.toLowerCase()) ||
                    patient.phone.includes(query)
                );
            }
        } catch (error) {
            console.error('Erro na busca:', error);
            return [];
        }
    }

    // Validar dados do paciente
    validatePatientData(data) {
        if (!data.name || data.name.trim().length < 2) {
            return 'Nome deve ter pelo menos 2 caracteres.';
        }

        if (!data.email || !this.isValidEmail(data.email)) {
            return 'E-mail inválido.';
        }

        if (!data.phone || data.phone.length < 10) {
            return 'Telefone deve ter pelo menos 10 dígitos.';
        }

        if (!data.birthDate) {
            return 'Data de nascimento é obrigatória.';
        }

        const birthDate = new Date(data.birthDate);
        const today = new Date();
        if (birthDate > today) {
            return 'Data de nascimento não pode ser no futuro.';
        }

        return null; // Válido
    }

    // Validar e-mail
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // Renderizar lista de pacientes
    renderPatientsList() {
        const container = document.getElementById('patientsList');
        if (!container) return;

        if (this.patients.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>Nenhum paciente encontrado</h3>
                    <p>Comece adicionando um novo paciente.</p>
                    <a href="novo_paciente.html" class="btn-primary">
                        <i class="fas fa-plus"></i>
                        Adicionar Paciente
                    </a>
                </div>
            `;
            return;
        }

        const patientsHTML = this.patients.map(patient => `
            <div class="patient-card" data-patient-id="${patient.id}">
                <div class="patient-header">
                    <div class="patient-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="patient-info">
                        <h3 class="patient-name">${patient.name}</h3>
                        <p class="patient-email">${patient.email}</p>
                    </div>
                    <div class="patient-status ${patient.status}">
                        ${patient.status === 'active' ? 'Ativo' : 'Inativo'}
                    </div>
                </div>
                <div class="patient-details">
                    <div class="detail-item">
                        <i class="fas fa-phone"></i>
                        <span>${patient.phone}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-birthday-cake"></i>
                        <span>${this.formatDate(patient.birthDate)}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-calendar"></i>
                        <span>Cadastrado em ${this.formatDate(patient.createdAt)}</span>
                    </div>
                </div>
                <div class="patient-actions">
                    <button class="btn-view" onclick="patientManager.viewPatient('${patient.id}')">
                        <i class="fas fa-eye"></i>
                        Ver
                    </button>
                    <button class="btn-edit" onclick="patientManager.editPatient('${patient.id}')">
                        <i class="fas fa-edit"></i>
                        Editar
                    </button>
                    <button class="btn-delete" onclick="patientManager.deletePatient('${patient.id}')">
                        <i class="fas fa-trash"></i>
                        Excluir
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = patientsHTML;
    }

    // Atualizar estatísticas
    updateStats() {
        const totalElement = document.getElementById('totalPatients');
        const activeElement = document.getElementById('activePatients');
        const newThisMonthElement = document.getElementById('newThisMonth');

        if (totalElement) {
            totalElement.textContent = this.patients.length;
        }

        if (activeElement) {
            const activeCount = this.patients.filter(p => p.status === 'active').length;
            activeElement.textContent = activeCount;
        }

        if (newThisMonthElement) {
            const thisMonth = new Date();
            thisMonth.setDate(1);
            const newThisMonth = this.patients.filter(p => 
                p.createdAt && new Date(p.createdAt) >= thisMonth
            ).length;
            newThisMonthElement.textContent = newThisMonth;
        }
    }

    // Manipular busca
    handleSearch(query) {
        if (query.length === 0) {
            this.renderPatientsList();
            return;
        }

        const filteredPatients = this.patients.filter(patient => 
            patient.name.toLowerCase().includes(query.toLowerCase()) ||
            patient.email.toLowerCase().includes(query.toLowerCase()) ||
            patient.phone.includes(query)
        );

        const originalPatients = this.patients;
        this.patients = filteredPatients;
        this.renderPatientsList();
        this.patients = originalPatients;
    }

    // Aplicar filtros
    applyFilters() {
        const statusFilter = document.getElementById('statusFilter');
        if (!statusFilter) return;

        const status = statusFilter.value;
        let filteredPatients = [...this.patients];

        if (status !== 'all') {
            filteredPatients = filteredPatients.filter(p => p.status === status);
        }

        const originalPatients = this.patients;
        this.patients = filteredPatients;
        this.renderPatientsList();
        this.patients = originalPatients;
    }

    // Manipular submit do formulário
    async handlePatientSubmit(event) {
        event.preventDefault();

        const formData = new FormData(event.target);
        const patientData = {
            name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            birthDate: formData.get('birthDate'),
            address: formData.get('address'),
            emergencyContact: formData.get('emergencyContact'),
            emergencyPhone: formData.get('emergencyPhone'),
            notes: formData.get('notes') || ''
        };

        if (this.currentPatient) {
            await this.updatePatient(this.currentPatient.id, patientData);
        } else {
            await this.addPatient(patientData);
        }
    }

    // Utilitários
    formatDate(date) {
        if (!date) return 'N/A';
        const d = new Date(date);
        return d.toLocaleDateString('pt-BR');
    }

    setLoading(loading) {
        this.isLoading = loading;
        const loadingElements = document.querySelectorAll('.loading-indicator');
        loadingElements.forEach(el => {
            el.style.display = loading ? 'block' : 'none';
        });

        const submitButton = document.querySelector('#patientForm button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = loading;
            submitButton.innerHTML = loading ? 
                '<i class="fas fa-spinner fa-spin"></i> Salvando...' : 
                '<i class="fas fa-save"></i> Salvar Paciente';
        }
    }

    clearForm() {
        const form = document.getElementById('patientForm');
        if (form) {
            form.reset();
            this.currentPatient = null;
        }
    }

    showAlert(message, type = 'info') {
        // Usar a função global se disponível
        if (window.showAlert) {
            window.showAlert(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    // Dados demo para teste
    async getDemoPatients() {
        return [
            {
                id: 'demo-1',
                name: 'Ana Silva',
                email: 'ana@email.com',
                phone: '(11) 99999-1111',
                birthDate: '1985-05-15',
                address: 'Rua das Flores, 123',
                emergencyContact: 'João Silva',
                emergencyPhone: '(11) 88888-1111',
                status: 'active',
                createdAt: new Date('2024-01-15'),
                notes: 'Paciente pontual e dedicada.'
            },
            {
                id: 'demo-2',
                name: 'Carlos Santos',
                email: 'carlos@email.com',
                phone: '(11) 99999-2222',
                birthDate: '1990-08-22',
                address: 'Av. Principal, 456',
                emergencyContact: 'Maria Santos',
                emergencyPhone: '(11) 88888-2222',
                status: 'active',
                createdAt: new Date('2024-02-20'),
                notes: 'Respondendo bem ao tratamento.'
            }
        ];
    }

    // Limpar listeners ao destruir
    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    // Aguardar inicialização do Firebase
    const initPatientManager = () => {
        window.patientManager = new PatientManager();
        window.patientManager.init();
    };

    if (window.firebaseConfig && window.firebaseConfig.isInitialized) {
        initPatientManager();
    } else {
        // Aguardar Firebase ou inicializar em modo demo
        setTimeout(initPatientManager, 2000);
    }
});

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PatientManager;
}
