const WAREHOUSE_LAT = 14.027750;
const WAREHOUSE_LON = 100.375694;
const MAX_DISTANCE_METERS = "";

let clockInterval = null;

function getOrCreateDeviceToken() {
    let token = localStorage.getItem('warehouse_device_token');
    if (!token) {
        token = 'TK-' + Math.random().toString(36).substr(2, 9).toUpperCase();
        localStorage.setItem('warehouse_device_token', token);
    }
    return token;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function handleCheckIn() {
    const idInput = document.getElementById('citizen-id');
    const deptInput = document.getElementById('department-select');

    if (!idInput || !deptInput) {
        alert("❌ โค้ด HTML มีปัญหา หาช่องกรอกข้อมูลไม่เจอ");
        return;
    }

    const loginId = idInput.value.trim();
    const loginDept = deptInput.value;

    if (!loginId || !loginDept) {
        alert("❌ กรุณากรอกเลขบัตรประชาชน และเลือกแผนกงานด้วยครับ");
        return;
    }

    let employees = JSON.parse(localStorage.getItem('employees')) || {};
    const employee = employees[loginId];
    const currentToken = getOrCreateDeviceToken();

    // 📝 1. ถ้ายังไม่มีเลขนี้ในระบบ -> พาไปหน้าลงทะเบียนใหม่
    if (!employee) {
        // Strict Mode: ห้ามสมัครเครื่องที่ผูกกับคนอื่นแล้ว
        const isDeviceUsed = Object.values(employees).some(emp => emp.deviceToken === currentToken);
        if (isDeviceUsed) {
            alert("❌ อุปกรณ์เครื่องนี้ถูกใช้ลงทะเบียนโดยพนักงานท่านอื่นไปแล้ว! \n(1 เครื่องสามารถลงทะเบียนได้แค่ 1 บัญชีเท่านั้น)");
            return;
        }

        // เปิดหน้าลงทะเบียน
        window.pendingLoginId = loginId;
        window.pendingLoginDept = loginDept;

        document.getElementById('checkin-section').classList.add('hidden');
        document.getElementById('checkout-section').classList.add('hidden');
        document.getElementById('register-section').classList.remove('hidden');
        return;
    }

    // 🔒 2. ตรวจสอบเวลาเปิด-ปิดระบบเช็คอิน
    const now = new Date();
    const currentTotalMinutes = (now.getHours() * 60) + now.getMinutes();
    const config = JSON.parse(localStorage.getItem('checkin_window')) || { start: "00:00", end: "23:59" };

    const [startH, startM] = config.start.split(':').map(Number);
    const [endH, endM] = config.end.split(':').map(Number);
    const startMinutes = (startH * 60) + startM;
    const endMinutes = (endH * 60) + endM;

    let isTimeValid = false;
    if (startMinutes <= endMinutes) {
        isTimeValid = (currentTotalMinutes >= startMinutes && currentTotalMinutes <= endMinutes);
    } else {
        // กรณีข้ามคืน เช่น 22:00 ถึง 06:00
        isTimeValid = (currentTotalMinutes >= startMinutes || currentTotalMinutes <= endMinutes);
    }

    // ตรวจสอบว่าแอดมินได้ทำการ "จองสิทธิ์" (Lock) ล่วงหน้าให้พนักงานคนนี้หรือไม่
    let lockedSlots = JSON.parse(localStorage.getItem('lockedSlots')) || {};
    const hasSpecialLock = !!lockedSlots[loginId];

    if (!isTimeValid && !hasSpecialLock) {
        alert(`❌ ไม่สามารถเข้าทำงานได้! \nระบบเช็คอินเปิดรับเฉพาะเวลา ${config.start} น. ถึง ${config.end} น. เท่านั้น`);
        document.getElementById('citizen-id').value = "";
        document.getElementById('department-select').value = "";
        return;
    }

    // ด่านตรวจสิทธิ์สแกนเครื่อง (กรณี VIP หรือเวลาปกติ)
    const targetEmployee = employee || employees[loginId];

    if (targetEmployee.deviceToken && targetEmployee.deviceToken !== currentToken) {
        alert("❌ ปฏิเสธการเข้างาน! อุปกรณ์เครื่องนี้ไม่ตรงกับที่ลงทะเบียนไว้");
        return;
    }

    // ป้องกันการเข้างานซ้ำในวันเดียวกัน และแสดง Badge ทันทีโดยไม่ต้องดึง GPS ใหม่
    let attendanceToday = JSON.parse(localStorage.getItem('attendanceToday')) || {};
    if (attendanceToday[loginId]) {
        alert(`✅ คุณ ${targetEmployee.name || targetEmployee.firstname} ทำการเช็คอินเข้างานไปแล้ว ระบบบันทึกข้อมูลเรียบร้อยครับ! (โควตาแผนกจะไม่ถูกนับซ้ำ)`);
        showPremiumBadge(targetEmployee, attendanceToday[loginId]);
        return;
    }

    // ตรวจสอบโควตาแผนกว่าเต็มหรือไม่ (ถ้าไม่ได้ถูกจองล็อกไว้)
    let depts = JSON.parse(localStorage.getItem('departments')) || [];
    const deptIndex = depts.findIndex(d => d.name === loginDept);
    if (deptIndex !== -1 && !hasSpecialLock) {
        if (depts[deptIndex].current >= depts[deptIndex].limit) {
            alert(`❌ ปฏิเสธการเข้างาน! โควตาแผนก ${loginDept} เต็มแล้ว (${depts[deptIndex].limit} คน)`);
            return;
        }
    }

    // บันทึก Token ให้ในกรณีที่ดึงมาจาก Mock Data แอดมิน หรือเพิ่งถูกล้างสิทธิ์มา
    if (!targetEmployee.deviceToken) {
        const isDeviceUsed = Object.values(employees).some(emp => emp.deviceToken === currentToken && emp.citizenId !== loginId);
        if (isDeviceUsed) {
            alert("❌ อุปกรณ์เครื่องนี้ถูกผูกใช้งานโดยพนักงานท่านอื่นไปแล้ว! \n(ไม่สามารถสวมรอยใช้เครื่องคนอื่นเข้างานได้)");
            return;
        }
        targetEmployee.deviceToken = currentToken;
        employees[loginId] = targetEmployee;
        localStorage.setItem('employees', JSON.stringify(employees));
    }

    processGeoLocationAndCheckIn(targetEmployee, loginId, loginDept, currentTotalMinutes);
}

function processGeoLocationAndCheckIn(employee, loginId, dept, currentMinutes) {
    if (!navigator.geolocation) {
        alert("❌ อุปกรณ์ไม่รองรับพิกัด GPS");
        return;
    }
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const userLat = position.coords.latitude;
            const userLon = position.coords.longitude;
            const distance = calculateDistance(WAREHOUSE_LAT, WAREHOUSE_LON, userLat, userLon);

            if (distance > MAX_DISTANCE_METERS) {
                // แจ้งเตือนระยะห่าง (อาจจะปิดไว้ชั่วคราวสำหรับการเทสบน PC)
                // alert(`❌ ปฏิเสธการเข้างาน! อยู่ห่างจากโกดังเกินกำหนด (${Math.round(distance)} เมตร)`);
                // return;
                console.warn(`อยู่นอกพื้นที่ ${Math.round(distance)} เมตร แต่ข้ามการเช็คระยะเพื่อทดสอบ`);
            }

            let attendanceToday = JSON.parse(localStorage.getItem('attendanceToday')) || {};
            const empName = employee.name || `${employee.firstname || ''} ${employee.lastname || ''}`.trim();

            let attendanceLog = JSON.parse(localStorage.getItem('attendance_log')) || [];
            const now = new Date();
            const checkInTimeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            attendanceLog.push({
                idCard: loginId,
                name: empName,
                department: dept,
                checkInTime: checkInTimeStr,
                status: currentMinutes > 570 ? "มาสาย" : "ปกติ",
                date: now.toLocaleDateString('th-TH')
            });
            localStorage.setItem('attendance_log', JSON.stringify(attendanceLog));

            // บันทึกลงระบบกะประจำวัน (สำหรับหน้า Admin Dashboard)
            attendanceToday[loginId] = dept;
            localStorage.setItem('attendanceToday', JSON.stringify(attendanceToday));
            localStorage.setItem(`timeIn_${loginId}`, checkInTimeStr);

            // อัปเดตโควตาแผนก (ถ้าไม่ได้ถูก Admin ล็อกไว้ล่วงหน้า เพราะถ้าล็อกแล้วโควตาจะถูกหักไปตั้งแต่ตอนล็อก)
            let lockedSlots = JSON.parse(localStorage.getItem('lockedSlots')) || {};
            let depts = JSON.parse(localStorage.getItem('departments')) || [];
            const deptIndex = depts.findIndex(d => d.name === dept);
            if (deptIndex !== -1 && lockedSlots[loginId] !== dept) {
                depts[deptIndex].current = (depts[deptIndex].current || 0) + 1;
                localStorage.setItem('departments', JSON.stringify(depts));
            }

            alert(`✅ บันทึกเวลาเข้างานสำเร็จ! ยินดีต้อนรับคุณ ${empName}`);
            showPremiumBadge(employee, dept);
        },
        (error) => {
            alert("❌ ระบบดึงพิกัด GPS ล้มเหลว กรุณาอนุญาตสิทธิ์ตำแหน่งที่ตั้งบนเบราว์เซอร์");
        }
    );
}

