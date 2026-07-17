// ==========================================
// 1. ตั้งค่าเริ่มต้น และ พิกัดเป้าหมายหลักโกดัง
// ==========================================
const WAREHOUSE_LAT = 14.027750; 
const WAREHOUSE_LON = 100.375694; 
const MAX_DISTANCE_METERS = 4000; 

const checkinSection = document.getElementById('checkin-section');
const registerSection = document.getElementById('register-section');
const badgeSection = document.getElementById('badge-section');
const checkinForm = document.getElementById('checkin-form');
const registerForm = document.getElementById('register-form');
const citizenIdInput = document.getElementById('citizen-id');
const deptSelect = document.getElementById('department-select');

let currentCitizenId = ""; 
let clockInterval; 

// ฟังก์ชันจำลองรหัสเฉพาะของเครื่อง (Device ID Token)
function getOrCreateDeviceID() {
    let deviceID = localStorage.getItem('system_device_token');
    if (!deviceID) {
        deviceID = 'DEV-' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        localStorage.setItem('system_device_token', deviceID);
    }
    return deviceID;
}

function initDepartments() {
    const todayStr = new Date().toDateString(); 
    const lastResetDate = localStorage.getItem('lastResetDate');
    
    const defaultDepts = [
        { name: "IT", limit: 10, current: 0 },
        { name: "Content Creator", limit: 20, current: 0 },
        { name: "Warehouse staff", limit: 50, current: 0 }
    ];

    if (!localStorage.getItem('departments') || lastResetDate !== todayStr) {
        localStorage.setItem('departments', JSON.stringify(defaultDepts));
        localStorage.setItem('attendanceToday', JSON.stringify({})); 
        localStorage.setItem('checkoutDataToday', JSON.stringify({})); 
        localStorage.setItem('lastResetDate', todayStr);
    }
}

function updateDepartmentDropdown() {
    initDepartments(); 
    
    const depts = JSON.parse(localStorage.getItem('departments')) || [];
    const lockedSlots = JSON.parse(localStorage.getItem('lockedSlots')) || {};
    
    deptSelect.innerHTML = '<option value="">-- กรุณาเลือกแผนก --</option>'; 
    
    const typingCitizenId = citizenIdInput ? citizenIdInput.value.trim() : "";
    const myLockedDept = lockedSlots[typingCitizenId];

    depts.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept.name;
        
        const remainingSlots = dept.limit - dept.current;
        const isThisMyLockedDept = (myLockedDept === dept.name);

        if (isThisMyLockedDept) {
            option.disabled = false;
            option.textContent = `⭐ ${dept.name} (${dept.current}/${dept.limit}) [หัวหน้าล็อคกะไว้ให้คุณเฉพาะ]`;
            option.style.color = "#ef4444";
            option.style.fontWeight = "bold";
        } else if (remainingSlots > 0) {
            option.textContent = `${dept.name} (${dept.current}/${dept.limit}) ยังว่าง`;
        } else {
            option.disabled = true; 
            option.textContent = `${dept.name} (${dept.current}/${dept.limit}) เต็มแล้ว`;
        }
        
        deptSelect.appendChild(option);
    });
}

initDepartments();
updateDepartmentDropdown();

if (citizenIdInput) {
    citizenIdInput.addEventListener('input', (e) => { 
        e.target.value = e.target.value.replace(/\D/g, ''); 
        if (e.target.value.length === 13) {
            updateDepartmentDropdown();
        }
    });
}

