// Firebase Configuration for mentePro
// Este arquivo contém a configuração do Firebase para o sistema mentePro

// Configuração real do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBd_3gsVLmK1pw7ZLPJVEXluIN1cDUsNNs",
    authDomain: "mentepro-a41a5.firebaseapp.com",
    projectId: "mentepro-a41a5",
    storageBucket: "mentepro-a41a5.firebasestorage.app",
    messagingSenderId: "225044362796",
    appId: "1:225044362796:web:be30a5ef58a80a99a68389",
    measurementId: "G-44B05KT671"
};

// Classe para gerenciar a configuração do Firebase
class FirebaseConfig {
    constructor() {
        this.config = firebaseConfig;
        this.app = null;
        this.auth = null;
        this.db = null;
        this.analytics = null;
        this.isInitialized = false;
        this.isFirebaseLoaded = false;
    }

    // Inicializar Firebase
    async initialize() {
        try {
            console.log('🔥 Iniciando inicialização do Firebase...');
            
            // Aguardar o carregamento das dependências do Firebase
            await this.loadFirebaseDependencies();
            
            if (this.isFirebaseLoaded) {
                console.log('🔥 Firebase SDK carregado, inicializando app...');
                
                // Inicializar Firebase
                this.app = firebase.initializeApp(this.config);
                console.log('✅ Firebase App inicializado');
                
                this.auth = firebase.auth();
                console.log('✅ Firebase Auth inicializado');
                
                this.db = firebase.firestore();
                console.log('✅ Firebase Firestore inicializado');
                
                // Inicializar Analytics se disponível
                if (firebase.analytics) {
                    this.analytics = firebase.analytics();
                    console.log('✅ Firebase Analytics inicializado');
                }
                
                this.isInitialized = true;
                console.log('🎉 Firebase totalmente inicializado!');
                
                // Configurar observador de estado de autenticação
                this.setupAuthStateObserver();
                
                // Verificar resultado de redirect (caso popup tenha sido bloqueado)
                this.checkRedirectResult();
                
                // Configurar persistência offline para Firestore
                this.setupOfflinePersistence();
                
            } else {
                throw new Error('Firebase SDK não foi carregado');
            }
            
        } catch (error) {
            console.error('❌ Erro ao inicializar Firebase:', error);
            console.log('🔄 Continuando em modo demo...');
            // Continuar sem Firebase em modo demo
            this.initializeDemoMode();
        }
    }

    // Carregar dependências do Firebase
    async loadFirebaseDependencies() {
        return new Promise((resolve, reject) => {
            // Verificar se o Firebase já está carregado
            if (typeof firebase !== 'undefined') {
                console.log('Firebase SDK já carregado');
                this.isFirebaseLoaded = true;
                resolve();
                return;
            }

            console.log('Carregando Firebase SDK...');

            // Carregar Firebase SDK v9 compat
            const script = document.createElement('script');
            script.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js';
            script.onload = () => {
                console.log('Firebase App carregado');
                // Carregar Auth
                const authScript = document.createElement('script');
                authScript.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js';
                authScript.onload = () => {
                    console.log('Firebase Auth carregado');
                    // Carregar Firestore
                    const firestoreScript = document.createElement('script');
                    firestoreScript.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js';
                    firestoreScript.onload = () => {
                        console.log('Firebase Firestore carregado');
                        // Carregar Analytics
                        const analyticsScript = document.createElement('script');
                        analyticsScript.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-analytics-compat.js';
                        analyticsScript.onload = () => {
                            console.log('Firebase Analytics carregado');
                            this.isFirebaseLoaded = true;
                            resolve();
                        };
                        analyticsScript.onerror = () => {
                            console.warn('Firebase Analytics não pôde ser carregado, continuando sem analytics');
                            this.isFirebaseLoaded = true;
                            resolve();
                        };
                        document.head.appendChild(analyticsScript);
                    };
                    firestoreScript.onerror = (error) => {
                        console.error('Erro ao carregar Firebase Firestore:', error);
                        reject(error);
                    };
                    document.head.appendChild(firestoreScript);
                };
                authScript.onerror = (error) => {
                    console.error('Erro ao carregar Firebase Auth:', error);
                    reject(error);
                };
                document.head.appendChild(authScript);
            };
            script.onerror = (error) => {
                console.error('Erro ao carregar Firebase App:', error);
                reject(error);
            };
            document.head.appendChild(script);
        });
    }

