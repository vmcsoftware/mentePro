// MedicalRecordsManager - Gerenciamento de Prontuários
class MedicalRecordsManager {
    constructor() {
        this.records = [];
        this.patients = [];
        this.currentPatient = null;
        this.currentChart = null;
        this.init();
    }

    init() {
        this.loadPatients();
        this.loadRecords();
        this.setupEventListeners();
        this.setupRatingSliders();
        
        // Definir data atual
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('sessionDate').value = today;
        
        // Definir horário atual
        const now = new Date();
        const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                           now.getMinutes().toString().padStart(2, '0');
        document.getElementById('sessionTime').value = currentTime;
    }

    setupEventListeners() {
        // Busca de pacientes
        document.getElementById('searchPatient').addEventListener('change', (e) => {
            this.selectPatient(e.target.value);
        });

        // Buscar registros
        document.getElementById('searchRecordsBtn').addEventListener('click', () => {
            this.filterRecords();
        });

        // Nova sessão
        document.getElementById('newRecordBtn').addEventListener('click', () => {
            this.openNewSessionModal();
        });

        // Formulário de nova sessão
        document.getElementById('newSessionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSession();
        });

        // Filtros de sessões
        document.getElementById('filterSessionType').addEventListener('change', () => {
            this.filterSessions();
        });

        document.getElementById('searchSession').addEventListener('input', () => {
            this.filterSessions();
        });

        // Métrica de progresso
        document.getElementById('progressMetric').addEventListener('change', (e) => {
            this.updateProgressChart(e.target.value);
        });