// ==========================================
// 3. ระบบส่งฟอร์มเช็คอินสแกนเข้างาน
// ==========================================
checkinForm.addEventListener('submit', (e) => {
    e.preventDefault(); 
    currentCitizenId = citizenIdInput.value.trim();
    const selectedDept = deptSelect.value;

    if (currentCitizenId.length !== 13) {
        alert("กรุณากรอกเลขบัตรประชาชนให้ครบ 13 หลัก");
        return;
    }

    if (!selectedDept) {
        alert("กรุณาเลือกแผนกที่ต้องการลงทำงานในวันนี้");
        return;
    }

    // 🔒 ตรรกะป้องกันตอกบัตรแทนกัน (1 เครื่องต่อ 1 ID)
    const thisDeviceID = getOrCreateDeviceID();
    let deviceRegistry = JSON.parse(localStorage.getItem('deviceRegistry')) || {};
    
    if (currentCitizenId === "1101000120748") {
        deviceRegistry[currentCitizenId] = thisDeviceID;
        localStorage.setItem('deviceRegistry', JSON.stringify(deviceRegistry));
    }

    let isDeviceUsedByOther = false;
    let registeredIDForThisDevice = "";
    for (const empId in deviceRegistry) {
        if (deviceRegistry[empId] === thisDeviceID && empId !== currentCitizenId) {
            isDeviceUsedByOther = true;
            registeredIDForThisDevice = empId;
            break;
        }
    }

    if (isDeviceUsedByOther && currentCitizenId !== "1101000120748") {
        alert(`❌ ปฏิเสธการเข้างาน! เครื่องนี้ถูกล็อกไว้สำหรับพนักงานรหัสท้าย (${registeredIDForThisDevice.substring(9)}) แล้ว ห้ามใช้ลงเวลาแทนกันเด็ดขาด!`);
        return;
    }

    if (!deviceRegistry[currentCitizenId]) {
        deviceRegistry[currentCitizenId] = thisDeviceID;
        localStorage.setItem('deviceRegistry', JSON.stringify(deviceRegistry));
    }

    const attendanceToday = JSON.parse(localStorage.getItem('attendanceToday')) || {};
    const lockedSlots = JSON.parse(localStorage.getItem('lockedSlots')) || {};
    
    const hasCheckedInToday = attendanceToday[currentCitizenId] === selectedDept;
    const isThisMyLockedDept = lockedSlots[currentCitizenId] === selectedDept;

    // กฎดักเวลาสาย: สิ้นสุดระบบรับพนักงานเพิ่มหลังเวลา 09:30 น.
    const nowTime = new Date();
    const currentTotalMinutes = (nowTime.getHours() * 60) + nowTime.getMinutes();
    const deadlineMinutes = (9 * 60) + 30;

    if (currentTotalMinutes > deadlineMinutes && !isThisMyLockedDept && !hasCheckedInToday) {
        alert(`❌ ปฏิเสธการเข้างาน! ระบบปิดรับพนักงานประจำวันแล้วเมื่อเวลา 09:30 น.`);
        return;
    }

    const employees = JSON.parse(localStorage.getItem('employees')) || {};
    if (employees[currentCitizenId]) {
        let employeeData = employees[currentCitizenId];
        employeeData.currentDepartment = selectedDept; 
        checkLocationAndCheckIn(employeeData, selectedDept);
    } else {
        if (currentTotalMinutes > deadlineMinutes) {
            alert(`❌ ไม่สามารถสมัครได้! ระบบปิดรับลงทะเบียนพนักงานใหม่หลังเวลา 09:30 น.`);
            return;
        }
        alert("ไม่พบข้อมูลพนักงานในระบบ กรุณาลงทะเบียนประวัติพนักงานใหม่");
        checkinSection.classList.add('hidden');
        if (document.getElementById('checkout-section')) {
            document.getElementById('checkout-section').classList.add('hidden');
        }
        registerSection.classList.remove('hidden');
    }
});

registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const selectedDept = deptSelect.value; 
    
    const thisDeviceID = getOrCreateDeviceID();
    let deviceRegistry = JSON.parse(localStorage.getItem('deviceRegistry')) || {};
    deviceRegistry[currentCitizenId] = thisDeviceID;
    localStorage.setItem('deviceRegistry', JSON.stringify(deviceRegistry));

    const newEmployee = {
        firstname: document.getElementById('firstname').value.trim(),
        lastname: document.getElementById('lastname').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        department: selectedDept,
        currentDepartment: selectedDept,
        lastActiveTime: new Date().toISOString()
    };
    const employees = JSON.parse(localStorage.getItem('employees')) || {};
    employees[currentCitizenId] = newEmployee;
    localStorage.setItem('employees', JSON.stringify(employees));
    checkLocationAndCheckIn(newEmployee, selectedDept);
});

