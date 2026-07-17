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
            injectMockData();
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
    renderDepartments(); 
    renderAttendance(); 
    renderInactiveEmployees(); 
    renderAllEmployees(); 
}

// จำลองชุดข้อมูลเริ่มต้นสำหรับการรันเทสระบบครั้งแรก
function injectMockData() {
    let employees = JSON.parse(localStorage.getItem('employees')) || {};
    const now = new Date().getTime();
    
    const sixHoursAgo = new Date(now - (6 * 60 * 60 * 1000)).toISOString();
    const oneDayAgo = new Date(now - (24 * 60 * 60 * 1000)).toISOString();
    const eightDaysAgo = new Date(now - (8 * 24 * 60 * 60 * 1000)).toISOString();
    
    const mockList = {
        "1101000120748": { firstname: "นิติพันธ์", lastname: "โกสุมา", phone: "0816281385", department: "IT", lastActiveTime: sixHoursAgo },
        "1100100011111": { firstname: "สมชาย", lastname: "สายทดสอบ", phone: "0812345671", department: "IT", lastActiveTime: oneDayAgo },
        "1100100022222": { firstname: "สมหญิง", lastname: "นิ่งสงบ", phone: "0812345672", department: "IT", lastActiveTime: eightDaysAgo },
        "1100100033333": { firstname: "กิตติภพ", lastname: "ลบไม่ออก", phone: "0812345673", department: "IT", lastActiveTime: eightDaysAgo },
        "1100100044444": { firstname: "นัฐพงษ์", lastname: "ต้องรอเจ็ดวัน", phone: "0812345674", department: "IT", lastActiveTime: eightDaysAgo },
        "1200300099999": { firstname: "นิติพันธ์", lastname: "โกสุมา", phone: "0898765432", department: "IT", lastActiveTime: eightDaysAgo }
    };
    
    let isUpdated = false;
    for (const key in mockList) {
        if (!employees[key]) { employees[key] = mockList[key]; isUpdated = true; }
    }
    if (isUpdated) { localStorage.setItem('employees', JSON.stringify(employees)); }

    let depts = JSON.parse(localStorage.getItem('departments')) || [];
    if (!depts.some(d => d.name.toUpperCase() === "IT")) {
        depts.push({ name: "IT", limit: 10, current: 0 });
        localStorage.setItem('departments', JSON.stringify(depts));
    }
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
    empCheckboxContainer.innerHTML = '';
    
    for (const id in employees) {
        const emp = employees[id];
        const div = document.createElement('div');
        div.className = 'employee-item';
        div.setAttribute('data-search', `${id} ${emp.firstname} ${emp.lastname}`.toLowerCase());
        
        div.innerHTML = `
            <input type="checkbox" id="chk-${id}" value="${id}">
            <label for="chk-${id}"><strong>${emp.firstname} ${emp.lastname}</strong> (${id})</label>
        `;
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
        const deptName = lockSelectDepartment.value;
        const checkedBoxes = empCheckboxContainer.querySelectorAll('input[type="checkbox"]:checked');
        if (checkedBoxes.length === 0) { alert("❌ กรุณาติ๊กเลือกพนักงานอย่างน้อย 1 คน"); return; }

        let lockedSlots = JSON.parse(localStorage.getItem('lockedSlots')) || {};
        let depts = JSON.parse(localStorage.getItem('departments')) || [];
        const deptIndex = depts.findIndex(d => d.name === deptName);

        if (deptIndex === -1) return;
        
        const countSelected = checkedBoxes.length;
        const remainingSlots = depts[deptIndex].limit - depts[deptIndex].current;

        if (countSelected > remainingSlots) {
            alert(`❌ โควตาแผนกไม่พอ! เหลือที่ว่างแค่ ${remainingSlots} ช่อง`);
            return;
        }

        checkedBoxes.forEach(box => { lockedSlots[box.value] = deptName; });
        localStorage.setItem('lockedSlots', JSON.stringify(lockedSlots));

        depts[deptIndex].current += countSelected;
        localStorage.setItem('departments', JSON.stringify(depts));

        alert(`🔒 ล็อคตัวพนักงานสำเร็จ ${countSelected} คน!`);
        lockEmployeeForm.reset();
        buildEmployeeCheckboxList();
        loadAdminData();
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
            <td><span class="badge" style="background:#e2e8f0; padding:4px 8px; border-radius:6px; font-weight:600;">${dept.current} / ${dept.limit} คน</span></td>
            <td style="text-align:center;">
                <button class="btn-modern btn-dang" style="padding:4px 10px; font-size:0.8rem;" onclick="deleteDepartment(${index})"><i class="fa-solid fa-trash"></i> ลบ</button>
            </td>
        `;
        deptTableBody.appendChild(tr);
    });
}

window.deleteDepartment = function(index) {
    if (confirm("ต้องการลบแผนกนี้ออกจากระบบใช่หรือไม่?")) {
        let depts = JSON.parse(localStorage.getItem('departments')) || [];
        depts.splice(index, 1);
        localStorage.setItem('departments', JSON.stringify(depts));
        loadAdminData();
        populateDeptDropdown();
    }
};

function renderAttendance() {
    if (!attendanceTableBody) return;
    const employees = JSON.parse(localStorage.getItem('employees')) || {};
    const attendanceToday = JSON.parse(localStorage.getItem('attendanceToday')) || {};
    const checkoutDataToday = JSON.parse(localStorage.getItem('checkoutDataToday')) || {}; 
    attendanceTableBody.innerHTML = '';
    
    let hasData = false;
    for (const citizenId in attendanceToday) {
        hasData = true;
        const currentDept = attendanceToday[citizenId];
        const empInfo = employees[citizenId] || { firstname: 'ไม่ระบุชื่อ', lastname: '' };
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
    if (!hasData) { attendanceTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#94a3b8; padding:30px 0;">ยังไม่มีพนักงานเช็คอินในวันนี้</td></tr>'; }
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

const btnClearAllToday = document.getElementById('btn-clear-all-today');
if (btnClearAllToday) {
    btnClearAllToday.addEventListener('click', () => {
        if (confirm("⚠️ ต้องการลบกะวันนี้ของทุกคนออกทั้งหมดใช่หรือไม่?")) {
            localStorage.setItem('attendanceToday', JSON.stringify({}));
            localStorage.setItem('checkoutDataToday', JSON.stringify({}));
            localStorage.setItem('lockedSlots', JSON.stringify({})); 
            let depts = JSON.parse(localStorage.getItem('departments')) || [];
            depts.forEach(dept => { dept.current = 0; });
            localStorage.setItem('departments', JSON.stringify(depts));
            alert("ล้างประวัติประจำวันเรียบร้อย");
            loadAdminData();
            buildEmployeeCheckboxList();
        }
    });
}

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

        let isBinded = !!deviceRegistry[citizenId];
        let deviceStatus = isBinded ? `<br><small style="color:#10b981;font-weight:600;"><i class="fa-solid fa-mobile-screen-button"></i> ผูกเครื่องแล้ว (${deviceRegistry[citizenId].substring(0,8)})</small>` : `<br><small style="color:#94a3b8;"><i class="fa-solid fa-mobile-screen-button"></i> ยังไม่ผูกเครื่อง</small>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${citizenId}</td>
            <td><strong>${emp.firstname} ${emp.lastname}</strong>${deviceStatus}</td>
            <td>${emp.phone || '-'}</td>
            <td>
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%; gap:10px;">
                    <div>${statusDisplay}</div>
                    <div style="display:flex; gap:6px;">
                        <button class="btn-modern btn-warn btn-table-action" onclick="resetEmployeeDevice('${citizenId}')" style="background:#ea580c; color:white;">
                            <i class="fa-solid fa-unlock"></i> ปลดล็อกเครื่อง
                        </button>
                    </div>
                </div>
            </td>
        `;
        allEmployeesTableBody.appendChild(tr);
    }
}

window.resetEmployeeDevice = function(citizenId) {
    let deviceRegistry = JSON.parse(localStorage.getItem('deviceRegistry')) || {};
    if (!deviceRegistry[citizenId]) {
        alert("พนักงานคนนี้ยังไม่มีประวัติผูกเครื่องในระบบ ไม่จำเป็นต้องปลดล็อกครับ");
        return;
    }
    
    if (confirm(`คุณต้องการปลดล็อกมือถือให้พนักงานรหัส ${citizenId} ใช่หรือไม่?\n(หลังจากปลดล็อกแล้ว พนักงานจะสามารถเอารหัสไปผูกเข้างานกับเครื่องใหม่ได้ทันที)`)) {
        delete deviceRegistry[citizenId];
        localStorage.setItem('deviceRegistry', JSON.stringify(deviceRegistry));
        alert("🔓 ทำการเคลียร์สิทธิ์และปลดล็อกเครื่องพนักงานสำเร็จแล้วครับ!");
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

// โหลดธีมสีที่บันทึกไว้ทันทีเมื่อเปิดหน้าจอ
(function loadSavedTheme() {
    const savedTheme = localStorage.getItem('user_app_theme') || 'white';
    changeTheme(savedTheme);
})();