        // Modais
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });

        // Editar sessão
        document.getElementById('editSessionBtn').addEventListener('click', () => {
            this.editCurrentSession();
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            firebase.auth().signOut();
        });
    }

    setupRatingSliders() {
        const sliders = document.querySelectorAll('.rating-slider input[type="range"]');
        sliders.forEach(slider => {
            const valueSpan = slider.nextElementSibling;
            
            slider.addEventListener('input', function() {
                valueSpan.textContent = this.value;
                
                // Atualizar cor baseada no valor
                const percentage = (this.value - this.min) / (this.max - this.min) * 100;
                this.style.background = `linear-gradient(to right, #667eea 0%, #667eea ${percentage}%, #ddd ${percentage}%, #ddd 100%)`;
            });
            
            // Trigger inicial
            slider.dispatchEvent(new Event('input'));
        });
    }

    async loadPatients() {
        try {
            const snapshot = await firebase.firestore().collection('patients').get();
            const select = document.getElementById('searchPatient');
            
            select.innerHTML = '<option value="">Selecione um paciente</option>';
            this.patients = [];
            
            snapshot.forEach(doc => {
                const patient = { id: doc.id, ...doc.data() };
                this.patients.push(patient);
                
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = patient.name;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar pacientes:', error);
        }
    }

    async loadRecords() {
        try {
            const snapshot = await firebase.firestore()
                .collection('medicalRecords')
                .orderBy('sessionDate', 'desc')
                .get();

            this.records = [];
            snapshot.forEach(doc => {
                this.records.push({ id: doc.id, ...doc.data() });
            });

            console.log(`${this.records.length} registros carregados`);
        } catch (error) {
            console.error('Erro ao carregar registros:', error);
        }
    }

    selectPatient(patientId) {
        if (!patientId) {
            this.hidePatientInfo();
            return;
        }

        this.currentPatient = this.patients.find(p => p.id === patientId);
        if (this.currentPatient) {
            this.showPatientInfo();
            this.loadPatientSessions();
        }
    }

    showPatientInfo() {
        const patient = this.currentPatient;
        const patientCard = document.getElementById('patientInfoCard');
        
        document.getElementById('patientName').textContent = patient.name;
        document.getElementById('patientAge').textContent = `Idade: ${this.calculateAge(patient.birthDate)} anos`;
        document.getElementById('patientCondition').textContent = `Condição: ${patient.condition || 'Não especificada'}`;
        document.getElementById('patientStartDate').textContent = `Início: ${new Date(patient.createdAt.toDate()).toLocaleDateString('pt-BR')}`;
        
        // Estatísticas do tratamento
        const patientRecords = this.records.filter(r => r.patientId === patient.id);
        document.getElementById('totalSessions').textContent = patientRecords.length;
        
        if (patientRecords.length > 0) {
            const lastSession = new Date(patientRecords[0].sessionDate).toLocaleDateString('pt-BR');
            document.getElementById('lastSession').textContent = lastSession;
            
            // Calcular progresso médio
            const avgProgress = patientRecords.reduce((sum, r) => sum + (r.progressLevel || 5), 0) / patientRecords.length;
            document.getElementById('treatmentProgress').textContent = `${avgProgress.toFixed(1)}/10`;
        } else {
            document.getElementById('lastSession').textContent = 'Nenhuma';
            document.getElementById('treatmentProgress').textContent = '--';
        }
        
        patientCard.style.display = 'block';
        document.getElementById('sessionsListCard').style.display = 'block';
        document.getElementById('progressCard').style.display = 'block';
    }

    hidePatientInfo() {
        document.getElementById('patientInfoCard').style.display = 'none';
        document.getElementById('sessionsListCard').style.display = 'none';
        document.getElementById('progressCard').style.display = 'none';
        this.currentPatient = null;
    }

    loadPatientSessions() {
        if (!this.currentPatient) return;

        const patientRecords = this.records.filter(r => r.patientId === this.currentPatient.id);
        this.renderSessionsTimeline(patientRecords);
        this.updateProgressChart('mood');
    }

    renderSessionsTimeline(sessions) {
        const timeline = document.getElementById('sessionsTimeline');
        
        if (sessions.length === 0) {
            timeline.innerHTML = '<div class="no-sessions">Nenhuma sessão registrada para este paciente.</div>';
            return;
        }

        timeline.innerHTML = sessions.map(session => `
            <div class="session-item" onclick="medicalRecordsManager.viewSession('${session.id}')">
                <div class="session-date">
                    <div class="date-day">${new Date(session.sessionDate).getDate()}</div>
                    <div class="date-month">${new Date(session.sessionDate).toLocaleDateString('pt-BR', { month: 'short' })}</div>
                    <div class="date-year">${new Date(session.sessionDate).getFullYear()}</div>
                </div>
                <div class="session-content">
                    <div class="session-header">
                        <span class="session-type">${this.getSessionTypeText(session.sessionType)}</span>
                        <span class="session-time">${session.sessionTime}</span>
                        <span class="session-duration">${session.sessionDuration}min</span>
                    </div>
                    <div class="session-ratings">
                        <div class="rating-item">
                            <span class="rating-label">Humor:</span>
                            <div class="rating-bar">
                                <div class="rating-fill" style="width: ${(session.moodLevel / 10) * 100}%"></div>
                                <span class="rating-number">${session.moodLevel}/10</span>
                            </div>
                        </div>
                        <div class="rating-item">
                            <span class="rating-label">Progresso:</span>
                            <div class="rating-bar">
                                <div class="rating-fill" style="width: ${(session.progressLevel / 10) * 100}%"></div>
                                <span class="rating-number">${session.progressLevel}/10</span>
                            </div>
                        </div>
                    </div>
                    <div class="session-notes">
                        ${session.sessionNotes.substring(0, 150)}${session.sessionNotes.length > 150 ? '...' : ''}
                    </div>
                    <div class="session-techniques">
                        ${session.techniques ? session.techniques.split(',').map(t => `<span class="technique-tag">${t.trim()}</span>`).join('') : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }

    filterSessions() {
        if (!this.currentPatient) return;

        const typeFilter = document.getElementById('filterSessionType').value;
        const searchTerm = document.getElementById('searchSession').value.toLowerCase();
        
        let filtered = this.records.filter(r => r.patientId === this.currentPatient.id);
        
        if (typeFilter) {
            filtered = filtered.filter(r => r.sessionType === typeFilter);
        }
        
        if (searchTerm) {
            filtered = filtered.filter(r => 
                r.sessionNotes.toLowerCase().includes(searchTerm) ||
                r.patientBehavior.toLowerCase().includes(searchTerm) ||
                r.interventions.toLowerCase().includes(searchTerm)
            );
        }
        
        this.renderSessionsTimeline(filtered);
    }

    updateProgressChart(metric) {
        if (!this.currentPatient) return;

        const patientRecords = this.records
            .filter(r => r.patientId === this.currentPatient.id)
            .sort((a, b) => new Date(a.sessionDate) - new Date(b.sessionDate));

        if (patientRecords.length === 0) return;

        const ctx = document.getElementById('progressChart').getContext('2d');
        
        if (this.currentChart) {
            this.currentChart.destroy();
        }

        const labels = patientRecords.map(r => new Date(r.sessionDate).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }));
        const data = patientRecords.map(r => {
            switch (metric) {
                case 'mood': return r.moodLevel || 5;
                case 'anxiety': return 11 - (r.anxietyLevel || 5); // Inverter ansiedade (menos é melhor)
                case 'progress': return r.progressLevel || 5;
                case 'medication': return r.medicationAdherence || 5;
                default: return r.progressLevel || 5;
            }
        });

        this.currentChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: this.getMetricLabel(metric),
                    data: data,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#667eea',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 10,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y}/10`;
                            }
                        }
                    }
                }
            }
        });

        // Atualizar resumo de progresso
        this.updateProgressSummary(data, metric);
    }

    updateProgressSummary(data, metric) {
        if (data.length < 2) return;

        const first = data[0];
        const last = data[data.length - 1];
        const improvement = ((last - first) / first * 100).toFixed(1);
        
        document.getElementById('overallImprovement').textContent = `${improvement > 0 ? '+' : ''}${improvement}%`;
        
        // Calcular tendência
        const recentData = data.slice(-3);
        const trend = recentData.every((val, i, arr) => i === 0 || val >= arr[i-1]) ? 'Crescente' : 
                     recentData.every((val, i, arr) => i === 0 || val <= arr[i-1]) ? 'Decrescente' : 'Estável';
        
        document.getElementById('progressTrend').textContent = trend;
        document.getElementById('nextGoal').textContent = this.getNextGoal(last, metric);
    }

    getNextGoal(currentLevel, metric) {
        const goals = {
            mood: {
                5: 'Manter estabilidade emocional',
                6: 'Desenvolver estratégias de enfrentamento',
                7: 'Fortalecer autoestima',
                8: 'Consolidar bem-estar emocional',
                9: 'Manter equilíbrio psicológico'
            },
            anxiety: {
                3: 'Reduzir ansiedade através de técnicas de relaxamento',
                4: 'Trabalhar controle de pensamentos ansiosos',
                5: 'Desenvolver tolerância à incerteza',
                6: 'Fortalecer confiança pessoal',
                7: 'Manter controle emocional'
            },
            progress: {
                5: 'Estabelecer metas terapêuticas claras',
                6: 'Desenvolver insight sobre padrões comportamentais',
                7: 'Aplicar estratégias aprendidas no dia a dia',
                8: 'Consolidar mudanças comportamentais',
                9: 'Preparar para finalização do tratamento'
            }
        };

        const metricGoals = goals[metric] || goals.progress;
        const currentGoal = metricGoals[Math.floor(currentLevel)] || 'Manter progresso atual';
        
        return currentGoal;
    }

    openNewSessionModal() {
        if (!this.currentPatient) {
            this.showError('Selecione um paciente primeiro.');
            return;
        }

        document.getElementById('sessionPatientId').value = this.currentPatient.id;
        this.resetSessionForm();
        this.showModal('newSessionModal');
    }

    resetSessionForm() {
        document.getElementById('newSessionForm').reset();
        
        // Resetar sliders
        const sliders = document.querySelectorAll('#newSessionModal .rating-slider input[type="range"]');
        sliders.forEach(slider => {
            slider.value = 5;
            slider.dispatchEvent(new Event('input'));
        });
        
        // Definir data e hora atuais
        const today = new Date().toISOString().split('T')[0];
        const now = new Date();
        const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                           now.getMinutes().toString().padStart(2, '0');
        
        document.getElementById('sessionDate').value = today;
        document.getElementById('sessionTime').value = currentTime;
    }

    async saveSession() {
        try {
            const formData = this.getSessionFormData();
            
            // Validar dados obrigatórios
            if (!formData.sessionNotes.trim()) {
                this.showError('As anotações da sessão são obrigatórias.');
                return;
            }

            // Salvar no Firebase
            await firebase.firestore().collection('medicalRecords').add({
                ...formData,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            this.showSuccess('Sessão registrada com sucesso!');
            this.closeModal();
            this.loadRecords();
            this.loadPatientSessions();

        } catch (error) {
            console.error('Erro ao salvar sessão:', error);
            this.showError('Erro ao registrar sessão.');
        }
    }

    getSessionFormData() {
        // Coletar técnicas selecionadas
        const selectedTechniques = Array.from(document.querySelectorAll('#techniques input:checked'))
            .map(cb => cb.value);

        return {
            patientId: document.getElementById('sessionPatientId').value,
            patientName: this.currentPatient.name,
            sessionDate: document.getElementById('sessionDate').value,
            sessionTime: document.getElementById('sessionTime').value,
            sessionType: document.getElementById('sessionType').value,
            sessionDuration: parseInt(document.getElementById('sessionDuration').value),
            moodLevel: parseInt(document.getElementById('moodLevel').value),
            anxietyLevel: parseInt(document.getElementById('anxietyLevel').value),
            progressLevel: parseInt(document.getElementById('progressLevel').value),
            medicationAdherence: parseInt(document.getElementById('medicationAdherence').value),
            sessionObjectives: document.getElementById('sessionObjectives').value,
            sessionNotes: document.getElementById('sessionNotes').value,
            patientBehavior: document.getElementById('patientBehavior').value,
            techniques: selectedTechniques.join(', '),
            interventions: document.getElementById('interventions').value,
            medicationNotes: document.getElementById('medicationNotes').value,
            homework: document.getElementById('homework').value,
            nextSessionPlan: document.getElementById('nextSessionPlan').value,
            treatmentGoals: document.getElementById('treatmentGoals').value,
            additionalNotes: document.getElementById('additionalNotes').value,
            sessionTags: document.getElementById('sessionTags').value
        };
    }

    viewSession(sessionId) {
        const session = this.records.find(r => r.id === sessionId);
        if (!session) return;

        this.currentSession = session;
        this.renderSessionDetails(session);
        this.showModal('viewSessionModal');
    }

    renderSessionDetails(session) {
        const detailsContainer = document.getElementById('sessionDetails');
        
        detailsContainer.innerHTML = `
            <div class="session-detail-section">
                <h4>Informações da Sessão</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="label">Data:</span>
                        <span class="value">${new Date(session.sessionDate).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Horário:</span>
                        <span class="value">${session.sessionTime}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Tipo:</span>
                        <span class="value">${this.getSessionTypeText(session.sessionType)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Duração:</span>
                        <span class="value">${session.sessionDuration} minutos</span>
                    </div>
                </div>
            </div>

            <div class="session-detail-section">
                <h4>Avaliações</h4>
                <div class="ratings-grid">
                    <div class="rating-detail">
                        <span class="rating-label">Humor:</span>
                        <div class="rating-visual">
                            <div class="rating-bar-large">
                                <div class="rating-fill" style="width: ${(session.moodLevel / 10) * 100}%"></div>
                            </div>
                            <span class="rating-number">${session.moodLevel}/10</span>
                        </div>
                    </div>
                    <div class="rating-detail">
                        <span class="rating-label">Ansiedade:</span>
                        <div class="rating-visual">
                            <div class="rating-bar-large">
                                <div class="rating-fill" style="width: ${(session.anxietyLevel / 10) * 100}%"></div>
                            </div>
                            <span class="rating-number">${session.anxietyLevel}/10</span>
                        </div>
                    </div>
                    <div class="rating-detail">
                        <span class="rating-label">Progresso:</span>
                        <div class="rating-visual">
                            <div class="rating-bar-large">
                                <div class="rating-fill" style="width: ${(session.progressLevel / 10) * 100}%"></div>
                            </div>
                            <span class="rating-number">${session.progressLevel}/10</span>
                        </div>
                    </div>
                    <div class="rating-detail">
                        <span class="rating-label">Adesão Medicamentosa:</span>
                        <div class="rating-visual">
                            <div class="rating-bar-large">
                                <div class="rating-fill" style="width: ${(session.medicationAdherence / 10) * 100}%"></div>
                            </div>
                            <span class="rating-number">${session.medicationAdherence}/10</span>
                        </div>
                    </div>
                </div>
            </div>

            ${session.sessionObjectives ? `
            <div class="session-detail-section">
                <h4>Objetivos da Sessão</h4>
                <p class="detail-text">${session.sessionObjectives}</p>
            </div>
            ` : ''}

            <div class="session-detail-section">
                <h4>Anotações da Sessão</h4>
                <p class="detail-text">${session.sessionNotes}</p>
            </div>

            ${session.patientBehavior ? `
            <div class="session-detail-section">
                <h4>Comportamento Observado</h4>
                <p class="detail-text">${session.patientBehavior}</p>
            </div>
            ` : ''}

            ${session.techniques ? `
            <div class="session-detail-section">
                <h4>Técnicas Utilizadas</h4>
                <div class="techniques-list">
                    ${session.techniques.split(',').map(t => `<span class="technique-tag">${t.trim()}</span>`).join('')}
                </div>
            </div>
            ` : ''}

            ${session.interventions ? `
            <div class="session-detail-section">
                <h4>Intervenções Específicas</h4>
                <p class="detail-text">${session.interventions}</p>
            </div>
            ` : ''}

            ${session.medicationNotes ? `
            <div class="session-detail-section">
                <h4>Observações sobre Medicação</h4>
                <p class="detail-text">${session.medicationNotes}</p>
            </div>
            ` : ''}

            ${session.homework ? `
            <div class="session-detail-section">
                <h4>Tarefas para Casa</h4>
                <p class="detail-text">${session.homework}</p>
            </div>
            ` : ''}

            ${session.nextSessionPlan ? `
            <div class="session-detail-section">
                <h4>Plano para Próxima Sessão</h4>
                <p class="detail-text">${session.nextSessionPlan}</p>
            </div>
            ` : ''}

            ${session.treatmentGoals ? `
            <div class="session-detail-section">
                <h4>Metas do Tratamento</h4>
                <p class="detail-text">${session.treatmentGoals}</p>
            </div>
            ` : ''}

            ${session.additionalNotes ? `
            <div class="session-detail-section">
                <h4>Observações Adicionais</h4>
                <p class="detail-text">${session.additionalNotes}</p>
            </div>
            ` : ''}

            ${session.sessionTags ? `
            <div class="session-detail-section">
                <h4>Tags</h4>
                <div class="tags-list">
                    ${session.sessionTags.split(',').map(tag => `<span class="session-tag">${tag.trim()}</span>`).join('')}
                </div>
            </div>
            ` : ''}
        `;
    }

    calculateAge(birthDate) {
        if (!birthDate) return 'N/A';
        
        const birth = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    }

    getSessionTypeText(type) {
        const types = {
            'individual': 'Individual',
            'grupo': 'Grupo',
            'avaliacao': 'Avaliação',
            'retorno': 'Retorno',
            'emergencia': 'Emergência'
        };
        return types[type] || type;
    }

    getMetricLabel(metric) {
        const labels = {
            'mood': 'Humor',
            'anxiety': 'Controle da Ansiedade',
            'progress': 'Progresso Geral',
            'medication': 'Adesão Medicamentosa'
        };
        return labels[metric] || 'Progresso';
    }

    showModal(modalId) {
        document.getElementById(modalId).style.display = 'flex';
    }

    closeModal() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    filterRecords() {
        const patientId = document.getElementById('searchPatient').value;
        const startDate = document.getElementById('filterDateStart').value;
        const endDate = document.getElementById('filterDateEnd').value;

        if (!patientId) {
            this.showError('Selecione um paciente para buscar registros.');
            return;
        }

        this.selectPatient(patientId);
    }

    showSuccess(message) {
        // Implementar notificação de sucesso
        alert(message);
    }

    showError(message) {
        // Implementar notificação de erro
        alert(message);
    }
}

// Inicializar o MedicalRecordsManager quando a página carregar
let medicalRecordsManager;

document.addEventListener('DOMContentLoaded', () => {
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            medicalRecordsManager = new MedicalRecordsManager();
        } else {
            window.location.href = 'index.html';
        }
    });
});

// Fechar modal clicando fora dele
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        medicalRecordsManager?.closeModal();
    }
}