function cancelRegistration() {
    document.getElementById('register-section').classList.add('hidden');
    document.getElementById('checkin-section').classList.remove('hidden');
    document.getElementById('checkout-section').classList.remove('hidden');
    document.getElementById('register-form').reset();
    window.pendingLoginId = null;
    window.pendingLoginDept = null;
}

function submitRegistration() {
    const fname = document.getElementById('firstname').value.trim();
    const lname = document.getElementById('lastname').value.trim();
    const phone = document.getElementById('phone').value.trim();

    if (!fname || !lname || !phone) {
        alert("❌ กรุณากรอกข้อมูลให้ครบถ้วน");
        return;
    }

    if (phone.length < 10) {
        alert("❌ กรุณากรอกเบอร์โทรศัพท์ให้ครบ 10 หลัก");
        return;
    }

    const currentToken = getOrCreateDeviceToken();
    let employees = JSON.parse(localStorage.getItem('employees')) || {};

    // ตรวจสอบว่าเครื่องนี้ถูกใช้ลงทะเบียนไปแล้วหรือไม่ (Strict 1-Device-1-Account)
    const isDeviceUsed = Object.values(employees).some(emp => emp.deviceToken === currentToken);
    if (isDeviceUsed) {
        alert("❌ อุปกรณ์เครื่องนี้ถูกใช้ลงทะเบียนไปแล้ว! \n(1 เครื่องสามารถลงทะเบียนได้แค่ 1 บัญชีเท่านั้น)");
        return;
    }

    const newEmployee = {
        firstname: fname,
        lastname: lname,
        phone: phone,
        department: window.pendingLoginDept,
        deviceToken: currentToken,
        lastActiveTime: new Date().toISOString()
    };

    employees[window.pendingLoginId] = newEmployee;
    localStorage.setItem('employees', JSON.stringify(employees));

    alert("✅ ลงทะเบียนประวัติสำเร็จ กรุณาทำการเช็คอินเพื่อเข้างาน");

    document.getElementById('register-section').classList.add('hidden');
    document.getElementById('checkin-section').classList.remove('hidden');
    document.getElementById('checkout-section').classList.remove('hidden');
    document.getElementById('register-form').reset();

    window.pendingLoginId = null;
    window.pendingLoginDept = null;
}

