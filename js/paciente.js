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
            this.initializeAnamnesisFormListeners(); // Inicializar anamnese
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
            // Tratar erros de permissão de forma mais silenciosa
            if (error.message && error.message.includes('Missing or insufficient permissions')) {
                console.log('🎭 Sem permissões Firebase, usando dados locais');
                this.patients = await this.getDemoPatients();
                this.renderPatientsList();
                this.updateStats();
            } else {
                console.error('Erro ao carregar pacientes:', error);
                this.showAlert('Erro ao carregar dados. Usando modo offline.', 'warning');
            }
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
                
                // Mostrar botão de anamnese
                this.showAnamnesisButton(result.id, patient.name);
                
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
            // Tratar erros de permissão de forma elegante
            if (error.message && error.message.includes('Missing or insufficient permissions')) {
                console.log('🎭 Sem permissões Firebase, salvando localmente');
                // Salvar no modo demo/local
                patient.id = 'local-' + Date.now();
                patient.createdAt = new Date();
                this.patients.unshift(patient);
                this.renderPatientsList();
                this.updateStats();
                this.showAlert('Paciente cadastrado localmente!', 'success');
                this.showAnamnesisButton(patient.id, patient.name);
            } else {
                console.error('Erro ao adicionar paciente:', error);
                this.showAlert('Erro ao cadastrar paciente: ' + error.message, 'error');
            }
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
                    <button class="btn-anamnesis" onclick="openAnamnesis('${patient.id}', '${patient.name}')" title="Anamnese">
                        <i class="fas fa-clipboard-list"></i>
                        Anamnese
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

    // Mostrar botão de anamnese após cadastro
    showAnamnesisButton(patientId, patientName) {
        const alertContainer = document.querySelector('.alert');
        if (alertContainer && alertContainer.style.display !== 'none') {
            // Adicionar botão de anamnese ao alerta de sucesso
            setTimeout(() => {
                const anamnesisDiv = document.createElement('div');
                anamnesisDiv.className = 'anamnesis-action';
                anamnesisDiv.style.marginTop = '1rem';
                anamnesisDiv.innerHTML = `
                    <p style="margin-bottom: 1rem; font-weight: 600;">
                        <i class="fas fa-clipboard-list"></i>
                        Deseja iniciar a anamnese completa para ${patientName}?
                    </p>
                    <div style="display: flex; gap: 1rem; justify-content: center;">
                        <button onclick="openAnamnesis('${patientId}', '${patientName}')" 
                                class="btn-anamnesis" style="
                            background: var(--primary-color);
                            color: white;
                            border: none;
                            padding: 0.75rem 1.5rem;
                            border-radius: 8px;
                            font-weight: 600;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            gap: 0.5rem;
                            transition: all 0.3s ease;
                        ">
                            <i class="fas fa-play"></i>
                            Iniciar Anamnese
                        </button>
                        <button onclick="this.closest('.anamnesis-action').remove()" 
                                class="btn-later" style="
                            background: #6c757d;
                            color: white;
                            border: none;
                            padding: 0.75rem 1.5rem;
                            border-radius: 8px;
                            font-weight: 600;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            gap: 0.5rem;
                            transition: all 0.3s ease;
                        ">
                            <i class="fas fa-clock"></i>
                            Fazer Depois
                        </button>
                    </div>
                `;
                
                alertContainer.appendChild(anamnesisDiv);

                // Estilo hover para os botões
                const style = document.createElement('style');
                style.textContent = `
                    .btn-anamnesis:hover {
                        background: var(--primary-hover) !important;
                        transform: translateY(-2px);
                    }
                    .btn-later:hover {
                        background: #5a6268 !important;
                        transform: translateY(-2px);
                    }
                `;
                document.head.appendChild(style);
            }, 500);
        }
    }

    // Iniciar processo de anamnese
    startAnamnesis(patientId, patientName) {
        // Remover o botão de anamnese
        const anamnesisAction = document.querySelector('.anamnesis-action');
        if (anamnesisAction) {
            anamnesisAction.remove();
        }

        // Mostrar modal de anamnese
        this.showAnamnesisModal(patientId, patientName);
    }

    // Mostrar modal de anamnese com fases
    showAnamnesisModal(patientId, patientName) {
        // Criar estrutura do modal
        const modalHTML = `
            <div id="anamnesisModal" class="modal-anamnesis" style="
                display: block;
                position: fixed;
                z-index: 2000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(5px);
            ">
                <div class="modal-content-anamnesis" style="
                    background: white;
                    margin: 2% auto;
                    padding: 0;
                    border-radius: 16px;
                    width: 95%;
                    max-width: 1200px;
                    max-height: 90vh;
                    overflow-y: auto;
                    position: relative;
                    animation: modalSlideIn 0.3s ease;
                ">
                    <div class="anamnesis-header" style="
                        background: var(--gradient-primary);
                        color: white;
                        padding: 2rem;
                        text-align: center;
                        position: relative;
                    ">
                        <button onclick="closeAnamnesisModal()" style="
                            position: absolute;
                            top: 1rem;
                            right: 1rem;
                            background: rgba(255, 255, 255, 0.2);
                            border: none;
                            color: white;
                            font-size: 1.5rem;
                            width: 40px;
                            height: 40px;
                            border-radius: 50%;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            transition: background 0.3s ease;
                        " onmouseover="this.style.background='rgba(255, 255, 255, 0.3)'" 
                           onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'">
                            <i class="fas fa-times"></i>
                        </button>
                        <h2 style="margin: 0 0 0.5rem 0; font-size: 2rem;">
                            <i class="fas fa-clipboard-list"></i>
                            Anamnese Completa
                        </h2>
                        <p style="margin: 0; opacity: 0.9; font-size: 1.1rem;">
                            Paciente: <strong>${patientName}</strong>
                        </p>
                    </div>

                    <div class="anamnesis-phases" style="padding: 2rem;">
                        <div class="phases-grid" style="
                            display: grid;
                            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                            gap: 1.5rem;
                            margin-bottom: 2rem;
                        ">
                            ${this.generatePhasesHTML(patientId)}
                        </div>

                        <div class="anamnesis-progress" style="
                            background: #f8f9fa;
                            padding: 1.5rem;
                            border-radius: 12px;
                            text-align: center;
                        ">
                            <h4 style="margin: 0 0 1rem 0; color: #333;">
                                <i class="fas fa-chart-line"></i>
                                Progresso da Anamnese
                            </h4>
                            <div class="progress-bar" style="
                                background: #e9ecef;
                                height: 20px;
                                border-radius: 10px;
                                overflow: hidden;
                                margin-bottom: 0.5rem;
                            ">
                                <div id="anamnesisProgress" style="
                                    background: var(--gradient-primary);
                                    height: 100%;
                                    width: 0%;
                                    transition: width 0.3s ease;
                                "></div>
                            </div>
                            <p style="margin: 0; color: #666; font-size: 0.9rem;">
                                <span id="progressText">0 de 4 fases concluídas</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Adicionar modal ao body
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Inicializar estado das fases
        this.initializeAnamnesisState(patientId);
    }

    // Gerar HTML das fases
    generatePhasesHTML(patientId) {
        const phases = [
            {
                id: 1,
                title: 'Dados Pessoais',
                subtitle: 'Informações básicas e histórico familiar',
                icon: 'fas fa-user',
                color: '#3b82f6',
                fields: ['História familiar', 'Dados sociodemográficos', 'Composição familiar']
            },
            {
                id: 2,
                title: 'Histórico Médico',
                subtitle: 'Condições médicas e medicamentos',
                icon: 'fas fa-heartbeat',
                color: '#ef4444',
                fields: ['Doenças anteriores', 'Medicamentos atuais', 'Alergias', 'Cirurgias']
            },
            {
                id: 3,
                title: 'Avaliação Psicológica',
                subtitle: 'Estado mental e comportamental',
                icon: 'fas fa-brain',
                color: '#10b981',
                fields: ['Humor atual', 'Sintomas', 'Comportamentos', 'Cognição']
            },
            {
                id: 4,
                title: 'Objetivos Terapêuticos',
                subtitle: 'Metas e plano de tratamento',
                icon: 'fas fa-target',
                color: '#f59e0b',
                fields: ['Objetivos principais', 'Expectativas', 'Motivação', 'Disponibilidade']
            }
        ];

        return phases.map(phase => `
            <div class="phase-card" data-phase="${phase.id}" style="
                background: white;
                border: 2px solid #e5e7eb;
                border-radius: 12px;
                padding: 1.5rem;
                cursor: pointer;
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            " onmouseover="this.style.borderColor='${phase.color}'; this.style.transform='translateY(-2px)'" 
               onmouseout="this.style.borderColor='#e5e7eb'; this.style.transform='translateY(0)'"
               onclick="window.patientManager.openPhaseForm('${patientId}', ${phase.id})">
                
                <div class="phase-status" style="
                    position: absolute;
                    top: 1rem;
                    right: 1rem;
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    background: #e5e7eb;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.8rem;
                    color: #6b7280;
                ">
                    <i class="fas fa-clock"></i>
                </div>

                <div style="margin-bottom: 1rem;">
                    <div style="
                        width: 60px;
                        height: 60px;
                        background: ${phase.color};
                        border-radius: 12px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: 1.5rem;
                        margin-bottom: 1rem;
                    ">
                        <i class="${phase.icon}"></i>
                    </div>
                    <h3 style="margin: 0 0 0.5rem 0; color: #1f2937; font-size: 1.2rem;">
                        Fase ${phase.id}: ${phase.title}
                    </h3>
                    <p style="margin: 0 0 1rem 0; color: #6b7280; font-size: 0.9rem;">
                        ${phase.subtitle}
                    </p>
                </div>

                <div class="phase-fields" style="margin-bottom: 1rem;">
                    ${phase.fields.map(field => `
                        <div style="
                            background: #f9fafb;
                            padding: 0.5rem 0.75rem;
                            border-radius: 6px;
                            margin-bottom: 0.5rem;
                            font-size: 0.85rem;
                            color: #4b5563;
                            display: flex;
                            align-items: center;
                            gap: 0.5rem;
                        ">
                            <i class="fas fa-check" style="font-size: 0.7rem; opacity: 0.5;"></i>
                            ${field}
                        </div>
                    `).join('')}
                </div>

                <button style="
                    width: 100%;
                    background: ${phase.color};
                    color: white;
                    border: none;
                    padding: 0.75rem;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                " onmouseover="this.style.opacity='0.9'" 
                   onmouseout="this.style.opacity='1'">
                    <i class="fas fa-play"></i>
                    Iniciar Fase ${phase.id}
                </button>
            </div>
        `).join('');
    }

    // Inicializar estado da anamnese
    initializeAnamnesisState(patientId) {
        // Verificar se já existe progresso salvo para este paciente
        const savedProgress = localStorage.getItem(`anamnesis_${patientId}`);
        if (savedProgress) {
            const progress = JSON.parse(savedProgress);
            this.updateAnamnesisProgress(progress);
        }
    }

    // Abrir formulário de uma fase específica
    openPhaseForm(patientId, phaseId) {
        // Fechar modal atual
        const currentModal = document.getElementById('anamnesisModal');
        if (currentModal) {
            currentModal.remove();
        }

        // Abrir formulário da fase
        this.showPhaseForm(patientId, phaseId);
    }

    // Mostrar formulário da fase específica
    showPhaseForm(patientId, phaseId) {
        const formHTML = this.generatePhaseFormHTML(patientId, phaseId);
        document.body.insertAdjacentHTML('beforeend', formHTML);
    }

    // Gerar HTML do formulário da fase
    generatePhaseFormHTML(patientId, phaseId) {
        const phaseData = this.getPhaseFormData(phaseId);
        
        return `
            <div id="phaseFormModal" class="modal-anamnesis" style="
                display: block;
                position: fixed;
                z-index: 2001;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(5px);
            ">
                <div class="modal-content-anamnesis" style="
                    background: white;
                    margin: 1% auto;
                    padding: 0;
                    border-radius: 16px;
                    width: 95%;
                    max-width: 800px;
                    max-height: 95vh;
                    overflow-y: auto;
                    position: relative;
                ">
                    <div class="phase-form-header" style="
                        background: ${phaseData.color};
                        color: white;
                        padding: 1.5rem;
                        text-align: center;
                        position: relative;
                    ">
                        <button onclick="closeAnamnesisModal(); openAnamnesis('${patientId}', 'Paciente')" style="
                            position: absolute;
                            top: 1rem;
                            right: 1rem;
                            background: rgba(255, 255, 255, 0.2);
                            border: none;
                            color: white;
                            font-size: 1.2rem;
                            width: 35px;
                            height: 35px;
                            border-radius: 50%;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        ">
                            <i class="fas fa-arrow-left"></i>
                        </button>
                        <h2 style="margin: 0; font-size: 1.5rem;">
                            <i class="${phaseData.icon}"></i>
                            Fase ${phaseId}: ${phaseData.title}
                        </h2>
                        <p style="margin: 0.5rem 0 0 0; opacity: 0.9;">
                            ${phaseData.subtitle}
                        </p>
                    </div>

                    <form id="phaseForm${phaseId}" class="phase-form" style="padding: 2rem;">
                        ${this.generatePhaseFields(phaseId)}
                        
                        <div class="form-actions" style="
                            margin-top: 2rem;
                            padding-top: 1.5rem;
                            border-top: 1px solid #e5e7eb;
                            display: flex;
                            gap: 1rem;
                            justify-content: flex-end;
                        ">
                            <button type="button" onclick="closePhaseModal(); openAnamnesis('${patientId}', 'Paciente')" style="
                                background: #6c757d;
                                color: white;
                                border: none;
                                padding: 0.75rem 1.5rem;
                                border-radius: 8px;
                                font-weight: 600;
                                cursor: pointer;
                            ">
                                <i class="fas fa-arrow-left"></i>
                                Voltar
                            </button>
                            <button type="submit" style="
                                background: ${phaseData.color};
                                color: white;
                                border: none;
                                padding: 0.75rem 1.5rem;
                                border-radius: 8px;
                                font-weight: 600;
                                cursor: pointer;
                            ">
                                <i class="fas fa-save"></i>
                                Salvar Fase ${phaseId}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    // Obter dados da fase
    getPhaseFormData(phaseId) {
        const phases = {
            1: {
                title: 'Dados Pessoais',
                subtitle: 'Informações básicas e histórico familiar',
                icon: 'fas fa-user',
                color: '#3b82f6'
            },
            2: {
                title: 'Histórico Médico',
                subtitle: 'Condições médicas e medicamentos',
                icon: 'fas fa-heartbeat',
                color: '#ef4444'
            },
            3: {
                title: 'Avaliação Psicológica',
                subtitle: 'Estado mental e comportamental',
                icon: 'fas fa-brain',
                color: '#10b981'
            },
            4: {
                title: 'Objetivos Terapêuticos',
                subtitle: 'Metas e plano de tratamento',
                icon: 'fas fa-target',
                color: '#f59e0b'
            }
        };
        return phases[phaseId];
    }

    // Gerar campos do formulário da fase
    generatePhaseFields(phaseId) {
        switch (phaseId) {
            case 1:
                return this.generatePhase1Fields();
            case 2:
                return this.generatePhase2Fields();
            case 3:
                return this.generatePhase3Fields();
            case 4:
                return this.generatePhase4Fields();
            default:
                return '';
        }
    }

    // Fase 1: Dados Pessoais
    generatePhase1Fields() {
        return `
            <div class="form-section">
                <h3 style="margin: 0 0 1.5rem 0; color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 0.5rem;">
                    <i class="fas fa-users"></i>
                    História Familiar
                </h3>
                
                <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div class="form-group">
                        <label>Estado Civil</label>
                        <select name="maritalStatus" required style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px;">
                            <option value="">Selecione...</option>
                            <option value="solteiro">Solteiro(a)</option>
                            <option value="casado">Casado(a)</option>
                            <option value="divorciado">Divorciado(a)</option>
                            <option value="viuvo">Viúvo(a)</option>
                            <option value="uniao_estavel">União Estável</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Quantidade de Filhos</label>
                        <input type="number" name="children" min="0" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px;">
                    </div>
                </div>

                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label>Profissão/Ocupação</label>
                    <input type="text" name="occupation" required style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px;">
                </div>

                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label>Composição Familiar (quem mora na casa)</label>
                    <textarea name="familyComposition" rows="3" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; resize: vertical;" placeholder="Descreva quem mora na mesma casa..."></textarea>
                </div>

                <h4 style="margin: 2rem 0 1rem 0; color: #374151;">
                    <i class="fas fa-heart"></i>
                    Histórico Familiar de Transtornos Mentais
                </h4>

                <div class="form-group" style="margin-bottom: 1rem;">
                    <label style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                        <input type="checkbox" name="familyMentalHealth" value="none">
                        Não há histórico familiar de transtornos mentais
                    </label>
                </div>

                <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <div>
                        <label style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                            <input type="checkbox" name="familyMentalHealth" value="depression">
                            Depressão
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                            <input type="checkbox" name="familyMentalHealth" value="anxiety">
                            Ansiedade
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                            <input type="checkbox" name="familyMentalHealth" value="bipolar">
                            Transtorno Bipolar
                        </label>
                    </div>
                    <div>
                        <label style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                            <input type="checkbox" name="familyMentalHealth" value="schizophrenia">
                            Esquizofrenia
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                            <input type="checkbox" name="familyMentalHealth" value="addiction">
                            Dependência Química
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                            <input type="checkbox" name="familyMentalHealth" value="other">
                            Outros
                        </label>
                    </div>
                </div>

                <div class="form-group" style="margin-top: 1rem;">
                    <label>Detalhes do Histórico Familiar (se aplicável)</label>
                    <textarea name="familyMentalHealthDetails" rows="3" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; resize: vertical;" placeholder="Descreva o parentesco e o transtorno..."></textarea>
                </div>
            </div>
        `;
    }

    // Fase 2: Histórico Médico
    generatePhase2Fields() {
        return `
            <div class="form-section">
                <h3 style="margin: 0 0 1.5rem 0; color: #1f2937; border-bottom: 2px solid #ef4444; padding-bottom: 0.5rem;">
                    <i class="fas fa-heartbeat"></i>
                    Histórico Médico
                </h3>
                
                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label>Doenças ou Condições Médicas Atuais</label>
                    <textarea name="currentMedicalConditions" rows="3" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; resize: vertical;" placeholder="Liste doenças, condições crônicas, etc..."></textarea>
                </div>

                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label>Medicamentos em Uso</label>
                    <textarea name="currentMedications" rows="3" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; resize: vertical;" placeholder="Nome do medicamento, dosagem, frequência..."></textarea>
                </div>

                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label>Alergias a Medicamentos ou Substâncias</label>
                    <textarea name="allergies" rows="2" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; resize: vertical;" placeholder="Descreva alergias conhecidas..."></textarea>
                </div>

                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label>Cirurgias Realizadas</label>
                    <textarea name="surgeries" rows="3" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; resize: vertical;" placeholder="Tipo de cirurgia e ano..."></textarea>
                </div>

                <h4 style="margin: 2rem 0 1rem 0; color: #374151;">
                    <i class="fas fa-smoking"></i>
                    Hábitos e Estilo de Vida
                </h4>

                <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div class="form-group">
                        <label>Uso de Tabaco</label>
                        <select name="tobacco" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px;">
                            <option value="never">Nunca fumou</option>
                            <option value="former">Ex-fumante</option>
                            <option value="current">Fumante atual</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Consumo de Álcool</label>
                        <select name="alcohol" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px;">
                            <option value="never">Não bebe</option>
                            <option value="occasional">Ocasional</option>
                            <option value="moderate">Moderado</option>
                            <option value="heavy">Excessivo</option>
                        </select>
                    </div>
                </div>

                <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div class="form-group">
                        <label>Atividade Física</label>
                        <select name="exercise" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px;">
                            <option value="sedentary">Sedentário</option>
                            <option value="light">Atividade leve</option>
                            <option value="moderate">Atividade moderada</option>
                            <option value="intense">Atividade intensa</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Qualidade do Sono</label>
                        <select name="sleep" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px;">
                            <option value="excellent">Excelente</option>
                            <option value="good">Boa</option>
                            <option value="fair">Regular</option>
                            <option value="poor">Ruim</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label>Uso de Outras Substâncias</label>
                    <textarea name="substanceUse" rows="2" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; resize: vertical;" placeholder="Descreva o uso de outras substâncias, se houver..."></textarea>
                </div>
            </div>
        `;
    }

    // Fase 3: Avaliação Psicológica
    generatePhase3Fields() {
        return `
            <div class="form-section">
                <h3 style="margin: 0 0 1.5rem 0; color: #1f2937; border-bottom: 2px solid #10b981; padding-bottom: 0.5rem;">
                    <i class="fas fa-brain"></i>
                    Avaliação Psicológica Atual
                </h3>
                
                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label>Motivo Principal da Consulta</label>
                    <textarea name="mainReason" rows="3" required style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; resize: vertical;" placeholder="Descreva o que trouxe o paciente para a terapia..."></textarea>
                </div>

                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label>Sintomas Atuais</label>
                    <textarea name="currentSymptoms" rows="4" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; resize: vertical;" placeholder="Descreva sintomas físicos, emocionais e comportamentais..."></textarea>
                </div>

                <h4 style="margin: 2rem 0 1rem 0; color: #374151;">
                    <i class="fas fa-thermometer-half"></i>
                    Escalas de Avaliação (0-10)
                </h4>

                <div class="rating-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
                    <div class="rating-item">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Nível de Ansiedade</label>
                        <input type="range" name="anxietyLevel" min="0" max="10" value="5" style="width: 100%; margin-bottom: 0.5rem;" oninput="this.nextElementSibling.textContent = this.value">
                        <div style="text-align: center; font-weight: 600; color: #10b981;">5</div>
                    </div>
                    <div class="rating-item">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Nível de Depressão</label>
                        <input type="range" name="depressionLevel" min="0" max="10" value="5" style="width: 100%; margin-bottom: 0.5rem;" oninput="this.nextElementSibling.textContent = this.value">
                        <div style="text-align: center; font-weight: 600; color: #10b981;">5</div>
                    </div>
                    <div class="rating-item">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Nível de Estresse</label>
                        <input type="range" name="stressLevel" min="0" max="10" value="5" style="width: 100%; margin-bottom: 0.5rem;" oninput="this.nextElementSibling.textContent = this.value">
                        <div style="text-align: center; font-weight: 600; color: #10b981;">5</div>
                    </div>
                    <div class="rating-item">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Qualidade de Vida</label>
                        <input type="range" name="qualityOfLife" min="0" max="10" value="5" style="width: 100%; margin-bottom: 0.5rem;" oninput="this.nextElementSibling.textContent = this.value">
                        <div style="text-align: center; font-weight: 600; color: #10b981;">5</div>
                    </div>
                </div>

                <h4 style="margin: 2rem 0 1rem 0; color: #374151;">
                    <i class="fas fa-history"></i>
                    Histórico Psicológico
                </h4>

                <div class="form-group" style="margin-bottom: 1rem;">
                    <label style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                        <input type="checkbox" name="previousTherapy" value="yes">
                        Já fez terapia anteriormente
                    </label>
                </div>

                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label>Detalhes da Terapia Anterior (se aplicável)</label>
                    <textarea name="previousTherapyDetails" rows="3" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; resize: vertical;" placeholder="Quando, duração, tipo de terapia, resultados..."></textarea>
                </div>

                <div class="form-group" style="margin-bottom: 1rem;">
                    <label style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                        <input type="checkbox" name="psychiatricMedication" value="yes">
                        Já usou medicação psiquiátrica
                    </label>
                </div>

                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label>Detalhes da Medicação Psiquiátrica (se aplicável)</label>
                    <textarea name="psychiatricMedicationDetails" rows="3" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; resize: vertical;" placeholder="Medicamentos, dosagens, período de uso, efeitos..."></textarea>
                </div>

                <div class="form-group">
                    <label>Eventos Traumáticos ou Estressantes</label>
                    <textarea name="traumaticEvents" rows="3" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; resize: vertical;" placeholder="Descreva eventos significativos que possam ter impacto na saúde mental..."></textarea>
                </div>
            </div>
        `;
    }

    // Fase 4: Objetivos Terapêuticos
    generatePhase4Fields() {
        return `
            <div class="form-section">
                <h3 style="margin: 0 0 1.5rem 0; color: #1f2937; border-bottom: 2px solid #f59e0b; padding-bottom: 0.5rem;">
                    <i class="fas fa-target"></i>
                    Objetivos e Expectativas
                </h3>
                
                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label>Principais Objetivos com a Terapia</label>
                    <textarea name="mainGoals" rows="4" required style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; resize: vertical;" placeholder="O que você espera alcançar com a terapia?"></textarea>
                </div>

                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label>Expectativas Específicas</label>
                    <textarea name="specificExpectations" rows="3" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; resize: vertical;" placeholder="Como você gostaria que fosse o processo terapêutico?"></textarea>
                </div>

                <h4 style="margin: 2rem 0 1rem 0; color: #374151;">
                    <i class="fas fa-calendar-check"></i>
                    Disponibilidade e Compromisso
                </h4>

                <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div class="form-group">
                        <label>Frequência Desejada</label>
                        <select name="preferredFrequency" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px;">
                            <option value="weekly">Semanal</option>
                            <option value="biweekly">Quinzenal</option>
                            <option value="monthly">Mensal</option>
                            <option value="flexible">Flexível</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Período Preferido</label>
                        <select name="preferredTime" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px;">
                            <option value="morning">Manhã</option>
                            <option value="afternoon">Tarde</option>
                            <option value="evening">Noite</option>
                            <option value="flexible">Flexível</option>
                        </select>
                    </div>
                </div>

                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label>Dias da Semana Disponíveis</label>
                    <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.5rem; margin-top: 0.5rem;">
                        <label style="display: flex; flex-direction: column; align-items: center; gap: 0.25rem; padding: 0.5rem; border: 2px solid #e5e7eb; border-radius: 8px; cursor: pointer;">
                            <input type="checkbox" name="availableDays" value="monday">
                            <span style="font-size: 0.8rem;">Seg</span>
                        </label>
                        <label style="display: flex; flex-direction: column; align-items: center; gap: 0.25rem; padding: 0.5rem; border: 2px solid #e5e7eb; border-radius: 8px; cursor: pointer;">
                            <input type="checkbox" name="availableDays" value="tuesday">
                            <span style="font-size: 0.8rem;">Ter</span>
                        </label>
                        <label style="display: flex; flex-direction: column; align-items: center; gap: 0.25rem; padding: 0.5rem; border: 2px solid #e5e7eb; border-radius: 8px; cursor: pointer;">
                            <input type="checkbox" name="availableDays" value="wednesday">
                            <span style="font-size: 0.8rem;">Qua</span>
                        </label>
                        <label style="display: flex; flex-direction: column; align-items: center; gap: 0.25rem; padding: 0.5rem; border: 2px solid #e5e7eb; border-radius: 8px; cursor: pointer;">
                            <input type="checkbox" name="availableDays" value="thursday">
                            <span style="font-size: 0.8rem;">Qui</span>
                        </label>
                        <label style="display: flex; flex-direction: column; align-items: center; gap: 0.25rem; padding: 0.5rem; border: 2px solid #e5e7eb; border-radius: 8px; cursor: pointer;">
                            <input type="checkbox" name="availableDays" value="friday">
                            <span style="font-size: 0.8rem;">Sex</span>
                        </label>
                        <label style="display: flex; flex-direction: column; align-items: center; gap: 0.25rem; padding: 0.5rem; border: 2px solid #e5e7eb; border-radius: 8px; cursor: pointer;">
                            <input type="checkbox" name="availableDays" value="saturday">
                            <span style="font-size: 0.8rem;">Sáb</span>
                        </label>
                        <label style="display: flex; flex-direction: column; align-items: center; gap: 0.25rem; padding: 0.5rem; border: 2px solid #e5e7eb; border-radius: 8px; cursor: pointer;">
                            <input type="checkbox" name="availableDays" value="sunday">
                            <span style="font-size: 0.8rem;">Dom</span>
                        </label>
                    </div>
                </div>

                <h4 style="margin: 2rem 0 1rem 0; color: #374151;">
                    <i class="fas fa-chart-line"></i>
                    Motivação e Recursos
                </h4>

                <div class="form-group" style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Nível de Motivação para Mudança (0-10)</label>
                    <input type="range" name="motivationLevel" min="0" max="10" value="8" style="width: 100%; margin-bottom: 0.5rem;" oninput="this.nextElementSibling.textContent = this.value">
                    <div style="text-align: center; font-weight: 600; color: #f59e0b;">8</div>
                </div>

                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label>Rede de Apoio</label>
                    <textarea name="supportNetwork" rows="3" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; resize: vertical;" placeholder="Descreva familiares, amigos ou pessoas que oferecem apoio..."></textarea>
                </div>

                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label>Fatores que Podem Dificultar o Tratamento</label>
                    <textarea name="treatmentBarriers" rows="3" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; resize: vertical;" placeholder="Tempo, dinheiro, resistência familiar, etc..."></textarea>
                </div>

                <div class="form-group">
                    <label>Observações Adicionais</label>
                    <textarea name="additionalNotes" rows="3" style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; resize: vertical;" placeholder="Qualquer informação adicional relevante..."></textarea>
                </div>
            </div>
        `;
    }

    // Atualizar progresso da anamnese
    updateAnamnesisProgress(progress) {
        const progressBar = document.getElementById('anamnesisProgress');
        const progressText = document.getElementById('progressText');
        
        if (progressBar && progressText) {
            const completedPhases = Object.values(progress).filter(p => p.completed).length;
            const percentage = (completedPhases / 4) * 100;
            
            progressBar.style.width = `${percentage}%`;
            progressText.textContent = `${completedPhases} de 4 fases concluídas`;
            
            // Atualizar status das fases nos cards
            document.querySelectorAll('.phase-card').forEach(card => {
                const phaseId = card.getAttribute('data-phase');
                const statusIcon = card.querySelector('.phase-status i');
                const statusContainer = card.querySelector('.phase-status');
                
                if (progress[phaseId] && progress[phaseId].completed) {
                    statusIcon.className = 'fas fa-check';
                    statusContainer.style.background = '#10b981';
                    statusContainer.style.color = 'white';
                    card.style.borderColor = '#10b981';
                    card.style.background = '#f0fdf4';
                }
            });
        }
    }

    // Salvar dados da fase
    savePhaseData(patientId, phaseId, formData) {
        try {
            // Obter progresso atual
            const savedProgress = localStorage.getItem(`anamnesis_${patientId}`) || '{}';
            const progress = JSON.parse(savedProgress);
            
            // Atualizar dados da fase
            progress[phaseId] = {
                completed: true,
                data: formData,
                completedAt: new Date().toISOString()
            };
            
            // Salvar no localStorage
            localStorage.setItem(`anamnesis_${patientId}`, JSON.stringify(progress));
            
            // Tentar salvar no Firebase
            if (window.firebaseConfig && window.firebaseConfig.firestore) {
                const anamnesisRef = window.firebaseConfig.firestore
                    .collection('anamnesis')
                    .doc(patientId);
                
                anamnesisRef.set({
                    patientId: patientId,
                    phases: progress,
                    lastUpdated: new Date().toISOString()
                }, { merge: true }).catch(error => {
                    console.log('Dados salvos localmente. Firebase não disponível:', error);
                });
            }
            
            return true;
        } catch (error) {
            console.error('Erro ao salvar dados da anamnese:', error);
            return false;
        }
    }

    // Carregar dados da fase
    loadPhaseData(patientId, phaseId) {
        try {
            const savedProgress = localStorage.getItem(`anamnesis_${patientId}`);
            if (savedProgress) {
                const progress = JSON.parse(savedProgress);
                return progress[phaseId] ? progress[phaseId].data : null;
            }
        } catch (error) {
            console.error('Erro ao carregar dados da anamnese:', error);
        }
        return null;
    }

    // Inicializar event listeners para formulários de anamnese
    initializeAnamnesisFormListeners() {
        // Event delegation para formulários de fase
        document.addEventListener('submit', (e) => {
            if (e.target.id && e.target.id.startsWith('phaseForm')) {
                e.preventDefault();
                this.handlePhaseFormSubmit(e.target);
            }
        });

        // Adicionar estilos para animações
        if (!document.getElementById('anamnesisStyles')) {
            const styles = document.createElement('style');
            styles.id = 'anamnesisStyles';
            styles.textContent = `
                @keyframes modalSlideIn {
                    from {
                        transform: translateY(-50px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }

                .modal-anamnesis input:focus,
                .modal-anamnesis textarea:focus,
                .modal-anamnesis select:focus {
                    border-color: var(--primary-color) !important;
                    outline: none;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }

                .modal-anamnesis label {
                    display: block;
                    margin-bottom: 0.5rem;
                    font-weight: 600;
                    color: #374151;
                }

                .modal-anamnesis .form-group {
                    margin-bottom: 1rem;
                }

                .modal-anamnesis input[type="checkbox"] {
                    width: auto !important;
                    margin-right: 0.5rem;
                }

                .modal-anamnesis input[type="range"] {
                    background: #e5e7eb;
                    height: 8px;
                    border-radius: 4px;
                    outline: none;
                    -webkit-appearance: none;
                }

                .modal-anamnesis input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: var(--primary-color);
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }

                .modal-anamnesis input[type="range"]::-moz-range-thumb {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: var(--primary-color);
                    cursor: pointer;
                    border: none;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }

                .modal-anamnesis .rating-grid .rating-item {
                    text-align: center;
                }

                .modal-anamnesis .phases-grid .phase-card {
                    transition: all 0.3s ease;
                    position: relative;
                }

                .modal-anamnesis .phases-grid .phase-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
                }

                .modal-anamnesis .form-section h3 {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }

                .modal-anamnesis .form-section h4 {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .modal-anamnesis .anamnesis-progress {
                    border: 1px solid #e5e7eb;
                }

                .modal-anamnesis .progress-bar {
                    position: relative;
                }

                .modal-anamnesis .progress-bar::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    height: 100%;
                    width: 100%;
                    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%);
                    animation: progressShimmer 2s infinite;
                }

                @keyframes progressShimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }

                .modal-anamnesis .phase-card.completed {
                    border-color: #10b981 !important;
                    background: #f0fdf4 !important;
                }

                .modal-anamnesis .phase-card.completed .phase-status {
                    background: #10b981 !important;
                    color: white !important;
                }

                .modal-anamnesis .phase-card .phase-status i.fa-check {
                    animation: checkPulse 0.6s ease;
                }

                @keyframes checkPulse {
                    0% { transform: scale(0); }
                    50% { transform: scale(1.2); }
                    100% { transform: scale(1); }
                }
            `;
            document.head.appendChild(styles);
        }
    }

    // Manipular submissão do formulário de fase
    handlePhaseFormSubmit(form) {
        const formData = new FormData(form);
        const phaseId = form.id.replace('phaseForm', '');
        const patientId = this.extractPatientIdFromForm(form);
        
        // Converter FormData para objeto
        const data = {};
        for (let [key, value] of formData.entries()) {
            if (data[key]) {
                // Se já existe, converter para array
                if (Array.isArray(data[key])) {
                    data[key].push(value);
                } else {
                    data[key] = [data[key], value];
                }
            } else {
                data[key] = value;
            }
        }

        // Salvar dados
        const saved = this.savePhaseData(patientId, phaseId, data);
        
        if (saved) {
            // Mostrar sucesso
            this.showSuccessMessage(`Fase ${phaseId} concluída com sucesso!`);
            
            // Fechar modal atual
            const modal = form.closest('.modal-anamnesis');
            if (modal) {
                modal.remove();
            }
            
            // Reabrir modal principal com progresso atualizado
            setTimeout(() => {
                this.showAnamnesisModal(patientId, 'Paciente');
            }, 500);
        } else {
            this.showError('Erro ao salvar dados da fase. Tente novamente.');
        }
    }

    // Extrair ID do paciente do formulário
    extractPatientIdFromForm(form) {
        // Buscar no onclick dos botões
        const buttons = form.querySelectorAll('button[onclick*="showAnamnesisModal"]');
        if (buttons.length > 0) {
            const onclick = buttons[0].getAttribute('onclick');
            const match = onclick.match(/'([^']+)'/);
            if (match) return match[1];
        }
        
        // Fallback: buscar no localStorage ou URL
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('patientId') || 'demo-patient';
    }

    // Mostrar mensagem de sucesso
    showSuccessMessage(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 9999;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-weight: 600;
            animation: slideInRight 0.3s ease;
        `;
        successDiv.innerHTML = `
            <i class="fas fa-check-circle"></i>
            ${message}
        `;
        
        document.body.appendChild(successDiv);
        
        // Remover após 3 segundos
        setTimeout(() => {
            successDiv.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => successDiv.remove(), 300);
        }, 3000);
        
        // Adicionar animações se não existirem
        if (!document.getElementById('successAnimations')) {
            const style = document.createElement('style');
            style.id = 'successAnimations';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
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
