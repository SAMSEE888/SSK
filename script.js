<!-- JavaScript Libraries -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js@3.7.1/dist/chart.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/toastify-js"></script>
    
    <script>
    // Configuration
    const CONFIG = {
        GOOGLE_APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyXJi_QHoMEdfKyoD7epdMFMUAdbNX2D-8E5Er1jm0p7bJU0LcSGjjH5KPhF4khcX2D/exec',
        PRICE_PER_BOTTLE: 40,
        DEFAULT_SHARE_COST: 100,
        DEFAULT_SAVINGS: 500,
        RECORDS_PER_PAGE: 10,
        DAYS_FOR_STATS: 30
    };

    // Main Application Class
    class SSKratomSystem {
        constructor() {
            this.currentPage = 1;
            this.allHistoryData = [];
            this.filteredHistoryData = [];
            this.salesChart = null;
            
            this.initElements();
            this.setupEventListeners();
            this.initializeForm();
            this.setupDateFilters();
            
            if (document.querySelector('.tab.active').dataset.tab === 'history') {
                this.loadHistory();
            } else if (document.querySelector('.tab.active').dataset.tab === 'dashboard') {
                this.loadDashboardData();
            }
        }

        initElements() {
            // Form elements
            this.salesForm = document.getElementById('salesForm');
            this.dateInput = document.getElementById('date');
            this.quantityInput = document.getElementById('quantity');
            this.rawWaterDebtInput = document.getElementById('rawWaterDebt');
            this.debtClearedInput = document.getElementById('debtCleared');
            this.totalIncomeInput = document.getElementById('totalIncome');
            this.pipeCostInput = document.getElementById('pipeCost');
            this.shareCostInput = document.getElementById('shareCost');
            this.savingsInput = document.getElementById('savings');
            this.otherExpensesInput = document.getElementById('otherExpenses');
            this.totalExpensesInput = document.getElementById('totalExpenses');
            this.remainingInput = document.getElementById('remaining');
            
            // Summary elements
            this.summaryIncome = document.getElementById('summaryIncome');
            this.summaryExpenses = document.getElementById('summaryExpenses');
            this.summaryRemaining = document.getElementById('summaryRemaining');
            
            // Buttons
            this.previewBtn = document.getElementById('previewBtn');
            this.clearFormBtn = document.getElementById('clearFormBtn');
            this.confirmSaveBtn = document.getElementById('confirmSaveBtn');
            this.cancelSaveBtn = document.getElementById('cancelSaveBtn');
            
            // History elements
            this.historyTableBody = document.getElementById('historyTableBody');
            this.searchDateInput = document.getElementById('searchDate');
            this.startDateInput = document.getElementById('startDate');
            this.endDateInput = document.getElementById('endDate');
            this.searchBtn = document.getElementById('searchBtn');
            this.refreshHistoryBtn = document.getElementById('refreshHistory');
            this.exportDataBtn = document.getElementById('exportData');
            this.shareDataBtn = document.getElementById('shareData');
            
            // Modals
            this.previewModal = document.getElementById('previewModal');
            this.detailModal = document.getElementById('detailModal');
            this.shareModal = document.getElementById('shareModal');
            this.modalPreviewContent = document.getElementById('modalPreviewContent');
            this.detailModalContent = document.getElementById('detailModalContent');
            this.qrCodeElement = document.getElementById('qrCode');
            this.shareLinkElement = document.getElementById('shareLink');
            this.copyLinkBtn = document.getElementById('copyLinkBtn');
            
            // Dashboard elements
            this.totalSalesElement = document.getElementById('totalSales');
            this.totalBottlesElement = document.getElementById('totalBottles');
            this.totalExpensesStatElement = document.getElementById('totalExpensesStat');
            this.totalProfitElement = document.getElementById('totalProfit');
            this.salesChartCanvas = document.getElementById('salesChart');
            
            // Error groups
            this.dateGroup = document.getElementById('dateGroup');
            this.quantityGroup = document.getElementById('quantityGroup');
        }

        setupEventListeners() {
            // Form calculation events
            [this.quantityInput, this.debtClearedInput, this.pipeCostInput, 
             this.shareCostInput, this.savingsInput, this.otherExpensesInput].forEach(input => {
                input.addEventListener('input', () => this.calculateTotals());
            });
            
            // Form validation
            this.dateInput.addEventListener('blur', () => this.validateDate());
            this.quantityInput.addEventListener('blur', () => this.validateQuantity());
            
            // Button events
            this.previewBtn.addEventListener('click', () => this.showPreview());
            this.clearFormBtn.addEventListener('click', () => this.clearForm());
            this.confirmSaveBtn.addEventListener('click', () => this.saveData());
            this.cancelSaveBtn.addEventListener('click', () => this.closeModal(this.previewModal));
            
            // History events
            this.searchBtn.addEventListener('click', () => this.filterHistory());
            this.refreshHistoryBtn.addEventListener('click', () => this.loadHistory());
            this.exportDataBtn.addEventListener('click', () => this.exportData());
            this.shareDataBtn.addEventListener('click', () => this.showShareModal());
            this.copyLinkBtn.addEventListener('click', () => this.copyShareLink());
            
            // Tab switching
            document.querySelectorAll('.tab').forEach(tab => {
                tab.addEventListener('click', () => this.switchTab(tab));
            });
            
            // Modal close buttons
            document.querySelectorAll('.modal .close').forEach(closeBtn => {
                closeBtn.addEventListener('click', () => {
                    const modal = closeBtn.closest('.modal');
                    this.closeModal(modal);
                });
            });
            
            // Close modal when clicking outside
            document.querySelectorAll('.modal').forEach(modal => {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.closeModal(modal);
                    }
                });
            });
        }

        initializeForm() {
            // Set default date to today
            const today = new Date().toISOString().split('T')[0];
            this.dateInput.value = today;
            
            // Set default values
            this.shareCostInput.value = CONFIG.DEFAULT_SHARE_COST;
            this.savingsInput.value = CONFIG.DEFAULT_SAVINGS;
            
            // Initial calculation
            this.calculateTotals();
        }

        setupDateFilters() {
            const today = new Date().toISOString().split('T')[0];
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            const oneMonthAgoStr = oneMonthAgo.toISOString().split('T')[0];
            
            this.searchDateInput.value = today;
            this.startDateInput.value = oneMonthAgoStr;
            this.endDateInput.value = today;
        }
        
        validateDate() {
            if (!this.dateInput.value) {
                this.dateGroup.classList.add('has-error');
                return false;
            }
            this.dateGroup.classList.remove('has-error');
            return true;
        }
        
        validateQuantity() {
            const value = parseInt(this.quantityInput.value);
            if (isNaN(value) || value < 0) {
                this.quantityGroup.classList.add('has-error');
                return false;
            }
            this.quantityGroup.classList.remove('has-error');
            return true;
        }

        calculateTotals() {
            const quantity = parseInt(this.quantityInput.value) || 0;
            const debtCleared = parseInt(this.debtClearedInput.value) || 0;
            const pipeCost = parseFloat(this.pipeCostInput.value) || 0;
            const shareCost = parseFloat(this.shareCostInput.value) || 0;
            const savings = parseFloat(this.savingsInput.value) || 0;
            const otherExpenses = parseFloat(this.otherExpensesInput.value) || 0;
            
            // Calculate income
            const totalIncome = (quantity + debtCleared) * CONFIG.PRICE_PER_BOTTLE;
            this.totalIncomeInput.value = totalIncome.toFixed(2);
            
            // Calculate expenses
            const totalExpenses = pipeCost + shareCost + savings + otherExpenses;
            this.totalExpensesInput.value = totalExpenses.toFixed(2);
            
            // Calculate remaining
            const remaining = totalIncome - totalExpenses;
            this.remainingInput.value = remaining.toFixed(2);
            
            // Update summary
            this.summaryIncome.textContent = `${totalIncome.toFixed(2)} ฿`;
            this.summaryExpenses.textContent = `${totalExpenses.toFixed(2)} ฿`;
            this.summaryRemaining.textContent = `${remaining.toFixed(2)} ฿`;
        }

        showPreview() {
            // Validate form
            const isDateValid = this.validateDate();
            const isQuantityValid = this.validateQuantity();
            
            if (!isDateValid || !isQuantityValid) {
                this.showToast('กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง', 'error');
                return;
            }
            
            const formData = this.getFormData();
            let previewHTML = `
                <div class="summary-section">
                    <div class="summary-item">
                        <span>วันที่:</span>
                        <span>${formData.date}</span>
                    </div>
                    <div class="summary-item">
                        <span>จำนวนขวดที่ขายได้:</span>
                        <span>${formData.quantity} ขวด</span>
                    </div>
                    <div class="summary-item">
                        <span>ค้างน้ำดิบ:</span>
                        <span>${formData.rawWaterDebt} ขวด</span>
                    </div>
                    <div class="summary-item">
                        <span>เคลียยอดค้าง:</span>
                        <span>${formData.debtCleared} ขวด</span>
                    </div>
                    <div class="summary-item">
                        <span>รวมรายรับ:</span>
                        <span>${formData.totalIncome} ฿</span>
                    </div>
                    <div class="summary-item">
                        <span>ค่าท่อม:</span>
                        <span>${formData.pipeCost} ฿</span>
                    </div>
                    <div class="summary-item">
                        <span>ค่าแชร์:</span>
                        <span>${formData.shareCost} ฿</span>
                    </div>
                    <div class="summary-item">
                        <span>เก็บออม:</span>
                        <span>${formData.savings} ฿</span>
                    </div>
                    <div class="summary-item">
                        <span>ค่าใช้จ่ายอื่น:</span>
                        <span>${formData.otherExpenses} ฿</span>
                    </div>
                    <div class="summary-item summary-total">
                        <span>คงเหลือ:</span>
                        <span>${formData.remaining} ฿</span>
                    </div>
                </div>
            `;
            
            this.modalPreviewContent.innerHTML = previewHTML;
            this.openModal(this.previewModal);
        }

        getFormData() {
            return {
                date: this.dateInput.value,
                quantity: parseInt(this.quantityInput.value) || 0,
                rawWaterDebt: parseInt(this.rawWaterDebtInput.value) || 0,
                debtCleared: parseInt(this.debtClearedInput.value) || 0,
                totalIncome: parseFloat(this.totalIncomeInput.value) || 0,
                pipeCost: parseFloat(this.pipeCostInput.value) || 0,
                shareCost: parseFloat(this.shareCostInput.value) || 0,
                savings: parseFloat(this.savingsInput.value) || 0,
                otherExpenses: parseFloat(this.otherExpensesInput.value) || 0,
                totalExpenses: parseFloat(this.totalExpensesInput.value) || 0,
                remaining: parseFloat(this.remainingInput.value) || 0
            };
        }

        async saveData() {
            const formData = this.getFormData();
            
            try {
                this.showToast('กำลังบันทึกข้อมูล...', 'info');
                
                const response = await fetch(CONFIG.GOOGLE_APPS_SCRIPT_URL, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'save',
                        data: formData
                    }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                
                const result = await response.json();
                
                if (result.success) {
                    this.showToast('บันทึกข้อมูลสำเร็จ', 'success');
                    this.clearForm();
                    this.closeModal(this.previewModal);
                    
                    // Reload history if on history tab
                    if (document.querySelector('.tab.active').dataset.tab === 'history') {
                        this.loadHistory();
                    }
                    
                    // Update dashboard if on dashboard tab
                    if (document.querySelector('.tab.active').dataset.tab === 'dashboard') {
                        this.loadDashboardData();
                    }
                } else {
                    throw new Error(result.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
                }
            } catch (error) {
                console.error('Error saving data:', error);
                this.showToast(`บันทึกข้อมูลไม่สำเร็จ: ${error.message}`, 'error');
            }
        }

        clearForm() {
            this.salesForm.reset();
            this.initializeForm();
            // Clear error states
            this.dateGroup.classList.remove('has-error');
            this.quantityGroup.classList.remove('has-error');
        }

        async loadHistory() {
            try {
                this.showLoading(true);
                
                const response = await fetch(CONFIG.GOOGLE_APPS_SCRIPT_URL + '?action=getHistory');
                
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                
                const data = await response.json();
                
                if (data.success) {
                    this.allHistoryData = data.data;
                    this.filteredHistoryData = [...this.allHistoryData];
                    this.renderHistoryTable();
                } else {
                    throw new Error(data.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
                }
            } catch (error) {
                console.error('Error loading history:', error);
                this.showToast(`โหลดข้อมูลไม่สำเร็จ: ${error.message}`, 'error');
                this.historyTableBody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; color: var(--danger-color);">
                            <i class="fas fa-exclamation-triangle"></i> โหลดข้อมูลไม่สำเร็จ
                        </td>
                    </tr>
                `;
            } finally {
                this.showLoading(false);
            }
        }

        renderHistoryTable(page = 1) {
            this.currentPage = page;
            const startIndex = (page - 1) * CONFIG.RECORDS_PER_PAGE;
            const endIndex = startIndex + CONFIG.RECORDS_PER_PAGE;
            const paginatedData = this.filteredHistoryData.slice(startIndex, endIndex);
            
            if (paginatedData.length === 0) {
                this.historyTableBody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center;">
                            <i class="fas fa-info-circle"></i> ไม่พบข้อมูล
                        </td>
                    </tr>
                `;
                document.getElementById('pagination').innerHTML = '';
                return;
            }
            
            let tableHTML = '';
            paginatedData.forEach((record, index) => {
                const statusClass = record.remaining >= 0 ? 'badge-success' : 'badge-danger';
                const statusText = record.remaining >= 0 ? 'ปกติ' : 'ขาดทุน';
                const statusIcon = record.remaining >= 0 ? 'fa-check' : 'fa-exclamation';
                
                tableHTML += `
                    <tr>
                        <td>${record.date}</td>
                        <td>${record.quantity}</td>
                        <td>${parseFloat(record.totalIncome).toFixed(2)} ฿</td>
                        <td>${parseFloat(record.totalExpenses).toFixed(2)} ฿</td>
                        <td>${parseFloat(record.remaining).toFixed(2)} ฿</td>
                        <td><span class="badge ${statusClass}"><i class="fas ${statusIcon}"></i> ${statusText}</span></td>
                        <td>
                            <button class="btn btn-sm btn-info view-detail" data-id="${record.id}">
                                <i class="fas fa-eye"></i> ดูรายละเอียด
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            this.historyTableBody.innerHTML = tableHTML;
            this.setupPagination();
            
            // Add event listeners to detail buttons
            document.querySelectorAll('.view-detail').forEach(btn => {
                btn.addEventListener('click', () => this.showDetail(btn.dataset.id));
            });
        }

        setupPagination() {
            const totalPages = Math.ceil(this.filteredHistoryData.length / CONFIG.RECORDS_PER_PAGE);
            const paginationContainer = document.getElementById('pagination');
            
            if (totalPages <= 1) {
                paginationContainer.innerHTML = '';
                return;
            }
            
            let paginationHTML = '';
            
            // Previous button
            paginationHTML += `
                <li class="page-item">
                    <a class="page-link ${this.currentPage === 1 ? 'disabled' : ''}" 
                       onclick="app.goToPage(${this.currentPage - 1})">
                        <i class="fas fa-chevron-left"></i>
                    </a>
                </li>
            `;
            
            // Page numbers
            for (let i = 1; i <= totalPages; i++) {
                paginationHTML += `
                    <li class="page-item">
                        <a class="page-link ${this.currentPage === i ? 'active' : ''}" 
                           onclick="app.goToPage(${i})">${i}</a>
                    </li>
                `;
            }
            
            // Next button
            paginationHTML += `
                <li class="page-item">
                    <a class="page-link ${this.currentPage === totalPages ? 'disabled' : ''}" 
                       onclick="app.goToPage(${this.currentPage + 1})">
                        <i class="fas fa-chevron-right"></i>
                    </a>
                </li>
            `;
            
            paginationContainer.innerHTML = paginationHTML;
        }

        goToPage(page) {
            if (page < 1 || page > Math.ceil(this.filteredHistoryData.length / CONFIG.RECORDS_PER_PAGE)) {
                return;
            }
            this.renderHistoryTable(page);
        }

        filterHistory() {
            const searchDate = this.searchDateInput.value;
            const startDate = this.startDateInput.value;
            const endDate = this.endDateInput.value;
            
            if (searchDate) {
                this.filteredHistoryData = this.allHistoryData.filter(record => record.date === searchDate);
            } else if (startDate && endDate) {
                this.filteredHistoryData = this.allHistoryData.filter(record => {
                    return record.date >= startDate && record.date <= endDate;
                });
            } else {
                this.filteredHistoryData = [...this.allHistoryData];
            }
            
            this.renderHistoryTable(1);
        }

        async showDetail(recordId) {
            try {
                const response = await fetch(`${CONFIG.GOOGLE_APPS_SCRIPT_URL}?action=getDetail&id=${recordId}`);
                
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                
                const data = await response.json();
                
                if (data.success) {
                    const record = data.data;
                    let detailHTML = `
                        <div class="summary-section">
                            <div class="summary-item">
                                <span>วันที่:</span>
                                <span>${record.date}</span>
                            </div>
                            <div class="summary-item">
                                <span>จำนวนขวดที่ขายได้:</span>
                                <span>${record.quantity} ขวด</span>
                            </div>
                            <div class="summary-item">
                                <span>ค้างน้ำดิบ:</span>
                                <span>${record.rawWaterDebt} ขวด</span>
                            </div>
                            <div class="summary-item">
                                <span>เคลียยอดค้าง:</span>
                                <span>${record.debtCleared} ขวด</span>
                            </div>
                            <div class="summary-item">
                                <span>รวมรายรับ:</span>
                                <span>${parseFloat(record.totalIncome).toFixed(2)} ฿</span>
                            </div>
                            <div class="summary-item">
                                <span>ค่าท่อม:</span>
                                <span>${parseFloat(record.pipeCost).toFixed(2)} ฿</span>
                            </div>
                            <div class="summary-item">
                                <span>ค่าแชร์:</span>
                                <span>${parseFloat(record.shareCost).toFixed(2)} ฿</span>
                            </div>
                            <div class="summary-item">
                                <span>เก็บออม:</span>
                                <span>${parseFloat(record.savings).toFixed(2)} ฿</span>
                            </div>
                            <div class="summary-item">
                                <span>ค่าใช้จ่ายอื่น:</span>
                                <span>${parseFloat(record.otherExpenses).toFixed(2)} ฿</span>
                            </div>
                            <div class="summary-item summary-total">
                                <span>คงเหลือ:</span>
                                <span>${parseFloat(record.remaining).toFixed(2)} ฿</span>
                            </div>
                        </div>
                    `;
                    
                    this.detailModalContent.innerHTML = detailHTML;
                    this.openModal(this.detailModal);
                } else {
                    throw new Error(data.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
                }
            } catch (error) {
                console.error('Error loading detail:', error);
                this.showToast(`โหลดรายละเอียดไม่สำเร็จ: ${error.message}`, 'error');
            }
        }

        async loadDashboardData() {
            try {
                const response = await fetch(`${CONFIG.GOOGLE_APPS_SCRIPT_URL}?action=getDashboardStats`);
                
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                
                const data = await response.json();
                
                if (data.success) {
                    this.updateDashboardStats(data.data);
                    this.renderSalesChart(data.chartData);
                } else {
                    throw new Error(data.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
                }
            } catch (error) {
                console.error('Error loading dashboard data:', error);
                this.showToast(`โหลดข้อมูลแดชบอร์ดไม่สำเร็จ: ${error.message}`, 'error');
            }
        }

        updateDashboardStats(stats) {
            this.totalSalesElement.textContent = `${parseFloat(stats.totalSales).toFixed(2)} ฿`;
            this.totalBottlesElement.textContent = stats.totalBottles;
            this.totalExpensesStatElement.textContent = `${parseFloat(stats.totalExpenses).toFixed(2)} ฿`;
            this.totalProfitElement.textContent = `${parseFloat(stats.totalProfit).toFixed(2)} ฿`;
        }

        renderSalesChart(chartData) {
            if (this.salesChart) {
                this.salesChart.destroy();
            }
            
            const ctx = this.salesChartCanvas.getContext('2d');
            this.salesChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: chartData.labels,
                    datasets: [
                        {
                            label: 'รายรับ',
                            data: chartData.income,
                            borderColor: '#6c5ce7',
                            backgroundColor: 'rgba(108, 92, 231, 0.1)',
                            tension: 0.3,
                            fill: true
                        },
                        {
                            label: 'รายจ่าย',
                            data: chartData.expenses,
                            borderColor: '#00b894',
                            backgroundColor: 'rgba(0, 184, 148, 0.1)',
                            tension: 0.3,
                            fill: true
                        },
                        {
                            label: 'กำไร',
                            data: chartData.profit,
                            borderColor: '#fdcb6e',
                            backgroundColor: 'rgba(253, 203, 110, 0.1)',
                            tension: 0.3,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                color: '#f5f6fa',
                                font: {
                                    family: 'Kanit'
                                }
                            }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            backgroundColor: 'rgba(45, 52, 54, 0.9)',
                            titleColor: '#f5f6fa',
                            bodyColor: '#dfe6e9',
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                            borderWidth: 1,
                            padding: 12,
                            cornerRadius: 12,
                            displayColors: true,
                            callbacks: {
                                label: function(context) {
                                    return `${context.dataset.label}: ${context.raw.toFixed(2)} ฿`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: '#dfe6e9'
                            }
                        },
                        y: {
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: '#dfe6e9',
                                callback: function(value) {
                                    return value + ' ฿';
                                }
                            }
                        }
                    },
                    interaction: {
                        mode: 'nearest',
                        axis: 'x',
                        intersect: false
                    }
                }
            });
        }

        async exportData() {
            try {
                const response = await fetch(`${CONFIG.GOOGLE_APPS_SCRIPT_URL}?action=exportData`);
                
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                
                const data = await response.json();
                
                if (data.success && data.url) {
                    window.open(data.url, '_blank');
                    this.showToast('ส่งออกข้อมูลสำเร็จ', 'success');
                } else {
                    throw new Error(data.message || 'เกิดข้อผิดพลาดในการส่งออกข้อมูล');
                }
            } catch (error) {
                console.error('Error exporting data:', error);
                this.showToast(`ส่งออกข้อมูลไม่สำเร็จ: ${error.message}`, 'error');
            }
        }

        async showShareModal() {
            try {
                const response = await fetch(`${CONFIG.GOOGLE_APPS_SCRIPT_URL}?action=generateShareLink`);
                
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                
                const data = await response.json();
                
                if (data.success && data.shareId) {
                    const shareUrl = `${window.location.origin}${window.location.pathname}?share=${data.shareId}`;
                    this.shareLinkElement.textContent = shareUrl;
                    
                    // Generate QR code
                    QRCode.toCanvas(this.qrCodeElement, shareUrl, { width: 200 }, (error) => {
                        if (error) {
                            console.error('Error generating QR code:', error);
                            this.qrCodeElement.innerHTML = '<p>ไม่สามารถสร้าง QR Code ได้</p>';
                        }
                    });
                    
                    this.openModal(this.shareModal);
                } else {
                    throw new Error(data.message || 'เกิดข้อผิดพลาดในการสร้างลิงก์แบ่งปัน');
                }
            } catch (error) {
                console.error('Error generating share link:', error);
                this.showToast(`สร้างลิงก์แบ่งปันไม่สำเร็จ: ${error.message}`, 'error');
            }
        }

        copyShareLink() {
            const shareUrl = this.shareLinkElement.textContent;
            navigator.clipboard.writeText(shareUrl)
                .then(() => {
                    this.showToast('คัดลอกลิงก์เรียบร้อยแล้ว', 'success');
                })
                .catch(err => {
                    console.error('Could not copy text: ', err);
                    this.showToast('คัดลอกลิงก์ไม่สำเร็จ', 'error');
                });
        }

        async viewSharedData(shareId) {
            try {
                this.showToast('กำลังโหลดข้อมูลที่แบ่งปัน...', 'info');
                
                const response = await fetch(`${CONFIG.GOOGLE_APPS_SCRIPT_URL}?action=getSharedData&shareId=${shareId}`);
                
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                
                const data = await response.json();
                
                if (data.success) {
                    // Switch to history tab
                    const historyTab = document.querySelector('.tab[data-tab="history"]');
                    this.switchTab(historyTab);
                    
                    // Load the shared data
                    this.allHistoryData = data.data;
                    this.filteredHistoryData = [...this.allHistoryData];
                    this.renderHistoryTable();
                    
                    this.showToast('โหลดข้อมูลที่แบ่งปันสำเร็จ', 'success');
                } else {
                    throw new Error(data.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลที่แบ่งปัน');
                }
            } catch (error) {
                console.error('Error viewing shared data:', error);
                this.showToast(`โหลดข้อมูลที่แบ่งปันไม่สำเร็จ: ${error.message}`, 'error');
            }
        }

        switchTab(tab) {
            // Update active tab
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show corresponding content
            const tabId = tab.dataset.tab;
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${tabId}-tab`).classList.add('active');
            
            // Load data if needed
            if (tabId === 'history') {
                this.loadHistory();
            } else if (tabId === 'dashboard') {
                this.loadDashboardData();
            }
        }

        openModal(modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }

        closeModal(modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }

        showLoading(show) {
            if (show) {
                this.historyTableBody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center;">
                            <div class="spinner"></div>
                            กำลังโหลดข้อมูล...
                        </td>
                    </tr>
                `;
            }
        }

        showToast(message, type = 'info') {
            let backgroundColor = '#6c5ce7';
            
            switch (type) {
                case 'success':
                    backgroundColor = '#00b894';
                    break;
                case 'error':
                    backgroundColor = '#d63031';
                    break;
                case 'warning':
                    backgroundColor = '#fdcb6e';
                    break;
                case 'info':
                default:
                    backgroundColor = '#0984e3';
            }
            
            Toastify({
                text: message,
                duration: 3000,
                close: true,
                gravity: "top",
                position: "right",
                stopOnFocus: true,
                style: {
                    background: backgroundColor,
                    color: '#fff',
                    fontFamily: "'Kanit', sans-serif",
                    borderRadius: "8px",
                    boxShadow: "0 5px 15px rgba(0, 0, 0, 0.3)"
                }
            }).showToast();
        }
    }

    // Initialize the application
    const app = new SSKratomSystem();

    // Make app available globally for HTML onclick handlers
    window.app = app;

    // Check for share parameter in URL
    window.addEventListener('DOMContentLoaded', () => {
        const urlParams = new URLSearchParams(window.location.search);
        const shareId = urlParams.get('share');
        
        if (shareId) {
            // Show shared data
            app.viewSharedData(shareId);
        }
    });
    </script>