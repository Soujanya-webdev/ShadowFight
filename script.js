       // Global state and chart reference
        let transactions = [];
        let chart = null;

        // DOM elements
        const form = document.getElementById('transactionForm');
        const transactionList = document.getElementById('transactionList');
        const clearAllBtn = document.getElementById('clearAllBtn');

        // Category colors for chart (matching UI)
        const categoryColors = {
            food: '#ff6b35',
            transport: '#4ecdc4',
            entertainment: '#45b7d1',
            shopping: '#f9ca24',
            income: '#2ecc71'
        };

        // Initialize app
        document.addEventListener('DOMContentLoaded', function() {
            loadTransactions();
            initChart();
            renderTransactions();
            updateSummary();
        });

        // Load transactions from localStorage
        function loadTransactions() {
            const saved = localStorage.getItem('transactions');
            if (saved) {
                transactions = JSON.parse(saved);
            }
        }

        // Save transactions to localStorage
        function saveTransactions() {
            localStorage.setItem('transactions', JSON.stringify(transactions));
        }

        // Initialize Chart.js doughnut chart
        function initChart() {
            const ctx = document.getElementById('expenseChart').getContext('2d');
            chart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: [],
                        borderWidth: 3,
                        borderColor: '#000'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                font: {
                                    size: 14,
                                    family: '-apple-system, BlinkMacSystemFont, sans-serif',
                                    weight: 'bold'
                                },
                                padding: 20,
                                usePointStyle: true,
                                pointStyle: 'rect'
                            }
                        }
                    },
                    cutout: '40%'
                }
            });
        }

        // Update chart data
        function updateChart() {
            if (!chart) return;

            // Calculate category totals (only expenses)
            const categoryTotals = {};
            transactions.forEach(t => {
                if (t.type === 'expense') {
                    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + parseFloat(t.amount);
                }
            });

            const labels = Object.keys(categoryTotals);
            const data = Object.values(categoryTotals);
            const colors = labels.map(cat => categoryColors[cat]);

            chart.data.labels = labels;
            chart.data.datasets[0].data = data;
            chart.data.datasets[0].backgroundColor = colors;
            chart.update('none'); // Smooth update without animation
        }

        // Update summary totals
        function updateSummary() {
            const totalIncome = transactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + parseFloat(t.amount), 0);
            
            const totalExpense = transactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + parseFloat(t.amount), 0);
            
            const balance = totalIncome - totalExpense;

            document.getElementById('totalIncome').textContent = `$${totalIncome.toFixed(2)}`;
            document.getElementById('totalExpense').textContent = `$${totalExpense.toFixed(2)}`;
            document.getElementById('balance').textContent = `$${balance.toFixed(2)}`;
        }

        // Render transactions in ledger
        function renderTransactions() {
            if (transactions.length === 0) {
                transactionList.innerHTML = '<div class="text-center py-12 text-lg text-gray-500">No transactions yet. Add one above.</div>';
                return;
            }

            transactionList.innerHTML = transactions.map((transaction, index) => `
                <div class="flex items-center justify-between p-4 border-2 border-black hover:bg-gray-50 transition-all">
                    <div class="flex items-center space-x-4">
                        <div class="w-12 h-12 flex items-center justify-center text-2xl font-bold category-${transaction.category}">
                            ${getCategoryEmoji(transaction.category)}
                        </div>
                        <div>
                            <div class="text-xl font-bold text-black uppercase tracking-wide">${transaction.title}</div>
                            <div class="text-sm font-bold text-gray-600">${transaction.category.toUpperCase()} • ${new Date(transaction.date).toLocaleDateString()}</div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-2xl font-black ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}">
                            ${transaction.type === 'income' ? '+' : '-'}$${parseFloat(transaction.amount).toFixed(2)}
                        </div>
                        <div class="flex gap-2 mt-2">
                            <button onclick="editTransaction(${index})" 
                                    class="px-4 py-1 bg-blue-600 text-white font-bold text-sm uppercase tracking-wide border-2 border-blue-600 hover:bg-blue-700">
                                Edit
                            </button>
                            <button onclick="deleteTransaction(${index})" 
                                    class="px-4 py-1 bg-red-600 text-white font-bold text-sm uppercase tracking-wide border-2 border-red-600 hover:bg-red-700">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // Get emoji for category
        function getCategoryEmoji(category) {
            const emojis = {
                food: '🍽️',
                transport: '🚗',
                entertainment: '🎬',
                shopping: '🛒',
                income: '💰'
            };
            return emojis[category] || '📊';
        }

        // Form submission handler
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const title = document.getElementById('title').value.trim();
            const amount = parseFloat(document.getElementById('amount').value);
            const category = document.getElementById('category').value;
            const type = document.getElementById('type').value;

            // Validation
            if (!title) {
                alert('Title cannot be empty');
                return;
            }
            if (isNaN(amount) || amount <= 0) {
                alert('Please enter a valid amount greater than 0');
                return;
            }

            // Add new transaction
            transactions.unshift({
                id: Date.now(),
                title: title.toUpperCase(),
                amount: amount.toString(),
                category,
                type,
                date: new Date().toISOString()
            });

            saveTransactions();
            form.reset();
            renderTransactions();
            updateSummary();
            updateChart();
        });

        // Delete transaction
        function deleteTransaction(index) {
            if (confirm('Delete this transaction?')) {
                transactions.splice(index, 1);
                saveTransactions();
                renderTransactions();
                updateSummary();
                updateChart();
            }
        }

        // Edit transaction (populate form for editing)
        function editTransaction(index) {
            const transaction = transactions[index];
            document.getElementById('title').value = transaction.title;
            document.getElementById('amount').value = transaction.amount;
            document.getElementById('category').value = transaction.category;
            document.getElementById('type').value = transaction.type;

            // Remove the transaction and let user re-add it
            transactions.splice(index, 1);
            saveTransactions();
            renderTransactions();
            updateSummary();
            updateChart();
        }

        // Clear all transactions
        clearAllBtn.addEventListener('click', function() {
            if (confirm('Delete ALL transactions? This cannot be undone.')) {
                transactions = [];
                saveTransactions();
                renderTransactions();
                updateSummary();
                updateChart();
            }
        });