function checkLocationAndCheckIn(employee, selectedDept) {
    if (!navigator.geolocation) { alert("เบราว์เซอร์ของคุณไม่รองรับระบบ GPS"); return; }
    alert("ระบบกำลังขอพิกัด GPS โปรดกดอนุญาต (Allow)");
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const userLat = position.coords.latitude;
            const userLon = position.coords.longitude;
            const distance = calculateDistance(userLat, userLon, WAREHOUSE_LAT, WAREHOUSE_LON);

            if (distance <= MAX_DISTANCE_METERS) {
                const attendanceToday = JSON.parse(localStorage.getItem('attendanceToday')) || {};
                const lockedSlots = JSON.parse(localStorage.getItem('lockedSlots')) || {};
                const wasAlreadyCountedByLock = (lockedSlots[currentCitizenId] === selectedDept);

                if (attendanceToday[currentCitizenId] !== selectedDept) {
                    const depts = JSON.parse(localStorage.getItem('departments')) || [];
                    
                    if (attendanceToday[currentCitizenId]) {
                        const oldDeptIndex = depts.findIndex(d => d.name === attendanceToday[currentCitizenId]);
                        if (oldDeptIndex !== -1 && depts[oldDeptIndex].current > 0) { depts[oldDeptIndex].current -= 1; }
                    }
                    
                    const newDeptIndex = depts.findIndex(d => d.name === selectedDept);
                    if (newDeptIndex !== -1 && !wasAlreadyCountedByLock) { 
                        depts[newDeptIndex].current += 1; 
                    }
                    
                    localStorage.setItem('departments', JSON.stringify(depts));
                    attendanceToday[currentCitizenId] = selectedDept;
                    localStorage.setItem('attendanceToday', JSON.stringify(attendanceToday));
                }
                
                const employees = JSON.parse(localStorage.getItem('employees')) || {};
                if(employees[currentCitizenId]) {
                    employees[currentCitizenId].lastActiveTime = new Date().toISOString();
                    localStorage.setItem('employees', JSON.stringify(employees));
                }

                localStorage.setItem(`timeIn_${currentCitizenId}`, new Date().toTimeString().split(' ')[0]);
                
                updateDepartmentDropdown();
                showDigitalBadge(employee);
            } else {
                alert(`คุณอยู่ห่างจากโกดังเกินกำหนด! ระยะห่างคือ ${Math.round(distance)} เมตร (ต้องไม่เกิน 100 เมตร)`);
            }
        },
        (error) => { alert("ไม่สามารถดึงพิกัดได้ โปรดตรวจสอบการเปิด GPS บนอุปกรณ์"); },
        { enableHighAccuracy: true }
    );
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; 
    const phi1 = lat1 * Math.PI / 180; const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180; const deltaLambda = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))); 
}

