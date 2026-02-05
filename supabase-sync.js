/**
 * Supabase Sync Client
 * Handles cloud synchronization of game state
 */

import { SUPABASE_CONFIG } from './supabase-config.js';

class SupabaseSync {
    constructor(gameState) {
        this.gameState = gameState;
        this.supabase = null;
        this.currentUser = null;
        this.isOnline = navigator.onLine;
        this.syncInProgress = false;

        this.initSupabase();
        this.setupListeners();
    }

    initSupabase() {
        if (typeof supabase === 'undefined') {
            console.warn('⚠️ Supabase library not loaded. Cloud sync disabled.');
            return;
        }

        this.supabase = supabase.createClient(
            SUPABASE_CONFIG.url,
            SUPABASE_CONFIG.anonKey
        );

        console.log('✅ Supabase client initialized');
    }

    setupListeners() {
        // Online/offline detection
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateSyncStatus('🔄 Reconnected - syncing...');
            this.syncNow();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateSyncStatus('📴 Offline');
        });

        // Auth state changes
        if (this.supabase) {
            this.supabase.auth.onAuthStateChange((event, session) => {
                if (event === 'SIGNED_IN') {
                    this.currentUser = session.user;
                    this.onSignIn();
                } else if (event === 'SIGNED_OUT') {
                    this.currentUser = null;
                    this.onSignOut();
                }
            });
        }
    }

    async checkSession() {
        if (!this.supabase) return;

        const { data: { session } } = await this.supabase.auth.getSession();
        if (session) {
            this.currentUser = session.user;
            this.updateAuthUI(true);
            this.updateSyncStatus('✅ Synced');

            // Auto-sync on load if authenticated
            await this.syncNow();
        } else {
            this.updateAuthUI(false);
            this.updateSyncStatus('☁️ Offline');
        }
    }

    // ============ AUTHENTICATION ============

    async signUp(email, password) {
        if (!this.supabase) {
            alert('⚠️ Supabase no está configurado');
            return { error: 'Supabase not configured' };
        }

        const { data, error } = await this.supabase.auth.signUp({
            email,
            password
        });

        if (error) {
            console.error('Sign up error:', error);
            alert(`❌ Error: ${error.message}`);
            return { error };
        }

        alert('✅ Cuenta creada! Revisa tu email para confirmar.');
        return { data };
    }

    async signIn(email, password) {
        if (!this.supabase) {
            alert('⚠️ Supabase no está configurado');
            return { error: 'Supabase not configured' };
        }

        this.updateSyncStatus('🔄 Iniciando sesión...');

        const { data, error } = await this.supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            console.error('Sign in error:', error);
            alert(`❌ Error: ${error.message}`);
            this.updateSyncStatus('☁️ Offline');
            return { error };
        }

        return { data };
    }

    async signOut() {
        if (!this.supabase) return;

        const { error } = await this.supabase.auth.signOut();
        if (error) {
            console.error('Sign out error:', error);
        }
    }

    async onSignIn() {
        console.log('✅ Signed in:', this.currentUser.email);
        this.updateAuthUI(true);
        this.updateSyncStatus('🔄 Syncing...');

        // Sync after sign in
        await this.syncNow();
    }

    onSignOut() {
        console.log('👋 Signed out');
        this.updateAuthUI(false);
        this.updateSyncStatus('☁️ Offline');
    }

    isAuthenticated() {
        return !!this.currentUser;
    }

    // ============ CLOUD SYNC ============

    async saveToCloud() {
        if (!this.supabase || !this.currentUser) {
            console.log('📴 Not authenticated - skipping cloud save');
            return;
        }

        if (!this.isOnline) {
            console.log('📴 Offline - will sync when online');
            return;
        }

        if (this.syncInProgress) {
            console.log('⏳ Sync already in progress');
            return;
        }

        try {
            this.syncInProgress = true;
            this.updateSyncStatus('🔄 Uploading...');

            const stateData = this.gameState.getStateObject();

            const { error } = await this.supabase
                .from('game_states')
                .upsert({
                    user_id: this.currentUser.id,
                    state_data: stateData,
                    updated_at: new Date().toISOString(),
                    version: (stateData.version || 0) + 1
                });

            if (error) throw error;

            console.log('✅ Saved to cloud');
            this.updateSyncStatus('✅ Synced');
        } catch (err) {
            console.error('❌ Cloud save error:', err);
            this.updateSyncStatus('⚠️ Sync Error');
        } finally {
            this.syncInProgress = false;
        }
    }

    async loadFromCloud() {
        if (!this.supabase || !this.currentUser) {
            return null;
        }

        try {
            const { data, error } = await this.supabase
                .from('game_states')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // No data found - first time user
                    console.log('📝 No cloud data found - will upload local data');
                    return null;
                }
                throw error;
            }

            return data;
        } catch (err) {
            console.error('❌ Cloud load error:', err);
            return null;
        }
    }

    async syncNow() {
        if (!this.supabase || !this.currentUser || !this.isOnline) {
            console.log('⏭️ Skipping sync - not ready');
            return;
        }

        if (this.syncInProgress) {
            console.log('⏳ Sync already in progress');
            return;
        }

        try {
            this.syncInProgress = true;
            this.updateSyncStatus('🔄 Syncing...');

            const cloudData = await this.loadFromCloud();

            if (!cloudData) {
                // No cloud data - upload local
                console.log('⬆️ First sync - uploading local data');
                await this.saveToCloud();
                return;
            }

            // Compare timestamps for conflict resolution
            const localState = this.gameState.getStateObject();
            const localTime = new Date(localState.lastModified || 0);
            const cloudTime = new Date(cloudData.updated_at);

            console.log('🕐 Local:', localTime, 'Cloud:', cloudTime);

            if (cloudTime > localTime) {
                // Cloud is newer - download
                console.log('⬇️ Cloud data is newer - downloading');
                this.gameState.loadFromObject(cloudData.state_data);
                this.gameState.save(); // Update localStorage
                this.gameState.renderAll(); // Refresh UI
                this.updateSyncStatus('✅ Synced (Downloaded)');
            } else if (localTime > cloudTime) {
                // Local is newer - upload
                console.log('⬆️ Local data is newer - uploading');
                await this.saveToCloud();
            } else {
                // Same - already synced
                console.log('✅ Already in sync');
                this.updateSyncStatus('✅ Synced');
            }
        } catch (err) {
            console.error('❌ Sync error:', err);
            this.updateSyncStatus('⚠️ Sync Error');
        } finally {
            this.syncInProgress = false;
        }
    }

    // ============ UI UPDATES ============

    updateSyncStatus(status) {
        const indicator = document.getElementById('sync-indicator');
        const text = document.getElementById('sync-text');

        if (indicator && text) {
            const parts = status.split(' ');
            indicator.textContent = parts[0];
            text.textContent = parts.slice(1).join(' ');
        }
    }

    updateAuthUI(isAuthenticated) {
        const authForm = document.getElementById('auth-form');
        const authStatus = document.getElementById('auth-status');
        const userEmail = document.getElementById('user-email');
        const authButton = document.getElementById('auth-button');

        if (isAuthenticated && this.currentUser) {
            if (authForm) authForm.style.display = 'none';
            if (authStatus) authStatus.style.display = 'block';
            if (userEmail) userEmail.textContent = this.currentUser.email;
            if (authButton) {
                authButton.textContent = '✅ ' + this.currentUser.email.split('@')[0];
                authButton.classList.add('authenticated');
            }
        } else {
            if (authForm) authForm.style.display = 'block';
            if (authStatus) authStatus.style.display = 'none';
            if (authButton) {
                authButton.textContent = '☁️ Sync';
                authButton.classList.remove('authenticated');
            }
        }
    }
}

// Make available globally
window.SupabaseSync = SupabaseSync;
