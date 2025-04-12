// Khai báo biến toàn cục
let database;
let currentUser = null;
let userType = null;
let startTime = 0;
let endTime = 0;
let selectedFieldId = null;
let bookedSlots = [];


//------Khởi tạo và theo dõi trạng thái khi tải trang------
/* Mô tả: Khởi tạo Firebase và theo dõi trạng thái đăng nhập của người dùng khi trang index.html được tải
   - Kiểm tra Firebase SDK
   - Cấu hình và khởi tạo Firebase
   - Theo dõi trạng thái đăng nhập và kiểm tra vai trò để hiển thị nội dung phù hợp
   - Chỉ cho phép truy cập nếu vai trò là "user"
*/
document.addEventListener("DOMContentLoaded", function() {
    // Kiểm tra xem Firebase SDK đã được tải chưa
    if (typeof firebase === "undefined") {
        console.error("Firebase SDK chưa được tải! Kiểm tra script trong index.html.");
        return;
    }

    // Cấu hình Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyDd4KmOJms1VR5ekbonEETa7HJUqFl5InY",
        authDomain: "sports-field-f538f.firebaseapp.com",
        databaseURL: "https://sports-field-f538f-default-rtdb.firebaseio.com",
        projectId: "sports-field-f538f",
        storageBucket: "sports-field-f538f.firebasestorage.app",
        messagingSenderId: "548893788178",
        appId: "1:548893788178:web:5556f1695cfbee3f1770cb"
    };

    // Khởi tạo Firebase một lần duy nhất
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();

    // Theo dõi trạng thái đăng nhập
    firebase.auth().onAuthStateChanged((user) => {
        if (!user) {
            window.location.href = "login.html"; // Chuyển hướng đến login.html nếu chưa đăng nhập
        } else {
            currentUser = user;
            console.log("UID hiện tại:", user.uid); // Debug: Hiển thị UID
            database.ref("users").child(user.uid).once("value").then((snapshot) => {
                const userData = snapshot.val();
                console.log("Dữ liệu người dùng:", userData); // Debug: Hiển thị dữ liệu người dùng
                if (userData && userData.role) {
                    userType = userData.role;
                    console.log("Vai trò hiện tại:", userType); // Debug: Hiển thị vai trò
                    if (userType !== "user") {
                        alert("Chỉ người dùng mới có quyền truy cập!");
                        window.location.href = "login.html"; // Chuyển hướng nếu không phải user
                        return;
                    }
                    document.getElementById("user-info").style.display = "block";
                    document.getElementById("user-email").textContent = `Xin chào, ${user.email} (${userType})`;
                    displayFields(); // Hiển thị danh sách sân
                    displayBookingHistory(); // Hiển thị lịch sử đặt sân
                } else {
                    alert("Vai trò chưa được gán. Liên hệ admin để gán quyền!");
                    firebase.auth().signOut(); // Đăng xuất nếu không có vai trò
                }
            }).catch((error) => {
                console.error("Lỗi khi lấy vai trò:", error);
            });
        }
    });
});
//------Hiển thị danh sách sân------
/* Mô tả: Hiển thị danh sách sân từ Firebase
   - Lấy dữ liệu từ node "sportsFields" và "bookings"
   - Lọc theo từ khóa tìm kiếm và loại sân
   - Hiển thị sân với thời gian đã đặt và link Google Maps
*/
window.displayFields = function() {
    const fieldList = document.getElementById("field-list");
    const searchTerm = document.getElementById("search-field").value.toLowerCase();
    const filterType = document.getElementById("filter-type").value.toLowerCase();

    fieldList.innerHTML = "";
    document.getElementById("booking-timeline").style.display = "none";

    // Lấy dữ liệu bookings trước để kiểm tra thời gian đã đặt
    database.ref("bookings").once("value").then((bookingsSnapshot) => {
        const bookings = bookingsSnapshot.val() || {};

        // Lấy dữ liệu sân
        database.ref("sportsFields").once("value").then((snapshot) => {
            const fields = snapshot.val() || {};
            Object.keys(fields).forEach((key) => {
                const data = fields[key];
                if ((data.name.toLowerCase().includes(searchTerm) || data.location.toLowerCase().includes(searchTerm)) &&
                    (!filterType || data.type.toLowerCase() === filterType)) {
                    // Lấy danh sách thời gian đã đặt cho sân này
                    const bookedTimes = [];
                    Object.values(bookings).forEach((booking) => {
                        if (booking.fieldId === key && (booking.status === "confirmed" || booking.status === "pending")) {
                            bookedTimes.push(booking.bookedTime || "Không rõ");
                        }
                    });
                    const bookedTimesText = bookedTimes.length > 0 ? bookedTimes.join(", ") : "Chưa có đặt sân";

                    // Lấy link Google Maps từ trường googleMaps, fallback nếu không có
                    const googleMapsUrl = data.googleMaps || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.location || "Thành Phố Thái Nguyên")}`;

                    const fieldCard = `
                        <div class="field-card">
                            <h3>${data.name} - ${data.fieldNumber}</h3>
                            <p>Địa chỉ: ${data.location}</p>
                            <p>Loại sân: ${data.type} - Giá: ${data.price} VND/giờ</p>
                            <p>Thời gian có hẹn: ${bookedTimesText}</p>
                            <a href="${googleMapsUrl}" target="_blank" class="map-link">Chỉ đường trên Google Maps</a>
                            <button id="btn-ds" onclick="selectField('${key}')">Đặt sân</button>
                        </div>
                    `;
                    fieldList.innerHTML += fieldCard;
                }
            });
        }).catch((error) => {
            console.error("Lỗi khi lấy danh sách sân:", error);
        });
    }).catch((error) => {
        console.error("Lỗi khi lấy danh sách đặt sân:", error);
    });
};

//------Chọn sân để đặt------
/* Mô tả: Hiển thị modal với timeline khi người dùng chọn sân
   - Lưu ID sân được chọn
   - Lấy danh sách các khoảng thời gian đã đặt từ Firebase (theo ngày được chọn)
   - Hiển thị modal với timeline để chọn thời gian
*/
window.selectField = function(fieldId) {
    selectedFieldId = fieldId;

    // Hiển thị modal
    const modal = document.getElementById("booking-modal");
    const bookingTimeline = document.getElementById("booking-timeline");

    // Thêm trường chọn ngày vào timeline
    const existingDateInput = document.getElementById("date-input-container");
    if (existingDateInput) {
        existingDateInput.remove();
    }
    const dateInput = document.createElement("div");
    dateInput.id = "date-input-container";
    dateInput.innerHTML = `
        <label for="booking-date">Chọn ngày đặt sân:</label>
        <input type="date" id="booking-date" value="${new Date().toISOString().split("T")[0]}" onchange="updateBookedSlots()">
    `;
    bookingTimeline.insertBefore(dateInput, bookingTimeline.firstChild);

    // Hiển thị timeline
    bookingTimeline.style.display = "block";
    modal.style.display = "flex"; // Hiển thị modal

    // Hàm cập nhật danh sách bookedSlots dựa trên ngày được chọn
    window.updateBookedSlots = function() {
        const selectedDate = document.getElementById("booking-date").value;
        if (!selectedDate) {
            alert("Vui lòng chọn ngày đặt sân!");
            return;
        }

        // Lấy danh sách các khoảng thời gian đã đặt từ Firebase, lọc theo ngày
        database.ref("bookings").once("value").then((snapshot) => {
            bookedSlots = [];
            const bookings = snapshot.val() || {};
            Object.values(bookings).forEach((booking) => {
                if (booking.fieldId === fieldId && 
                    booking.status === "confirmed" && 
                    booking.date === selectedDate) {
                    const [start, end] = booking.bookedTime.split(" - ");
                    bookedSlots.push({ start, end });
                }
            });
            initializeTimeline(); // Cập nhật timeline với bookedSlots mới
        }).catch((error) => {
            console.error("Lỗi khi lấy danh sách đặt sân:", error);
            initializeTimeline(); // Vẫn hiển thị timeline nếu có lỗi
        });
    };

    // Gọi lần đầu để khởi tạo timeline cho ngày mặc định
    updateBookedSlots();
};

//------Đóng modal------
/* Mô tả: Đóng modal đặt sân và làm sạch dữ liệu tạm thời */
window.closeBookingModal = function() {
    const modal = document.getElementById("booking-modal");
    const bookingTimeline = document.getElementById("booking-timeline");
    modal.style.display = "none";
    bookingTimeline.style.display = "none"; // Ẩn timeline khi đóng modal
    selectedFieldId = null;
    startTime = 0;
    endTime = 0;
    bookedSlots = [];
};
//------Khởi tạo timeline------
/* Mô tả: Khởi tạo thanh thời gian với các mốc 30 phút từ 6h đến 22h
   - Hiển thị các mốc thời gian trên thanh timeline
   - Hiển thị các khoảng thời gian đã đặt
   - Thiết lập vị trí ban đầu cho start và end handle
   - Đảm bảo khoảng cách tối thiểu giữa start và end là 2 mốc (1 giờ)
   - Thêm sự kiện kéo thả
*/
window.initializeTimeline = function() {
    const timeline = document.getElementById("timeline");
    const startHandle = document.getElementById("start-handle");
    const endHandle = document.getElementById("end-handle");
    const selectedRange = document.getElementById("selected-range");
    const timeRange = document.getElementById("time-range");
    const timeMarks = document.getElementById("time-marks");
    const bookedSlotsDiv = document.getElementById("booked-slots");

    let isDraggingStart = false;
    let isDraggingEnd = false;

    // Tổng số mốc thời gian từ 6h đến 22h, mỗi mốc 30 phút
    const totalSlots = (22 - 6) * 2; // 16 tiếng * 2 mốc = 32 mốc
    const slotPercentage = 100 / totalSlots; // Mỗi mốc chiếm 100/32 = 3.125%

    // Hiển thị các mốc thời gian
    timeMarks.innerHTML = "";
    for (let hour = 6; hour <= 22; hour++) {
        const mark1 = document.createElement("div");
        mark1.className = "time-mark";
        mark1.textContent = `${hour}h`;
        timeMarks.appendChild(mark1);

        if (hour < 22) {
            const mark2 = document.createElement("div");
            mark2.className = "time-mark";
            mark2.textContent = `${hour}:30`;
            timeMarks.appendChild(mark2);
        }
    }

    // Hiển thị các khoảng thời gian đã đặt
    bookedSlotsDiv.innerHTML = "";
    bookedSlots.forEach(slot => {
        const startSlot = timeToSlot(slot.start);
        const endSlot = timeToSlot(slot.end);
        const startPos = startSlot * slotPercentage;
        const endPos = endSlot * slotPercentage;

        const bookedDiv = document.createElement("div");
        bookedDiv.className = "booked-slot";
        bookedDiv.style.left = `${startPos}%`;
        bookedDiv.style.width = `${endPos - startPos}%`;
        bookedSlotsDiv.appendChild(bookedDiv);
    });

    // Đặt vị trí ban đầu (6h và 7h, tức là 2 mốc)
    startTime = 0; // 6h
    endTime = 2 * slotPercentage; // 7h (2 mốc)
    updateHandlesAndRange();

    // Sự kiện kéo thả
    startHandle.addEventListener("mousedown", () => (isDraggingStart = true));
    endHandle.addEventListener("mousedown", () => (isDraggingEnd = true));
    document.addEventListener("mouseup", () => {
        isDraggingStart = false;
        isDraggingEnd = false;
    });
    document.addEventListener("mousemove", (e) => {
        if (isDraggingStart || isDraggingEnd) {
            const rect = timeline.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            const width = rect.width;
            let newPos = (offsetX / width) * 100;

            // Giới hạn trong khoảng 0-100% và chia mốc 30 phút
            newPos = Math.round(newPos / slotPercentage) * slotPercentage;
            newPos = Math.max(0, Math.min(100, newPos));

            if (isDraggingStart) {
                startTime = Math.min(newPos, endTime - 2 * slotPercentage); // Đảm bảo khoảng cách tối thiểu 1h (2 mốc)
                if (startTime < 0) startTime = 0;
            } else if (isDraggingEnd) {
                endTime = Math.max(newPos, startTime + 2 * slotPercentage); // Đảm bảo khoảng cách tối thiểu 1h (2 mốc)
                if (endTime > 100) endTime = 100;
            }

            updateHandlesAndRange();
        }
    });

    // Chuyển thời gian thành slot (tính từ 6h)
    function timeToSlot(time) {
        const [hour, min] = time.split(":").map(Number);
        const totalMinutes = (hour - 6) * 60 + (min || 0);
        return totalMinutes / 30; // Mỗi 30 phút là 1 slot
    }

    // Cập nhật thời gian hiển thị
    function updateHandlesAndRange() {
        startHandle.style.left = `${startTime}%`;
        endHandle.style.right = `${100 - endTime}%`;
        selectedRange.style.left = `${startTime}%`;
        selectedRange.style.right = `${100 - endTime}%`;

        // Tính thời gian từ 6h
        const startSlot = Math.round(startTime / slotPercentage);
        const endSlot = Math.round(endTime / slotPercentage);
        const startHour = 6 + Math.floor(startSlot / 2);
        const endHour = 6 + Math.floor(endSlot / 2);
        const startMin = (startSlot % 2 === 0) ? "00" : "30";
        const endMin = (endSlot % 2 === 0) ? "00" : "30";
        timeRange.textContent = `${startHour}:${startMin} - ${endHour}:${endMin}`;
    }
};

//------Đặt sân------
/* Mô tả: Gửi yêu cầu đặt sân với thông tin sân, ngày và thời gian đã chọn
   - Kiểm tra trùng lặp thời gian đã đặt (theo ngày) trước khi lưu
   - Lưu thông tin đặt sân vào node "bookings" trong Firebase
   - Đóng modal sau khi đặt thành công
*/
window.bookField = function() {
    if (!currentUser || !selectedFieldId) {
        alert("Vui lòng chọn sân và đăng nhập để đặt!");
        return;
    }

    // Lấy ngày và thời gian đã chọn
    const selectedDate = document.getElementById("booking-date").value;
    const selectedTime = document.getElementById("time-range").textContent;

    if (!selectedDate) {
        alert("Vui lòng chọn ngày đặt sân!");
        return;
    }
    if (!selectedTime) {
        alert("Vui lòng chọn khoảng thời gian!");
        return;
    }

    // Chuyển đổi thời gian thành slot để kiểm tra
    const [startTimeStr, endTimeStr] = selectedTime.split(" - ");
    const startSlot = timeToSlot(startTimeStr);
    const endSlot = timeToSlot(endTimeStr);

    // Kiểm tra trùng lặp với thời gian đã đặt (theo ngày)
    let isOverlapping = false;
    bookedSlots.forEach(slot => {
        const bookedStart = timeToSlot(slot.start);
        const bookedEnd = timeToSlot(slot.end);
        if (startSlot < bookedEnd && endSlot > bookedStart) {
            isOverlapping = true;
        }
    });

    if (isOverlapping) {
        alert("Khoảng thời gian này đã có người đặt, vui lòng chọn khoảng thời gian khác!");
        return;
    }

    database.ref("sportsFields").child(selectedFieldId).once("value").then((snapshot) => {
        const fieldData = snapshot.val();
        const bookingData = {
            userId: currentUser.uid,
            fieldId: selectedFieldId,
            fieldName: fieldData.name,
            date: selectedDate,
            bookedTime: selectedTime,
            status: "pending",
            timestamp: Date.now(),
            isNotified: false
        };

        database.ref("bookings").push(bookingData).then(() => {
            alert("Đặt sân thành công! Vui lòng chờ xác nhận từ chủ sân.");
            closeBookingModal();
        }).catch((error) => {
            console.error("Lỗi khi đặt sân:", error);
            alert("Có lỗi xảy ra khi đặt sân!");
        });
    });
};

//------Chuyển thời gian thành slot (tính từ 6h)------
/* Mô tả: Chuyển đổi chuỗi thời gian thành slot để so sánh
   - Input: "9:00" hoặc "14:30"
   - Output: Số slot tính từ 6h (mỗi 30 phút là 1 slot)
*/
function timeToSlot(time) {
    const [hour, min] = time.split(":").map(Number);
    const totalMinutes = (hour - 6) * 60 + (min || 0);
    return totalMinutes / 30; // Mỗi 30 phút là 1 slot
}
//------Hiển thị lịch sử đặt sân------
/* Mô tả: Hiển thị danh sách lịch sử đặt sân của người dùng hiện tại
   - Lấy dữ liệu từ node "bookings" trong Firebase, lọc theo userId
   - Hiển thị thông tin: tên sân, ngày, giờ, trạng thái (bằng tiếng Việt), và nút hủy (nếu trạng thái là pending)
   - Hiển thị thông báo nếu không có lịch sử
*/
function displayBookingHistory() {
    const historyList = document.getElementById("history-list");
    if (!historyList || !currentUser || userType !== "user") return; // Kiểm tra quyền truy cập
    historyList.innerHTML = ""; // Xóa nội dung cũ

    database.ref("bookings").orderByChild("userId").equalTo(currentUser.uid).once("value").then((snapshot) => {
        const bookings = snapshot.val();
        if (bookings) {
            Object.keys(bookings).forEach((key) => {
                const data = bookings[key];
                const fieldName = data.fieldName || "Tên sân không xác định";

                // Định dạng ngày từ trường date (giả sử là timestamp hoặc chuỗi ngày)
                let dateText = "Ngày không xác định";
                if (data.date) {
                    if (typeof data.date === "number") {
                        dateText = new Date(data.date).toLocaleDateString("vi-VN"); // Định dạng ngày kiểu Việt Nam
                    } else if (typeof data.date === "string") {
                        dateText = new Date(data.date).toLocaleDateString("vi-VN"); // Xử lý chuỗi ngày
                    }
                }

                // Lấy giờ từ bookedTime
                const bookedTime = data.bookedTime || "Giờ không xác định";

                // Chuyển đổi trạng thái sang tiếng Việt
                let statusText = data.status || "Chưa xác định";
                switch (statusText.toLowerCase()) {
                    case "pending":
                        statusText = "Đang chờ";
                        break;
                    case "confirmed":
                        statusText = "Đã xác nhận";
                        break;
                    case "cancelled":
                        statusText = "Đã hủy";
                        break;
                }
                const bookingItem = `
                    <div class="booking-item">
                        <p>Sân: ${fieldName} - Ngày: ${dateText} - Giờ: ${bookedTime} - Trạng thái: ${statusText}
                        ${data.status === "pending" ? `<button onclick="cancelBooking('${key}')">Hủy</button>` : ""}
                        </p>
                    </div>
                `;
                historyList.innerHTML += bookingItem;
            });
        } else {
            historyList.innerHTML = "<p>Chưa có lịch sử đặt sân!</p>";
        }
    }).catch((error) => {
        console.error("Lỗi khi lấy lịch sử đặt sân:", error);
        historyList.innerHTML = "<p>Có lỗi xảy ra khi tải lịch sử đặt sân!</p>";
    });
}

//------Xử lý tìm kiếm sân------
/* Mô tả: Kích hoạt tìm kiếm sân khi người dùng nhập từ khóa hoặc chọn loại sân
   - Gọi lại hàm displayFields để áp dụng bộ lọc và hiển thị kết quả
*/
window.searchFields = function() {
    displayFields(); // Gọi lại displayFields để áp dụng tìm kiếm
};

//------Xử lý tìm kiếm sân (phụ)------
/* Mô tả: Hàm phụ để kích hoạt tìm kiếm sân (giống window.searchFields)
   - Được gọi khi có sự kiện thay đổi trên input hoặc select
*/
function searchFields() {
    displayFields(); // Gọi lại displayFields để áp dụng tìm kiếm
}

//------Hủy đặt sân------
/* Mô tả: Xử lý hủy đặt sân của người dùng
   - Kiểm tra quyền truy cập (chỉ "user" được phép hủy)
   - Cập nhật trạng thái đặt sân thành "cancelled" trong node "bookings"
   - Cập nhật danh sách sân và lịch sử đặt sân sau khi hủy
   - Hiển thị thông báo lỗi nếu thất bại
*/
window.cancelBooking = function(bookingId) {
    if (!currentUser || userType !== "user") {
        alert("Chỉ người dùng mới có quyền hủy đặt sân!");
        return;
    }
    if (confirm("Bạn có chắc muốn hủy đặt sân này?")) {
        database.ref("bookings").child(bookingId).update({ status: "cancelled" }).then(() => {
            alert("Hủy đặt sân thành công!");
            displayBookingHistory();
            displayFields(); // Cập nhật giờ trống
        }).catch((error) => {
            console.error("Lỗi khi hủy:", error);
            alert("Có lỗi xảy ra khi hủy đặt sân!");
        });
    }
};

//------Xử lý đăng xuất------
/* Mô tả: Xử lý quá trình đăng xuất của người dùng
   - Gọi phương thức signOut của Firebase Authentication
   - Hiển thị thông báo thành công hoặc lỗi nếu thất bại
*/
window.logout = function() {
    firebase.auth().signOut().then(() => {
        alert("Đăng xuất thành công!");
    }).catch((error) => {
        console.error("Lỗi đăng xuất:", error);
        alert("Lỗi đăng xuất: " + error.message);
    });
};
//------Chuyển đổi section------
/* Mô tả: Hiển thị section tương ứng khi người dùng bấm vào các nút điều hướng
   - Ẩn tất cả các section
   - Hiển thị section được chọn
   - Cập nhật trạng thái active của nút điều hướng
   - Gọi hàm hiển thị dữ liệu nếu cần (đặt sân, lịch sử, tài khoản)
*/
window.showSection = function(sectionId) {
    // Ẩn tất cả các section
    const sections = document.querySelectorAll("section");
    sections.forEach(section => {
        section.style.display = "none";
        section.classList.remove("active");
    });

    // Hiển thị section được chọn
    const selectedSection = document.getElementById(sectionId);
    selectedSection.style.display = "block";
    selectedSection.classList.add("active");

    // Cập nhật trạng thái active của nút điều hướng
    const navLinks = document.querySelectorAll("nav ul li a");
    navLinks.forEach(link => {
        link.classList.remove("active");
        if (link.getAttribute("onclick") === `showSection('${sectionId}')`) {
            link.classList.add("active");
        }
    });

    // Gọi hàm hiển thị dữ liệu nếu cần
    if (sectionId === "booking-section") {
        displayFields();
    } else if (sectionId === "history-section") {
        displayBookingHistory();
    } else if (sectionId === "account-section" && currentUser) {
        displayUserInfo();
    }
};

//------Hiển thị thông tin tài khoản------
/* Mô tả: Lấy thông tin tài khoản từ Firebase và hiển thị trên section "Tài khoản"
   - Kiểm tra trạng thái đăng nhập
   - Lấy dữ liệu từ node "users" trong Firebase
   - Cập nhật các phần tử HTML với thông tin tài khoản
   - Hiển thị thông báo nếu không có dữ liệu
*/
window.displayUserInfo = function() {
    if (!currentUser) {
        alert("Vui lòng đăng nhập để xem thông tin tài khoản!");
        return;
    }

    database.ref("users").child(currentUser.uid).once("value").then((snapshot) => {
        const userData = snapshot.val();
        if (userData) {
            document.getElementById("user-fullname").textContent = userData.fullname || "Chưa có thông tin";
            document.getElementById("user-email").textContent = userData.email || "Chưa có thông tin";
            document.getElementById("user-phone").textContent = userData.phone || "Chưa có thông tin";
            document.getElementById("user-role").textContent = userData.role || "Chưa xác định";
        } else {
            document.getElementById("user-info").innerHTML = "<p>Không tìm thấy thông tin tài khoản!</p>";
        }
    }).catch((error) => {
        console.error("Lỗi khi lấy thông tin tài khoản:", error);
        alert("Có lỗi xảy ra khi lấy thông tin tài khoản!");
    });
};