    // Verificar resultado de redirect
    async checkRedirectResult() {
        if (this.auth && this.isInitialized) {
            try {
                const result = await this.auth.getRedirectResult();
                if (result.user) {
                    console.log('Login via redirect realizado:', result.user.email);
                    
                    // Log do Analytics
                    if (this.analytics) {
                        this.analytics.logEvent('login', {
                            method: 'google_redirect'
                        });
                    }
                }
            } catch (error) {
                console.error('Erro ao verificar resultado do redirect:', error);
            }
        }
    }

    // Configurar persistência offline
    async setupOfflinePersistence() {
        try {
            await this.db.enablePersistence();
            console.log('Persistência offline habilitada');
        } catch (error) {
            if (error.code === 'failed-precondition') {
                console.warn('Múltiplas abas abertas, persistência offline desabilitada');
            } else if (error.code === 'unimplemented') {
                console.warn('O navegador não suporta persistência offline');
            }
        }
    }

    // Inicializar modo demo (sem Firebase)
    initializeDemoMode() {
        console.log('Executando em modo demo (sem Firebase)');
        this.isInitialized = true;
        
        // Simular alguns dados de exemplo
        this.mockData = {
            users: [
                { 
                    uid: 'demo-admin',
                    email: 'admin@mentepro.com',
                    displayName: 'Administrador',
                    role: 'admin'
                },
                { 
                    uid: 'demo-doctor',
                    email: 'doutor@mentepro.com',
                    displayName: 'Dr. Silva',
                    role: 'doctor'
                },
                { 
                    uid: 'demo-secretary',
                    email: 'secretaria@mentepro.com',
                    displayName: 'Maria Secretária',
                    role: 'secretary'
                }
            ],
            patients: [
                {
                    id: 'patient-1',
                    name: 'João Silva',
                    email: 'joao@email.com',
                    phone: '(11) 99999-9999',
                    birthDate: '1985-05-15',
                    address: 'Rua das Flores, 123',
                    createdAt: new Date('2024-01-15'),
                    status: 'active'
                },
                {
                    id: 'patient-2',
                    name: 'Maria Santos',
                    email: 'maria@email.com',
                    phone: '(11) 88888-8888',
                    birthDate: '1990-08-22',
                    address: 'Av. Principal, 456',
                    createdAt: new Date('2024-02-20'),
                    status: 'active'
                }
            ]
        };
    }

    // Configurar observador de estado de autenticação
    setupAuthStateObserver() {
        if (this.auth && this.auth.onAuthStateChanged) {
            this.auth.onAuthStateChanged((user) => {
                if (user) {
                    console.log('Usuário autenticado:', user.email);
                    this.onAuthStateChanged(user, true);
                } else {
                    console.log('Usuário deslogado');
                    this.onAuthStateChanged(null, false);
                }
            });
        }
    }

    // Callback para mudanças no estado de autenticação
    onAuthStateChanged(user, isAuthenticated) {
        // Atualizar o AuthManager se disponível
        if (window.authManager) {
            if (isAuthenticated && user) {
                window.authManager.currentUser = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName
                };
                window.authManager.isAuthenticated = true;
            } else {
                window.authManager.currentUser = null;
                window.authManager.isAuthenticated = false;
            }
        }

