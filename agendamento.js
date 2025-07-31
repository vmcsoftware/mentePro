// Appointment Manager - Sistema de gestão de agendamentos
class AppointmentManager {
    constructor() {
        this.appointments = [];
        this.patients = [];
        this.isFirebaseEnabled = false;
        this.db = null;
        this.auth = null;
        this.initializeFirebase();
    }

    // Inicializar Firebase
    async initializeFirebase() {
        try {
            if (window.firebaseConfig && window.firebaseConfig.isInitialized) {
                this.isFirebaseEnabled = true;
                this.db = window.firebaseConfig.db;
                this.auth = window.firebaseConfig.auth;
                console.log('AppointmentManager: Firebase inicializado');
                await this.loadAppointmentsFromFirestore();
            } else {
                console.log('AppointmentManager: Firebase não disponível, usando localStorage');
                this.loadAppointmentsFromStorage();
            }
        } catch (error) {
            console.error('Erro ao inicializar Firebase no AppointmentManager:', error);
            this.loadAppointmentsFromStorage();
        }
    }

    // Carregar agendamentos do Firestore
    async loadAppointmentsFromFirestore() {
        if (!this.isFirebaseEnabled) return;

        try {
            const querySnapshot = await window.firebaseConfig.getDocs(
                window.firebaseConfig.collection(this.db, 'appointments')
            );
            
            this.appointments = [];
            querySnapshot.forEach((doc) => {
                this.appointments.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            console.log(`AppointmentManager: ${this.appointments.length} agendamentos carregados do Firestore`);
        } catch (error) {
            console.error('Erro ao carregar agendamentos do Firestore:', error);
            this.loadAppointmentsFromStorage();
        }
    }

    // Carregar agendamentos do localStorage
    loadAppointmentsFromStorage() {
        try {
            const stored = localStorage.getItem('mentePro_appointments');
            this.appointments = stored ? JSON.parse(stored) : [];
            console.log(`AppointmentManager: ${this.appointments.length} agendamentos carregados do localStorage`);
        } catch (error) {
            console.error('Erro ao carregar agendamentos do localStorage:', error);
            this.appointments = [];
        }
    }

    // Salvar agendamentos no storage
    async saveAppointmentsToStorage() {
        try {
            localStorage.setItem('mentePro_appointments', JSON.stringify(this.appointments));
        } catch (error) {
            console.error('Erro ao salvar no localStorage:', error);
        }
    }

    // Criar novo agendamento
    async createAppointment(appointmentData) {
        try {
            const appointment = {
                ...appointmentData,
                id: 'apt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            if (this.isFirebaseEnabled) {
                await window.firebaseConfig.setDoc(
                    window.firebaseConfig.doc(this.db, 'appointments', appointment.id),
                    appointment
                );
                console.log('Agendamento salvo no Firestore:', appointment.id);
            }

            this.appointments.push(appointment);
            await this.saveAppointmentsToStorage();
            
            return { success: true, appointment };
        } catch (error) {
            console.error('Erro ao criar agendamento:', error);
            return { success: false, error: error.message };
        }
    }

    // Atualizar agendamento
    async updateAppointment(appointmentId, updateData) {
        try {
            const index = this.appointments.findIndex(apt => apt.id === appointmentId);
            if (index === -1) {
                throw new Error('Agendamento não encontrado');
            }

            const updatedAppointment = {
                ...this.appointments[index],
                ...updateData,
                updatedAt: new Date().toISOString()
            };

            if (this.isFirebaseEnabled) {
                await window.firebaseConfig.updateDoc(
                    window.firebaseConfig.doc(this.db, 'appointments', appointmentId),
                    updateData
                );
                console.log('Agendamento atualizado no Firestore:', appointmentId);
            }

            this.appointments[index] = updatedAppointment;
            await this.saveAppointmentsToStorage();

            return { success: true, appointment: updatedAppointment };
        } catch (error) {
            console.error('Erro ao atualizar agendamento:', error);
            return { success: false, error: error.message };
        }
    }

    // Excluir agendamento
    async deleteAppointment(appointmentId) {
        try {
            const index = this.appointments.findIndex(apt => apt.id === appointmentId);
            if (index === -1) {
                throw new Error('Agendamento não encontrado');
            }

            if (this.isFirebaseEnabled) {
                await window.firebaseConfig.deleteDoc(
                    window.firebaseConfig.doc(this.db, 'appointments', appointmentId)
                );
                console.log('Agendamento excluído do Firestore:', appointmentId);
            }

            this.appointments.splice(index, 1);
            await this.saveAppointmentsToStorage();

            return { success: true };
        } catch (error) {
            console.error('Erro ao excluir agendamento:', error);
            return { success: false, error: error.message };
        }
    }

    // Buscar agendamento por ID
    getAppointmentById(appointmentId) {
        return this.appointments.find(apt => apt.id === appointmentId);
    }

    // Buscar agendamentos por data
    getAppointmentsByDate(date) {
        return this.appointments.filter(apt => apt.date === date);
    }

    // Buscar agendamentos por período
    getAppointmentsByPeriod(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        return this.appointments.filter(apt => {
            const aptDate = new Date(apt.date);
            return aptDate >= start && aptDate <= end;
        });
    }

    // Buscar agendamentos por paciente
    getAppointmentsByPatient(patientId) {
        return this.appointments.filter(apt => apt.patientId === patientId);
    }

    // Buscar agendamentos por status
    getAppointmentsByStatus(status) {
        return this.appointments.filter(apt => apt.status === status);
    }

    // Verificar conflitos de horário
    checkTimeConflict(date, time, duration, excludeId = null) {
        const newStart = new Date(`${date} ${time}`);
        const newEnd = new Date(newStart.getTime() + (duration * 60000));

        return this.appointments.some(apt => {
            if (excludeId && apt.id === excludeId) return false;
            if (apt.date !== date) return false;

            const existingStart = new Date(`${apt.date} ${apt.time}`);
            const existingEnd = new Date(existingStart.getTime() + (apt.duration * 60000));

            return (newStart < existingEnd && newEnd > existingStart);
        });
    }

    // Obter estatísticas
    getStatistics() {
        const today = new Date().toISOString().split('T')[0];
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        const todayAppointments = this.appointments.filter(apt => apt.date === today);
        const weekAppointments = this.getAppointmentsByPeriod(
            startOfWeek.toISOString().split('T')[0],
            endOfWeek.toISOString().split('T')[0]
        );

        const statusCounts = {
            scheduled: 0,
            confirmed: 0,
            completed: 0,
            cancelled: 0,
            'no-show': 0
        };

        this.appointments.forEach(apt => {
            if (statusCounts.hasOwnProperty(apt.status)) {
                statusCounts[apt.status]++;
            }
        });

        return {
            today: todayAppointments.length,
            week: weekAppointments.length,
            pending: statusCounts.scheduled + statusCounts.confirmed,
            completed: statusCounts.completed,
            cancelled: statusCounts.cancelled,
            noShow: statusCounts['no-show'],
            total: this.appointments.length,
            statusCounts
        };
    }

    // Obter próximos agendamentos
    getUpcomingAppointments(limit = 5) {
        const now = new Date();
        return this.appointments
            .filter(apt => {
                const aptDateTime = new Date(`${apt.date} ${apt.time}`);
                return aptDateTime > now && (apt.status === 'scheduled' || apt.status === 'confirmed');
            })
            .sort((a, b) => new Date(`${a.date} ${a.time}`) - new Date(`${b.date} ${b.time}`))
            .slice(0, limit);
    }

    // Obter agendamentos de hoje
    getTodayAppointments() {
        const today = new Date().toISOString().split('T')[0];
        return this.getAppointmentsByDate(today)
            .sort((a, b) => a.time.localeCompare(b.time));
    }

    // Validar dados do agendamento
    validateAppointmentData(data) {
        const errors = [];

        if (!data.patientId) {
            errors.push('Paciente é obrigatório');
        }

        if (!data.date) {
            errors.push('Data é obrigatória');
        } else {
            const appointmentDate = new Date(data.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (appointmentDate < today) {
                errors.push('Data não pode ser no passado');
            }
        }

        if (!data.time) {
            errors.push('Horário é obrigatório');
        }

        if (!data.type) {
            errors.push('Tipo de consulta é obrigatório');
        }

        if (data.duration && (data.duration < 15 || data.duration > 180)) {
            errors.push('Duração deve estar entre 15 e 180 minutos');
        }

        // Verificar conflito de horário
        if (data.date && data.time && data.duration) {
            if (this.checkTimeConflict(data.date, data.time, data.duration, data.id)) {
                errors.push('Horário conflita com outro agendamento');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Gerar dados de exemplo para demonstração
    generateSampleData() {
        const sampleAppointments = [
            {
                patientId: 'patient_1',
                patientName: 'Ana Silva',
                date: new Date().toISOString().split('T')[0],
                time: '09:00',
                type: 'primeira-consulta',
                duration: 50,
                status: 'confirmed',
                paymentStatus: 'pending',
                notes: 'Primeira consulta - ansiedade'
            },
            {
                patientId: 'patient_2',
                patientName: 'João Santos',
                date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                time: '10:30',
                type: 'terapia-individual',
                duration: 50,
                status: 'scheduled',
                paymentStatus: 'pending',
                notes: 'Sessão de acompanhamento'
            }
        ];

        sampleAppointments.forEach(apt => {
            this.createAppointment(apt);
        });
    }

    // Exportar agendamentos
    exportAppointments(format = 'json') {
        switch (format) {
            case 'json':
                return JSON.stringify(this.appointments, null, 2);
            case 'csv':
                return this.convertToCSV(this.appointments);
            default:
                return this.appointments;
        }
    }

    // Converter para CSV
    convertToCSV(appointments) {
        const headers = [
            'ID', 'Paciente', 'Data', 'Horário', 'Tipo', 'Duração', 
            'Status', 'Pagamento', 'Observações', 'Criado em'
        ];
        
        const rows = appointments.map(apt => [
            apt.id,
            apt.patientName,
            apt.date,
            apt.time,
            apt.type,
            apt.duration,
            apt.status,
            apt.paymentStatus,
            apt.notes || '',
            apt.createdAt
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        return csvContent;
    }
}

// Inicializar AppointmentManager globalmente
window.appointmentManager = new AppointmentManager();

// Aguardar carregamento do DOM e Firebase
document.addEventListener('DOMContentLoaded', function() {
    console.log('AppointmentManager carregado');
    
    // Aguardar Firebase estar disponível
    const checkFirebase = setInterval(() => {
        if (window.firebaseConfig) {
            clearInterval(checkFirebase);
            window.appointmentManager.initializeFirebase();
        }
    }, 100);

    // Timeout de 5 segundos
    setTimeout(() => {
        clearInterval(checkFirebase);
    }, 5000);
});

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppointmentManager;
}
