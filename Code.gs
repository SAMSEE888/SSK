// Code.gs - Google Apps Script for SSKratomYMT
// 1) Set SHEET_ID and SHEET_NAME to your spreadsheet
// 2) Deploy -> New deployment -> Web app, set "Who has access" to "Anyone" (or "Anyone with link")
// 3) Copy the Web App URL into CONFIG.webAppUrl in the client script

const SHEET_ID = '11vhg3yMbHRm53SSEHLsCI3EBXx5_meXVvlRuqhFteaY'; // <-- replace if different
const SHEET_NAME = 'SaleForm';

function _jsonOutput(obj, callback) {
  var json = JSON.stringify(obj);
  if (callback) {
    var text = callback + '(' + json + ')';
    return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    var action = (e.parameter && e.parameter.action) ? e.parameter.action : '';
    if (action === 'getDashboardData') {
      var range = e.parameter.range || 'last30';
      var data = buildDashboardData(range);
      return _jsonOutput(data, e.parameter.callback);
    } else {
      return _jsonOutput({status: 'ok', message: 'SSKratomYMT WebApp ready'}, e.parameter && e.parameter.callback);
    }
  } catch (err) {
    return _jsonOutput({error: err.toString()});
  }
}

function doPost(e) {
  try {
    var contents = e.postData && e.postData.contents ? e.postData.contents : null;
    if (!contents) return _jsonOutput({error: 'No post data received'});
    var payload = JSON.parse(contents);
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    // Ensure header row
    var headers = ['timestamp','date','sold','pending','cleared','revenue','pipeFee','shareFee','otherFee','saveFee','expense','balance'];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
    }
    var row = [
      new Date(),
      payload.date || '',
      Number(payload.sold || 0),
      Number(payload.pending || 0),
      Number(payload.cleared || 0),
      Number(payload.revenue || 0),
      Number(payload.pipeFee || 0),
      Number(payload.shareFee || 0),
      Number(payload.otherFee || 0),
      Number(payload.saveFee || 0),
      Number(payload.expense || 0),
      Number(payload.balance || 0)
    ];
    sheet.appendRow(row);
    return _jsonOutput({result: 'success'});
  } catch (err) {
    return _jsonOutput({error: err.toString()});
  }
}

// Build dashboard data: KPIs, chartData, historyData
function buildDashboardData(range) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return {error: 'Sheet not found: ' + SHEET_NAME};
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return {kpi:null, chartData:{}, historyData:[]};
  var headers = values[0];
  var rows = values.slice(1).map(r => {
    var obj = {};
    headers.forEach(function(h,i){ obj[h] = r[i]; });
    return obj;
  });
  // convert types
  rows = rows.map(r => {
    return {
      timestamp: r.timestamp instanceof Date ? r.timestamp : new Date(r.timestamp),
      date: (r.date || '').toString(),
      sold: Number(r.sold || 0),
      pending: Number(r.pending || 0),
      cleared: Number(r.cleared || 0),
      revenue: Number(r.revenue || 0),
      pipeFee: Number(r.pipeFee || 0),
      shareFee: Number(r.shareFee || 0),
      otherFee: Number(r.otherFee || 0),
      saveFee: Number(r.saveFee || 0),
      expense: Number(r.expense || 0),
      balance: Number(r.balance || 0)
    };
  });
  // filter by date range
  var now = new Date();
  var filtered = rows;
  if (range === 'last7') {
    var since = new Date(now.getTime() - 7*24*60*60*1000);
    filtered = rows.filter(r => new Date(r.timestamp) >= since);
  } else if (range === 'last30') {
    var since = new Date(now.getTime() - 30*24*60*60*1000);
    filtered = rows.filter(r => new Date(r.timestamp) >= since);
  }
  // KPIs
  var totalSold = filtered.reduce((s,r)=>s + (r.sold||0), 0);
  var totalRevenue = filtered.reduce((s,r)=>s + (r.revenue||0), 0);
  var totalExpense = filtered.reduce((s,r)=>s + (r.expense||0), 0);
  var totalProfit = totalRevenue - totalExpense;
  var latestBalance = rows.length ? rows[rows.length-1].balance : 0;
  var kpi = {sold: totalSold, revenue: totalRevenue, profit: totalProfit, balance: latestBalance};
  // chartData - last 6 months by month label
  var chartPeriods = [];
  var revenueData = [], profitData = [], salesData = [];
  for (var m=5; m>=0; m--) {
    var d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    var label = Utilities.formatDate(d, Session.getScriptTimeZone(), 'MMM yyyy');
    chartPeriods.push(label);
    // sum for month
    var start = new Date(d.getFullYear(), d.getMonth(), 1);
    var end = new Date(d.getFullYear(), d.getMonth()+1, 1);
    var monthRows = rows.filter(r => r.timestamp >= start && r.timestamp < end);
    var monthRevenue = monthRows.reduce((s,r)=>s + (r.revenue||0), 0);
    var monthExpense = monthRows.reduce((s,r)=>s + (r.expense||0), 0);
    var monthProfit = monthRevenue - monthExpense;
    var monthSold = monthRows.reduce((s,r)=>s + (r.sold||0), 0);
    revenueData.push(monthRevenue);
    profitData.push(monthProfit);
    salesData.push(monthSold);
  }
  var chartData = {
    salesChart: {periods: chartPeriods, currentData: salesData},
    profitChart: {periods: chartPeriods, revenueData: revenueData, profitData: profitData}
  };
  // historyData - last 20 rows (most recent first)
  var hist = rows.slice(-20).reverse().map(r => ({
    date: r.date || Utilities.formatDate(r.timestamp, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    sold: r.sold,
    revenue: r.revenue,
    fees: r.expense,
    profit: r.revenue - r.expense,
    balance: r.balance
  }));
  return {kpi: kpi, chartData: chartData, historyData: hist};
}