        // Disparar evento personalizado
        const event = new CustomEvent('authStateChanged', {
            detail: { user, isAuthenticated }
        });
        document.dispatchEvent(event);
    }

    // Métodos de autenticação
    async signInWithEmailAndPassword(email, password) {
        if (this.auth && this.isInitialized) {
            try {
                const result = await this.auth.signInWithEmailAndPassword(email, password);
                console.log('Login realizado com sucesso:', result.user.email);
                
                // Log do Analytics
                if (this.analytics) {
                    this.analytics.logEvent('login', {
                        method: 'email'
                    });
                }
                
                return result;
            } catch (error) {
                console.error('Erro no login:', error);
                throw this.handleAuthError(error);
            }
        } else {
            // Modo demo
            return this.demoSignIn(email, password);
        }
    }

    async signInWithGoogle() {
        if (this.auth && this.isInitialized) {
            try {
                console.log('Iniciando login com Google...');
                const provider = new firebase.auth.GoogleAuthProvider();
                
                // Configurar escopos necessários
                provider.addScope('email');
                provider.addScope('profile');
                
                // Configurar parâmetros customizados
                provider.setCustomParameters({
                    'prompt': 'select_account'
                });
                
                console.log('Abrindo popup do Google...');
                const result = await this.auth.signInWithPopup(provider);
                
                console.log('Login com Google realizado:', result.user.email);
                
                // Log do Analytics
                if (this.analytics) {
                    this.analytics.logEvent('login', {
                        method: 'google'
                    });
                }
                
                return result;
            } catch (error) {
                console.error('Erro detalhado no login com Google:', error);
                
                // Tratamento específico para erros de popup
                if (error.code === 'auth/popup-closed-by-user') {
                    throw new Error('Login cancelado. Tente novamente.');
                } else if (error.code === 'auth/popup-blocked') {
                    console.log('Popup bloqueado, tentando redirect...');
                    // Tentar redirect como fallback
                    try {
                        await this.auth.signInWithRedirect(provider);
                        return null; // O resultado virá via getRedirectResult
                    } catch (redirectError) {
                        console.error('Erro no redirect:', redirectError);
                        throw new Error('Popup bloqueado. Permita popups para este site ou tente outro navegador.');
                    }
                }
                
                throw this.handleAuthError(error);
            }
        } else {
            console.log('Firebase não inicializado, usando modo demo para Google...');
            // Modo demo
            return this.demoGoogleSignIn();
        }
    }

    async signOut() {
        if (this.auth && this.isInitialized) {
            try {
                await this.auth.signOut();
                console.log('Logout realizado com sucesso');
                
                // Log do Analytics
                if (this.analytics) {
                    this.analytics.logEvent('logout');
                }
                
                return;
            } catch (error) {
                console.error('Erro no logout:', error);
                throw error;
            }
        } else {
            // Modo demo
            this.onAuthStateChanged(null, false);
            return Promise.resolve();
        }
    }

    async createUserWithEmailAndPassword(email, password, displayName = '') {
        if (this.auth && this.isInitialized) {
            try {
                const result = await this.auth.createUserWithEmailAndPassword(email, password);
                
                // Atualizar perfil do usuário
                if (displayName) {
                    await result.user.updateProfile({
                        displayName: displayName
                    });
                }
                
                console.log('Usuário criado com sucesso:', result.user.email);
                
                // Log do Analytics
                if (this.analytics) {
                    this.analytics.logEvent('sign_up', {
                        method: 'email'
                    });
                }
                
                return result;
            } catch (error) {
                console.error('Erro ao criar usuário:', error);
                throw this.handleAuthError(error);
            }
        } else {
            throw new Error('Firebase não está inicializado');
        }
    }

    async resetPassword(email) {
        if (this.auth && this.isInitialized) {
            try {
                await this.auth.sendPasswordResetEmail(email);
                console.log('E-mail de redefinição enviado para:', email);
                return;
            } catch (error) {
                console.error('Erro ao enviar e-mail de redefinição:', error);
                throw this.handleAuthError(error);
            }
        } else {
            throw new Error('Firebase não está inicializado');
        }
    }

    // Tratar erros de autenticação
    handleAuthError(error) {
        const errorMessages = {
            'auth/user-not-found': 'Usuário não encontrado. Verifique o e-mail.',
            'auth/wrong-password': 'Senha incorreta. Tente novamente.',
            'auth/email-already-in-use': 'Este e-mail já está em uso.',
            'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
            'auth/invalid-email': 'E-mail inválido.',
            'auth/user-disabled': 'Esta conta foi desabilitada.',
            'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
            'auth/network-request-failed': 'Erro de conexão. Verifique sua internet.',
            'auth/popup-closed-by-user': 'Login cancelado pelo usuário.',
            'auth/cancelled-popup-request': 'Solicitação de popup cancelada.',
            'auth/popup-blocked': 'Popup bloqueado. Permita popups para este site.'
        };

        const message = errorMessages[error.code] || 'Erro desconhecido. Tente novamente.';
        return new Error(message);
    }

    // Métodos demo
    demoSignIn(email, password) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const user = this.mockData.users.find(u => u.email === email);
                if (user && password.length >= 6) {
                    this.onAuthStateChanged(user, true);
                    resolve({ user });
                } else {
                    reject(new Error('E-mail ou senha incorretos'));
                }
            }, 1500);
        });
    }

    demoGoogleSignIn() {
        console.log('🎭 Executando login Google em modo demo...');
        return new Promise((resolve) => {
            setTimeout(() => {
                const user = {
                    uid: 'demo-google-user',
                    email: 'usuario@gmail.com',
                    displayName: 'Usuário Google (Demo)',
                    photoURL: 'https://via.placeholder.com/40x40?text=G'
                };
                console.log('🎭 Login Google demo concluído:', user.email);
                this.onAuthStateChanged(user, true);
                resolve({ user });
            }, 2000);
        });
    }

    // Métodos para Firestore
    async addDocument(collection, data) {
        if (this.db && this.isInitialized) {
            try {
                // Adicionar timestamp automaticamente
                const docData = {
                    ...data,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                const docRef = await this.db.collection(collection).add(docData);
                console.log('Documento adicionado com ID:', docRef.id);
                
                // Log do Analytics
                if (this.analytics) {
                    this.analytics.logEvent('document_created', {
                        collection: collection
                    });
                }
                
                return { id: docRef.id, ...docData };
            } catch (error) {
                console.error('Erro ao adicionar documento:', error);
                throw error;
            }
        } else {
            // Modo demo
            console.log('Demo: Adicionando documento em', collection, data);
            return { id: 'demo-' + Date.now(), ...data };
        }
    }

    async getDocuments(collection, orderBy = 'createdAt', limit = null) {
        if (this.db && this.isInitialized) {
            try {
                let query = this.db.collection(collection);
                
                // Aplicar ordenação
                if (orderBy) {
                    query = query.orderBy(orderBy, 'desc');
                }
                
                // Aplicar limite
                if (limit) {
                    query = query.limit(limit);
                }
                
                const snapshot = await query.get();
                const docs = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    // Converter timestamps para Date objects
                    createdAt: doc.data().createdAt?.toDate(),
                    updatedAt: doc.data().updatedAt?.toDate()
                }));
                
                console.log(`${docs.length} documentos obtidos de ${collection}`);
                return docs;
            } catch (error) {
                console.error('Erro ao obter documentos:', error);
                throw error;
            }
        } else {
            // Modo demo
            if (collection === 'patients') {
                return this.mockData.patients;
            }
            return [];
        }
    }

    async getDocument(collection, id) {
        if (this.db && this.isInitialized) {
            try {
                const doc = await this.db.collection(collection).doc(id).get();
                if (doc.exists) {
                    return {
                        id: doc.id,
                        ...doc.data(),
                        createdAt: doc.data().createdAt?.toDate(),
                        updatedAt: doc.data().updatedAt?.toDate()
                    };
                } else {
                    throw new Error('Documento não encontrado');
                }
            } catch (error) {
                console.error('Erro ao obter documento:', error);
                throw error;
            }
        } else {
            // Modo demo
            const mockDoc = this.mockData.patients?.find(p => p.id === id);
            if (mockDoc) {
                return mockDoc;
            }
            throw new Error('Documento não encontrado');
        }
    }

    async updateDocument(collection, id, data) {
        if (this.db && this.isInitialized) {
            try {
                const updateData = {
                    ...data,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                await this.db.collection(collection).doc(id).update(updateData);
                console.log('Documento atualizado:', id);
                
                // Log do Analytics
                if (this.analytics) {
                    this.analytics.logEvent('document_updated', {
                        collection: collection
                    });
                }
                
                return;
            } catch (error) {
                console.error('Erro ao atualizar documento:', error);
                throw error;
            }
        } else {
            // Modo demo
            console.log('Demo: Atualizando documento', id, 'em', collection, data);
            return Promise.resolve();
        }
    }

    async deleteDocument(collection, id) {
        if (this.db && this.isInitialized) {
            try {
                await this.db.collection(collection).doc(id).delete();
                console.log('Documento deletado:', id);
                
                // Log do Analytics
                if (this.analytics) {
                    this.analytics.logEvent('document_deleted', {
                        collection: collection
                    });
                }
                
                return;
            } catch (error) {
                console.error('Erro ao deletar documento:', error);
                throw error;
            }
        } else {
            // Modo demo
            console.log('Demo: Deletando documento', id, 'de', collection);
            return Promise.resolve();
        }
    }

    async queryDocuments(collection, field, operator, value) {
        if (this.db && this.isInitialized) {
            try {
                const snapshot = await this.db.collection(collection)
                    .where(field, operator, value)
                    .get();
                
                const docs = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate(),
                    updatedAt: doc.data().updatedAt?.toDate()
                }));
                
                console.log(`${docs.length} documentos encontrados na consulta`);
                return docs;
            } catch (error) {
                console.error('Erro na consulta:', error);
                throw error;
            }
        } else {
            // Modo demo
            return this.mockData.patients?.filter(p => {
                switch (operator) {
                    case '==':
                        return p[field] === value;
                    case '!=':
                        return p[field] !== value;
                    case '>':
                        return p[field] > value;
                    case '<':
                        return p[field] < value;
                    case '>=':
                        return p[field] >= value;
                    case '<=':
                        return p[field] <= value;
                    case 'array-contains':
                        return p[field]?.includes(value);
                    default:
                        return false;
                }
            }) || [];
        }
    }

    // Escutar mudanças em tempo real
    listenToCollection(collection, callback, orderBy = 'createdAt') {
        if (this.db && this.isInitialized) {
            const unsubscribe = this.db.collection(collection)
                .orderBy(orderBy, 'desc')
                .onSnapshot((snapshot) => {
                    const docs = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                        createdAt: doc.data().createdAt?.toDate(),
                        updatedAt: doc.data().updatedAt?.toDate()
                    }));
                    callback(docs);
                }, (error) => {
                    console.error('Erro no listener:', error);
                });
            
            return unsubscribe;
        } else {
            // Modo demo - simular listener
            callback(this.mockData.patients || []);
            return () => {}; // função vazia para unsubscribe
        }
    }

    // Getter para verificar se está inicializado
    get initialized() {
        return this.isInitialized;
    }

    // Getter para modo demo
    get isDemoMode() {
        return !this.auth || !this.db;
    }
}

// Criar instância global
window.firebaseConfig = new FirebaseConfig();

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    window.firebaseConfig.initialize();
});

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FirebaseConfig;
}