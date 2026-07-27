// ==========================================
// 1. ตรวจสอบชิ้นส่วนหน้าจอแอดมิน และระบบล็อกอิน
// ==========================================
const adminLoginSection = document.getElementById('admin-login-section');
const adminDashboardSection = document.getElementById('admin-dashboard-section');
const adminLoginForm = document.getElementById('admin-login-form');
const adminPasswordInput = document.getElementById('admin-password');
const btnLogout = document.getElementById('btn-logout');

if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const inputPass = adminPasswordInput.value.trim();
        // รหัสผ่านเข้าหลังบ้าน
        if (inputPass === "สล" || inputPass === "admin123") {
            if (adminLoginSection) adminLoginSection.classList.add('hidden');
            if (adminDashboardSection) adminDashboardSection.classList.remove('hidden');
            loadAdminData(); 
            buildEmployeeCheckboxList(); 
            populateDeptDropdown();      
        } else {
            alert("รหัสผ่านไม่ถูกต้อง!");
            adminPasswordInput.value = "";
        }
    });
}

if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        if (adminDashboardSection) adminDashboardSection.classList.add('hidden'); 
        if (adminLoginSection) adminLoginSection.classList.remove('hidden'); 
        if (adminPasswordInput) adminPasswordInput.value = "";
    });
}

// การผูกมัดตารางและฟอร์มจัดการแผนก
const deptTableBody = document.querySelector('#dept-table tbody');
const attendanceTableBody = document.querySelector('#attendance-table tbody');
const inactiveTableBody = document.querySelector('#inactive-employees-table tbody');
const allEmployeesTableBody = document.querySelector('#all-employees-table tbody');
const deptManagerForm = document.getElementById('dept-manager-form');
const manageDeptName = document.getElementById('manage-dept-name');
const manageDeptLimit = document.getElementById('manage-dept-limit');

const empCheckboxContainer = document.getElementById('emp-checkbox-container');
const empSearchInput = document.getElementById('emp-search-input');
const lockSelectDepartment = document.getElementById('lock-select-department');
const lockEmployeeForm = document.getElementById('lock-employee-form');

function loadAdminData() {
    try {
        const config = JSON.parse(localStorage.getItem('checkin_window')) || { start: "00:00", end: "23:59" };
        const startInput = document.getElementById('checkin-start');
        const endInput = document.getElementById('checkin-end');
        if (startInput) startInput.value = config.start;
        if (endInput) endInput.value = config.end;
    } catch (e) { console.error(e); }

    try { renderDepartments(); } catch (e) { console.error("renderDepartments error", e); }
    try { renderAttendance(); } catch (e) { console.error("renderAttendance error", e); }
    try { renderInactiveEmployees(); } catch (e) { console.error("renderInactive error", e); }
    try { renderAllEmployees(); } catch (e) { console.error("renderAllEmployees error", e); }
}



function timeSince(dateString) {
    if (!dateString) return "ไม่เคยเข้างาน";
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return "เมื่อสักครู่นี้";
    if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
    return `${diffDays} วันที่แล้ว`;
}

function buildEmployeeCheckboxList() {
    if (!empCheckboxContainer) return;
    const employees = JSON.parse(localStorage.getItem('employees')) || {};
    const lockedSlots = JSON.parse(localStorage.getItem('lockedSlots')) || {};
    empCheckboxContainer.innerHTML = '';
    
    for (const id in employees) {
        const emp = employees[id];
        const div = document.createElement('div');
        div.className = 'employee-item';
        div.setAttribute('data-search', `${id} ${emp.firstname} ${emp.lastname}`.toLowerCase());
        
        if (lockedSlots[id]) {
            div.innerHTML = `
                <input type="checkbox" id="chk-${id}" value="${id}" disabled>
                <label for="chk-${id}" style="color: #94a3b8; cursor: not-allowed;"><strong>${emp.firstname} ${emp.lastname}</strong> (${id}) <span style="color:#ef4444; font-size:0.8rem; margin-left:4px;"><i class="fa-solid fa-lock"></i> จองแล้ว: ${lockedSlots[id]}</span></label>
            `;
        } else {
            div.innerHTML = `
                <input type="checkbox" id="chk-${id}" value="${id}" class="emp-checkbox">
                <label for="chk-${id}"><strong>${emp.firstname} ${emp.lastname}</strong> (${id})</label>
            `;
        }
        empCheckboxContainer.appendChild(div);
    }
}

if (empSearchInput) {
    empSearchInput.addEventListener('input', (e) => {
        const filter = e.target.value.toLowerCase().trim();
        const items = empCheckboxContainer.querySelectorAll('.employee-item');
        items.forEach(item => {
            const searchText = item.getAttribute('data-search');
            if (searchText.includes(filter)) { item.style.display = 'flex'; } else { item.style.display = 'none'; }
        });
    });
}

function populateDeptDropdown() {
    if (!lockSelectDepartment) return;
    const depts = JSON.parse(localStorage.getItem('departments')) || [];
    lockSelectDepartment.innerHTML = '<option value="">-- เลือกแผนก --</option>';
    depts.forEach(d => { lockSelectDepartment.innerHTML += `<option value="${d.name}">${d.name}</option>`; });
}

