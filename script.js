class GameState {
    constructor() {
        // Initialize state with defaults first (loading state)
        this.xp = { mental: 0, fisico: 0, espiritual: 0 };
        this.coins = 0;
        this.tasks = this.getDefaultTasks();
        this.goals = { mental: [], fisico: [], espiritual: [] };
        this.rewards = this.getDefaultRewards();
        this.challenges = this.getDefaultChallenges();
        this.routines = this.getDefaultRoutines();
        this.englishState = this.getDefaultEnglishState();
        this.spiritualState = this.getDefaultSpiritualState();

        // Initialize Supabase Sync
        this.supabaseSync = null;
        this.initData();
    }

    async initData() {
        // 1. Init Supabase
        if (typeof SupabaseSync !== 'undefined') {
            this.supabaseSync = new SupabaseSync(this);
            await this.supabaseSync.checkSession();
        }

        // 2. Try Load from Cloud
        let cloudData = null;
        if (this.supabaseSync && this.supabaseSync.isAuthenticated()) {
            console.log('☁️ Attempting to load from Supabase...');
            cloudData = await this.supabaseSync.loadFromCloud();
        }

        if (cloudData) {
            console.log('✅ Loaded data from Cloud');
            this.loadFromObject(cloudData.state_data);
        } else {
            // 3. Fallback to LocalStorage
            console.log('📂 Loading from LocalStorage');
            const savedState = localStorage.getItem('crmState');
            if (savedState) {
                const parsed = JSON.parse(savedState);
                // MIGRATION: Check if routines are in old format (numeric keys)
                if (parsed.routines) {
                    const routineKeys = Object.keys(parsed.routines);
                    const isOldFormat = routineKeys.some(k => !isNaN(k));

                    if (isOldFormat) {
                        console.log('🔄 Migrando rutinas del formato antiguo al nuevo...');
                        // Old format detected - migrate to new tri-category structure
                        const oldRoutines = parsed.routines;
                        const newRoutines = this.getDefaultRoutines();

                        // Preserve old physical routines in the fisico category
                        for (let day = 0; day <= 6; day++) {
                            if (oldRoutines[day]) {
                                newRoutines.fisico[day] = {
                                    name: oldRoutines[day].name,
                                    subs: oldRoutines[day].subs || []
                                };
                            }
                        }

                        parsed.routines = newRoutines; // Update parsed object with new routines
                        console.log('✅ Migración completada. Rutinas físicas preservadas, mental y espiritual con valores por defecto.');
                    }
                }
                this.loadFromObject(parsed);
                // If we have local data but no cloud data, and we are logged in -> Upload
                if (this.supabaseSync && this.supabaseSync.isAuthenticated()) {
                    console.log('⬆️ uploading local data to empty cloud');
                    this.save();
                }
            }
        }

        // 4. Render
        this.renderAll();
    }

    // async initSupabaseSync() { // This method is now integrated into initData
    //     // Only initialize if SupabaseSync class is available
    //     if (typeof SupabaseSync !== 'undefined') {
    //         this.supabaseSync = new SupabaseSync(this);
    //         await this.supabaseSync.checkSession();
    //     }
    // }

    getStateObject() {
        // Serialize current state for cloud sync
        return {
            xp: this.xp,
            coins: this.coins,
            tasks: this.tasks,
            goals: this.goals,
            rewards: this.rewards,
            challenges: this.challenges,
            routines: this.routines,
            englishState: this.englishState,
            spiritualState: this.spiritualState,
            lastModified: new Date().toISOString()
        };
    }

    loadFromObject(stateObj) {
        // Load state from cloud data
        this.xp = stateObj.xp || { mental: 0, fisico: 0, espiritual: 0 };
        this.coins = stateObj.coins || 0;
        this.tasks = stateObj.tasks || this.getDefaultTasks();
        this.goals = stateObj.goals || { mental: [], fisico: [], espiritual: [] };
        this.rewards = stateObj.rewards || this.getDefaultRewards();
        this.challenges = stateObj.challenges || this.getDefaultChallenges();
        this.routines = stateObj.routines || this.getDefaultRoutines();
        this.englishState = stateObj.englishState || this.getDefaultEnglishState();
        this.spiritualState = stateObj.spiritualState || this.getDefaultSpiritualState();
    }

    renderAll() {
        // Refresh all UI components
        this.renderGoals();
        this.renderTasks();
        this.renderRewards();
        this.renderChallenges();
        this.renderEnglishSection();
        this.renderSpiritualSection();
        this.renderAnnualGoals();
        this.updateUI();
    }

    getDefaultEnglishState() {
        return {
            currentMonth: 0, // Index 0-11
            weeklyStreak: 0, // Days completed this week (0-7)
            savings: 0, // Accumulated $$
            lastDate: null, // To check for daily reset
            daily: { theory: false, production: false, immersion: false },
            plan: [
                { title: 'Mes 1: Conectores Complejos', desc: 'however, although, despite. Deja "and/but".' },
                { title: 'Mes 2: Tiempos Narrativos', desc: 'Past Continuous, Past Perfect.' },
                { title: 'Mes 3: Verbos Modales', desc: 'Probabilidad y consejo (might, should have).' },
                { title: 'Mes 4: Condicionales 1 & 2', desc: 'Sueños y posibilidades reales.' },
                { title: 'Mes 5: Voz Pasiva', desc: 'Formal y negocios (The process was done...).' },
                { title: 'Mes 6: Phrasal Verbs', desc: 'Top 50 más comunes.' },
                { title: 'Mes 7: Tercer Condicional', desc: 'Arrepentimientos (I would have...).' },
                { title: 'Mes 8: Reported Speech', desc: 'He said that...' },
                { title: 'Mes 9: Gerunds vs Infinitives', desc: 'Going vs To Go.' },
                { title: 'Mes 10: Modales Perfectos', desc: 'Deducción (must have been).' },
                { title: 'Mes 11: Modismos (Idioms)', desc: 'Lenguaje coloquial nativo.' },
                { title: 'Mes 12: Debate y Argumentación', desc: 'Defender puntos de vista complejos.' }
            ]
        };
    }

    getDefaultSpiritualState() {
        return {
            currentMonth: 0,
            weeklyStreak: 0,
            savings: 0,
            lastDate: null,
            daily: { practice: false, study: false, meditation: false },
            plan: [
                { title: 'Mes 1: Geometría Sagrada', desc: 'Semilla de la Vida - Dibujo diario perfecto' },
                { title: 'Mes 2: Tarot y Arquetipos', desc: 'Un Arcano Mayor al día + geometría oculta' },
                { title: 'Mes 3: Limpieza Vibracional', desc: 'Cuenco tibetano + cuarzos antes de dibujar' },
                { title: 'Mes 4: El Péndulo', desc: 'Tableros de respuesta con geometría sagrada' },
                { title: 'Mes 5: Programación de Cuarzos', desc: 'Cargar cristales con frecuencias (cuenco)' },
                { title: 'Mes 6: El Sello Personal', desc: 'Diseñar sigilo personal con círculos' },
                { title: 'Mes 7: Scrying (Espejo)', desc: '5-10 min mirada fija en obsidiana' },
                { title: 'Mes 8: Cubo de Metatrón', desc: 'Figura compleja - protección máxima' },
                { title: 'Mes 9: Sombras', desc: 'Tarot sobre lo visto en el espejo' },
                { title: 'Mes 10: Sólidos Platónicos', desc: 'Un sólido diferente cada semana' },
                { title: 'Mes 11: Geometría en Espejo', desc: 'Visualizar figuras sobre obsidiana' },
                { title: 'Mes 12: Mandala Maestro', desc: 'Integración de toda la simbología del año' }
            ]
        };
    }

    getDefaultRoutines() {
        return {
            fisico: {
                1: { name: 'Fuerza A (Pierna)', subs: ['Sentadilla 4x10', 'Zancadas 3x12', 'Extensiones 3x15', 'Pantorrillas 4x20'] },
                2: { name: 'Fuerza B (Empuje)', subs: ['Press Banca/Flexiones 4x10', 'Press Militar 3x10', 'Laterales 3x15', 'Tríceps 3x12'] },
                3: { name: 'Cardio HIT', subs: ['20 min Bicicleta (Intervalos)', '5 min Salto Cuerda', 'Abdominales 3x20'] },
                4: { name: 'Fuerza C (Tracción)', subs: ['Dominadas/Remo 4x10', 'Remo Mancuerna 3x12', 'Curl Bíceps 3x12', 'Facepull 3x15'] },
                5: { name: 'Cardio Suave', subs: ['45 min Caminata/Bici suave', 'Estiramientos Full Body'] },
                6: { name: 'Fuerza D (Full Body)', subs: ['Peso Muerto 3x10', 'Press Banca 3x10', 'Sentadilla 3x10', 'Plancha 3x1min'] },
                0: { name: 'Descanso Activo', subs: ['Caminata 30 min', 'Yoga/Estiramientos', 'Meditación Extra'] }
            },
            mental: {
                1: { name: 'Estudio Profundo', subs: ['Leer 30 min', 'Tomar notas', 'Revisar conceptos'] },
                2: { name: 'Práctica Activa', subs: ['Ejercicios del tema', 'Flashcards', 'Quiz'] },
                3: { name: 'Proyecto Personal', subs: ['Trabajar en proyecto', 'Documentar progreso'] },
                4: { name: 'Revisión Semanal', subs: ['Repasar notas', 'Identificar gaps', 'Planear siguiente semana'] },
                5: { name: 'Creatividad', subs: ['Brainstorming', 'Mind mapping', 'Escritura libre'] },
                6: { name: 'Consolidación', subs: ['Resumir aprendizajes', 'Crear conexiones', 'Enseñar a alguien'] },
                0: { name: 'Descanso Mental', subs: ['Lectura ligera', 'Podcast interesante', 'Documental'] }
            },
            espiritual: {
                1: { name: 'Geometría Básica', subs: ['Círculos perfectos', 'Líneas rectas', 'Proporciones'] },
                2: { name: 'Símbolos Sagrados', subs: ['Dibujar símbolo del mes', 'Meditar en él', 'Estudiar significado'] },
                3: { name: 'Energía Sutil', subs: ['Cuenco tibetano', 'Limpieza con cuarzo', 'Respiración consciente'] },
                4: { name: 'Radiestesia', subs: ['Práctica con péndulo', 'Calibrar respuestas', 'Preguntas simples'] },
                5: { name: 'Contemplación', subs: ['Espejo de obsidiana', 'Vela', 'Silencio'] },
                6: { name: 'Integración', subs: ['Dibujo complejo', 'Tarot + geometría', 'Journaling espiritual'] },
                0: { name: 'Descanso Sagrado', subs: ['Paseo en naturaleza', 'Baño ritual', 'Gratitud'] }
            }
        };
    }

    getDefaultTasks() {
        // Initial tasks now with frequency 'daily' by default
        return {
            mental: [
                { id: 'm1', text: 'Leer 10 páginas', xp: 15, completed: false, frequency: 'daily', goalId: null }
            ],
            fisico: [
                { id: 'f1', text: '30 min de ejercicio', xp: 25, completed: false, frequency: 'daily', goalId: null }
            ],
            espiritual: [
                { id: 'e1', text: 'Meditar 10 min', xp: 20, completed: false, frequency: 'daily', goalId: null }
            ]
        };
    }

    getDefaultRewards() {
        return [
            { id: 'r1', name: 'Ver 1 cap de serie', cost: 100 },
            { id: 'r2', name: 'Comprar Snack', cost: 50 },
            { id: 'r3', name: "Libro: 'El Secreto de la Flor de la Vida'", cost: 500 },
            { id: 'r4', name: 'Compás Profesional de Metal', cost: 300 },
            { id: 'r5', name: 'Cuarzo Herkimer de Visión', cost: 400 },
            { id: 'r6', name: 'Diccionario de Símbolos', cost: 250 }
        ];
    }

    save() {
        localStorage.setItem('crmState', JSON.stringify({
            xp: this.xp,
            coins: this.coins,
            tasks: this.tasks,
            goals: this.goals,
            rewards: this.rewards,
            challenges: this.challenges,
            routines: this.routines,
            englishState: this.englishState,
            spiritualState: this.spiritualState
        }));

        // Trigger cloud sync if authenticated
        if (this.supabaseSync?.isAuthenticated()) {
            this.supabaseSync.saveToCloud().catch(err => {
                console.error('Background sync failed:', err);
            });
        }
    }

    addXP(category, amount = 10) {
        if (this.xp.hasOwnProperty(category)) {
            this.xp[category] += amount;
            this.coins += amount;
            this.save();
            this.updateUI();
            this.animateButton(category);
        }
    }

    // --- GOALS LOGIC ---
    addGoal(category, text) {
        const id = 'g' + Date.now();
        this.goals[category].push({ id, text });
        this.save();
        this.renderGoals();
        this.renderTaskForms(); // Update selectors
    }

    editGoal(category, goalId) {
        const goal = this.goals[category].find(g => g.id === goalId);
        if (goal) {
            const newText = prompt("Editar Meta:", goal.text);
            if (newText) {
                goal.text = newText;
                this.save();
                this.renderGoals();
                this.renderTaskForms();
            }
        }
    }

    deleteGoal(category, goalId) {
        if (confirm("¿Borrar meta? (Las tareas vinculadas quedarán sueltas)")) {
            this.goals[category] = this.goals[category].filter(g => g.id !== goalId);
            // Optional: Unlink tasks
            this.tasks[category].forEach(t => {
                if (t.goalId === goalId) t.goalId = null;
            });
            this.save();
            this.renderGoals();
            this.renderTaskForms();
            this.renderTasks();
        }
    }

    // --- TASKS LOGIC ---
    addTask(category, text, frequency = 'daily', goalId = '') {
        const id = 't' + Date.now();
        const xp = frequency === 'weekly' ? 50 : (frequency === 'monthly' ? 100 : 15);

        // HABIT GRID SETUP
        let gridSize = 7; // Daily
        if (frequency === 'weekly') gridSize = 4;
        if (frequency === 'monthly') gridSize = 12;

        this.tasks[category].push({
            id,
            text,
            xp,
            completed: false, // Legacy support, or for "whole task" view
            frequency,
            goalId: goalId || null,
            progress: new Array(gridSize).fill(false),
            cyclesCompleted: 0
        });
        this.save();
        this.renderTasks();
    }

    // New: Toggle specific square in the habit grid
    toggleTaskProgress(category, taskId, index) {
        const task = this.tasks[category].find(t => t.id === taskId);
        if (task && task.progress) {
            // Toggle state
            task.progress[index] = !task.progress[index];

            // Logic: Award/Remove XP based on check
            if (task.progress[index]) {
                this.addXP(category, task.xp); // XP per square
            } else {
                this.xp[category] = Math.max(0, this.xp[category] - task.xp);
                this.coins = Math.max(0, this.coins - task.xp);
                this.updateUI();
            }

            // Check Cycle Completion
            const allCompleted = task.progress.every(val => val === true);
            if (allCompleted) {
                setTimeout(() => {
                    this.archiveCycle(category, taskId);
                }, 300); // Slight delay for visual satisfaction
            } else {
                this.save();
                this.renderTasks();
            }
        }
    }

    editTask(category, taskId) {
        const task = this.tasks[category].find(t => t.id === taskId);
        if (task) {
            const newText = prompt("Editar Tarea:", task.text);
            if (newText) {
                task.text = newText;
                this.save();
                this.renderTasks();
            }
        }
    }

    deleteTask(category, taskId) {
        if (confirm("¿Borrar tarea?")) {
            this.tasks[category] = this.tasks[category].filter(t => t.id !== taskId);
            this.save();
            this.renderTasks();
        }
    }

    // Legacy method for backward compatibility if needed, though UI now uses grid
    toggleTask(category, taskId) {
        // ... kept for fallback or single-check tasks if we kept them ...
    }

    // --- REWARDS LOGIC (Existing) ---
    addReward(name, cost) {
        const id = 'r' + Date.now();
        this.rewards.push({ id, name, cost: parseInt(cost) });
        this.save();
        this.renderRewards();
    }

    editReward(id) {
        const reward = this.rewards.find(r => r.id === id);
        if (!reward) return;
        const newName = prompt("Nuevo nombre:", reward.name);
        const newCost = prompt("Nuevo costo:", reward.cost);
        if (newName && newCost) {
            reward.name = newName;
            reward.cost = parseInt(newCost);
            this.save();
            this.renderRewards();
        }
    }

    deleteReward(id) {
        if (confirm('¿Borrar premio?')) {
            this.rewards = this.rewards.filter(r => r.id !== id);
            this.save();
            this.renderRewards();
        }
    }

    redeemReward(id) {
        const reward = this.rewards.find(r => r.id === id);
        if (reward) {
            if (this.coins >= reward.cost) {
                this.coins -= reward.cost;
                this.save();
                this.updateUI();
                alert(`¡Canjeaste: ${reward.name}! 🎉`);
            } else {
                alert('No tienes suficientes monedas 🪙');
            }
        }
    }

    // --- UI RENDERING ---
    updateUI() {
        document.getElementById('xp-mental').textContent = this.xp.mental;
        document.getElementById('xp-fisico').textContent = this.xp.fisico;
        document.getElementById('xp-espiritual').textContent = this.xp.espiritual;

        // 1. GLOBAL LEVEL CALCULATION
        const totalXP = this.xp.mental + this.xp.fisico + this.xp.espiritual;
        const currentLevel = Math.floor(totalXP / 1000) + 1;
        const xpInLevel = totalXP % 1000;
        const levelProgress = (xpInLevel / 1000) * 100;

        document.getElementById('current-level').textContent = currentLevel;
        document.getElementById('current-xp-total').textContent = xpInLevel;
        document.getElementById('global-level-bar').style.width = `${levelProgress}%`;

        // 2. DASHBOARD RINGS (GOAL COMPLETION)
        ['mental', 'fisico', 'espiritual'].forEach(cat => {
            // Filter tasks that are linked to a Goal (this is our metric for "Goal Progress")
            const goalTasks = this.tasks[cat].filter(t => t.goalId);
            const total = goalTasks.length;
            const completed = goalTasks.filter(t => t.completed || t.cyclesCompleted > 0).length; // Count completed or cycled

            const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

            // SVG Ring Update
            const circle = document.getElementById(`ring-${cat}`);
            const text = document.getElementById(`text-ring-${cat}`);

            if (circle) {
                const radius = circle.r.baseVal.value;
                const circumference = radius * 2 * Math.PI;
                circle.style.strokeDasharray = `${circumference} ${circumference}`;
                const offset = circumference - (pct / 100) * circumference;
                circle.style.strokeDashoffset = offset;
            }
            if (text) text.textContent = `${pct}%`;
        });

        const coinDisplay = document.getElementById('coin-count');
        if (coinDisplay) coinDisplay.textContent = this.coins;
        this.updateRedeemButtons();
    }

    resetProgress() {
        if (confirm("⚠️ ¿ESTÁS SEGURO?\n\nEsto borrará TODO tu progreso:\n- Monedas\n- XP\n- Rachas de Tareas\n- Premios\n\nNo se puede deshacer.")) {
            localStorage.removeItem('crmState');
            location.reload(); // Reload to reset state to defaults
        }
    }

    archiveCycle(category, taskId) {
        const task = this.tasks[category].find(t => t.id === taskId);
        if (task) {
            task.cyclesCompleted = (task.cyclesCompleted || 0) + 1;
            task.progress.fill(false); // Reset grid

            // BONUS LOGIC
            let bonusXP = 0;
            let msg = '';

            if (task.frequency === 'daily') {
                bonusXP = 200;
                msg = '¡RACHA DIARIA COMPLETADA! 🔥 +200 XP';
            } else {
                bonusXP = 500;
                msg = '¡GRAN HITO ALCANZADO! 🏆 +500 XP';
            }

            this.addXP(category, bonusXP);
            this.save();
            this.renderTasks();
            alert(`${msg}\nHas completado este hábito ${task.cyclesCompleted} veces.`);
        }
    }

    updateRedeemButtons() {
        const buttons = document.querySelectorAll('.redeem-btn');
        buttons.forEach(btn => {
            const cost = parseInt(btn.dataset.cost);
            if (this.coins < cost) {
                btn.disabled = true;
                btn.classList.add('disabled');
            } else {
                btn.disabled = false;
                btn.classList.remove('disabled');
            }
        });
    }

    animateButton(category) {
        const btn = document.querySelector(`.btn-${category}`);
        if (btn) {
            btn.style.transform = 'scale(0.95)';
            setTimeout(() => { btn.style.transform = 'translateY(-2px)'; }, 100);
        }
    }

    activateColumn(category) {
        document.querySelectorAll('.task-column').forEach(col => {
            col.classList.remove('active');
            if (col.dataset.category === category) {
                col.classList.add('active');
            }
        });
    }

    renderGoals() {
        ['mental', 'fisico', 'espiritual'].forEach(category => {
            const container = document.getElementById(`goals-${category}`);
            if (!container) return;
            container.innerHTML = '';

            this.goals[category].forEach(goal => {
                const div = document.createElement('div');
                div.className = 'goal-card';
                div.innerHTML = `
                    <span class="goal-text">🎯 ${goal.text}</span>
                    <div class="goal-actions">
                        <button onclick="game.editGoal('${category}', '${goal.id}')">✏️</button>
                        <button onclick="game.deleteGoal('${category}', '${goal.id}')">×</button>
                    </div>
                `;
                container.appendChild(div);
            });
        });
    }

    renderTasks() {
        ['mental', 'fisico', 'espiritual'].forEach(category => {
            const listContainer = document.getElementById(`list-${category}`);
            if (!listContainer) return;
            listContainer.innerHTML = ''; // Prevent duplicates

            // Routine Banner for Physical (or others if we expand)
            if (category === 'fisico') {
                const bannerContainer = document.getElementById('routine-banner-fisico');
                if (bannerContainer) {
                    bannerContainer.innerHTML = ''; // Clear previous

                    const today = new Date().getDay();
                    // Use dynamic routines if available, else fallback
                    const routineName = this.routines && this.routines[today] ? this.routines[today].name : 'Descanso';

                    const banner = document.createElement('div');
                    banner.className = 'routine-banner';
                    banner.innerHTML = `🔥 Hoy toca: <strong>${routineName}</strong>`;
                    bannerContainer.appendChild(banner);
                }
            }

            this.tasks[category].forEach(task => {
                // Ensure proper data structure if loading old tasks
                if (!task.progress) {
                    let size = task.frequency === 'weekly' ? 4 : (task.frequency === 'monthly' ? 12 : 7);
                    task.progress = new Array(size).fill(false);
                }

                // Metadata Labels
                let goalLabel = '';
                if (task.goalId) {
                    const goal = this.goals[category].find(g => g.id === task.goalId);
                    if (goal) goalLabel = `<div class="task-goal-link">↪ ${goal.text}</div>`;
                }
                const cyclesLabel = task.cyclesCompleted > 0 ? `<span class="cycle-badge">🔄 ${task.cyclesCompleted}</span>` : '';

                // Build Grid HTML
                let gridHTML = `<div class="habit-grid">`;
                task.progress.forEach((isDone, idx) => {
                    gridHTML += `
                        <div class="habit-square ${isDone ? 'active' : ''}" 
                             onclick="game.toggleTaskProgress('${category}', '${task.id}', ${idx})">
                        </div>`;
                });
                gridHTML += `</div>`;

                // Build Subtasks HTML
                let subtasksHTML = '';
                if (task.subtasks && task.subtasks.length > 0) {
                    subtasksHTML = `<div class="subtasks-list">`;
                    task.subtasks.forEach((sub, idx) => {
                        subtasksHTML += `
                            <label class="subtask-item">
                                <input type="checkbox" ${sub.done ? 'checked' : ''} 
                                       onclick="game.toggleSubtask('${category}', '${task.id}', ${idx})">
                                <span class="${sub.done ? 'done' : ''}">${sub.text}</span>
                            </label>
                        `;
                    });
                    subtasksHTML += `</div>`;
                }

                const li = document.createElement('li');
                li.className = `task-item`;

                // Disable main interaction if subtasks exist
                const mainPointerEvents = (task.subtasks && task.subtasks.length > 0) ? 'none' : 'auto';

                li.innerHTML = `
                    <div class="task-content">
                        <div class="task-header">
                            <span class="task-text">${task.text}</span>
                            <div class="task-meta">
                                ${cyclesLabel}
                                <span class="freq-badge ${task.frequency}">${this.getFreqLabel(task.frequency)}</span>
                                <span class="xp-badge">+${task.xp} XP</span>
                            </div>
                        </div>
                        ${goalLabel}
                        ${subtasksHTML}
                        <!-- HABIT GRID UI -->
                        <div style="pointer-events: ${mainPointerEvents}; opacity: ${mainPointerEvents === 'none' ? '0.8' : '1'}">
                            ${gridHTML}
                        </div>
                    </div>
                    <div class="item-actions">
                        <button onclick="game.editTask('${category}', '${task.id}')">✏️</button>
                        <button onclick="game.deleteTask('${category}', '${task.id}')">×</button>
                    </div>
                `;
                listContainer.appendChild(li);
            });
        });
    }

    toggleSubtask(category, taskId, subIndex) {
        const task = this.tasks[category].find(t => t.id === taskId);
        if (task && task.subtasks) {
            task.subtasks[subIndex].done = !task.subtasks[subIndex].done;
            this.save();
            this.renderTasks();

            // Check if ALL are done
            const allDone = task.subtasks.every(s => s.done);
            // Sync with Today's Grid Square (assuming Daily frequency for now)
            // We need to know "today's index" in the grid. 
            // For simplicity in this demo, let's assume index 0 IS Monday, etc? 
            // Or just use the first unchecked? 
            // A better approach for "Daily" is usually mapping Day of Week to Index or just next empty.
            // Let's use: If allDone is TRUE, ensure the current day's square is Checked.
            // Actually, toggleTaskProgress toggles a specific index. 
            // Let's implement smart "Check Today" logic.

            // SIMPLIFICATION: If all subtasks done, allow the user to check the grid OR auto-check the *next empty* slot.
            if (allDone) {
                // Auto-check next empty slot
                const nextIndex = task.progress.findIndex(p => !p);
                if (nextIndex !== -1) {
                    this.toggleTaskProgress(category, taskId, nextIndex);
                }
            } else {
                // If unchecking a subtask makes it incomplete, should we uncheck the grid?
                // Probably too complex to rollback accurately. Let's keep it additive for now.
            }
        }
    }

    generateDailyWorkout() {
        const today = new Date().getDay();
        const dateStr = new Date().toDateString();

        // Process all three categories
        ['fisico', 'mental', 'espiritual'].forEach(category => {
            const routine = this.routines[category][today];
            if (!routine) return;

            // Rest Day Logic
            if (routine.name === 'Descanso' || routine.name === 'Descanso Activo' || routine.name === 'Descanso Sagrado' || routine.name === 'Descanso Mental') {
                // If it's a rest day, we might want to ensure no old routine tasks linger? 
                // Or maybe just show a "Rest" task?
                // For now, let's NOT generate the daily exercise task.
                // Optionally clear logic if needed, but for now just return prevents creation.
                return;
            }

            const taskId = `daily-${category}-routine`;
            const icon = category === 'mental' ? '🧠' : (category === 'espiritual' ? '✨' : '🏋️');
            const taskText = `${icon} ${routine.name}`;
            const subtasks = routine.subs.map(s => ({ text: s, done: false }));

            let existingTask = this.tasks[category].find(t => t.id === taskId);

            if (!existingTask) {
                this.tasks[category].unshift({
                    id: taskId,
                    text: taskText,
                    xp: 200,
                    frequency: 'daily',
                    goalId: `${category}-routine-goal`,
                    progress: new Array(7).fill(false),
                    cyclesCompleted: 0,
                    subtasks: subtasks,
                    lastUpdate: dateStr
                });
            } else {
                if (existingTask.lastUpdate !== dateStr || existingTask.text !== taskText) {
                    existingTask.text = taskText;
                    existingTask.subtasks = subtasks;
                    existingTask.lastUpdate = dateStr;
                }
            }

            const goalId = `${category}-routine-goal`;
            if (!this.goals[category].find(g => g.id === goalId)) {
                this.goals[category].unshift({
                    id: goalId,
                    text: category === 'fisico' ? 'Reducir Grasa Visceral' :
                        category === 'mental' ? 'Alcanzar Nivel B2' :
                            'El Geómetra Místico'
                });
            }
        });

        this.save();
    }

    // --- ROUTINE CONFIGURATION LOGIC ---

    loadRoutineData(dayIndex) {
        const select = document.getElementById('config-day-select');
        if (select && select.value != dayIndex) select.value = dayIndex;

        // Load all three categories for this day
        ['fisico', 'mental', 'espiritual'].forEach(cat => {
            const routine = this.routines[cat][dayIndex];
            if (!routine) return;

            const titleEl = document.getElementById(`config-title-${cat}`);
            const exercisesEl = document.getElementById(`config-exercises-${cat}`);

            if (titleEl) titleEl.value = routine.name;
            if (exercisesEl) exercisesEl.value = routine.subs.join('\n');
        });
    }

    saveRoutineData() {
        const dayIndex = document.getElementById('config-day-select').value;
        const today = new Date().getDay();

        // Save all three categories
        ['fisico', 'mental', 'espiritual'].forEach(cat => {
            const titleEl = document.getElementById(`config-title-${cat}`);
            const exercisesEl = document.getElementById(`config-exercises-${cat}`);

            if (!titleEl || !exercisesEl) return;

            const subs = exercisesEl.value.split('\n').map(l => l.trim()).filter(l => l.length > 0);

            this.routines[cat][dayIndex] = {
                name: titleEl.value,
                subs: subs
            };
        });

        this.save();
        alert('Rutinas guardadas correctamente.');

        if (parseInt(dayIndex) === today) {
            this.generateDailyWorkout();
            this.renderTasks();
        }
    }

    loadMasterPlan() {
        if (confirm("¿Restaurar las rutinas originales de Fuerza/Bici? Se perderán tus configuraciones personalizadas.")) {
            this.routines = this.getDefaultRoutines();
            this.save();
            this.loadRoutineData(document.getElementById('config-day-select').value);
            // Refresh today if needed
            this.generateDailyWorkout();
            this.renderTasks();
            alert("Plan Maestro restaurado.");
        }
    }

    getFreqLabel(freq) {
        if (freq === 'weekly') return 'Semanal';
        if (freq === 'monthly') return 'Mensual';
        return 'Diaria';
    }

    // --- CHALLENGES LOGIC ---
    getDefaultChallenges() {
        return {
            social: {
                options: ['Llamar a un amigo', 'Organizar una salida', 'Escribir una carta', 'Invitar un café'],
                current: 'Llamar a un amigo',
                completed: false
            },
            savings: {
                options: ['Ahorrar ₡2,000 en una semana', 'Ahorrar ₡10,000 en un mes', 'No gastar hoy', 'Cocinar en casa'],
                current: 'Ahorrar ₡2,000 en una semana',
                completed: false
            }
        };
    }

    addChallengeOption(type, text) {
        this.challenges[type].options.push(text);
        this.save();
        this.renderChallenges();
        alert('Opción añadida al catálogo');
    }

    setActiveChallenge(type, text) {
        this.challenges[type].current = text;
        this.challenges[type].completed = false; // Reset completion when changing
        this.save();
        this.renderChallenges();
    }

    completeChallenge(type) {
        const challenge = this.challenges[type];
        if (!challenge.completed) {
            challenge.completed = true;
            this.addXP('mental', 50); // General XP or specific? Let's split or give general.
            this.addXP('espiritual', 50);
            this.addXP('fisico', 50); // Bonus mix
            this.save();
            this.renderChallenges();
            alert(`¡Desafío "${challenge.current}" Completado! 🎉 +150 XP Globales`);
        }
    }

    renderChallenges() {
        ['social', 'savings'].forEach(type => {
            const container = document.getElementById(`challenge-${type}`);
            if (!container) return;

            const data = this.challenges[type];
            const isDone = data.completed;

            // Header with Config Button
            let html = `
                <div class="challenge-header">
                    <h3>${type === 'social' ? '👥 Social' : '💰 Ahorro'}</h3>
                    <button class="config-btn" onclick="game.promptNewOption('${type}')">⚙️</button>
                </div>
            `;

            // Selector or Completed Text
            if (isDone) {
                html += `<p class="challenge-done">✅ ${data.current} (Completado)</p>`;
            } else {
                html += `
                    <select onchange="game.setActiveChallenge('${type}', this.value)" class="challenge-select">
                        ${data.options.map(opt => `<option value="${opt}" ${opt === data.current ? 'selected' : ''}>${opt}</option>`).join('')}
                    </select>
                `;
            }

            // Action Button
            if (!isDone) {
                html += `<button class="action-btn" onclick="game.completeChallenge('${type}')">Completar (+150 XP)</button>`;
            } else {
                html += `<button class="action-btn disabled" disabled>¡Hecho!</button>`;
            }

            container.innerHTML = html;
        });
    }

    promptNewOption(type) {
        const text = prompt("Nueva opción para este desafío:");
        if (text) this.addChallengeOption(type, text);
    }


    // --- ENGLISH B2 LOGIC ---
    renderEnglishSection() {
        const container = document.getElementById('english-section-content');
        if (!container) return;

        // Daily Reset Logic check
        const today = new Date().toDateString();
        if (this.englishState.lastDate !== today) {
            this.englishState.daily = { theory: false, production: false, immersion: false };
            this.englishState.lastDate = today;
            // Note: We don't reset weeklyStreak here, that happens on completion of 7th day? 
            // Or if they missed a day? For now, let's keep it cumulative (simple streak) or just "days completed".
            // User request: "Al completar todos los checks de una semana" -> implies count 7 completions.
            this.save();
        }

        const state = this.englishState;
        const currentTopic = state.plan[state.currentMonth];
        const progressPct = (state.weeklyStreak / 7) * 100;

        container.innerHTML = `
            <div class="english-card">
                <div class="english-header">
                    <h4>🇬🇧 Ruta al B2</h4>
                    <span class="savings-badge">💰 Ahorro: $${state.savings}</span>
                </div>
                
                <div class="topic-box">
                    <div class="topic-nav">
                        <button onclick="game.changeEnglishMonth(-1)">◀</button>
                        <span class="month-label">${currentTopic.title}</span>
                        <button onclick="game.changeEnglishMonth(1)">▶</button>
                    </div>
                    <p class="topic-desc">${currentTopic.desc}</p>
                </div>

                <div class="english-checklist">
                    <label class="check-item ${state.daily.theory ? 'checked' : ''}">
                        <input type="checkbox" ${state.daily.theory ? 'checked' : ''} onchange="game.toggleEnglishTask('theory')">
                        <span>📖 <strong>Teoría</strong> (15 min)</span>
                    </label>
                    <label class="check-item ${state.daily.production ? 'checked' : ''}">
                        <input type="checkbox" ${state.daily.production ? 'checked' : ''} onchange="game.toggleEnglishTask('production')">
                        <span>✍️ <strong>Producción</strong> (3 oraciones)</span>
                    </label>
                    <label class="check-item ${state.daily.immersion ? 'checked' : ''}">
                        <input type="checkbox" ${state.daily.immersion ? 'checked' : ''} onchange="game.toggleEnglishTask('immersion')">
                        <span>🎧 <strong>Inmersión</strong> (15 min)</span>
                    </label>
                </div>

                <div class="english-progress">
                    <div class="progress-info">
                        <span>Progreso Semanal</span>
                        <span>${state.weeklyStreak}/7 Días</span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width: ${progressPct}%"></div>
                    </div>
                </div>

                <div class="english-actions">
                    <button class="edit-plan-btn" onclick="game.editEnglishPlan()">✏️ Editar Plan</button>
                </div>
            </div>
        `;
    }

    toggleEnglishTask(type) {
        this.englishState.daily[type] = !this.englishState.daily[type];

        // Check if ALL done today
        const d = this.englishState.daily;
        if (d.theory && d.production && d.immersion) {
            // Did we already increment for today? 
            // We need a flag "dayCompleted" to avoid double counting if they toggle back and forth.
            // Simplified: We assume honesty. Or stricly:
            // Let's check "isDayComplete" flag? 
            // For this version: Just save. We will check completion on a separate explicit action OR
            // just count it when they render?
            // BETTER: We check if ALL true right now. If so, and we haven't "claimed" today, we increment.
            // But complex to track "claimed". 
            // Let's just update UI.
        }

        // Check for Daily Completion (All 3 Checked)
        // We'll require user to keep them checked.
        // We increment streak ONLY if it wasn't already incremented today?
        // Let's add a "dailyComplete" boolean to state.

        // Simple Version: Auto-save, UI updates. Creating a robust "Streak" requires tracking "lastStreakDate".
        // Let's add that logic in render or here.

        this.checkEnglishDailyCompletion();
        this.save();
        this.renderEnglishSection();
    }

    checkEnglishDailyCompletion() {
        const d = this.englishState.daily;
        const today = new Date().toDateString();

        if (d.theory && d.production && d.immersion) {
            if (this.englishState.lastStreakDate !== today) {
                this.englishState.weeklyStreak++;
                this.englishState.lastStreakDate = today;
                this.coins += 100; // Universal session bonus
                this.addXP('mental', 50);
                alert("¡Good job! 🇬🇧 Day Completed! +50 XP +100₡");

                if (this.englishState.weeklyStreak >= 7) {
                    this.englishState.savings += 3;
                    this.englishState.weeklyStreak = 0;
                    this.addXP('mental', 300);
                    alert("¡AMAZING! Semana completada. +$3 al Ahorro y +300 XP. 🚀");
                }
            }
        }
    }

    changeEnglishMonth(delta) {
        const len = this.englishState.plan.length;
        this.englishState.currentMonth = (this.englishState.currentMonth + delta + len) % len;
        this.save();
        this.renderEnglishSection();
    }

    editEnglishPlan() {
        const current = this.englishState.plan[this.englishState.currentMonth];
        const newDesc = prompt(`Editar tema: ${current.title}`, current.desc);
        if (newDesc !== null) {
            current.desc = newDesc;
            this.save();
            this.renderEnglishSection();
        }
    }

    // --- SPIRITUAL PLAN LOGIC ---
    renderSpiritualSection() {
        const container = document.getElementById('spiritual-section-content');
        if (!container) return;

        const today = new Date().toDateString();
        if (this.spiritualState.lastDate !== today) {
            this.spiritualState.daily = { practice: false, study: false, meditation: false };
            this.spiritualState.lastDate = today;
            this.save();
        }

        const state = this.spiritualState;
        const currentTopic = state.plan[state.currentMonth];
        const progressPct = (state.weeklyStreak / 7) * 100;

        container.innerHTML = `
            <div class="spiritual-card">
                <div class="spiritual-header">
                    <h4>✨ El Geómetra Místico</h4>
                    <span class="savings-badge">💎 Ahorro: $${state.savings}</span>
                </div>
                
                <div class="topic-box">
                    <div class="topic-nav">
                        <button onclick="game.changeSpiritualMonth(-1)">◀</button>
                        <span class="month-label">${currentTopic.title}</span>
                        <button onclick="game.changeSpiritualMonth(1)">▶</button>
                    </div>
                    <p class="topic-desc">${currentTopic.desc}</p>
                </div>

                <div class="spiritual-checklist">
                    <label class="check-item ${state.daily.practice ? 'checked' : ''}">
                        <input type="checkbox" ${state.daily.practice ? 'checked' : ''} onchange="game.toggleSpiritualTask('practice')">
                        <span>🎨 <strong>Práctica</strong> (Dibujo/Geometría)</span>
                    </label>
                    <label class="check-item ${state.daily.study ? 'checked' : ''}">
                        <input type="checkbox" ${state.daily.study ? 'checked' : ''} onchange="game.toggleSpiritualTask('study')">
                        <span>📖 <strong>Estudio</strong> (Teoría del mes)</span>
                    </label>
                    <label class="check-item ${state.daily.meditation ? 'checked' : ''}">
                        <input type="checkbox" ${state.daily.meditation ? 'checked' : ''} onchange="game.toggleSpiritualTask('meditation')">
                        <span>🧘 <strong>Meditación</strong> (Conexión)</span>
                    </label>
                </div>

                <div class="spiritual-progress">
                    <div class="progress-info">
                        <span>Progreso Semanal</span>
                        <span>${state.weeklyStreak}/7 Días</span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width: ${progressPct}%"></div>
                    </div>
                </div>

                <div class="spiritual-actions">
                    <button class="edit-plan-btn" onclick="game.editSpiritualPlan()">✏️ Editar Plan</button>
                </div>
            </div>
        `;
    }

    toggleSpiritualTask(type) {
        this.spiritualState.daily[type] = !this.spiritualState.daily[type];
        this.checkSpiritualDailyCompletion();
        this.save();
        this.renderSpiritualSection();
    }

    checkSpiritualDailyCompletion() {
        const d = this.spiritualState.daily;
        const today = new Date().toDateString();

        if (d.practice && d.study && d.meditation) {
            if (this.spiritualState.lastStreakDate !== today) {
                this.spiritualState.weeklyStreak++;
                this.spiritualState.lastStreakDate = today;
                this.coins += 100; // Universal session bonus
                this.addXP('espiritual', 50);
                alert("¡Excelente! ✨ Día Completado! +50 XP +100₡");

                if (this.spiritualState.weeklyStreak >= 7) {
                    this.spiritualState.savings += 3;
                    this.spiritualState.weeklyStreak = 0;
                    this.addXP('espiritual', 300);
                    alert("¡MAESTRÍA! Semana completada. +$3 al Ahorro y +300 XP. 🔮");
                }
            }
        }
    }

    changeSpiritualMonth(delta) {
        const len = this.spiritualState.plan.length;
        this.spiritualState.currentMonth = (this.spiritualState.currentMonth + delta + len) % len;
        this.save();
        this.renderSpiritualSection();
    }

    editSpiritualPlan() {
        const current = this.spiritualState.plan[this.spiritualState.currentMonth];
        const newDesc = prompt(`Editar tema: ${current.title}`, current.desc);
        if (newDesc !== null) {
            current.desc = newDesc;
            this.save();
            this.renderSpiritualSection();
        }
    }

    // --- ANNUAL GOALS ---
    renderAnnualGoals() {
        const container = document.getElementById('annual-goals-section');
        if (!container) return;

        const englishMonth = this.englishState.plan[this.englishState.currentMonth].title;
        const spiritualMonth = this.spiritualState.plan[this.spiritualState.currentMonth].title;

        container.innerHTML = `
            <div class="annual-goals-grid">
                <div class="goal-card goal-fisico">
                    <div class="goal-icon">🏋️</div>
                    <h4>Reducir Grasa Visceral</h4>
                    <p>Plan Fuerza + Bici</p>
                </div>
                <div class="goal-card goal-mental">
                    <div class="goal-icon">🇬🇧</div>
                    <h4>Nivel B2 Inglés</h4>
                    <p>${englishMonth}</p>
                </div>
                <div class="goal-card goal-espiritual">
                    <div class="goal-icon">✨</div>
                    <h4>El Geómetra Místico</h4>
                    <p>${spiritualMonth}</p>
                </div>
            </div>
        `;
    }

    // --- VIEW LOGIC ---
    switchView(viewName) {
        // Update Nav
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });

        // Handle Dashboard vs Single Columns
        const grid = document.querySelector('.dashboard-grid');
        const mainHeader = document.querySelector('.main-header');

        if (viewName === 'dashboard') {
            mainHeader.style.display = 'flex';
            document.getElementById('view-dashboard').classList.add('active');

            // Show all columns
            ['mental', 'fisico', 'espiritual'].forEach(cat => {
                const col = document.getElementById(`col-${cat}`);
                if (col) col.style.display = 'flex';
            });
            grid.classList.remove('single-view');
            document.getElementById('view-config-routine').style.display = 'none';

        } else if (viewName === 'config-routine') {
            mainHeader.style.display = 'none';
            document.getElementById('view-dashboard').classList.remove('active');
            document.getElementById('view-config-routine').style.display = 'block';

            // Should initiate loading the current day
            // But verify DOM is ready or just call it:
            const daySelect = document.getElementById('config-day-select');
            if (daySelect) {
                // Default to Today if first load, or just keep default
                const today = new Date().getDay();
                daySelect.value = today;
                this.loadRoutineData(today);
            }

        } else {
            // Specific Category View
            // Hide header to focus
            mainHeader.style.display = 'none';
            document.getElementById('view-dashboard').classList.add('active'); // Re-use main structure
            document.getElementById('view-config-routine').style.display = 'none';
            grid.classList.add('single-view');

            // Hide all cols first, then show selected
            ['mental', 'fisico', 'espiritual'].forEach(cat => {
                const col = document.getElementById(`col-${cat}`);
                if (col) col.style.display = cat === viewName ? 'flex' : 'none';
            });
        }
    }

    redeemReward(id) {
        const reward = this.rewards.find(r => r.id === id);
        if (reward) {
            if (this.coins >= reward.cost) {
                this.coins -= reward.cost;
                this.save();
                this.updateUI();
                alert(`¡Canjeaste: ${reward.name}! 🎉`);
            } else {
                alert('No tienes suficientes colones ₡');
            }
        }
    }

    renderTaskForms() {
        ['mental', 'fisico', 'espiritual'].forEach(category => {
            const select = document.getElementById(`goal-select-${category}`);
            if (!select) return;

            // Save current selection if any
            const currentVal = select.value;

            select.innerHTML = '<option value="">-- Suelta --</option>';
            this.goals[category].forEach(goal => {
                select.innerHTML += `<option value="${goal.id}">${goal.text}</option>`;
            });

            select.value = currentVal;
        });
    }

    renderRewards() {
        const rewardsList = document.getElementById('rewards-list'); // Sidebar list
        if (!rewardsList) return;

        rewardsList.innerHTML = '';
        this.rewards.forEach(reward => {
            const div = document.createElement('div');
            div.className = 'reward-card';
            div.innerHTML = `
                <div class="reward-info">
                    <h4>${reward.name}</h4>
                    <span class="cost">₡ ${reward.cost}</span>
                </div>
                <div class="reward-actions">
                    <button class="redeem-btn" data-cost="${reward.cost}" onclick="game.redeemReward('${reward.id}')">Canjear</button>
                    <button class="edit-btn" onclick="game.editReward('${reward.id}')">✏️</button>
                    <button class="delete-btn" onclick="game.deleteReward('${reward.id}')">🗑️</button>
                </div>
            `;
            rewardsList.appendChild(div);
        });
        this.updateRedeemButtons();
    }
}

