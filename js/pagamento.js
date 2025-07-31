// PaymentManager - Gerenciamento de Pagamentos
class PaymentManager {
    constructor() {
        this.payments = [];
        this.consultationFees = {
            standard: 150.00,
            return: 120.00,
            group: 80.00,
            online: 130.00
        };
        this.init();
    }

    init() {
        this.loadConsultationFees();
        this.loadPayments();
        this.setupEventListeners();
        this.populatePatientSelect();
        this.populateMonthFilter();
        this.updateFinancialSummary();
        
        // Definir data atual nos campos de data
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('paymentDate').value = today;
    }

    // Método público para obter valores de consulta
    static async getConsultationFees() {
        try {
            const doc = await firebase.firestore().collection('settings').doc('consultationFees').get();
            if (doc.exists) {
                return doc.data();
            }
            // Valores padrão se não existir configuração
            return {
                standard: 150.00,
                return: 120.00,
                group: 80.00,
                online: 130.00
            };
        } catch (error) {
            console.error('Erro ao carregar valores de consulta:', error);
            return {
                standard: 150.00,
                return: 120.00,
                group: 80.00,
                online: 130.00
            };
        }
    }

    // Método público para obter valor por tipo de consulta
    static getConsultationValue(type) {
        const fees = {
            'consulta': 150.00,
            'retorno': 120.00,
            'grupo': 80.00,
            'online': 130.00
        };
        return fees[type] || fees['consulta'];
    }

    setupEventListeners() {
        // Formulário de configurações de valores
        document.getElementById('consultationFeesForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveConsultationFees();
        });