function showPremiumBadge(employee, dept) {
    document.getElementById('checkin-section').classList.add('hidden');
    document.getElementById('checkout-section').classList.add('hidden');
    document.getElementById('badge-section').classList.remove('hidden');

    const empName = employee.name || `${employee.firstname || ''} ${employee.lastname || ''}`.trim();
    document.getElementById('badge-name').textContent = empName;
    document.getElementById('badge-dept').textContent = `แผนกวันนี้: ${dept}`;

    const dateEl = document.getElementById('badge-date');
    const clockEl = document.getElementById('badge-clock');

    if (clockInterval) clearInterval(clockInterval);
    clockInterval = setInterval(() => {
        const d = new Date();
        if (dateEl) dateEl.textContent = d.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        if (clockEl) clockEl.textContent = d.toLocaleTimeString('th-TH');
    }, 1000);
}

function backToMain() {
    if (clockInterval) clearInterval(clockInterval);
    document.getElementById('badge-section').classList.add('hidden');
    document.getElementById('checkin-section').classList.remove('hidden');
    document.getElementById('checkout-section').classList.remove('hidden');
    document.getElementById('citizen-id').value = "";
    document.getElementById('department-select').value = "";
    populateIndexDeptDropdown();
}

function handleCheckOut(type) {
    const logoutId = document.getElementById('checkout-citizen-id').value.trim();
    if (!logoutId) {
        alert("❌ กรุณากรอกเลขบัตรประชาชนก่อนกดปุ่มทำรายการ");
        return;
    }

    if (type === 'ot') {
        const currentHours = new Date().getHours();
        // คอมเมนต์เงื่อนไขเวลา OT เพื่อทดสอบระบบ
        // if (currentHours < 17) {
        //     alert("❌ ยังไม่ถึงเวลาทำ OT (กดบันทึกเข้ากะ OT ได้ตั้งแต่เวลา 17:00 น. เป็นต้นไป)");
        //     return;
        // }
    }

    let employees = JSON.parse(localStorage.getItem('employees')) || {};
    const employee = employees[logoutId];
    if (!employee) {
        alert("❌ ไม่พบประวัติพนักงานเลขนี้ในระบบ");
        return;
    }

    const empName = employee.name || `${employee.firstname || ''} ${employee.lastname || ''}`.trim();

    const now = new Date();
    const timeOutStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    let checkoutDataToday = JSON.parse(localStorage.getItem('checkoutDataToday')) || {};

    if (type === 'normal') {
        const timeInStr = localStorage.getItem(`timeIn_${logoutId}`);
        let workedText = "ไม่พบข้อมูลเวลาเข้างาน";

        if (timeInStr) {
            const [inH, inM, inS] = timeInStr.split(':').map(Number);
            const inDate = new Date(now);
            inDate.setHours(inH || 0, inM || 0, inS || 0, 0);

            let diffMs = now.getTime() - inDate.getTime();
            if (diffMs < 0) diffMs = 0;

            const diffH = Math.floor(diffMs / (1000 * 60 * 60));
            const diffM = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            const diffS = Math.floor((diffMs % (1000 * 60)) / 1000);

            workedText = `${diffH} ชั่วโมง ${diffM} นาที ${diffS} วินาที`;
        }

        const confirmMsg = `ขณะนี้ท่านได้ทำงานมาแล้ว ${workedText}\nท่านยืนยันที่จะเลิกงานใช่หรือไม่?`;
        if (!confirm(confirmMsg)) {
            return;
        }

        alert(`🚌 บันทึกเวลาเลิกงานปกติสำเร็จ! ให้คุณ ${empName}`);
        checkoutDataToday[logoutId] = { statusMode: "เลิกงาน", timeOut: timeOutStr, cashAmount: 0 };
    } else if (type === 'ot') {
        if (checkoutDataToday[logoutId] && checkoutDataToday[logoutId].statusMode === 'เลิกงาน') {
            alert("❌ คุณได้กดเลิกงานปกติไปแล้ว ไม่สามารถเข้ากะ OT ได้!\n(กรุณาติดต่อแอดมินหากมีข้อผิดพลาด)");
            return;
        }

        const otConfig = JSON.parse(localStorage.getItem('ot_config')) || { start: "17:00", end: "20:00", limit: 10 };
        const currentTotalMinutes = (now.getHours() * 60) + now.getMinutes();
        const [startH, startM] = otConfig.start.split(':').map(Number);
        const [endH, endM] = otConfig.end.split(':').map(Number);
        const startMinutes = (startH * 60) + startM;
        const endMinutes = (endH * 60) + endM;

        let isTimeValid = false;
        if (startMinutes <= endMinutes) {
            isTimeValid = (currentTotalMinutes >= startMinutes && currentTotalMinutes <= endMinutes);
        } else {
            isTimeValid = (currentTotalMinutes >= startMinutes || currentTotalMinutes <= endMinutes);
        }

        if (!isTimeValid) {
            alert(`❌ ไม่สามารถเข้ากะ OT ได้! \nระบบเปิดรับสมัคร OT เฉพาะเวลา ${otConfig.start} น. ถึง ${otConfig.end} น. เท่านั้น`);
            return;
        }

        let otCount = 0;
        for (const id in checkoutDataToday) {
            if (checkoutDataToday[id].statusMode === 'ทำ OT' || checkoutDataToday[id].statusMode === 'ออก OT') {
                otCount++;
            }
        }

        if (!checkoutDataToday[logoutId] || (checkoutDataToday[logoutId].statusMode !== 'ทำ OT' && checkoutDataToday[logoutId].statusMode !== 'ออก OT')) {
            if (otCount >= otConfig.limit) {
                alert(`❌ ปฏิเสธการเข้า OT! โควตา OT เต็มแล้ว (รับจำกัด ${otConfig.limit} คน)`);
                return;
            }
        }

        let startTimeMs = now.getTime();
        // สามารถเข้าสายได้ 10 นาที (ปัดเป็นเวลาเริ่ม OT)
        if (now.getHours() === startH && now.getMinutes() >= startM && now.getMinutes() <= startM + 10) {
            let fakeStart = new Date(now);
            fakeStart.setHours(startH, startM, 0, 0);
            startTimeMs = fakeStart.getTime();
        }

        alert(`🔥 บันทึกเข้ากะ OT สำเร็จ! ให้คุณ ${empName}`);
        checkoutDataToday[logoutId] = {
            statusMode: "ทำ OT",
            timeOut: timeOutStr,
            cashAmount: 0,
            otStartTime: startTimeMs
        };
    } else if (type === 'ot_out') {
        const cData = checkoutDataToday[logoutId];
        if (!cData || cData.statusMode !== "ทำ OT" || !cData.otStartTime) {
            alert("❌ คุณยังไม่ได้กดปุ่ม 'บันทึกเข้ากะ OT' หรือไม่ได้อยู่ในสถานะทำ OT");
            return;
        }

        const startTimeMs = cData.otStartTime;
        const endTimeMs = now.getTime();

        let diffTotalSecs = Math.max(0, Math.floor((endTimeMs - startTimeMs) / 1000));
        const h = Math.floor(diffTotalSecs / 3600);
        const m = Math.floor((diffTotalSecs % 3600) / 60);
        const s = diffTotalSecs % 60;
        const exactTimeText = `${h} ชั่วโมง ${m} นาที ${s} วินาที`;

        let diffMins = diffTotalSecs / 60;

        // ปัดเศษนาที (29->30, 59->60) (ครึ่งชั่วโมง)
        let roundedMins = Math.round(diffMins / 30) * 30;

        // ชั่วโมงละ 72 บาท
        let earnedCash = (roundedMins / 60) * 72;

        alert(`🌙 บันทึกเวลาออก OT สำเร็จ! ให้คุณ ${empName}\n\nระยะเวลาทำ OT จริง: ${exactTimeText}\n(ปัดเป็นจำนวน: ${roundedMins} นาที สำหรับคิดเงิน)\nยอดเงิน OT: ${earnedCash} บาท`);
        checkoutDataToday[logoutId] = {
            statusMode: "ออก OT",
            timeOut: timeOutStr,
            cashAmount: earnedCash,
            otStartTime: startTimeMs,
            otEndMins: roundedMins
        };
    }

    localStorage.setItem('checkoutDataToday', JSON.stringify(checkoutDataToday));
    document.getElementById('checkout-citizen-id').value = "";
}

