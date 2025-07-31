// Auth.js - Sistema de autenticação para mentePro
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.init();
    }

    init() {
        // Verificar se existe sessão salva
        this.checkSavedSession();
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Escutar mudanças no estado de autenticação do Firebase
        this.setupFirebaseAuthListener();
    }

    setupFirebaseAuthListener() {
        // Escutar eventos personalizados do Firebase
        document.addEventListener('authStateChanged', (event) => {
            const { user, isAuthenticated } = event.detail;
            
            if (isAuthenticated && user) {
                console.log('Firebase Auth: Usuário logado', user.email);
                this.onLoginSuccess(user);
            } else {
                console.log('Firebase Auth: Usuário deslogado');
                if (this.isAuthenticated) {
                    this.performLogout();
                }
            }
        });

        // Aguardar inicialização do Firebase e configurar listener
        if (window.firebaseConfig) {
            const checkFirebaseReady = setInterval(() => {
                if (window.firebaseConfig.isInitialized && window.firebaseConfig.auth) {
                    clearInterval(checkFirebaseReady);
                    
                    // Verificar se já há um usuário logado
                    const currentUser = window.firebaseConfig.auth.currentUser;
                    if (currentUser && !this.isAuthenticated) {
                        console.log('Firebase: Usuário já estava logado', currentUser.email);
                        this.onLoginSuccess(currentUser);
                    }
                }
            }, 500);
            
            // Timeout de segurança
            setTimeout(() => {
                clearInterval(checkFirebaseReady);
            }, 10000);
        }
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Google login
        const googleLoginBtn = document.getElementById('googleLoginBtn');
        if (googleLoginBtn) {
            googleLoginBtn.addEventListener('click', () => this.handleGoogleLogin());
        }

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Remember me
        const rememberMe = document.getElementById('rememberMe');
        if (rememberMe) {
            rememberMe.checked = localStorage.getItem('mentePro_rememberMe') === 'true';
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('rememberMe').checked;
        
        // Validação básica
        if (!this.validateEmail(email)) {
            this.showAlert('Por favor, insira um e-mail válido.', 'error');
            return;
        }

        if (!password || password.length < 6) {
            this.showAlert('A senha deve ter pelo menos 6 caracteres.', 'error');
            return;
        }

        // Mostrar loading
        this.setLoginLoading(true);

        try {
            // Usar Firebase para autenticação
            let result;
            if (window.firebaseConfig && window.firebaseConfig.isInitialized) {
                result = await window.firebaseConfig.signInWithEmailAndPassword(email, password);
            } else {
                // Fallback para modo demo
                result = await this.authenticateUser(email, password);
            }
            
            // Salvar sessão se necessário
            if (rememberMe) {
                this.saveSession(email);
                localStorage.setItem('mentePro_rememberMe', 'true');
            } else {
                localStorage.removeItem('mentePro_rememberMe');
            }

            // Sucesso
            this.onLoginSuccess(result.user || { email });
            this.showAlert('Login realizado com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro no login:', error);
            this.showAlert(error.message, 'error');
        } finally {
            this.setLoginLoading(false);
        }
    }

    async handleGoogleLogin() {
        try {
            this.showAlert('Redirecionando para o Google...', 'info');
            
            // Usar Firebase para login com Google
            if (window.firebaseConfig && window.firebaseConfig.isInitialized) {
                const result = await window.firebaseConfig.signInWithGoogle();
                this.onLoginSuccess(result.user);
                this.showAlert('Login com Google realizado com sucesso!', 'success');
            } else {
                // Fallback para modo demo
                setTimeout(() => {
                    const email = 'usuario@gmail.com';
                    this.onLoginSuccess({ email });
                    this.showAlert('Login com Google realizado com sucesso! (Demo)', 'success');
                }, 2000);
            }
            
        } catch (error) {
            console.error('Erro no login com Google:', error);
            if (error.message.includes('cancelado') || error.message.includes('popup')) {
                this.showAlert('Login cancelado pelo usuário.', 'info');
            } else {
                this.showAlert('Erro ao fazer login com Google: ' + error.message, 'error');
            }
        }
    }

    async authenticateUser(email, password) {
        // Simular delay de rede
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Validação simples para demo (substituir por Firebase Auth)
        const validUsers = [
            { email: 'admin@mentepro.com', password: '123456' },
            { email: 'doutor@mentepro.com', password: 'doutor123' },
            { email: 'secretaria@mentepro.com', password: 'secretaria123' }
        ];

        const user = validUsers.find(u => u.email === email && u.password === password);
        
        if (!user) {
            throw new Error('E-mail ou senha incorretos.');
        }

        return user;
    }

    onLoginSuccess(user) {
        // Extrair informações do usuário (Firebase ou demo)
        const userData = {
            uid: user.uid || 'demo-uid',
            email: user.email,
            displayName: user.displayName || user.email?.split('@')[0] || 'Usuário',
            photoURL: user.photoURL || null
        };

        this.currentUser = userData;
        this.isAuthenticated = true;
        
        // Atualizar interface
        this.showWelcomeSection();
        this.updateUserInfo(userData);
        
        // Salvar no sessionStorage
        sessionStorage.setItem('mentePro_currentUser', JSON.stringify(userData));

        // Log para analytics (se disponível)
        if (window.firebaseConfig && window.firebaseConfig.analytics) {
            window.firebaseConfig.analytics.logEvent('user_login_success');
        }
    }

    handleLogout() {
        // Usar Firebase para logout
        if (window.firebaseConfig && window.firebaseConfig.isInitialized) {
            window.firebaseConfig.signOut()
                .then(() => {
                    this.performLogout();
                    this.showAlert('Logout realizado com sucesso!', 'info');
                })
                .catch((error) => {
                    console.error('Erro no logout:', error);
                    this.performLogout(); // Fazer logout local mesmo se houver erro
                    this.showAlert('Logout realizado (local).', 'info');
                });
        } else {
            this.performLogout();
            this.showAlert('Logout realizado com sucesso!', 'info');
        }
    }

    performLogout() {
        this.currentUser = null;
        this.isAuthenticated = false;
        
        // Limpar storage
        sessionStorage.removeItem('mentePro_currentUser');
        localStorage.removeItem('mentePro_session');
        
        // Atualizar interface
        this.showLoginSection();
        this.clearUserInfo();
        this.clearForm();
    }

    checkSavedSession() {
        // Verificar sessionStorage primeiro
        const sessionUser = sessionStorage.getItem('mentePro_currentUser');
        if (sessionUser) {
            this.currentUser = JSON.parse(sessionUser);
            this.isAuthenticated = true;
            this.showWelcomeSection();
            this.updateUserInfo(this.currentUser.email);
            return;
        }

        // Verificar localStorage para "lembrar de mim"
        const savedSession = localStorage.getItem('mentePro_session');
        if (savedSession) {
            const session = JSON.parse(savedSession);
            const now = new Date().getTime();
            
            // Verificar se a sessão não expirou (30 dias)
            if (now - session.timestamp < 30 * 24 * 60 * 60 * 1000) {
                this.currentUser = { email: session.email };
                this.isAuthenticated = true;
                this.showWelcomeSection();
                this.updateUserInfo(session.email);
                
                // Preencher e-mail no form
                const emailInput = document.getElementById('email');
                if (emailInput) {
                    emailInput.value = session.email;
                }
            } else {
                // Sessão expirada
                localStorage.removeItem('mentePro_session');
            }
        }
    }

    saveSession(email) {
        const session = {
            email: email,
            timestamp: new Date().getTime()
        };
        localStorage.setItem('mentePro_session', JSON.stringify(session));
    }

    showWelcomeSection() {
        const loginSection = document.getElementById('loginSection');
        const welcomeSection = document.getElementById('welcomeSection');
        
        if (loginSection) loginSection.style.display = 'none';
        if (welcomeSection) welcomeSection.style.display = 'block';
    }

    showLoginSection() {
        const loginSection = document.getElementById('loginSection');
        const welcomeSection = document.getElementById('welcomeSection');
        
        if (loginSection) loginSection.style.display = 'block';
        if (welcomeSection) welcomeSection.style.display = 'none';
    }

    updateUserInfo(userData) {
        const userName = document.getElementById('userName');
        const userInfo = document.getElementById('userInfo');
        
        if (userName) {
            userName.textContent = userData.displayName || userData.email;
        }
        if (userInfo) userInfo.style.display = 'flex';
    }

    clearUserInfo() {
        const userInfo = document.getElementById('userInfo');
        if (userInfo) userInfo.style.display = 'none';
    }

    clearForm() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) loginForm.reset();
    }

    setLoginLoading(loading) {
        const loginBtn = document.getElementById('loginBtn');
        const btnText = loginBtn?.querySelector('.btn-text');
        const btnSpinner = loginBtn?.querySelector('.btn-spinner');
        
        if (loading) {
            if (btnText) btnText.style.display = 'none';
            if (btnSpinner) btnSpinner.style.display = 'inline-block';
            if (loginBtn) loginBtn.disabled = true;
        } else {
            if (btnText) btnText.style.display = 'inline-block';
            if (btnSpinner) btnSpinner.style.display = 'none';
            if (loginBtn) loginBtn.disabled = false;
        }
    }

    showAlert(message, type = 'info') {
        const alertElement = document.getElementById('alertMessage');
        if (!alertElement) return;
        
        alertElement.textContent = message;
        alertElement.className = `alert alert-${type}`;
        alertElement.style.display = 'block';
        
        // Auto-hide após 5 segundos
        setTimeout(() => {
            alertElement.style.display = 'none';
        }, 5000);
    }

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // Método para verificar se o usuário está autenticado
    isUserAuthenticated() {
        return this.isAuthenticated;
    }

    // Método para obter o usuário atual
    getCurrentUser() {
        return this.currentUser;
    }

    // Método para redirecionar usuários não autenticados
    requireAuth() {
        if (!this.isAuthenticated) {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    }
}

// Inicializar o gerenciador de autenticação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});

// Exportar para uso em outras páginas
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}