const game = new GameState();

document.addEventListener('DOMContentLoaded', () => {
    // Buttons setup - No longer main page buttons, but we have Nav now.
    // Ensure Nav works via HTML onclick attributes or add here if needed.

    // Column headers click (keep ability to "focus" via existing logic, or rely on nav)
    ['mental', 'fisico', 'espiritual'].forEach(cat => {
        // Add Goal Form
        const goalForm = document.getElementById(`form-goal-${cat}`);
        if (goalForm) {
            goalForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const input = goalForm.querySelector('input');
                if (input.value.trim()) {
                    game.addGoal(cat, input.value.trim());
                    input.value = '';
                }
            });
        }

        // Add Task Form
        const taskForm = document.getElementById(`form-task-${cat}`);
        if (taskForm) {
            taskForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const textInput = document.getElementById(`text-task-${cat}`);
                const freqInput = document.getElementById(`freq-task-${cat}`);
                const goalInput = document = document.getElementById(`goal-select-${cat}`);

                if (textInput.value.trim()) {
                    game.addTask(cat, textInput.value.trim(), freqInput.value, goalInput.value);
                    textInput.value = '';
                }
            });
        }
    });

    // Reward Form (Sidebar)
    const addRewardForm = document.getElementById('add-reward-form');
    if (addRewardForm) {
        addRewardForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('reward-name').value;
            const cost = document.getElementById('reward-cost').value;
            if (name && cost) {
                game.addReward(name, cost);
                addRewardForm.reset();
            }
        });
    }

    // Init Logic
    game.switchView('dashboard'); // Default view
    game.generateDailyWorkout(); // Generate workout before rendering
    game.renderGoals();
    game.renderTaskForms();
    game.renderTasks();
    game.renderRewards();
    game.renderChallenges();
    game.renderEnglishSection();
    game.renderSpiritualSection();
    game.renderAnnualGoals();
    game.updateUI();
});