function changeTheme(themeName) {
    document.body.className = '';
    document.body.classList.add(`theme-${themeName}`);
    localStorage.setItem('warehouse_theme', themeName);
}

function updateOTButtonStatus() {
    const otBtn = document.getElementById('btn-action-ot');
    const otBtnStatus = document.getElementById('ot-btn-status');
    if (!otBtn || !otBtnStatus) return;

    let otConfig = JSON.parse(localStorage.getItem('ot_config')) || { start: "17:00", end: "20:00", limit: 10 };
    if (!otConfig || !otConfig.start || !otConfig.end) {
        otBtn.style.background = 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)';
        otBtn.style.boxShadow = 'none';
        otBtn.style.animation = 'none';
        otBtnStatus.innerText = "(ยังไม่ตั้งค่า OT)";
        return;
    }

    const now = new Date();
    const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = otConfig.start.split(':').map(Number);
    const [endH, endM] = otConfig.end.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    let isTimeValid = false;
    let isBeforeStart = false;

    if (startMinutes <= endMinutes) {
        isTimeValid = (currentTotalMinutes >= startMinutes && currentTotalMinutes <= endMinutes);
        isBeforeStart = (currentTotalMinutes < startMinutes);
    } else {
        isTimeValid = (currentTotalMinutes >= startMinutes || currentTotalMinutes <= endMinutes);
        isBeforeStart = (currentTotalMinutes > endMinutes && currentTotalMinutes < startMinutes);
    }

    let checkoutDataToday = JSON.parse(localStorage.getItem('checkoutDataToday')) || {};
    let otCount = 0;
    for (const id in checkoutDataToday) {
        if (checkoutDataToday[id].statusMode === 'ทำ OT' || checkoutDataToday[id].statusMode === 'ออก OT') {
            otCount++;
        }
    }

    if (isBeforeStart) {
        otBtn.style.background = 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)';
        otBtn.style.boxShadow = 'none';
        otBtn.style.animation = 'none';
        otBtnStatus.innerText = `(รอเปิดเวลา ${otConfig.start})`;
    } else if (isTimeValid) {
        if (otCount >= otConfig.limit) {
            otBtn.style.background = 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)';
            otBtn.style.boxShadow = 'none';
            otBtn.style.animation = 'none';
            otBtnStatus.innerText = `(❌ โควตาเต็ม ${otCount}/${otConfig.limit})`;
        } else {
            otBtn.style.background = 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)';
            otBtn.style.boxShadow = '0 4px 12px rgba(234, 88, 12, 0.4)';
            otBtn.style.animation = 'pulse-fire 2s infinite';
            otBtnStatus.innerText = `(🔥 ว่าง ${otConfig.limit - otCount}/${otConfig.limit})`;
        }
    } else {
        otBtn.style.background = 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)';
        otBtn.style.boxShadow = 'none';
        otBtn.style.animation = 'none';
        otBtnStatus.innerText = `(ปิดรับ OT แล้ว)`;
    }
}

