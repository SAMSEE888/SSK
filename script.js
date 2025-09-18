// script.js - main client logic (keep CONFIG.webAppUrl updated)
const CONFIG = {
  webAppUrl: 'https://script.google.com/macros/s/AKfycbwTYfu6Iszyl7WPkUFy0hbFbDejlajS1TTbuQpdwVRTn-rtSASSyAlobNqrmLpKZBAQ/exec', // <-- replace with your deployed Web App URL
  sheetUrl: 'https://docs.google.com/spreadsheets/d/11vhg3yMbHRm53SSEHLsCI3EBXx5_meXVvlRuqhFteaY'
};

const pricePerBottle = 40;
const msg = document.getElementById('msg');
// elements
const sold = document.getElementById('sold');
const pending = document.getElementById('pending');
const cleared = document.getElementById('cleared');
const revenueOut = document.getElementById('revenue');
const pipeFee = document.getElementById('pipeFee');
const shareFee = document.getElementById('shareFee');
const otherFee = document.getElementById('otherFee');
const saveFee = document.getElementById('saveFee');
const expenseOut = document.getElementById('expense');
const balanceOut = document.getElementById('balance');
const form = document.getElementById('saleForm');
const dateInput = document.getElementById('date');
const sheetBtn = document.getElementById('sheetBtn');
const reportBtn = document.getElementById('reportBtn');
const submitBtn = document.getElementById('submitBtn');

function showMessage(message, type='success', duration=3000){
  msg.textContent = message; msg.className = 'msg-box ' + type; msg.style.display='block';
  setTimeout(()=> msg.style.display='none', duration);
}
function calcRevenue(){ const rev=(Number(sold.value)+Number(cleared.value)-Number(pending.value))*pricePerBottle; revenueOut.textContent=rev.toLocaleString(); return rev; }
function calcExpense(){ const exp=Number(pipeFee.value)+Number(shareFee.value)+Number(otherFee.value)+Number(saveFee.value); expenseOut.textContent=exp.toLocaleString(); return exp; }
function calcBalance(){ const bal=calcRevenue()-calcExpense(); balanceOut.textContent=bal.toLocaleString(); return bal; }

function setupSalesForm(){
  dateInput.value = new Date().toISOString().substr(0,10);
  [sold,pending,cleared,pipeFee,shareFee,otherFee,saveFee].forEach(el=>el.addEventListener('input',()=>{ calcRevenue(); calcExpense(); calcBalance(); }));
  form.addEventListener('submit', async e=>{
    e.preventDefault();
    submitBtn.disabled=true; submitBtn.textContent='กำลังบันทึก...';
    const payload = {
      date: dateInput.value,
      sold: Number(sold.value),
      pending: Number(pending.value),
      cleared: Number(cleared.value),
      revenue: calcRevenue(),
      pipeFee: Number(pipeFee.value),
      shareFee: Number(shareFee.value),
      otherFee: Number(otherFee.value),
      saveFee: Number(saveFee.value),
      expense: calcExpense(),
      balance: calcBalance()
    };
    try{
      await fetch(CONFIG.webAppUrl, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload), mode:'no-cors'});
      showMessage('✅ บันทึกข้อมูลเรียบร้อย','success',4000);
      form.reset(); dateInput.value=new Date().toISOString().substr(0,10); calcRevenue(); calcExpense(); calcBalance();
    }catch(err){
      console.error(err); showMessage('❌ เกิดข้อผิดพลาดในการบันทึก','error',5000);
    }finally{ submitBtn.disabled=false; submitBtn.textContent='บันทึกข้อมูล'; }
  });
}
document.addEventListener('DOMContentLoaded', ()=>{
  setupSalesForm();
});