if (lockEmployeeForm) {
    lockEmployeeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const selectedIds = Array.from(document.querySelectorAll('.emp-checkbox:checked')).map(cb => cb.value);
        const dept = document.getElementById('lock-select-department').value;
        if (selectedIds.length === 0) {
            alert("❌ กรุณาเลือกพนักงานอย่างน้อย 1 คน");
            return;
        }
        if (!dept) {
            alert("❌ กรุณาเลือกแผนก");
            return;
        }
        
        let lockedSlots = JSON.parse(localStorage.getItem('lockedSlots')) || {};
        let depts = JSON.parse(localStorage.getItem('departments')) || [];
        const deptIndex = depts.findIndex(d => d.name === dept);
        
        if (deptIndex !== -1) {
            let available = (depts[deptIndex].limit || 0) - (depts[deptIndex].current || 0);
            if (selectedIds.length > available) {
                alert(`❌ แผนก ${dept} เหลือที่ว่างแค่ ${available} ที่ แต่คุณพยายามจอง ${selectedIds.length} ที่`);
                return;
            }
            
            selectedIds.forEach(id => {
                lockedSlots[id] = dept;
                depts[deptIndex].current = (depts[deptIndex].current || 0) + 1;
            });
            
            localStorage.setItem('lockedSlots', JSON.stringify(lockedSlots));
            localStorage.setItem('departments', JSON.stringify(depts));
            
            alert(`✅ จองสิทธิ์ให้พนักงาน ${selectedIds.length} คน ลงแผนก ${dept} เรียบร้อยแล้ว`);
            lockEmployeeForm.reset();
            document.querySelectorAll('.emp-checkbox').forEach(cb => cb.checked = false);
            loadAdminData();
        }
    });
}

