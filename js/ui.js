(function () {
  function formatCurrency(amount, currency) {
    const symbols = { USD: '$', EUR: '€', JOD: 'د.ا', SAR: 'ر.س' };
    return `${symbols[currency] || '$'}${Number(amount).toFixed(2)}`;
  }

  function getCategoryById(categories, id) {
    return categories.find((category) => category.id === id) || null;
  }

  function getBudgetForCategory(budgets, categoryId) {
    return budgets.find((budget) => budget.categoryId === categoryId) || { amount: 0 };
  }

  function renderCategoryTitle(category) {
    if (!category) return '<span class="category-pill">غير محدد</span>';
    return `<span class="category-pill"><i data-lucide="${category.icon}" style="width:16px;height:16px"></i>${category.name}</span>`;
  }

  function renderDashboard(state, currency) {
    const monthKey = new Date().toISOString().slice(0, 7);
    const monthTransactions = state.transactions.filter((tx) => tx.date.startsWith(monthKey));
    const income = monthTransactions.filter((tx) => tx.type === 'income').reduce((sum, tx) => sum + Number(tx.amount), 0);
    const expenses = monthTransactions.filter((tx) => tx.type === 'expense').reduce((sum, tx) => sum + Number(tx.amount), 0);
    const balance = income - expenses;
    const totalBudget = (state.budgets || []).reduce((sum, budget) => sum + Number(budget.amount), 0);
    const budgetRatio = totalBudget ? Math.min(100, Math.round((expenses / totalBudget) * 100)) : 0;

    document.getElementById('incomeTotal').textContent = formatCurrency(income, currency);
    document.getElementById('expenseTotal').textContent = formatCurrency(expenses, currency);
    document.getElementById('balanceTotal').textContent = formatCurrency(balance, currency);
    document.getElementById('budgetRatio').textContent = `${budgetRatio}%`;
  }

  function renderTransactions(state, filters, currency) {
    const list = document.getElementById('transactionsList');
    const categoryFilter = document.getElementById('categoryFilter');
    if (!list || !categoryFilter) return;

    const categories = state.categories || [];
    const options = ['<option value="all">الكل</option>', ...categories.map((category) => `<option value="${category.id}" ${filters.category === category.id ? 'selected' : ''}>${category.name}</option>`)].join('');
    categoryFilter.innerHTML = options;

    const filtered = state.transactions.filter((tx) => {
      const matchesSearch = !filters.search || `${tx.note || ''} ${getCategoryById(categories, tx.categoryId)?.name || ''}`.toLowerCase().includes(filters.search.toLowerCase());
      const matchesType = filters.type === 'all' || tx.type === filters.type;
      const matchesCategory = filters.category === 'all' || tx.categoryId === filters.category;
      return matchesSearch && matchesType && matchesCategory;
    });

    list.innerHTML = filtered.length
      ? filtered.map((tx) => {
          const category = getCategoryById(categories, tx.categoryId);
          return `
            <div class="transaction-item">
              <div>
                <div class="transaction-meta">
                  <span class="badge ${tx.type}">${tx.type === 'income' ? 'دخل' : 'مصروف'}</span>
                  ${renderCategoryTitle(category)}
                  <span>${tx.date}</span>
                </div>
                <p style="margin: 8px 0 0; color: var(--text-secondary);">${tx.note || 'بدون ملاحظة'}</p>
              </div>
              <div class="actions">
                <strong>${formatCurrency(tx.amount, currency)}</strong>
                <button class="icon-btn" data-action="edit-transaction" data-id="${tx.id}" type="button"><i data-lucide="pencil-line"></i></button>
                <button class="icon-btn" data-action="delete-transaction" data-id="${tx.id}" type="button"><i data-lucide="trash-2"></i></button>
              </div>
            </div>`;
        }).join('')
      : '<div class="card">لا توجد معاملات لعرضها</div>';
  }

  function renderBudgets(state, currency) {
    const container = document.getElementById('budgetList');
    if (!container) return;
    const categories = state.categories || [];
    const monthKey = new Date().toISOString().slice(0, 7);
    const monthExpenses = state.transactions.filter((tx) => tx.type === 'expense' && tx.date.startsWith(monthKey));

    container.innerHTML = categories.map((category) => {
      const budget = getBudgetForCategory(state.budgets || [], category.id);
      const spent = monthExpenses.filter((tx) => tx.categoryId === category.id).reduce((sum, tx) => sum + Number(tx.amount), 0);
      const ratio = budget.amount ? Math.min(100, Math.round((spent / budget.amount) * 100)) : 0;
      const statusClass = ratio >= 100 ? 'danger' : ratio >= 80 ? 'warning' : '';
      return `
        <div class="budget-item">
          <div>
            <strong>${renderCategoryTitle(category)}</strong>
            <p style="margin: 6px 0 0; color: var(--text-secondary);">تم الإنفاق ${formatCurrency(spent, currency)} من ${formatCurrency(budget.amount, currency)}</p>
            <div class="progress-track">
              <div class="progress-bar ${statusClass}" style="width:${ratio}%"></div>
            </div>
          </div>
          <div class="actions">
            <input type="number" min="1" value="${budget.amount}" id="budget-${category.id}" />
            <button class="secondary-btn" data-action="save-budget" data-category="${category.id}" type="button">حفظ</button>
          </div>
        </div>`;
    }).join('');
  }

  function renderGoals(state) {
    const container = document.getElementById('goalsList');
    if (!container) return;
    container.innerHTML = (state.goals || []).map((goal) => {
      const ratio = goal.targetAmount ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0;
      return `
        <div class="goal-item">
          <div>
            <strong>${goal.title}</strong>
            <p style="margin: 4px 0 0; color: var(--text-secondary);">${goal.currentAmount}/${goal.targetAmount}</p>
            <div class="progress-track">
              <div class="progress-bar" style="width:${ratio}%"></div>
            </div>
          </div>
          <div class="actions">
            <input type="number" min="1" value="10" id="contrib-${goal.id}" />
            <button class="primary-btn" data-action="contribute-goal" data-id="${goal.id}" type="button">إضافة</button>
            <button class="icon-btn" data-action="delete-goal" data-id="${goal.id}" type="button"><i data-lucide="trash-2"></i></button>
          </div>
        </div>`;
    }).join('');
  }

  function renderSettings(state) {
    const currencySelect = document.getElementById('currencySelect');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const categoriesList = document.getElementById('categoriesList');
    if (currencySelect) currencySelect.value = state.currency || 'USD';
    if (darkModeToggle) darkModeToggle.checked = state.theme === 'dark';
    if (categoriesList) {
      categoriesList.innerHTML = (state.categories || []).map((category) => `
        <span class="chip">
          <i data-lucide="${category.icon}" style="width:14px;height:14px"></i>${category.name}
          ${category.default ? '' : `<button class="icon-btn" data-action="delete-category" data-category="${category.id}" type="button"><i data-lucide="trash-2"></i></button>`}
        </span>`).join('');
    }
  }

  function renderInsights(state, currency) {
    const container = document.getElementById('insightsList');
    if (!container) return;
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
    const current = state.transactions.filter((tx) => tx.type === 'expense' && tx.date.startsWith(currentMonth));
    const previous = state.transactions.filter((tx) => tx.type === 'expense' && tx.date.startsWith(prevMonth));
    const currentByCategory = current.reduce((acc, tx) => { acc[tx.categoryId] = (acc[tx.categoryId] || 0) + Number(tx.amount); return acc; }, {});
    const previousByCategory = previous.reduce((acc, tx) => { acc[tx.categoryId] = (acc[tx.categoryId] || 0) + Number(tx.amount); return acc; }, {});

    const topCategoryId = Object.entries(currentByCategory).sort((a, b) => b[1] - a[1])[0]?.[0];
    const category = state.categories.find((item) => item.id === topCategoryId);
    const highest = category ? category.name : 'لا يوجد';
    const dailyAvg = current.length ? current.reduce((sum, tx) => sum + Number(tx.amount), 0) / 30 : 0;

    const insights = [];
    const topPrev = Object.entries(previousByCategory).sort((a, b) => b[1] - a[1])[0];
    const currentTop = Object.entries(currentByCategory).sort((a, b) => b[1] - a[1])[0];
    if (topPrev && currentTop && topPrev[0] === currentTop[0]) {
      const diff = currentTop[1] - topPrev[1];
      const percent = topPrev[1] ? Math.round((diff / topPrev[1]) * 100) : 100;
      insights.push(`أنفقت ${percent > 0 ? 'أكثر' : 'أقل'} من الشهر الماضي بنسبة ${Math.abs(percent)}% في ${category ? category.name : 'هذا التصنيف'}`);
    } else if (currentTop) {
      insights.push(`أعلى تصنيف إنفاقًا هذا الشهر هو ${highest}`);
    }
    insights.push(`متوسط إنفاقك اليومي هو ${formatCurrency(dailyAvg, currency)}`);
    insights.push(`رصيدك الحالي هذا الشهر يساوي ${formatCurrency((current.filter((tx) => tx.type === 'income').reduce((sum, tx) => sum + Number(tx.amount), 0) - current.filter((tx) => tx.type === 'expense').reduce((sum, tx) => sum + Number(tx.amount), 0)), currency)}`);

    container.innerHTML = insights.map((item) => `<div class="insight-item">${item}</div>`).join('');
  }

  function setActivePage(pageId) {
    document.querySelectorAll('.page-section').forEach((section) => section.classList.toggle('active', section.id === pageId));
    document.querySelectorAll('.nav-link, .mobile-nav-link').forEach((button) => button.classList.toggle('active', button.dataset.page === pageId));
    document.getElementById('headerTitle').textContent = pageId === 'dashboard' ? 'لوحة التحكم' : pageId === 'transactions' ? 'المعاملات' : pageId === 'budget' ? 'الميزانية' : pageId === 'goals' ? 'الأهداف' : 'الإعدادات';
  }

  function openModal() {
    document.getElementById('transactionModal').classList.remove('hidden');
  }

  function closeModal() {
    document.getElementById('transactionModal').classList.add('hidden');
    document.getElementById('transactionForm').reset();
    document.getElementById('transactionId').value = '';
  }

  function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = 'position:fixed;left:50%;bottom:20px;transform:translateX(-50%);background:var(--bg-surface);padding:12px 16px;border-radius:999px;box-shadow:var(--shadow);z-index:2000;border:1px solid var(--border);';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1600);
  }

  window.UI = {
    renderDashboard,
    renderTransactions,
    renderBudgets,
    renderGoals,
    renderSettings,
    renderInsights,
    setActivePage,
    openModal,
    closeModal,
    showToast,
    formatCurrency
  };
})();