        // Formulário de registro de pagamento
        document.getElementById('paymentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.registerPayment();
        });

        // Formulário de edição de pagamento
        document.getElementById('editPaymentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updatePayment();
        });

        // Filtros
        document.getElementById('filterStatus').addEventListener('change', () => this.filterPayments());
        document.getElementById('filterMonth').addEventListener('change', () => this.filterPayments());
        document.getElementById('searchPayment').addEventListener('input', () => this.filterPayments());

        // Seleção de paciente para carregar consultas
        document.getElementById('paymentPatient').addEventListener('change', (e) => {
            this.loadPatientAppointments(e.target.value);
        });

        // Seleção de consulta para preencher valor automaticamente
        document.getElementById('paymentAppointment').addEventListener('change', (e) => {
            this.setAppointmentValue(e.target.value);
        });

        // Modal
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });

        // Relatórios
        document.getElementById('generateReportBtn').addEventListener('click', () => {
            this.generateReport();
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            firebase.auth().signOut();
        });
    }

    async loadConsultationFees() {
        try {
            const doc = await firebase.firestore().collection('settings').doc('consultationFees').get();
            if (doc.exists) {
                this.consultationFees = doc.data();
                this.populateFeesForm();
            }
        } catch (error) {
            console.error('Erro ao carregar valores:', error);
        }
    }

    populateFeesForm() {
        document.getElementById('consultationPrice').value = this.consultationFees.standard || 150;
        document.getElementById('returnPrice').value = this.consultationFees.return || 120;
        document.getElementById('groupPrice').value = this.consultationFees.group || 80;
        document.getElementById('onlinePrice').value = this.consultationFees.online || 130;
    }

    async saveConsultationFees() {
        try {
            const fees = {
                standard: parseFloat(document.getElementById('consultationPrice').value),
                return: parseFloat(document.getElementById('returnPrice').value),
                group: parseFloat(document.getElementById('groupPrice').value),
                online: parseFloat(document.getElementById('onlinePrice').value),
                updatedAt: new Date()
            };

            await firebase.firestore().collection('settings').doc('consultationFees').set(fees);
            this.consultationFees = fees;
            
            this.showSuccess('Valores de consulta atualizados com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar valores:', error);
            this.showError('Erro ao salvar valores de consulta.');
        }
    }

    async populatePatientSelect() {
        try {
            const snapshot = await firebase.firestore().collection('patients').get();
            const select = document.getElementById('paymentPatient');
            
            select.innerHTML = '<option value="">Selecione um paciente</option>';
            
            snapshot.forEach(doc => {
                const patient = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = patient.name;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar pacientes:', error);
        }
    }

    async loadPatientAppointments(patientId) {
        if (!patientId) {
            document.getElementById('paymentAppointment').innerHTML = '<option value="">Selecione uma consulta</option>';
            return;
        }

        try {
            const snapshot = await firebase.firestore()
                .collection('appointments')
                .where('patientId', '==', patientId)
                .orderBy('date', 'desc')
                .get();

            const select = document.getElementById('paymentAppointment');
            select.innerHTML = '<option value="">Selecione uma consulta</option>';

            snapshot.forEach(doc => {
                const appointment = doc.data();
                const date = new Date(appointment.date).toLocaleDateString('pt-BR');
                const status = appointment.paymentStatus || 'pending';
                
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = `${date} - ${appointment.type || 'Consulta'} (${this.getStatusText(status)})`;
                option.dataset.type = appointment.type;
                option.dataset.status = status;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar consultas:', error);
        }
    }

    setAppointmentValue(appointmentId) {
        if (!appointmentId) {
            document.getElementById('paymentAmount').value = '';
            return;
        }

        const option = document.querySelector(`#paymentAppointment option[value="${appointmentId}"]`);
        if (option) {
            const type = option.dataset.type;
            let value = this.consultationFees.standard;

            switch (type) {
                case 'retorno':
                    value = this.consultationFees.return;
                    break;
                case 'grupo':
                    value = this.consultationFees.group;
                    break;
                case 'online':
                    value = this.consultationFees.online;
                    break;
                default:
                    value = this.consultationFees.standard;
            }

            document.getElementById('paymentAmount').value = value.toFixed(2);
        }
    }

    async registerPayment() {
        try {
            const patientId = document.getElementById('paymentPatient').value;
            const appointmentId = document.getElementById('paymentAppointment').value;
            const amount = parseFloat(document.getElementById('paymentAmount').value);
            const method = document.getElementById('paymentMethod').value;
            const date = document.getElementById('paymentDate').value;
            const status = document.getElementById('paymentStatus').value;
            const notes = document.getElementById('paymentNotes').value;

            // Buscar dados do paciente
            const patientDoc = await firebase.firestore().collection('patients').doc(patientId).get();
            const patient = patientDoc.data();

            // Buscar dados da consulta
            const appointmentDoc = await firebase.firestore().collection('appointments').doc(appointmentId).get();
            const appointment = appointmentDoc.data();

            const payment = {
                patientId,
                patientName: patient.name,
                appointmentId,
                appointmentDate: appointment.date,
                appointmentType: appointment.type || 'consulta',
                amount,
                method,
                paymentDate: date,
                status,
                notes,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Adicionar pagamento
            await firebase.firestore().collection('payments').add(payment);

            // Atualizar status da consulta
            await firebase.firestore().collection('appointments').doc(appointmentId).update({
                paymentStatus: status,
                paymentAmount: amount,
                paymentMethod: method,
                paymentDate: date
            });

            this.showSuccess('Pagamento registrado com sucesso!');
            this.clearPaymentForm();
            this.loadPayments();
            this.updateFinancialSummary();

        } catch (error) {
            console.error('Erro ao registrar pagamento:', error);
            this.showError('Erro ao registrar pagamento.');
        }
    }

    async loadPayments() {
        try {
            const snapshot = await firebase.firestore()
                .collection('payments')
                .orderBy('paymentDate', 'desc')
                .get();

            this.payments = [];
            snapshot.forEach(doc => {
                this.payments.push({ id: doc.id, ...doc.data() });
            });

            this.renderPayments();
        } catch (error) {
            console.error('Erro ao carregar pagamentos:', error);
        }
    }

    renderPayments(paymentsToRender = this.payments) {
        const tbody = document.getElementById('paymentsTableBody');
        
        if (paymentsToRender.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Nenhum pagamento encontrado</td></tr>';
            return;
        }

        tbody.innerHTML = paymentsToRender.map(payment => `
            <tr>
                <td>${new Date(payment.paymentDate).toLocaleDateString('pt-BR')}</td>
                <td>${payment.patientName}</td>
                <td>${this.getTypeText(payment.appointmentType)}</td>
                <td>R$ ${payment.amount.toFixed(2)}</td>
                <td>${this.getMethodText(payment.method)}</td>
                <td><span class="status-badge status-${payment.status}">${this.getStatusText(payment.status)}</span></td>
                <td>
                    <button class="btn-icon" onclick="paymentManager.editPayment('${payment.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-danger" onclick="paymentManager.deletePayment('${payment.id}')" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    editPayment(paymentId) {
        const payment = this.payments.find(p => p.id === paymentId);
        if (!payment) return;

        document.getElementById('editPaymentId').value = payment.id;
        document.getElementById('editPaymentAmount').value = payment.amount;
        document.getElementById('editPaymentMethod').value = payment.method;
        document.getElementById('editPaymentDate').value = payment.paymentDate;
        document.getElementById('editPaymentStatus').value = payment.status;
        document.getElementById('editPaymentNotes').value = payment.notes || '';

        this.showModal('editPaymentModal');
    }

    async updatePayment() {
        try {
            const paymentId = document.getElementById('editPaymentId').value;
            const amount = parseFloat(document.getElementById('editPaymentAmount').value);
            const method = document.getElementById('editPaymentMethod').value;
            const paymentDate = document.getElementById('editPaymentDate').value;
            const status = document.getElementById('editPaymentStatus').value;
            const notes = document.getElementById('editPaymentNotes').value;

            const payment = this.payments.find(p => p.id === paymentId);
            if (!payment) return;

            const updateData = {
                amount,
                method,
                paymentDate,
                status,
                notes,
                updatedAt: new Date()
            };

            // Atualizar pagamento
            await firebase.firestore().collection('payments').doc(paymentId).update(updateData);

            // Atualizar consulta correspondente
            await firebase.firestore().collection('appointments').doc(payment.appointmentId).update({
                paymentStatus: status,
                paymentAmount: amount,
                paymentMethod: method,
                paymentDate: paymentDate
            });

            this.showSuccess('Pagamento atualizado com sucesso!');
            this.closeModal();
            this.loadPayments();
            this.updateFinancialSummary();

        } catch (error) {
            console.error('Erro ao atualizar pagamento:', error);
            this.showError('Erro ao atualizar pagamento.');
        }
    }

    async deletePayment(paymentId) {
        if (!confirm('Tem certeza que deseja excluir este pagamento?')) return;

        try {
            const payment = this.payments.find(p => p.id === paymentId);
            if (!payment) return;

            // Excluir pagamento
            await firebase.firestore().collection('payments').doc(paymentId).delete();

            // Resetar status da consulta
            await firebase.firestore().collection('appointments').doc(payment.appointmentId).update({
                paymentStatus: 'pending',
                paymentAmount: firebase.firestore.FieldValue.delete(),
                paymentMethod: firebase.firestore.FieldValue.delete(),
                paymentDate: firebase.firestore.FieldValue.delete()
            });

            this.showSuccess('Pagamento excluído com sucesso!');
            this.loadPayments();
            this.updateFinancialSummary();

        } catch (error) {
            console.error('Erro ao excluir pagamento:', error);
            this.showError('Erro ao excluir pagamento.');
        }
    }

    filterPayments() {
        const statusFilter = document.getElementById('filterStatus').value;
        const monthFilter = document.getElementById('filterMonth').value;
        const searchTerm = document.getElementById('searchPayment').value.toLowerCase();

        let filtered = this.payments.filter(payment => {
            const statusMatch = !statusFilter || payment.status === statusFilter;
            const monthMatch = !monthFilter || payment.paymentDate.startsWith(monthFilter);
            const searchMatch = !searchTerm || payment.patientName.toLowerCase().includes(searchTerm);

            return statusMatch && monthMatch && searchMatch;
        });

        this.renderPayments(filtered);
    }

    populateMonthFilter() {
        const select = document.getElementById('filterMonth');
        const currentYear = new Date().getFullYear();
        
        for (let month = 1; month <= 12; month++) {
            const monthValue = `${currentYear}-${month.toString().padStart(2, '0')}`;
            const monthName = new Date(currentYear, month - 1).toLocaleDateString('pt-BR', { month: 'long' });
            
            const option = document.createElement('option');
            option.value = monthValue;
            option.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);
            select.appendChild(option);
        }
    }

    async updateFinancialSummary() {
        try {
            const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
            
            let monthlyTotal = 0;
            let pendingTotal = 0;
            let receivedTotal = 0;

            this.payments.forEach(payment => {
                const paymentMonth = payment.paymentDate.slice(0, 7);
                
                if (paymentMonth === currentMonth) {
                    if (payment.status === 'paid') {
                        monthlyTotal += payment.amount;
                        receivedTotal += payment.amount;
                    } else if (payment.status === 'partial') {
                        receivedTotal += payment.amount;
                    }
                } else if (payment.status !== 'paid') {
                    pendingTotal += payment.amount;
                }
            });

            document.getElementById('monthlyRevenue').textContent = `R$ ${monthlyTotal.toFixed(2)}`;
            document.getElementById('pendingPayments').textContent = `R$ ${pendingTotal.toFixed(2)}`;
            document.getElementById('receivedPayments').textContent = `R$ ${receivedTotal.toFixed(2)}`;

        } catch (error) {
            console.error('Erro ao atualizar resumo financeiro:', error);
        }
    }

    generateReport() {
        const startDate = document.getElementById('reportStartDate').value;
        const endDate = document.getElementById('reportEndDate').value;

        if (!startDate || !endDate) {
            this.showError('Selecione as datas de início e fim para gerar o relatório.');
            return;
        }

        const filteredPayments = this.payments.filter(payment => {
            return payment.paymentDate >= startDate && payment.paymentDate <= endDate;
        });

        let totalReceived = 0;
        let totalPending = 0;
        let totalAppointments = filteredPayments.length;
        const methodsBreakdown = {};

        filteredPayments.forEach(payment => {
            if (payment.status === 'paid') {
                totalReceived += payment.amount;
            } else {
                totalPending += payment.amount;
            }

            methodsBreakdown[payment.method] = (methodsBreakdown[payment.method] || 0) + payment.amount;
        });

        document.getElementById('reportTotalReceived').textContent = `R$ ${totalReceived.toFixed(2)}`;
        document.getElementById('reportTotalPending').textContent = `R$ ${totalPending.toFixed(2)}`;
        document.getElementById('reportTotalAppointments').textContent = totalAppointments;

        this.renderPaymentMethodsChart(methodsBreakdown);
        document.getElementById('reportResults').style.display = 'block';
    }

    renderPaymentMethodsChart(methodsBreakdown) {
        const chartContainer = document.getElementById('paymentMethodsChart');
        const total = Object.values(methodsBreakdown).reduce((sum, value) => sum + value, 0);

        if (total === 0) {
            chartContainer.innerHTML = '<p>Nenhum pagamento no período selecionado</p>';
            return;
        }

        chartContainer.innerHTML = Object.entries(methodsBreakdown)
            .map(([method, amount]) => {
                const percentage = ((amount / total) * 100).toFixed(1);
                return `
                    <div class="payment-method-item">
                        <span class="method-name">${this.getMethodText(method)}</span>
                        <div class="method-bar">
                            <div class="method-fill" style="width: ${percentage}%"></div>
                        </div>
                        <span class="method-value">R$ ${amount.toFixed(2)} (${percentage}%)</span>
                    </div>
                `;
            })
            .join('');
    }

    clearPaymentForm() {
        document.getElementById('paymentForm').reset();
        document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('paymentAppointment').innerHTML = '<option value="">Selecione uma consulta</option>';
    }

    showModal(modalId) {
        document.getElementById(modalId).style.display = 'flex';
    }

    closeModal() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    getStatusText(status) {
        const statusMap = {
            'paid': 'Pago',
            'pending': 'Pendente',
            'partial': 'Parcial'
        };
        return statusMap[status] || status;
    }

    getMethodText(method) {
        const methodMap = {
            'dinheiro': 'Dinheiro',
            'pix': 'PIX',
            'cartao-debito': 'Cartão de Débito',
            'cartao-credito': 'Cartão de Crédito',
            'transferencia': 'Transferência',
            'cheque': 'Cheque'
        };
        return methodMap[method] || method;
    }

    getTypeText(type) {
        const typeMap = {
            'consulta': 'Consulta',
            'retorno': 'Retorno',
            'grupo': 'Terapia em Grupo',
            'online': 'Online'
        };
        return typeMap[type] || 'Consulta';
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

// Inicializar o PaymentManager quando a página carregar
let paymentManager;

document.addEventListener('DOMContentLoaded', () => {
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            paymentManager = new PaymentManager();
        } else {
            window.location.href = 'index.html';
        }
    });
});

// Fechar modal clicando fora dele
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        paymentManager?.closeModal();
    }
}
