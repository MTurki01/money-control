(function () {
  let charts = {};

  function destroyCharts() {
    Object.values(charts).forEach((chart) => chart?.destroy());
    charts = {};
  }

  function getCurrencySymbol(currency) {
    const map = { USD: '$', EUR: '€', JOD: 'د.ا', SAR: 'ر.س' };
    return map[currency] || '$';
  }

  function buildExpenseData(state) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const filtered = state.transactions.filter((tx) => tx.type === 'expense' && tx.date.startsWith(currentMonth));
    const categories = state.categories || [];
    const totals = categories.reduce((acc, category) => {
      acc[category.id] = 0;
      return acc;
    }, {});

    filtered.forEach((tx) => {
      totals[tx.categoryId] = (totals[tx.categoryId] || 0) + Number(tx.amount);
    });

    const labels = categories.filter((c) => totals[c.id] > 0).map((c) => `${c.icon} ${c.name}`);
    const values = categories.filter((c) => totals[c.id] > 0).map((c) => totals[c.id]);
    const colors = categories.filter((c) => totals[c.id] > 0).map((c) => c.color);

    return { labels, values, colors };
  }

  function buildTrendData(state) {
    const months = [];
    const income = [];
    const expenses = [];
    const now = new Date();

    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toISOString().slice(0, 7);
      months.push(date.toLocaleString('ar', { month: 'short' }));
      income.push(state.transactions.filter((tx) => tx.type === 'income' && tx.date.startsWith(monthKey)).reduce((sum, tx) => sum + Number(tx.amount), 0));
      expenses.push(state.transactions.filter((tx) => tx.type === 'expense' && tx.date.startsWith(monthKey)).reduce((sum, tx) => sum + Number(tx.amount), 0));
    }

    return { labels: months, income, expenses };
  }

  function renderDashboardCharts(state, currency) {
    destroyCharts();
    const expenseCanvas = document.getElementById('expenseChart');
    const trendCanvas = document.getElementById('trendChart');
    const expenseData = buildExpenseData(state);
    const trendData = buildTrendData(state);

    if (expenseCanvas) {
      charts.expense = new Chart(expenseCanvas, {
        type: 'doughnut',
        data: {
          labels: expenseData.labels,
          datasets: [{ data: expenseData.values, backgroundColor: expenseData.colors }]
        },
        options: {
          responsive: true,
          plugins: { legend: { position: 'bottom' } }
        }
      });
    }

    if (trendCanvas) {
      charts.trend = new Chart(trendCanvas, {
        type: 'line',
        data: {
          labels: trendData.labels,
          datasets: [
            { label: 'الدخل', data: trendData.income, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.16)', tension: 0.3 },
            { label: 'المصروفات', data: trendData.expenses, borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.16)', tension: 0.3 }
          ]
        },
        options: {
          responsive: true,
          plugins: { legend: { position: 'bottom' } },
          scales: {
            y: {
              ticks: {
                callback: (value) => `${getCurrencySymbol(currency)}${value}`
              }
            }
          }
        }
      });
    }
  }

  window.Charts = { renderDashboardCharts };
})();