window.onload = function () {
    const savedTheme = localStorage.getItem('warehouse_theme') || 'pink';
    changeTheme(savedTheme);
    getOrCreateDeviceToken();
    populateIndexDeptDropdown();

    updateOTButtonStatus();
    setInterval(updateOTButtonStatus, 15000); // Check every 15 seconds

    // Load Announcement
    const announcement = JSON.parse(localStorage.getItem('warehouse_announcement'));
    const annBanner = document.getElementById('announcement-banner');
    const annText = document.getElementById('announcement-text');
    if (annBanner && annText && announcement && announcement.isActive && announcement.text) {
        annText.textContent = announcement.text;
        annBanner.style.display = 'flex';
    }

    const idInput = document.getElementById('citizen-id');
    const deptSelect = document.getElementById('department-select');
    const lockMessage = document.getElementById('lock-status-message');

    if (idInput && deptSelect && lockMessage) {
        idInput.addEventListener('input', (e) => {
            const loginId = e.target.value.trim();
            if (loginId.length === 13) {
                const lockedSlots = JSON.parse(localStorage.getItem('lockedSlots')) || {};
                const lockedDept = lockedSlots[loginId];
                if (lockedDept) {
                    deptSelect.value = lockedDept;
                    deptSelect.disabled = true;
                    lockMessage.innerHTML = `<i class="fa-solid fa-lock"></i> แอดมินจองสิทธิ์คุณไว้ที่แผนก ${lockedDept} แล้ว (ไม่ต้องเลือกใหม่)`;
                    lockMessage.style.display = 'block';
                } else {
                    deptSelect.disabled = false;
                    lockMessage.style.display = 'none';
                }
            } else {
                deptSelect.disabled = false;
                lockMessage.style.display = 'none';
            }
        });
    }
};