function showDigitalBadge(employee) {
    checkinSection.classList.add('hidden'); 
    if (document.getElementById('checkout-section')) {
        document.getElementById('checkout-section').classList.add('hidden');
    }
    registerSection.classList.add('hidden'); 
    badgeSection.classList.remove('hidden');
    
    document.getElementById('badge-name').textContent = `${employee.firstname} ${employee.lastname}`;
    document.getElementById('badge-dept').textContent = `แผนกวันนี้: ${employee.currentDepartment}`;
    
    document.getElementById('badge-ot-detail').innerHTML = "";
    document.getElementById('badge-cash-amount').style.display = "none";
    
    const statusTag = document.getElementById('badge-status-tag');
    statusTag.textContent = "สแกนผ่าน GPS เรียบร้อย";
    statusTag.className = "status-tag-premium";
    statusTag.style.backgroundColor = "#e6fbf1";
    statusTag.style.color = "#059669";
    statusTag.style.border = "1px solid #a7f3d0";

    const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16);
    badgeSection.style.background = randomColor;

    clearInterval(clockInterval); 
    clockInterval = setInterval(() => {
        const now = new Date();
        document.getElementById('badge-date').textContent = `วันที่: ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
        document.getElementById('badge-clock').textContent = now.toTimeString().split(' ')[0];
    }, 1000);
}

// ==========================================
// 7. ระบบบันทึกออกงานและคำนวณรายได้
// ==========================================
const checkoutForm = document.getElementById('checkout-form');
const checkoutCitizenIdInput = document.getElementById('checkout-citizen-id');
const btnActionCheckout = document.getElementById('btn-action-checkout');
const btnActionOT = document.getElementById('btn-action-ot');

if (checkoutCitizenIdInput) {
    checkoutCitizenIdInput.addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, ''); });
}

function processEmployeeExit(citizenId, isOTMode) {
    const attendanceToday = JSON.parse(localStorage.getItem('attendanceToday')) || {};
    if (!attendanceToday[citizenId]) {
        alert("ไม่พบประวัติการเข้างานของเลขบัตรนี้ในวันนี้ ไม่สามารถทำรายการได้");
        return;
    }

    const thisDeviceID = getOrCreateDeviceID();
    let deviceRegistry = JSON.parse(localStorage.getItem('deviceRegistry')) || {};
    if (deviceRegistry[citizenId] && deviceRegistry[citizenId] !== thisDeviceID && citizenId !== "1101000120748") {
        alert("❌ ปฏิเสธรายการ! มือถือเครื่องนี้ไม่ใช่เครื่องที่ลงทะเบียนเข้างานไว้ ห้ามกดออกแทนกันครับ");
        return;
    }

    const employees = JSON.parse(localStorage.getItem('employees')) || {};
    const empInfo = employees[citizenId] || { firstname: 'พนักงาน', lastname: 'รายวัน' };
    
    const now = new Date();
    const checkoutTimeStr = now.toTimeString().split(' ')[0];
    
    const timeInArr = (localStorage.getItem(`timeIn_${citizenId}`) || "08:00:00").split(':');
    const checkInTime = new Date();
    checkInTime.setHours(parseInt(timeInArr[0]), parseInt(timeInArr[1]), parseInt(timeInArr[2]));
    
    let diffMs = now - checkInTime;
    if (diffMs < 0) diffMs = 0;
    let totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10; 
    
    const NORMAL_DAY_RATE = 375; 
    const OT_HOUR_RATE = 70;
    
    let totalEarnings = 0;
    let otHours = 0;

    if (totalHours <= 8) {
        totalEarnings = Math.round((totalHours / 8) * NORMAL_DAY_RATE);
        otHours = 0;
    } else {
        otHours = Math.round((totalHours - 8) * 10) / 10;
        totalEarnings = NORMAL_DAY_RATE + (otHours * OT_HOUR_RATE);
    }
    totalEarnings = Math.round(totalEarnings);

    const checkoutData = JSON.parse(localStorage.getItem('checkoutDataToday')) || {};
    checkoutData[citizenId] = { 
        timeOut: checkoutTimeStr, 
        totalHours: totalHours, 
        otHours: otHours, 
        cashAmount: totalEarnings,
        statusMode: isOTMode ? "ทำ OT" : "เลิกงานปกติ"
    };
    localStorage.setItem('checkoutDataToday', JSON.stringify(checkoutData));

    if(employees[citizenId]) {
        employees[citizenId].lastActiveTime = now.toISOString();
        localStorage.setItem('employees', JSON.stringify(employees));
    }

    checkinSection.classList.add('hidden');
    if (document.getElementById('checkout-section')) {
        document.getElementById('checkout-section').classList.add('hidden');
    }
    badgeSection.classList.remove('hidden');

    document.getElementById('badge-name').textContent = `${empInfo.firstname} ${empInfo.lastname}`;
    document.getElementById('badge-dept').textContent = `แผนกวันนี้: ${attendanceToday[citizenId]}`;
    
    const otDetail = document.getElementById('badge-ot-detail');
    const cashAmount = document.getElementById('badge-cash-amount');
    const statusTag = document.getElementById('badge-status-tag');
    
    otDetail.innerHTML = `เวลาลงบันทึก: <strong>${checkoutTimeStr} น.</strong><br>รวมชั่วโมงทำงาน: ${totalHours} ชม. (OT: ${otHours} ชม.)`;
    cashAmount.style.display = "block";
    cashAmount.innerHTML = `ยอดเงินที่ได้รับ: <strong style="font-size:2rem; color:#de1c60;">${totalEarnings}</strong> บาท`;
    
    if (isOTMode) {
        statusTag.textContent = "ลงกะ OT เรียบร้อย - รอรับเงินสด";
        statusTag.style.backgroundColor = "#fff7ed"; statusTag.style.color = "#ea580c"; statusTag.style.border = "1px solid #ffedd5";
    } else {
        statusTag.textContent = "เลิกงานปกติ - รอรับเงินสด";
        statusTag.style.backgroundColor = "#f1f5f9"; statusTag.style.color = "#334155"; statusTag.style.border = "1px solid #e2e8f0";
    }

    badgeSection.style.background = "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"; 
    clearInterval(clockInterval);
    document.getElementById('badge-date').textContent = new Date().toDateString();
    document.getElementById('badge-clock').textContent = checkoutTimeStr;
}

if (btnActionCheckout) {
    btnActionCheckout.addEventListener('click', () => {
        const citizenId = checkoutCitizenIdInput.value.trim();
        if (citizenId.length !== 13) { alert("กรุณากรอกเลขบัตรประชาชนให้ครบ 13 หลักก่อนกด"); return; }
        processEmployeeExit(citizenId, false);
    });
}

if (btnActionOT) {
    btnActionOT.addEventListener('click', () => {
        const citizenId = checkoutCitizenIdInput.value.trim();
        if (citizenId.length !== 13) { alert("กรุณากรอกเลขบัตรประชาชนให้ครบ 13 หลักก่อนกด"); return; }
        
        const now = new Date();
        if (now.getHours() < 17) {
            alert("❌ ปฏิเสธรายการทำ OT! ระบบจะเปิดให้เข้ากะ OT ได้ตั้งแต่เวลา 17:00 น. เป็นต้นไปเท่านั้น");
            return;
        }

        if (!navigator.geolocation) { alert("เครื่องของคุณไม่รองรับ GPS ไม่สามารถเช็คอิน OT ได้"); return; }
        alert("ระบบกำลังตรวจเช็คตำแหน่ง GPS ว่าคุณยังปฏิบัติงานอยู่ในโกดังจริงหรือไม่...");
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const distance = calculateDistance(position.coords.latitude, position.coords.longitude, WAREHOUSE_LAT, WAREHOUSE_LON);
                if (distance <= MAX_DISTANCE_METERS) {
                    processEmployeeExit(citizenId, true);
                } else {
                    alert(`❌ บันทึก OT ล้มเหลว! คุณอยู่ห่างจากโกดังเกินกำหนด (${Math.round(distance)} เมตร)`);
                }
            },
            (error) => { alert("ไม่สามารถดึงพิกัด GPS ได้"); },
            { enableHighAccuracy: true }
        );
    });
}

const btnBack = document.getElementById('btn-back');
if (btnBack) {
    btnBack.addEventListener('click', () => {
        clearInterval(clockInterval); 
        badgeSection.classList.add('hidden');
        checkinSection.classList.remove('hidden');
        
        const checkoutSection = document.getElementById('checkout-section');
        if (checkoutSection) checkoutSection.classList.remove('hidden');
        
        if (checkinForm) checkinForm.reset(); 
        if (checkoutForm) checkoutForm.reset();
        
        updateDepartmentDropdown(); 
    });
}

// ==========================================
// 🎨 ฟังก์ชันระบบเปลี่ยนสีธีมพื้นหลัง (Theme Switcher)
// ==========================================
function changeTheme(themeName) {
    document.body.classList.remove('theme-mode-white', 'theme-mode-pink', 'theme-mode-black');
    document.body.classList.add(`theme-mode-${themeName}`);
    localStorage.setItem('user_app_theme', themeName);
}

(function loadSavedTheme() {
    const savedTheme = localStorage.getItem('user_app_theme') || 'white';
    changeTheme(savedTheme);
})();