function renderDepartments() {
    if (!deptTableBody) return;
    const depts = JSON.parse(localStorage.getItem('departments')) || [];
    deptTableBody.innerHTML = ''; 
    depts.forEach((dept, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${dept.name}</strong></td>
            <td><span class="badge" style="background:#e2e8f0; color:#334155; padding:4px 8px; border-radius:6px; font-weight:600;">${dept.current} / ${dept.limit} คน</span></td>
            <td style="text-align:center; display:flex; gap:5px; justify-content:center; flex-wrap:wrap;">
                <button class="btn-modern btn-prime" style="padding:4px 8px; font-size:0.75rem;" onclick="editDepartment(${index})"><i class="fa-solid fa-pen"></i> แก้ไข</button>
                <button class="btn-modern btn-dang" style="padding:4px 8px; font-size:0.75rem;" onclick="deleteDepartment(${index})"><i class="fa-solid fa-trash"></i> ลบ</button>
            </td>
        `;
        deptTableBody.appendChild(tr);
    });
}

window.editDepartment = function(index) {
    let depts = JSON.parse(localStorage.getItem('departments')) || [];
    const dept = depts[index];
    
    // ตั้งค่าข้อมูลเดิมลงใน Modal
    document.getElementById('edit-dept-index').value = index;
    document.getElementById('edit-dept-name').value = dept.name;
    document.getElementById('edit-dept-limit').value = dept.limit;
    
    // เปิด Modal
    document.getElementById('dept-edit-modal').style.display = 'flex';
};

window.closeDeptModal = function() {
    document.getElementById('dept-edit-modal').style.display = 'none';
};

window.saveDepartmentEdit = function() {
    const index = document.getElementById('edit-dept-index').value;
    const newName = document.getElementById('edit-dept-name').value.trim();
    const newLimit = parseInt(document.getElementById('edit-dept-limit').value);
    
    if (newName !== "" && !isNaN(newLimit) && newLimit > 0) {
        let depts = JSON.parse(localStorage.getItem('departments')) || [];
        depts[index].name = newName;
        depts[index].limit = newLimit;
        // ไม่แตะต้อง current เพราะให้ระบบนับเองจากการเช็คอิน
        
        localStorage.setItem('departments', JSON.stringify(depts));
        loadAdminData();
        populateDeptDropdown();
        
        closeDeptModal();
        alert("✅ อัปเดตข้อมูลแผนกสำเร็จ");
    } else {
        alert("❌ ข้อมูลไม่ถูกต้อง กรุณาระบุชื่อ และโควตา ให้ถูกต้อง");
    }
};

window.deleteDepartment = function(index) {
    let depts = JSON.parse(localStorage.getItem('departments')) || [];
    const dept = depts[index];
    
    let confirmMessage = "ต้องการลบแผนกนี้ออกจากระบบใช่หรือไม่?";
    if (dept.current > 0) {
        confirmMessage = "⚠️ ขณะนี้มีคนที่กำลังทำงานอยู่ในแผนก ยืนยันที่จะลบโควต้าใช่หรือไม่?\n(ถ้าลบ พนักงานในแผนกนี้จะถูกดึงออกจากกะวันนี้ และบันทึกลงประวัติย้อนหลังทันที)";
    }
    
    if (confirm(confirmMessage)) {
        // อัปเดตพนักงานที่อยู่ในแผนกนี้ให้ "เลิกงาน" และดึงลงประวัติย้อนหลัง
        let attendanceToday = JSON.parse(localStorage.getItem('attendanceToday')) || {};
        let checkoutDataToday = JSON.parse(localStorage.getItem('checkoutDataToday')) || {};
        let employees = JSON.parse(localStorage.getItem('employees')) || {};
        let historyData = JSON.parse(localStorage.getItem('historical_attendance')) || [];
        let lockedSlots = JSON.parse(localStorage.getItem('lockedSlots')) || {};
        
        const todayDate = new Date();
        const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
        const timeOutStr = todayDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        
        for (const citizenId in attendanceToday) {
            if (attendanceToday[citizenId] === dept.name) {
                const empInfo = employees[citizenId] || { firstname: 'ไม่ระบุชื่อ', lastname: '' };
                const timeInStr = localStorage.getItem(`timeIn_${citizenId}`) || "08:00:00";
                const cOut = checkoutDataToday[citizenId];
                
                // บันทึกลงประวัติย้อนหลัง
                historyData.push({
                    citizenId: citizenId,
                    name: `${empInfo.firstname} ${empInfo.lastname}`,
                    department: dept.name,
                    date: todayStr,
                    timeIn: timeInStr,
                    statusMode: cOut ? cOut.statusMode : 'แผนกถูกยุบ/เลิกงาน',
                    timeOut: cOut ? cOut.timeOut : timeOutStr,
                    cashAmount: cOut ? cOut.cashAmount : 0
                });
                
                // ลบออกจากกะวันนี้
                delete attendanceToday[citizenId];
                delete checkoutDataToday[citizenId];
                if (lockedSlots[citizenId]) delete lockedSlots[citizenId];
            }
        }
        
        localStorage.setItem('historical_attendance', JSON.stringify(historyData));
        localStorage.setItem('attendanceToday', JSON.stringify(attendanceToday));
        localStorage.setItem('checkoutDataToday', JSON.stringify(checkoutDataToday));
        localStorage.setItem('lockedSlots', JSON.stringify(lockedSlots));
        
        depts.splice(index, 1);
        localStorage.setItem('departments', JSON.stringify(depts));
        
        loadAdminData();
        populateDeptDropdown();
        buildEmployeeCheckboxList();
    }
};

function renderAttendance() {
    if (!attendanceTableBody) return;
    const employees = JSON.parse(localStorage.getItem('employees')) || {};
    const attendanceToday = JSON.parse(localStorage.getItem('attendanceToday')) || {};
    const checkoutDataToday = JSON.parse(localStorage.getItem('checkoutDataToday')) || {}; 
    const searchInput = document.getElementById('attendance-search-input');
    const filter = searchInput ? searchInput.value.toLowerCase().trim() : '';

    attendanceTableBody.innerHTML = '';
    
    let hasData = false;
    let hasMatch = false;
    for (const citizenId in attendanceToday) {
        hasData = true;
        const currentDept = attendanceToday[citizenId] || '';
        const empInfo = employees[citizenId] || { firstname: 'ไม่ระบุชื่อ', lastname: '' };
        const fullName = `${empInfo.firstname} ${empInfo.lastname}`.toLowerCase();
        
        if (filter && !citizenId.includes(filter) && !fullName.includes(filter) && !currentDept.toLowerCase().includes(filter)) {
            continue;
        }
        hasMatch = true;
        
        const cOut = checkoutDataToday[citizenId];
        const timeInStr = localStorage.getItem(`timeIn_${citizenId}`) || "08:00:00";
        
        let statusDisplay = `<span class="status-tag">${currentDept}</span>`;
        let otInfo = `<span style="color:#475569; font-size:0.85rem;"><i class="fa-solid fa-spinner fa-spin"></i> กำลังทำงาน</span>`;
        
        if (cOut) {
            const modeText = cOut.statusMode || "เลิกงาน";
            const badgeBg = (modeText === "ทำ OT") ? "#fff7ed" : "#f1f5f9";
            const badgeColor = (modeText === "ทำ OT") ? "#ea580c" : "#334155";
            const badgeBorder = (modeText === "ทำ OT") ? "#ffedd5" : "#e2e8f0";

            statusDisplay = `<span class="status-tag" style="background-color:${badgeBg}; color:${badgeColor}; border-color:${badgeBorder}; font-weight:700;">${modeText} (${cOut.timeOut})</span>`;
            otInfo = `<strong style="color:#de1c60;">ยอด: ${cOut.cashAmount} บ.</strong>`;
        }
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${citizenId}</td>
            <td><strong>${empInfo.firstname} ${empInfo.lastname}</strong><br>${statusDisplay}</td>
            <td style="text-align: center; vertical-align: middle;">
                <span style="background-color: #eff6ff; color: #1e40af; padding: 4px 10px; border-radius: 6px; font-weight: 500; font-size: 0.85rem; border: 1px solid #dbeafe;">
                    <i class="fa-regular fa-clock" style="color: #3b82f6; margin-right: 4px;"></i> ${timeInStr} น.
                </span>
            </td>
            <td style="text-align: center; vertical-align: middle;">
                <div style="margin-bottom: 4px;">${otInfo}</div>
                <button class="btn-modern btn-neut btn-table-action" onclick="deleteAttendanceToday('${citizenId}', '${currentDept}')">
                    <i class="fa-solid fa-user-minus"></i> ลบจากกะวันนี้
                </button>
            </td>
        `;
        attendanceTableBody.appendChild(tr);
    }
    if (!hasData) { 
        attendanceTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#94a3b8; padding:30px 0;">ยังไม่มีพนักงานเช็คอินในวันนี้</td></tr>'; 
    } else if (!hasMatch) {
        attendanceTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#94a3b8; padding:30px 0;">🔍 ไม่พบพนักงานที่ตรงกับคำค้นหา</td></tr>';
    }
}

const attendanceSearchInput = document.getElementById('attendance-search-input');
if (attendanceSearchInput) {
    attendanceSearchInput.addEventListener('input', () => renderAttendance());
}

window.deleteAttendanceToday = function(citizenId, deptName) {
    if (confirm("ต้องการลบประวัติเฉพาะของวันนี้ใช่หรือไม่?")) {
        let attendanceToday = JSON.parse(localStorage.getItem('attendanceToday')) || {};
        delete attendanceToday[citizenId];
        localStorage.setItem('attendanceToday', JSON.stringify(attendanceToday));
        
        let checkoutDataToday = JSON.parse(localStorage.getItem('checkoutDataToday')) || {};
        delete checkoutDataToday[citizenId];
        localStorage.setItem('checkoutDataToday', JSON.stringify(checkoutDataToday));
        
        let depts = JSON.parse(localStorage.getItem('departments')) || [];
        const deptIndex = depts.findIndex(d => d.name === deptName);
        if (deptIndex !== -1 && depts[deptIndex].current > 0) {
            depts[deptIndex].current -= 1;
            localStorage.setItem('departments', JSON.stringify(depts));
        }
        
        let lockedSlots = JSON.parse(localStorage.getItem('lockedSlots')) || {};
        if (lockedSlots[citizenId]) {
            delete lockedSlots[citizenId];
            localStorage.setItem('lockedSlots', JSON.stringify(lockedSlots));
        }

        alert("ลบข้อมูลกะประจำวันเสร็จสิ้น");
        loadAdminData();
        buildEmployeeCheckboxList(); 
    }
};

function clearAllTodayData(isAuto = false) {
    if (isAuto || confirm("⚠️ ต้องการลบกะวันนี้ของทุกคนออกทั้งหมดใช่หรือไม่?")) {
        // --- Archive Data to History before clearing ---
        let attendanceToday = JSON.parse(localStorage.getItem('attendanceToday')) || {};
        let checkoutDataToday = JSON.parse(localStorage.getItem('checkoutDataToday')) || {};
        let employees = JSON.parse(localStorage.getItem('employees')) || {};
        let historyData = JSON.parse(localStorage.getItem('historical_attendance')) || [];
        
        const todayDate = new Date();
        const year = todayDate.getFullYear();
        const month = String(todayDate.getMonth() + 1).padStart(2, '0');
        const day = String(todayDate.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`; // Format YYYY-MM-DD for easy filtering
        
        for (const citizenId in attendanceToday) {
            const empInfo = employees[citizenId] || { firstname: 'ไม่ระบุชื่อ', lastname: '' };
            const dept = attendanceToday[citizenId];
            const timeInStr = localStorage.getItem(`timeIn_${citizenId}`) || "08:00:00";
            const cOut = checkoutDataToday[citizenId];
            
            historyData.push({
                date: todayStr,
                idCard: citizenId,
                name: `${empInfo.firstname} ${empInfo.lastname}`,
                department: dept,
                timeIn: timeInStr,
                timeOut: cOut ? cOut.timeOut : "-",
                otHours: cOut && cOut.otHours ? parseFloat(cOut.otHours) : 0,
                statusMode: cOut ? cOut.statusMode : "-",
                cashAmount: cOut ? cOut.cashAmount : 0
            });
        }
        localStorage.setItem('historical_attendance', JSON.stringify(historyData));
        // -----------------------------------------------

        localStorage.setItem('attendanceToday', JSON.stringify({}));
        localStorage.setItem('checkoutDataToday', JSON.stringify({}));
        localStorage.setItem('lockedSlots', JSON.stringify({})); 
        let depts = JSON.parse(localStorage.getItem('departments')) || [];
        depts.forEach(dept => { dept.current = 0; });
        localStorage.setItem('departments', JSON.stringify(depts));
        
        if (isAuto) {
            alert("⏰ ระบบได้ทำการล้างข้อมูลกะประจำวันอัตโนมัติเรียบร้อยแล้ว!");
        } else {
            alert("ล้างประวัติประจำวันเรียบร้อย");
        }
        
        loadAdminData();
        buildEmployeeCheckboxList();
    }
}

const btnClearAllToday = document.getElementById('btn-clear-all-today');
if (btnClearAllToday) {
    btnClearAllToday.addEventListener('click', () => clearAllTodayData(false));
}



// ระบบตั้งเวลาลบข้อมูลอัตโนมัติ
const btnSetAutoClear = document.getElementById('btn-set-auto-clear');
const autoClearTimeInput = document.getElementById('auto-clear-time');
const autoClearStatus = document.getElementById('auto-clear-status');
const autoClearTimeDisplay = document.getElementById('auto-clear-time-display');
const btnCancelAutoClear = document.getElementById('btn-cancel-auto-clear');
let autoClearInterval = null;

function updateAutoClearUI() {
    if (!autoClearStatus) return;
    const savedTime = localStorage.getItem('autoClearTime');
    if (savedTime) {
        autoClearStatus.style.display = 'flex';
        autoClearTimeDisplay.textContent = savedTime;
        if(autoClearTimeInput) autoClearTimeInput.value = savedTime;
        startAutoClearChecker();
    } else {
        autoClearStatus.style.display = 'none';
        if(autoClearTimeInput) autoClearTimeInput.value = '';
        if (autoClearInterval) clearInterval(autoClearInterval);
    }
}

function startAutoClearChecker() {
    if (autoClearInterval) clearInterval(autoClearInterval);
    autoClearInterval = setInterval(() => {
        const savedTime = localStorage.getItem('autoClearTime');
        if (!savedTime) return;
        
        const now = new Date();
        const currentHours = now.getHours().toString().padStart(2, '0');
        const currentMinutes = now.getMinutes().toString().padStart(2, '0');
        const currentTime = `${currentHours}:${currentMinutes}`;
        
        const lastClearedTime = localStorage.getItem('lastAutoClearTime');
        
        // ถ้าเวลาตรงกัน และยังไม่เคยลบในเวลานี้ของวันนี้
        if (currentTime === savedTime && lastClearedTime !== currentTime) {
            clearAllTodayData(true);
            localStorage.setItem('lastAutoClearTime', currentTime); // เก็บเวลาที่ลบไปแล้วเพื่อไม่ให้ลบซ้ำในนาทีเดียวกัน
            console.log(`Auto-cleared data at ${currentTime}`);
        }
    }, 10000); // เช็คทุก 10 วินาที เพื่อให้ตอบสนองตอนเทสไวขึ้น
}

if (btnSetAutoClear) {
    btnSetAutoClear.addEventListener('click', () => {
        const timeVal = autoClearTimeInput.value;
        if (!timeVal) {
            alert("❌ กรุณาระบุเวลาก่อนกดตั้งค่า");
            return;
        }
        localStorage.setItem('autoClearTime', timeVal);
        localStorage.removeItem('lastAutoClearTime'); // รีเซ็ตสถานะการลบ เพื่อให้ตั้งค่าเวลาใหม่และเทสซ้ำได้ในวันเดียวกัน
        updateAutoClearUI();
        alert(`✅ ตั้งเวลาลบข้อมูลอัตโนมัติเป็น ${timeVal} น. เรียบร้อยแล้ว`);
    });
}

if (btnCancelAutoClear) {
    btnCancelAutoClear.addEventListener('click', () => {
        localStorage.removeItem('autoClearTime');
        updateAutoClearUI();
        alert("✅ ยกเลิกการตั้งเวลาลบข้อมูลอัตโนมัติแล้ว");
    });
}

updateAutoClearUI();

function renderInactiveEmployees() {
    if (!inactiveTableBody) return;
    const employees = JSON.parse(localStorage.getItem('employees')) || {};
    inactiveTableBody.innerHTML = '';
    const now = new Date();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000; 
    let hasInactiveData = false;

    for (const citizenId in employees) {
        const emp = employees[citizenId];
        if (!emp.lastActiveTime) continue;
        const diffTime = now - new Date(emp.lastActiveTime);

        if (diffTime > SEVEN_DAYS_MS) {
            hasInactiveData = true;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${citizenId}</td>
                <td><strong>${emp.firstname} ${emp.lastname}</strong></td>
                <td style="color:#ef4444; font-weight:500;">ไม่ได้มาทำงานนานเกินเกณฑ์<br><small style="color:#94a3b8;">(${timeSince(emp.lastActiveTime)})</small></td>
                <td style="text-align: center;">
                    <button class="btn-modern btn-dang" style="padding:4px 10px; font-size:0.8rem;" onclick="deleteInactiveEmployee('${citizenId}')"><i class="fa-solid fa-user-xmark"></i> ลบถาวร</button>
                </td>
            `;
            inactiveTableBody.appendChild(tr);
        }
    }
    if (!hasInactiveData) { inactiveTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#94a3b8; padding:20px 0;">ไม่มีบัญชีพนักงานที่ขาดงานเกิน 7 วัน</td></tr>'; }
}

function renderAllEmployees() {
    if (!allEmployeesTableBody) return;
    const employees = JSON.parse(localStorage.getItem('employees')) || {};
    const lockedSlots = JSON.parse(localStorage.getItem('lockedSlots')) || {};
    const deviceRegistry = JSON.parse(localStorage.getItem('deviceRegistry')) || {};
    allEmployeesTableBody.innerHTML = '';
    
    for (const citizenId in employees) {
        const emp = employees[citizenId];
        const activeText = timeSince(emp.lastActiveTime);
        let statusDisplay = `<span style="color: #475569; font-weight: 500;"><i class="fa-solid fa-clock-rotate-left"></i> ${activeText}</span>`;
        
        if (lockedSlots[citizenId]) {
            statusDisplay += ` <span class="lock-badge" style="margin-left: 8px;"><i class="fa-solid fa-lock"></i> จอง: ${lockedSlots[citizenId]}</span>`;
        }

        let isBinded = !!emp.deviceToken;
        let deviceStatus = isBinded ? `<br><small style="color:#10b981;font-weight:600;"><i class="fa-solid fa-mobile-screen-button"></i> ผูกเครื่องแล้ว (${emp.deviceToken.substring(0,8)})</small>` : `<br><small style="color:#94a3b8;"><i class="fa-solid fa-mobile-screen-button"></i> ยังไม่ผูกเครื่อง</small>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${citizenId}</td>
            <td><strong>${emp.firstname} ${emp.lastname}</strong>${deviceStatus}</td>
            <td>${emp.phone || '-'}</td>
            <td>
                <div style="display:flex; align-items:center; gap:20px;">
                    <div style="flex:1;">${statusDisplay}</div>
                    <div style="display:flex; gap: 8px; flex-wrap: wrap;">
                        ${isBinded ? `
                        <button class="btn-modern btn-warn btn-table-action" onclick="resetCurrentDeviceToken('${citizenId}')" style="background:#ea580c; color:white;">
                            <i class="fa-solid fa-mobile-screen-button"></i> ปลดล็อกเครื่อง
                        </button>
                        ` : ''}
                        
                        ${lockedSlots[citizenId] ? `
                        <button class="btn-modern btn-dang btn-table-action" onclick="cancelReservation('${citizenId}')" style="background:#ef4444; color:white;">
                            <i class="fa-solid fa-lock-open"></i> ยกเลิกจองแผนก
                        </button>
                        ` : ''}
                        
                        <button class="btn-modern btn-prime btn-table-action" onclick="editEmployee('${citizenId}')">
                            <i class="fa-solid fa-pen-to-square"></i> แก้ไข
                        </button>
                        
                        <button class="btn-modern btn-dang btn-table-action" onclick="deleteEmployee('${citizenId}')" style="background:#dc2626; color:white;">
                            <i class="fa-solid fa-trash-can"></i> ลบ
                        </button>
                    </div>
                </div>
            </td>
        `;
        allEmployeesTableBody.appendChild(tr);
    }
}

window.resetCurrentDeviceToken = function(citizenId) {
    let employeesData = JSON.parse(localStorage.getItem('employees')) || {};
    let emp = employeesData[citizenId];
    
    let lockedSlots = JSON.parse(localStorage.getItem('lockedSlots')) || {};
    let hasLock = !!lockedSlots[citizenId];
    let hasDevice = emp && emp.deviceToken;
    
    if (!hasDevice) {
        alert("พนักงานคนนี้ยังไม่มีการผูกเครื่องในระบบ ไม่จำเป็นต้องล้างสิทธิ์ครับ");
        return;
    }
    
    let warnMsg = "";
    if (hasLock) warnMsg += "⚠️ พนักงานคนนี้มีการยืนยันสิทธิ์จองแผนกไว้ (การล้างสิทธิ์นี้จะลบแค่ประวัติเครื่อง แต่ไม่ลบสิทธิ์จองแผนก)\n";
    warnMsg += `คุณต้องการล้างสิทธิ์อุปกรณ์เครื่องนี้ (ปลดล็อกเครื่อง) ของพนักงานรหัส ${citizenId} ใช่หรือไม่?`;
    
    if (confirm(warnMsg)) {
        delete emp.deviceToken;
        localStorage.setItem('employees', JSON.stringify(employeesData));
        alert("🔓 ทำการล้างสิทธิ์อุปกรณ์เครื่องนี้สำเร็จแล้วครับ!");
        loadAdminData();
    }
};

window.deleteInactiveEmployee = function(citizenId) {
    if (confirm("ยืนยันการลบบัญชีผู้ใช้งานถาวร?")) {
        let employeesData = JSON.parse(localStorage.getItem('employees')) || {};
        delete employeesData[citizenId]; 
        localStorage.setItem('employees', JSON.stringify(employeesData));
        loadAdminData();
        buildEmployeeCheckboxList();
    }
};

window.deleteEmployee = function(citizenId) {
    if (confirm(`คุณต้องการลบบัญชีพนักงานรหัส ${citizenId} ถาวรใช่หรือไม่?\n(เมื่อลบแล้วพนักงานจะต้องลงทะเบียนใหม่)`)) {
        let employeesData = JSON.parse(localStorage.getItem('employees')) || {};
        let lockedSlots = JSON.parse(localStorage.getItem('lockedSlots')) || {};
        let deviceRegistry = JSON.parse(localStorage.getItem('deviceRegistry')) || {};
        
        let emp = employeesData[citizenId];
        if (emp && emp.deviceToken) {
            delete deviceRegistry[emp.deviceToken];
        }
        
        delete employeesData[citizenId];
        delete lockedSlots[citizenId];
        
        localStorage.setItem('employees', JSON.stringify(employeesData));
        localStorage.setItem('lockedSlots', JSON.stringify(lockedSlots));
        localStorage.setItem('deviceRegistry', JSON.stringify(deviceRegistry));
        
        alert("✅ ลบบัญชีพนักงานสำเร็จแล้ว!");
        loadAdminData();
        buildEmployeeCheckboxList();
    }
};

window.editEmployee = function(citizenId) {
    let employeesData = JSON.parse(localStorage.getItem('employees')) || {};
    let emp = employeesData[citizenId];
    if (!emp) return;
    
    document.getElementById('edit-emp-old-id').value = citizenId;
    document.getElementById('edit-emp-id').value = citizenId;
    document.getElementById('edit-emp-fname').value = emp.firstname || '';
    document.getElementById('edit-emp-lname').value = emp.lastname || '';
    document.getElementById('edit-emp-phone').value = emp.phone || '';
    
    document.getElementById('emp-edit-modal').style.display = 'flex';
};

window.closeEmpModal = function() {
    document.getElementById('emp-edit-modal').style.display = 'none';
};

window.saveEmployeeEdit = function() {
    const oldId = document.getElementById('edit-emp-old-id').value;
    const newId = document.getElementById('edit-emp-id').value.trim();
    const fname = document.getElementById('edit-emp-fname').value.trim();
    const lname = document.getElementById('edit-emp-lname').value.trim();
    const phone = document.getElementById('edit-emp-phone').value.trim();
    
    if (!newId || !fname || !lname) {
        alert("❌ กรุณากรอกรหัสประจำตัว ชื่อ และนามสกุลให้ครบถ้วน");
        return;
    }
    
    let employeesData = JSON.parse(localStorage.getItem('employees')) || {};
    let lockedSlots = JSON.parse(localStorage.getItem('lockedSlots')) || {};
    let deviceRegistry = JSON.parse(localStorage.getItem('deviceRegistry')) || {};
    
    if (newId !== oldId && employeesData[newId]) {
        alert("❌ รหัสประจำตัวใหม่นี้มีอยู่ในระบบแล้ว!");
        return;
    }
    
    let emp = employeesData[oldId];
    emp.firstname = fname;
    emp.lastname = lname;
    emp.phone = phone;
    
    if (newId !== oldId) {
        employeesData[newId] = emp;
        delete employeesData[oldId];
        
        if (lockedSlots[oldId]) {
            lockedSlots[newId] = lockedSlots[oldId];
            delete lockedSlots[oldId];
        }
        
        if (emp.deviceToken && deviceRegistry[emp.deviceToken]) {
            deviceRegistry[emp.deviceToken] = newId;
        }
    }
    
    localStorage.setItem('employees', JSON.stringify(employeesData));
    localStorage.setItem('lockedSlots', JSON.stringify(lockedSlots));
    localStorage.setItem('deviceRegistry', JSON.stringify(deviceRegistry));
    
    alert("✅ บันทึกข้อมูลพนักงานสำเร็จ!");
    closeEmpModal();
    loadAdminData();
    buildEmployeeCheckboxList();
};

window.cancelReservation = function(citizenId) {
    let lockedSlots = JSON.parse(localStorage.getItem('lockedSlots')) || {};
    if (!lockedSlots[citizenId]) {
        alert("พนักงานคนนี้ไม่มีการจองแผนกไว้ครับ");
        return;
    }
    
    if (confirm(`คุณต้องการยกเลิกการจองแผนก (${lockedSlots[citizenId]}) ของพนักงานรหัส ${citizenId} ใช่หรือไม่?`)) {
        delete lockedSlots[citizenId];
        localStorage.setItem('lockedSlots', JSON.stringify(lockedSlots));
        alert("✅ ยกเลิกการจองแผนกสำเร็จแล้วครับ!");
        loadAdminData();
    }
};

const btnClearAllInactive = document.getElementById('btn-clear-all-inactive');
if (btnClearAllInactive) {
    btnClearAllInactive.addEventListener('click', () => {
        if (confirm("⚠️ คุณแน่ใจหรือไม่ว่าต้องการลบบัญชีพนักงานที่ขาดงานเกิน 7 วัน 'ทั้งหมด' ออกจากระบบ?\n(การกระทำนี้ไม่สามารถย้อนกลับได้)")) {
            let employeesData = JSON.parse(localStorage.getItem('employees')) || {};
            const now = new Date();
            const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
            let countDeleted = 0;
            
            for (const citizenId in employeesData) {
                const emp = employeesData[citizenId];
                if (emp.lastActiveTime) {
                    const diffTime = now - new Date(emp.lastActiveTime);
                    if (diffTime > SEVEN_DAYS_MS) {
                        delete employeesData[citizenId];
                        countDeleted++;
                    }
                }
            }
            
            if (countDeleted > 0) {
                localStorage.setItem('employees', JSON.stringify(employeesData));
                alert(`✅ ลบข้อมูลพนักงานที่ขาดงานสำเร็จจำนวน ${countDeleted} บัญชี`);
                loadAdminData();
                buildEmployeeCheckboxList();
            } else {
                alert("ไม่มีพนักงานที่ขาดงานเกิน 7 วันในระบบครับ");
            }
        }
    });
}

if (deptManagerForm) {
    deptManagerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = manageDeptName.value.trim();
        const limit = parseInt(manageDeptLimit.value);
        let depts = JSON.parse(localStorage.getItem('departments')) || [];
        depts.push({ name: name, limit: limit, current: 0 });
        localStorage.setItem('departments', JSON.stringify(depts));
        loadAdminData(); deptManagerForm.reset(); populateDeptDropdown();
    });
}