function populateIndexDeptDropdown() {
    const deptSelect = document.getElementById('department-select');
    if (!deptSelect) return;

    // โหลดแผนกจาก LocalStorage ถ้าไม่มีให้ใช้ค่าตั้งต้น
    let depts = JSON.parse(localStorage.getItem('departments'));
    if (!depts || depts.length === 0) {
        depts = [
            { name: "IT", limit: 10, current: 0 },
            { name: "Warehouse staff", limit: 50, current: 0 },
            { name: "Content Creator", limit: 20, current: 0 }
        ];
        localStorage.setItem('departments', JSON.stringify(depts));
    }

    deptSelect.innerHTML = '<option value="">-- กรุณาเลือกแผนก --</option>';

    depts.forEach(d => {
        const isFull = d.current >= d.limit;
        const text = isFull ? `${d.name} (${d.current}/${d.limit}) เต็มแล้ว` : `${d.name} (${d.current}/${d.limit}) ยังว่าง`;
        const option = document.createElement('option');
        option.value = d.name;
        option.textContent = text;
        if (isFull) option.disabled = true;
        deptSelect.appendChild(option);
    });
}

function resetCurrentDeviceToken() {
    const isConfirm = confirm("🔓 คุณต้องการล้างสิทธิ์อุปกรณ์เครื่องนี้เพื่อให้พนักงานคนอื่นยืมใช้งานใช่หรือไม่?");
    if (isConfirm) {
        localStorage.removeItem('warehouse_device_token');
        alert("✅ ปลดล็อกอุปกรณ์สำเร็จ! เครื่องนี้พร้อมสำหรับให้พนักงานคนอื่นใช้ลงทะเบียนหรือเข้างานแล้ว");
        location.reload();
    }
}