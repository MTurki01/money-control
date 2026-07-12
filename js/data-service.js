(function () {
  const STORAGE_KEY = 'smart-expense-tracker-v1';
  const FIREBASE_PATH = 'appState';
  const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyDQEAYzt2IKWqNrv1ptpjziY9cpfj1VhCQ',
    authDomain: 'money-control-2da81.firebaseapp.com',
    projectId: 'money-control-2da81',
    storageBucket: 'money-control-2da81.firebasestorage.app',
    messagingSenderId: '68183728252',
    appId: '1:68183728252:web:05e9a0fa73c6ba3732a9f9',
    measurementId: 'G-HGXNWLPP8L',
    databaseURL: 'https://money-control-2da81-default-rtdb.firebaseio.com/'
  };

  let firebaseDb = null;
  let cachedState = null;

  const defaultCategories = [
    { id: 'food', name: 'طعام', icon: 'utensils', color: '#8b7cf6', default: true },
    { id: 'transport', name: 'مواصلات', icon: 'car-front', color: '#7c8db5', default: true },
    { id: 'bills', name: 'فواتير', icon: 'lamp-desk', color: '#b68a4b', default: true },
    { id: 'health', name: 'صحة', icon: 'activity', color: '#5f8f7b', default: true },
    { id: 'entertainment', name: 'ترفيه', icon: 'gamepad-2', color: '#a873b7', default: true },
    { id: 'shopping', name: 'تسوق', icon: 'shopping-bag', color: '#6f84c5', default: true },
    { id: 'education', name: 'تعليم', icon: 'book-open', color: '#5a8db8', default: true },
    { id: 'other', name: 'أخرى', icon: 'file-stack', color: '#7b8a99', default: true }
  ];

  function getSeedDate(monthOffset) {
    const date = new Date();
    date.setMonth(date.getMonth() + monthOffset);
    return date.toISOString().slice(0, 10);
  }

  const defaultState = () => ({
    theme: 'light',
    currency: 'USD',
    categories: defaultCategories,
    budgets: [
      { categoryId: 'food', amount: 500 },
      { categoryId: 'transport', amount: 200 },
      { categoryId: 'bills', amount: 300 },
      { categoryId: 'health', amount: 250 },
      { categoryId: 'entertainment', amount: 180 },
      { categoryId: 'shopping', amount: 220 },
      { categoryId: 'education', amount: 150 },
      { categoryId: 'other', amount: 120 }
    ],
    transactions: [
      { id: crypto.randomUUID(), type: 'expense', amount: 85, categoryId: 'food', date: getSeedDate(0), note: 'غداء عمل', paymentMethod: 'بطاقة', recurring: { enabled: false, frequency: 'monthly', lastGenerated: getSeedDate(0) } },
      { id: crypto.randomUUID(), type: 'income', amount: 2500, categoryId: 'other', date: getSeedDate(0), note: 'راتب', paymentMethod: 'تحويل', recurring: { enabled: false, frequency: 'monthly', lastGenerated: getSeedDate(0) } },
      { id: crypto.randomUUID(), type: 'expense', amount: 120, categoryId: 'transport', date: getSeedDate(-1), note: 'وقود', paymentMethod: 'نقدي', recurring: { enabled: false, frequency: 'monthly', lastGenerated: getSeedDate(-1) } },
      { id: crypto.randomUUID(), type: 'expense', amount: 55, categoryId: 'bills', date: getSeedDate(0), note: 'إنترنت', paymentMethod: 'بطاقة', recurring: { enabled: true, frequency: 'monthly', lastGenerated: getSeedDate(0) } },
      { id: crypto.randomUUID(), type: 'expense', amount: 140, categoryId: 'entertainment', date: getSeedDate(-1), note: 'اشتراك', paymentMethod: 'بطاقة', recurring: { enabled: false, frequency: 'monthly', lastGenerated: getSeedDate(-1) } }
    ],
    goals: [
      { id: crypto.randomUUID(), title: 'شراء لابتوب', targetAmount: 3000, currentAmount: 1200, color: '#6366f1' }
    ]
  });

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeCategoryIcon(icon) {
    const legacyMap = {
      '🍔': 'utensils',
      '🚗': 'car-front',
      '💡': 'lamp-desk',
      '🩺': 'activity',
      '🎮': 'gamepad-2',
      '🛍️': 'shopping-bag',
      '📚': 'book-open',
      '🧾': 'file-stack'
    };
    return legacyMap[icon] || icon;
  }

  function normalizeCategories(categories) {
    return (categories || []).map((category) => ({
      ...category,
      icon: normalizeCategoryIcon(category.icon)
    }));
  }

  function initializeFirebase() {
    if (firebaseDb) return Promise.resolve(firebaseDb);
    if (!window.firebase) return Promise.resolve(null);

    try {
      if (!window.firebase.apps.length) {
        window.firebase.initializeApp(FIREBASE_CONFIG);
      }
      firebaseDb = window.firebase.database();
      return Promise.resolve(firebaseDb);
    } catch (error) {
      console.warn('Firebase init failed', error);
      return Promise.resolve(null);
    }
  }

  function initialize() {
    if (cachedState) {
      return Promise.resolve(clone(cachedState));
    }

    return initializeFirebase().then((db) => {
      if (!db) {
        const fallbackState = getState();
        cachedState = fallbackState;
        return clone(cachedState);
      }

      return db.ref(FIREBASE_PATH).once('value').then((snapshot) => {
        const remoteState = snapshot.val();
        if (remoteState) {
          cachedState = ensureStateShape(remoteState);
          saveState(cachedState);
          return clone(cachedState);
        }

        const initialState = defaultState();
        saveState(initialState);
        return clone(initialState);
      }).catch((error) => {
        console.warn('Firebase load failed, using local fallback', error);
        const fallbackState = getState();
        cachedState = fallbackState;
        return clone(cachedState);
      });
    });
  }

  function getState() {
    if (cachedState) {
      return clone(cachedState);
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initialState = defaultState();
      saveState(initialState);
      return clone(initialState);
    }
    try {
      const parsed = JSON.parse(raw);
      cachedState = ensureStateShape(parsed);
      return clone(cachedState);
    } catch (error) {
      const initialState = defaultState();
      saveState(initialState);
      return clone(initialState);
    }
  }

  function ensureStateShape(state) {
    const base = defaultState();
    const merged = {
      ...base,
      ...state,
      categories: normalizeCategories(state.categories && state.categories.length ? state.categories : base.categories),
      budgets: state.budgets && state.budgets.length ? state.budgets : base.budgets,
      transactions: Array.isArray(state.transactions) ? state.transactions : base.transactions,
      goals: Array.isArray(state.goals) ? state.goals : base.goals
    };
    return merged;
  }

  function saveState(state) {
    const normalizedState = {
      ...state,
      categories: normalizeCategories(state.categories)
    };
    cachedState = normalizedState;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedState));
    if (firebaseDb) {
      firebaseDb.ref(FIREBASE_PATH).set(normalizedState).catch((error) => {
        console.warn('Firebase save failed', error);
      });
    }
    return clone(normalizedState);
  }

  function updateState(mutator) {
    const state = getState();
    const updated = mutator(state);
    saveState(updated);
    return clone(updated);
  }

  function getTransactions() {
    return getState().transactions;
  }

  function addTransaction(transaction) {
    return updateState((state) => {
      state.transactions.unshift({
        id: crypto.randomUUID(),
        ...transaction,
        recurring: transaction.recurring && transaction.recurring.enabled
          ? { enabled: true, frequency: transaction.recurring.frequency || 'monthly', lastGenerated: transaction.date }
          : { enabled: false, frequency: 'monthly', lastGenerated: transaction.date }
      });
      return state;
    });
  }

  function updateTransaction(id, updates) {
    return updateState((state) => {
      state.transactions = state.transactions.map((tx) => (tx.id === id ? { ...tx, ...updates } : tx));
      return state;
    });
  }

  function deleteTransaction(id) {
    return updateState((state) => {
      state.transactions = state.transactions.filter((tx) => tx.id !== id);
      return state;
    });
  }

  function getCategories() {
    return getState().categories;
  }

  function addCategory(category) {
    return updateState((state) => {
      state.categories.push(category);
      if (!state.budgets.some((budget) => budget.categoryId === category.id)) {
        state.budgets.push({ categoryId: category.id, amount: 200 });
      }
      return state;
    });
  }

  function deleteCategory(categoryId) {
    return updateState((state) => {
      state.categories = state.categories.filter((category) => category.id !== categoryId);
      state.budgets = state.budgets.filter((budget) => budget.categoryId !== categoryId);
      state.transactions = state.transactions.filter((transaction) => transaction.categoryId !== categoryId);
      return state;
    });
  }

  function getBudgets() {
    return getState().budgets;
  }

  function updateBudget(categoryId, amount) {
    return updateState((state) => {
      state.budgets = state.budgets.map((budget) => (budget.categoryId === categoryId ? { ...budget, amount: Number(amount) } : budget));
      return state;
    });
  }

  function getGoals() {
    return getState().goals;
  }

  function addGoal(goal) {
    return updateState((state) => {
      state.goals.unshift({ id: crypto.randomUUID(), ...goal, currentAmount: Number(goal.currentAmount || 0) });
      return state;
    });
  }

  function updateGoalContribution(id, contribution) {
    return updateState((state) => {
      state.goals = state.goals.map((goal) => (goal.id === id ? { ...goal, currentAmount: goal.currentAmount + Number(contribution) } : goal));
      return state;
    });
  }

  function deleteGoal(id) {
    return updateState((state) => {
      state.goals = state.goals.filter((goal) => goal.id !== id);
      return state;
    });
  }

  function getSettings() {
    const state = getState();
    return { theme: state.theme, currency: state.currency };
  }

  function updateSettings(settings) {
    return updateState((state) => {
      state.theme = settings.theme || state.theme;
      state.currency = settings.currency || state.currency;
      return state;
    });
  }

  function resetData() {
    const initialState = defaultState();
    saveState(initialState);
    return clone(initialState);
  }

  function formatDate(date) {
    return date.toISOString().slice(0, 10);
  }

  function isRecurringDue(lastGenerated, currentDate, frequency) {
    const last = new Date(lastGenerated);
    const current = new Date(currentDate);
    const diff = current - last;
    const days = frequency === 'weekly' ? 7 : 30;
    return diff >= days * 24 * 60 * 60 * 1000;
  }

  function processRecurringExpenses() {
    const state = getState();
    const today = formatDate(new Date());
    let changed = false;

    state.transactions.forEach((tx) => {
      if (!tx.recurring || !tx.recurring.enabled) return;
      const lastGenerated = tx.recurring.lastGenerated || tx.date;
      if (isRecurringDue(lastGenerated, today, tx.recurring.frequency)) {
        const newTx = {
          ...tx,
          id: crypto.randomUUID(),
          date: today,
          recurring: { ...tx.recurring, lastGenerated: today, enabled: true }
        };
        delete newTx._id;
        state.transactions.unshift(newTx);
        changed = true;
      }
    });

    if (changed) {
      saveState(state);
    }
    return clone(state);
  }

  window.DataService = {
    initialize,
    getState,
    getTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getCategories,
    addCategory,
    deleteCategory,
    getBudgets,
    updateBudget,
    getGoals,
    addGoal,
    updateGoalContribution,
    deleteGoal,
    getSettings,
    updateSettings,
    resetData,
    processRecurringExpenses
  };
})();