// ==========================================
// 🎨 ฟังก์ชันระบบเปลี่ยนสีธีมพื้นหลัง (Theme Switcher สำหรับหน้า Admin)
// ==========================================
function changeTheme(themeName) {
    document.body.classList.remove('theme-mode-white', 'theme-mode-pink', 'theme-mode-black');
    document.body.classList.add(`theme-mode-${themeName}`);
    localStorage.setItem('user_app_theme', themeName);
}

const historyTableBody = document.querySelector('#history-table tbody');
const historyDatePicker = document.getElementById('history-date-picker');
const btnExportExcel = document.getElementById('btn-export-excel');

function renderHistoryTable() {
    if (!historyTableBody) return;
    const historyData = JSON.parse(localStorage.getItem('historical_attendance')) || [];
    let filterDate = historyDatePicker ? historyDatePicker.value : '';
    
    historyTableBody.innerHTML = '';
    
    let filteredData = historyData;
    if (filterDate) {
        filteredData = historyData.filter(row => row.date === filterDate);
    }
    
    // Sort by date descending
    filteredData.sort((a, b) => new Date(b.date) - new Date(a.date));

    let hasData = false;
    filteredData.forEach(row => {
        hasData = true;
        const tr = document.createElement('tr');
        
        const otHoursStr = row.otHours > 0 ? `<strong style="color:#0ea5e9;">${row.otHours} ชม.</strong>` : "-";
        const cashStr = row.cashAmount > 0 ? `<strong style="color:#de1c60;">${row.cashAmount} ฿</strong>` : "-";
        
        let statusDisplay = `<span style="color:#94a3b8;">${row.statusMode}</span>`;
        if (row.statusMode === "ทำ OT") statusDisplay = `<span style="background:#fff7ed; color:#ea580c; border:1px solid #ffedd5; padding:4px 8px; border-radius:6px; font-weight:700; font-size:0.8rem;">ทำ OT</span>`;
        else if (row.statusMode === "เลิกงาน") statusDisplay = `<span style="background:#f1f5f9; color:#334155; border:1px solid #e2e8f0; padding:4px 8px; border-radius:6px; font-weight:700; font-size:0.8rem;">เลิกงานปกติ</span>`;

        tr.innerHTML = `
            <td>${row.date}</td>
            <td>${row.idCard}</td>
            <td><strong>${row.name}</strong><br><span class="status-tag-dept">${row.department}</span></td>
            <td><span class="text-time"><i class="fa-regular fa-clock"></i> ${row.timeIn} น.</span></td>
            <td>${row.timeOut !== "-" ? `<i class="fa-regular fa-clock"></i> ${row.timeOut} น.` : "-"}</td>
            <td style="text-align:center; vertical-align:middle;">${otHoursStr}</td>
            <td style="text-align:center; vertical-align:middle;">${cashStr}</td>
            <td style="text-align:center; vertical-align:middle;">${statusDisplay}</td>
        `;
        historyTableBody.appendChild(tr);
    });

    if (!hasData) {
        historyTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#94a3b8; padding:30px 0;">ไม่มีข้อมูลประวัติย้อนหลังในวันที่เลือก</td></tr>';
    }
}

