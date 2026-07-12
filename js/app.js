(function () {
  const state = () => DataService.getState();
  let filters = { search: '', type: 'all', category: 'all' };

  async function init() {
    dataLayerInit();
    bindEvents();
    await DataService.initialize();
    DataService.processRecurringExpenses();
    render();
  }

  function dataLayerInit() {
    const currentSettings = DataService.getSettings();
    document.body.dataset.theme = currentSettings.theme || 'light';
    updateThemeButton();
  }

  function bindEvents() {
    document.querySelectorAll('.nav-link, .mobile-nav-link').forEach((button) => {
      button.addEventListener('click', () => {
        UI.setActivePage(button.dataset.page);
      });
    });

    document.getElementById('openTransactionModal').addEventListener('click', UI.openModal);
    document.getElementById('fabAdd').addEventListener('click', UI.openModal);
    document.getElementById('closeModalBtn').addEventListener('click', UI.closeModal);
    document.getElementById('transactionModal').addEventListener('click', (event) => {
      if (event.target.id === 'transactionModal') UI.closeModal();
    });

    document.getElementById('transactionForm').addEventListener('submit', handleTransactionSubmit);
    document.getElementById('incomeForm').addEventListener('submit', handleIncomeSubmit);
    document.getElementById('goalForm').addEventListener('submit', handleGoalSubmit);
    document.getElementById('settingsForm').addEventListener('submit', handleSettingsSubmit);
    document.getElementById('categoryForm').addEventListener('submit', handleCategorySubmit);
    document.getElementById('clearDataBtn').addEventListener('click', handleClearData);
    document.getElementById('exportCsvBtn').addEventListener('click', exportCsv);

    document.getElementById('searchInput').addEventListener('input', (event) => {
      filters.search = event.target.value;
      renderTransactions();
    });

    document.getElementById('typeFilter').addEventListener('change', (event) => {
      filters.type = event.target.value;
      renderTransactions();
    });

    document.getElementById('categoryFilter').addEventListener('change', (event) => {
      filters.category = event.target.value;
      renderTransactions();
    });

    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.addEventListener('click', handleActionClick);
  }

  function handleActionClick(event) {
    const target = event.target.closest('button[data-action]');
    if (!target) return;
    const action = target.dataset.action;
    if (action === 'edit-transaction') {
      editTransaction(target.dataset.id);
    } else if (action === 'delete-transaction') {
      deleteTransaction(target.dataset.id);
    } else if (action === 'save-budget') {
      saveBudget(target.dataset.category);
    } else if (action === 'contribute-goal') {
      contributeGoal(target.dataset.id);
    } else if (action === 'delete-goal') {
      deleteGoal(target.dataset.id);
    } else if (action === 'delete-category') {
      deleteCustomCategory(target.dataset.category);
    }
  }

  function handleTransactionSubmit(event) {
    event.preventDefault();
    const payload = {
      type: 'expense',
      amount: Number(document.getElementById('transactionAmount').value),
      categoryId: document.getElementById('transactionCategory').value,
      date: getTodayDate(),
      note: 'مصروف سريع',
      paymentMethod: document.getElementById('transactionPayment').value,
      recurring: { enabled: false, frequency: 'monthly', lastGenerated: getTodayDate() }
    };

    if (!payload.amount || payload.amount <= 0) {
      UI.showToast('الرجاء إدخال مبلغ صحيح');
      return;
    }

    DataService.addTransaction(payload);
    UI.showToast('تم إضافة المصروف');
    UI.closeModal();
    render();
  }

  function handleIncomeSubmit(event) {
    event.preventDefault();
    const payload = {
      type: 'income',
      amount: Number(document.getElementById('incomeAmount').value),
      categoryId: document.getElementById('incomeCategory').value,
      date: getTodayDate(),
      note: 'دخل سريع',
      paymentMethod: document.getElementById('incomePayment').value,
      recurring: { enabled: false, frequency: 'monthly', lastGenerated: getTodayDate() }
    };

    if (!payload.amount || payload.amount <= 0) {
      UI.showToast('الرجاء إدخال مبلغ صحيح');
      return;
    }

    DataService.addTransaction(payload);
    UI.showToast('تم إضافة الدخل');
    event.target.reset();
    render();
  }

  function handleGoalSubmit(event) {
    event.preventDefault();
    const title = document.getElementById('goalTitle').value.trim();
    const targetAmount = Number(document.getElementById('goalTarget').value);
    if (!title || !targetAmount) {
      UI.showToast('يرجى إدخال عنوان وهدف صحيح');
      return;
    }
    DataService.addGoal({ title, targetAmount });
    event.target.reset();
    render();
  }

  function handleSettingsSubmit(event) {
    event.preventDefault();
    const currency = document.getElementById('currencySelect').value;
    const theme = document.getElementById('darkModeToggle').checked ? 'dark' : 'light';
    DataService.updateSettings({ currency, theme });
    document.body.dataset.theme = theme;
    updateThemeButton();
    UI.showToast('تم حفظ الإعدادات');
    render();
  }

  function handleCategorySubmit(event) {
    event.preventDefault();
    const name = document.getElementById('customCategoryName').value.trim();
    const icon = document.getElementById('customCategoryIcon').value.trim();
    const color = document.getElementById('customCategoryColor').value;
    if (!name || !icon) {
      UI.showToast('يرجى إدخال اسم وأيقونة للتصنيف');
      return;
    }
    DataService.addCategory({ id: `custom-${Date.now()}`, name, icon, color, default: false });
    event.target.reset();
    render();
  }

  function deleteCustomCategory(categoryId) {
    const category = state().categories.find((item) => item.id === categoryId);
    if (!category || category.default) return;
    if (!confirm(`هل تريد حذف التصنيف ${category.name}؟`)) return;
    DataService.deleteCategory(categoryId);
    render();
    UI.showToast('تم حذف التصنيف');
  }

  function handleClearData() {
    if (confirm('هل أنت متأكد من حذف كل البيانات؟')) {
      DataService.resetData();
      render();
      UI.showToast('تم حذف جميع البيانات');
    }
  }

  function exportCsv() {
    const transactions = state().transactions;
    const rows = [['التاريخ', 'النوع', 'المبلغ', 'التصنيف', 'ملاحظة']];
    transactions.forEach((tx) => {
      const category = state().categories.find((item) => item.id === tx.categoryId)?.name || '';
      rows.push([tx.date, tx.type, tx.amount, category, tx.note || '']);
    });

    const csvContent = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'transactions.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  function editTransaction(id) {
    const transaction = state().transactions.find((tx) => tx.id === id);
    if (!transaction) return;
    document.getElementById('transactionId').value = transaction.id;
    document.getElementById('transactionType').value = transaction.type;
    document.getElementById('transactionAmount').value = transaction.amount;
    document.getElementById('transactionCategory').value = transaction.categoryId;
    document.getElementById('transactionPayment').value = transaction.paymentMethod || '';
    document.getElementById('modalTitle').textContent = 'تعديل معاملة';
    UI.openModal();
  }

  function deleteTransaction(id) {
    if (confirm('هل تريد حذف هذه المعاملة؟')) {
      DataService.deleteTransaction(id);
      render();
      UI.showToast('تم حذف المعاملة');
    }
  }

  function saveBudget(categoryId) {
    const input = document.getElementById(`budget-${categoryId}`);
    if (!input) return;
    DataService.updateBudget(categoryId, input.value);
    render();
    UI.showToast('تم حفظ الميزانية');
  }

  function contributeGoal(id) {
    const input = document.getElementById(`contrib-${id}`);
    if (!input) return;
    DataService.updateGoalContribution(id, input.value);
    render();
    UI.showToast('تم إضافة المساهمة');
  }

  function deleteGoal(id) {
    if (confirm('هل تريد حذف الهدف؟')) {
      DataService.deleteGoal(id);
      render();
      UI.showToast('تم حذف الهدف');
    }
  }

  function renderTransactions() {
    const currentState = state();
    const currentSettings = DataService.getSettings();
    UI.renderTransactions(currentState, filters, currentSettings.currency);
    refreshIcons();
  }

  function render() {
    const currentState = state();
    const currentSettings = DataService.getSettings();
    document.body.dataset.theme = currentSettings.theme || 'light';
    updateThemeButton();
    UI.renderDashboard(currentState, currentSettings.currency);
    UI.renderTransactions(currentState, filters, currentSettings.currency);
    UI.renderBudgets(currentState, currentSettings.currency);
    UI.renderGoals(currentState);
    UI.renderSettings(currentState);
    UI.renderInsights(currentState, currentSettings.currency);
    Charts.renderDashboardCharts(currentState, currentSettings.currency);
    populateCategorySelect(currentState);
    refreshIcons();
  }

  function populateCategorySelect(state) {
    const expenseSelect = document.getElementById('transactionCategory');
    const incomeSelect = document.getElementById('incomeCategory');
    const categories = (state.categories || []).filter((category) => !category.default || category.id !== 'other');
    if (expenseSelect) {
      expenseSelect.innerHTML = categories.map((category) => `<option value="${category.id}">${category.name}</option>`).join('');
    }
    if (incomeSelect) {
      incomeSelect.innerHTML = categories.map((category) => `<option value="${category.id}">${category.name}</option>`).join('');
    }
  }

  function updateThemeButton() {
    const button = document.getElementById('themeToggle');
    if (!button) return;
    const isDark = document.body.dataset.theme === 'dark';
    button.innerHTML = `<i data-lucide="${isDark ? 'sun' : 'moon'}"></i><span>${isDark ? 'الوضع النهاري' : 'الوضع الليلي'}</span>`;
    refreshIcons();
  }

  function getTodayDate() {
    return new Date().toISOString().slice(0, 10);
  }

  function refreshIcons() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  function toggleTheme() {
    const nextTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    DataService.updateSettings({ theme: nextTheme });
    document.body.dataset.theme = nextTheme;
    updateThemeButton();
    UI.showToast(nextTheme === 'dark' ? 'تم تفعيل الوضع الليلي' : 'تم تفعيل الوضع النهاري');
    render();
  }

  window.addEventListener('DOMContentLoaded', () => {
    init();
  });
})();