if (historyDatePicker) {
    // Set default date to today
    const todayDate = new Date();
    const year = todayDate.getFullYear();
    const month = String(todayDate.getMonth() + 1).padStart(2, '0');
    const day = String(todayDate.getDate()).padStart(2, '0');
    historyDatePicker.value = `${year}-${month}-${day}`;
    
    historyDatePicker.addEventListener('change', renderHistoryTable);
}

if (btnExportExcel) {
    btnExportExcel.addEventListener('click', () => {
        const historyData = JSON.parse(localStorage.getItem('historical_attendance')) || [];
        let filterDate = historyDatePicker ? historyDatePicker.value : '';
        
        let dataToExport = historyData;
        if (filterDate) {
            dataToExport = historyData.filter(row => row.date === filterDate);
        }
        
        if (dataToExport.length === 0) {
            alert("❌ ไม่มีข้อมูลสำหรับ Export ในวันที่เลือกครับ");
            return;
        }

        let tableHtml = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head><meta charset="utf-8"></head>
            <body>
                <br>
                <h2 style="text-align:center; font-family:'Segoe UI', sans-serif; color:#334155;">รายงานประวัติการทำงานและยอดเงิน OT</h2>
                <h4 style="text-align:center; font-family:'Segoe UI', sans-serif; color:#64748b; font-weight:normal;">ประจำวันที่: ${filterDate || "ทั้งหมด"}</h4>
                <br>
                <table cellpadding="8" cellspacing="0" style="border-collapse: collapse; font-family: 'Segoe UI', sans-serif; text-align: center; font-size: 14px;">
                    <tr style="background-color: #f8fafc; color: #475569;">
                        <th style="padding: 12px; border-bottom: 2px solid #cbd5e1;">วันที่</th>
                        <th style="padding: 12px; border-bottom: 2px solid #cbd5e1;">รหัสบัตรประชาชน</th>
                        <th style="padding: 12px; border-bottom: 2px solid #cbd5e1; text-align:left;">ชื่อ-นามสกุล</th>
                        <th style="padding: 12px; border-bottom: 2px solid #cbd5e1;">แผนก</th>
                        <th style="padding: 12px; border-bottom: 2px solid #cbd5e1;">เวลาเข้างาน</th>
                        <th style="padding: 12px; border-bottom: 2px solid #cbd5e1;">เวลาเลิกงาน</th>
                        <th style="padding: 12px; border-bottom: 2px solid #cbd5e1;">ชั่วโมง OT</th>
                        <th style="padding: 12px; border-bottom: 2px solid #cbd5e1;">ยอดเงิน OT (บาท)</th>
                        <th style="padding: 12px; border-bottom: 2px solid #cbd5e1;">สถานะ</th>
                    </tr>
        `;
        
        dataToExport.forEach(row => {
            const safeName = row.name.replace(/,/g, " ");
            
            tableHtml += `
                <tr style="color: #334155;">
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${row.date}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; mso-number-format:'\@';">${row.idCard}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align:left;">${safeName}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${row.department}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${row.timeIn}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${row.timeOut}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #64748b;">${row.otHours || "-"}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #64748b;">${row.cashAmount || "-"}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${row.statusMode}</td>
                </tr>
            `;
        });
        
        tableHtml += `</table></body></html>`;
        
        const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const fileNameDate = filterDate || 'All';
        link.setAttribute('href', url);
        link.setAttribute('download', `Attendance_Report_${fileNameDate}.xls`);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

const originalLoadAdminData = loadAdminData;
loadAdminData = function() {
    originalLoadAdminData();
    renderHistoryTable();
};

// โหลดธีมสีที่บันทึกไว้ทันทีเมื่อเปิดหน้าจอ
(function loadSavedTheme() {
    const savedTheme = localStorage.getItem('user_app_theme') || 'white';
    changeTheme(savedTheme);
})();

// ระบบตั้งเวลาเปิด-ปิดรับเช็คอิน
const checkinWindowForm = document.getElementById('checkin-window-form');
if (checkinWindowForm) {
    checkinWindowForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const start = document.getElementById('checkin-start').value;
        const end = document.getElementById('checkin-end').value;
        
        if (!start || !end) {
            alert("❌ กรุณาระบุเวลาเปิดและปิดให้ครบถ้วน");
            return;
        }

        localStorage.setItem('checkin_window', JSON.stringify({ start, end }));
        alert(`✅ บันทึกเวลาเปิด-ปิดเช็คอินสำเร็จ! \n(เปิด: ${start} น. - ปิด: ${end} น.)`);
    });
}

// โหลดค่าเวลาเปิด-ปิดที่เคยตั้งไว้เมื่อเปิดหน้าเว็บ
(function loadTimeWindowSettings() {
    const config = JSON.parse(localStorage.getItem('checkin_window')) || { start: "00:00", end: "23:59" };
    const startInput = document.getElementById('checkin-start');
    const endInput = document.getElementById('checkin-end');
    if (startInput) startInput.value = config.start;
    if (endInput) endInput.value = config.end;
})();

// ระบบตั้งเวลาและโควตา OT
const otWindowForm = document.getElementById('ot-window-form');
if (otWindowForm) {
    otWindowForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const start = document.getElementById('ot-start').value;
        const end = document.getElementById('ot-end').value;
        const limit = parseInt(document.getElementById('ot-limit').value, 10);
        
        if (!start || !end || isNaN(limit) || limit < 1) {
            alert("❌ กรุณาระบุเวลาเปิด-ปิดและโควตาให้ถูกต้อง");
            return;
        }

        localStorage.setItem('ot_config', JSON.stringify({ start, end, limit }));
        alert(`✅ บันทึกตั้งค่า OT สำเร็จ! \n(เวลา: ${start} - ${end} น. | รับจำนวน: ${limit} คน)`);
    });
}

(function loadOtSettings() {
    const config = JSON.parse(localStorage.getItem('ot_config')) || { start: "17:00", end: "20:00", limit: 10 };
    const startInput = document.getElementById('ot-start');
    const endInput = document.getElementById('ot-end');
    const limitInput = document.getElementById('ot-limit');
    
    if (startInput) startInput.value = config.start;
    if (endInput) endInput.value = config.end;
    if (limitInput) limitInput.value = config.limit;
    
    const checkoutDataToday = JSON.parse(localStorage.getItem('checkoutDataToday')) || {};
    let otCount = 0;
    for (const id in checkoutDataToday) {
        if (checkoutDataToday[id].statusMode === 'ทำ OT' || checkoutDataToday[id].statusMode === 'ออก OT') {
            otCount++;
        }
    }
    const otCurrentDisplay = document.getElementById('ot-current-display');
    if (otCurrentDisplay) {
        otCurrentDisplay.textContent = otCount;
    }
})();

// ระบบประกาศข่าวสาร (Announcement)
const announcementForm = document.getElementById('announcement-form');
if (announcementForm) {
    announcementForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = document.getElementById('announcement-input').value.trim();
        const isActive = document.getElementById('announcement-active').checked;
        
        localStorage.setItem('warehouse_announcement', JSON.stringify({ text, isActive }));
        
        if (isActive && text) {
            alert("✅ บันทึกและเผยแพร่ประกาศเรียบร้อยแล้ว พนักงานจะเห็นป้ายประกาศนี้ทันที");
        } else if (!isActive) {
            alert("✅ ปิดการแสดงป้ายประกาศเรียบร้อยแล้ว");
        } else {
            alert("✅ บันทึกประกาศแล้ว (แต่ยังไม่แสดงผลเพราะไม่ได้เปิดใช้งาน)");
        }
    });
}

// โหลดค่าประกาศที่เคยตั้งไว้
(function loadAnnouncementSettings() {
    const announcement = JSON.parse(localStorage.getItem('warehouse_announcement')) || { text: "", isActive: false };
    const annInput = document.getElementById('announcement-input');
    const annActive = document.getElementById('announcement-active');
    
    if (annInput) annInput.value = announcement.text;
    if (annActive) annActive.checked = announcement.isActive;
})();