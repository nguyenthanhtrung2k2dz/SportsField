// Khai báo biến toàn cục
let database;
let currentUser = null;
let userType = null;
let editingFieldId = null; // Biến để lưu ID sân đang chỉnh sửa

//------Khởi tạo và theo dõi trạng thái khi tải trang------
/* Mô tả: Khởi tạo Firebase và theo dõi trạng thái đăng nhập của người dùng khi trang owner.html được tải
   - Kiểm tra Firebase SDK
   - Cấu hình và khởi tạo Firebase
   - Theo dõi trạng thái đăng nhập và kiểm tra vai trò để hiển thị nội dung phù hợp
   - Chỉ cho phép truy cập nếu vai trò là "owner"
*/
document.addEventListener("DOMContentLoaded", function() {
    // Kiểm tra xem Firebase SDK đã được tải chưa
    if (typeof firebase === "undefined") {
        console.error("Firebase SDK chưa được tải!");
        return;
    }

    // Cấu hình Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyDd4KmOJms1VR5ekbonEETa7HJUqFl5InY",
        authDomain: "sports-field-f538f.firebaseapp.com",
        databaseURL: "https://sports-field-f538f-default-rtdb.firebaseio.com",
        projectId: "sports-field-f538f",
        storageBucket: "sports-field-f538f.appspot.com",
        messagingSenderId: "548893788178",
        appId: "1:548893788178:web:5556f1695cfbee3f1770cb"
    };

    // Khởi tạo Firebase
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();

    // Theo dõi trạng thái đăng nhập
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            database.ref("users").child(user.uid).once("value").then((snapshot) => {
                const userData = snapshot.val();
                if (userData && userData.role) {
                    userType = userData.role;
                    if (userType !== "owner") {
                        alert("Chỉ chủ sân mới có quyền truy cập!");
                        window.location.href = "index.html";
                        return;
                    }
                    document.getElementById("user-info").style.display = "block";
                    document.getElementById("user-email").textContent = `Xin chào (${userType})`; // Chỉ hiển thị vai trò
                    // Hiển thị section mặc định là Trang chủ
                    showSection("owner-home-section");
                } else {
                    alert("Vai trò chưa được gán. Liên hệ admin để gán quyền!");
                    firebase.auth().signOut();
                }
            }).catch((error) => {
                console.error("Lỗi khi lấy vai trò:", error);
                alert("Có lỗi xảy ra khi lấy thông tin người dùng!");
            });
        } else {
            currentUser = null;
            userType = null;
            window.location.href = "login.html";
        }
    });
});

//------Chuyển đổi section------
/* Mô tả: Hiển thị section tương ứng khi người dùng bấm vào các nút điều hướng
   - Ẩn tất cả các section
   - Hiển thị section được chọn
   - Cập nhật trạng thái active của nút điều hướng
   - Gọi hàm hiển thị dữ liệu nếu cần
*/
window.showSection = function(sectionId) {
    const sections = document.querySelectorAll("section");
    sections.forEach(section => {
        section.style.display = "none";
        section.classList.remove("active");
    });

    const selectedSection = document.getElementById(sectionId);
    selectedSection.style.display = "block";
    selectedSection.classList.add("active");

    const navLinks = document.querySelectorAll("nav ul li a");
    navLinks.forEach(link => {
        link.classList.remove("active");
        if (link.getAttribute("onclick") === `showSection('${sectionId}')`) {
            link.classList.add("active");
        }
    });

    if (sectionId === "manage-fields-section" && currentUser) {
        displayOwnerFields();
    } else if (sectionId === "confirm-bookings-section" && currentUser) {
        displayBookingRequests();
    } else if (sectionId === "owner-account-section" && currentUser) {
        displayUserInfo();
    } else if (sectionId === "booked-fields-section" && currentUser) {
        displayBookedFields();
    } else if (sectionId === "statistics-section" && currentUser) {
        displayStatistics();
    }
};

//------Hiển thị form thêm sân------
window.showAddFieldForm = function() {
    const addFieldForm = document.getElementById("add-field-form");
    if (addFieldForm) {
        addFieldForm.style.display = "block";
    } else {
        console.error("Form thêm sân mới (add-field-form) không tồn tại trong HTML!");
        alert("Có lỗi: Form thêm sân mới không được tìm thấy!");
    }
};

//------Ẩn form thêm sân------
window.hideAddFieldForm = function() {
    const addFieldForm = document.getElementById("add-field-form");
    if (addFieldForm) {
        addFieldForm.style.display = "none";
        // Đặt lại các giá trị trong form
        document.getElementById("field-name").value = "";
        document.getElementById("field-number").value = "";
        document.getElementById("field-type").value = "bóng đá";
        document.getElementById("field-price").value = "";
        document.getElementById("field-location").value = "";
        document.getElementById("field-google-maps").value = "";
    } else {
        console.error("Form thêm sân mới (add-field-form) không tồn tại trong HTML!");
    }
};

//------Thêm sân mới------
/* Mô tả: Xử lý thêm sân mới vào hệ thống
   - Lấy thông tin từ form (tên, số sân, loại, giá, địa chỉ, liên kết Google Maps)
   - Kiểm tra các trường bắt buộc
   - Lưu thông tin sân vào node "sportsFields" với ownerId là UID của chủ sân
   - Cập nhật danh sách sân sau khi thêm thành công
   - Hiển thị thông báo lỗi nếu thất bại
*/
window.addField = function() {
    const name = document.getElementById("field-name").value;
    const fieldNumber = document.getElementById("field-number").value;
    const type = document.getElementById("field-type").value;
    const price = document.getElementById("field-price").value;
    const location = document.getElementById("field-location").value;
    const googleMaps = document.getElementById("field-google-maps").value;

    // Kiểm tra các trường bắt buộc
    if (!name || !fieldNumber || !type || !price || !location) {
        alert("Vui lòng điền đầy đủ thông tin sân (tên, sân số, loại, giá, địa chỉ là bắt buộc)!");
        return;
    }

    // Kiểm tra giá trị hợp lệ cho price
    const priceValue = parseInt(price);
    if (isNaN(priceValue) || priceValue <= 0) {
        alert("Giá sân phải là một số dương!");
        return;
    }

    // Kiểm tra liên kết Google Maps
    let googleMapsUrl = googleMaps;
    if (!googleMapsUrl) {
        googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
    } else {
        // Kiểm tra xem liên kết có phải là URL hợp lệ không
        try {
            new URL(googleMapsUrl);
        } catch (e) {
            alert("Liên kết Google Maps không hợp lệ! Vui lòng nhập lại hoặc để trống để tự động tạo.");
            return;
        }
    }

    const fieldData = {
        name: name,
        fieldNumber: fieldNumber,
        type: type,
        price: priceValue,
        location: location,
        googleMaps: googleMapsUrl,
        ownerId: currentUser.uid
    };

    database.ref("sportsFields").push(fieldData).then(() => {
        alert("Thêm sân thành công!");
        hideAddFieldForm();
        displayOwnerFields();
    }).catch((error) => {
        console.error("Lỗi khi thêm sân:", error);
        alert("Có lỗi xảy ra khi thêm sân: " + error.message);
    });
};

//------Hiển thị danh sách sân của chủ sân------
/* Mô tả: Hiển thị danh sách sân thuộc sở hữu của chủ sân hiện tại
   - Lấy dữ liệu từ node "sportsFields" và lọc theo ownerId
   - Hiển thị thông tin sân: tên, số sân, địa chỉ, loại, giá, và liên kết Google Maps
   - Cung cấp nút chỉnh sửa và xóa cho từng sân
*/
window.displayOwnerFields = function() {
    const fieldList = document.getElementById("owner-field-list");
    if (!fieldList || !currentUser) return;
    fieldList.innerHTML = "<p>Đang tải danh sách sân...</p>";

    database.ref("sportsFields").once("value").then((snapshot) => {
        const fields = snapshot.val() || {};
        fieldList.innerHTML = ""; // Xóa thông báo "Đang tải"

        let hasFields = false;
        Object.keys(fields).forEach((key) => {
            const data = fields[key];
            if (data.ownerId === currentUser.uid) {
                hasFields = true;
                const fieldCard = `
                    <div class="field-card">
                        <h3>${data.name || "Tên không có"} - ${data.fieldNumber || "Không có sân số"}</h3>
                        <p>Địa chỉ: ${data.location || "Vị trí không có"}</p>
                        <p>Loại: ${data.type || "Loại không có"} - Giá: ${data.price || 0} VND/giờ</p>
                        ${data.googleMaps ? `<a href="${data.googleMaps}" target="_blank" class="map-link">Chỉ đường trên Google Maps</a>` : '<p>Chưa có liên kết Google Maps</p>'}
                        <button onclick="editField('${key}')">Chỉnh sửa</button>
                        <button onclick="deleteField('${key}')">Xóa sân</button>
                    </div>
                `;
                fieldList.innerHTML += fieldCard;
            }
        });

        if (!hasFields) {
            fieldList.innerHTML = "<p>Bạn chưa có sân nào. Hãy thêm sân mới!</p>";
        }
    }).catch((error) => {
        console.error("Lỗi khi lấy danh sách sân:", error);
        fieldList.innerHTML = "<p>Có lỗi xảy ra khi tải danh sách sân!</p>";
    });
};

//------Mở form chỉnh sửa sân------
/* Mô tả: Mở form chỉnh sửa thông tin sân dựa trên ID sân được chọn
   - Lấy dữ liệu sân từ node "sportsFields" và điền vào form chỉnh sửa
   - Hiển thị form khi người dùng nhấp vào nút "Chỉnh sửa"
*/
window.editField = function(fieldId) {
    editingFieldId = fieldId;
    const editForm = document.getElementById("edit-field-form");
    if (!editForm) {
        console.error("Form chỉnh sửa không tồn tại trong HTML!");
        alert("Có lỗi: Form chỉnh sửa không được tìm thấy!");
        return;
    }

    database.ref("sportsFields").child(fieldId).once("value").then((snapshot) => {
        const data = snapshot.val();
        if (data) {
            document.getElementById("edit-field-id").value = fieldId;
            document.getElementById("edit-field-name").value = data.name || "";
            document.getElementById("edit-field-number").value = data.fieldNumber || "";
            document.getElementById("edit-field-type").value = data.type || "bóng đá";
            document.getElementById("edit-field-price").value = data.price || "";
            document.getElementById("edit-field-location").value = data.location || "";
            document.getElementById("edit-field-google-maps").value = data.googleMaps || "";
            editForm.style.display = "block";
        } else {
            console.error("Không tìm thấy thông tin sân với ID:", fieldId);
            alert("Không tìm thấy thông tin sân! Vui lòng kiểm tra lại ID sân.");
        }
    }).catch((error) => {
        console.error("Lỗi khi lấy thông tin sân:", error);
        alert("Có lỗi xảy ra khi lấy thông tin sân: " + error.message);
    });
};

//------Lưu chỉnh sửa sân------
/* Mô tả: Lưu thông tin đã chỉnh sửa của sân
   - Lấy dữ liệu từ form chỉnh sửa và kiểm tra các trường bắt buộc
   - Cập nhật dữ liệu vào node "sportsFields" với ID tương ứng
   - Ẩn form và cập nhật danh sách sân sau khi lưu thành công
   - Hiển thị thông báo lỗi nếu thất bại
*/
window.saveEditField = function() {
    const fieldId = document.getElementById("edit-field-id").value;
    const name = document.getElementById("edit-field-name").value;
    const fieldNumber = document.getElementById("edit-field-number").value;
    const type = document.getElementById("edit-field-type").value;
    const price = document.getElementById("edit-field-price").value;
    const location = document.getElementById("edit-field-location").value;
    const googleMaps = document.getElementById("edit-field-google-maps").value;

    if (!name || !fieldNumber || !type || !price || !location) {
        alert("Vui lòng điền đầy đủ thông tin sân!");
        return;
    }

    const priceValue = parseInt(price);
    if (isNaN(priceValue) || priceValue <= 0) {
        alert("Giá sân phải là một số dương!");
        return;
    }

    // Kiểm tra liên kết Google Maps
    let googleMapsUrl = googleMaps;
    if (!googleMapsUrl) {
        googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
    } else {
        try {
            new URL(googleMapsUrl);
        } catch (e) {
            alert("Liên kết Google Maps không hợp lệ! Vui lòng nhập lại hoặc để trống để tự động tạo.");
            return;
        }
    }

    const updatedFieldData = {
        name: name,
        fieldNumber: fieldNumber,
        type: type,
        price: priceValue,
        location: location,
        googleMaps: googleMapsUrl,
        ownerId: currentUser.uid
    };

    database.ref("sportsFields").child(fieldId).update(updatedFieldData).then(() => {
        alert("Cập nhật sân thành công!");
        cancelEditField();
        displayOwnerFields();
    }).catch((error) => {
        console.error("Lỗi khi cập nhật sân:", error);
        alert("Có lỗi xảy ra khi cập nhật sân: " + error.message);
    });
};

//------Hủy chỉnh sửa sân------
/* Mô tả: Hủy và ẩn form chỉnh sửa sân
   - Ẩn form và đặt lại các giá trị trong form về rỗng
   - Đặt lại biến editingFieldId
*/
window.cancelEditField = function() {
    const editForm = document.getElementById("edit-field-form");
    editForm.style.display = "none";
    document.getElementById("edit-field-id").value = "";
    document.getElementById("edit-field-name").value = "";
    document.getElementById("edit-field-number").value = "";
    document.getElementById("edit-field-type").value = "";
    document.getElementById("edit-field-price").value = "";
    document.getElementById("edit-field-location").value = "";
    document.getElementById("edit-field-google-maps").value = "";
    editingFieldId = null;
};

//------Xóa sân------
/* Mô tả: Xóa sân và các đặt sân liên quan
   - Xác nhận với người dùng trước khi xóa
   - Xóa sân khỏi node "sportsFields" và các đặt sân liên quan khỏi node "bookings"
   - Cập nhật danh sách sân và yêu cầu đặt sân sau khi xóa thành công
   - Hiển thị thông báo lỗi nếu thất bại
*/
window.deleteField = function(fieldId) {
    if (!confirm("Bạn có chắc muốn xóa sân này? Tất cả đặt sân liên quan cũng sẽ bị xóa.")) return;

    // Xóa sân
    database.ref("sportsFields").child(fieldId).remove().then(() => {
        // Xóa tất cả đặt sân liên quan
        database.ref("bookings").once("value").then((snapshot) => {
            const bookings = snapshot.val();
            if (bookings) {
                const updates = {};
                Object.keys(bookings).forEach((bookingId) => {
                    if (bookings[bookingId].fieldId === fieldId) {
                        updates[`bookings/${bookingId}`] = null;
                    }
                });
                return database.ref().update(updates);
            }
        }).then(() => {
            alert("Xóa sân và các đặt sân liên quan thành công!");
            displayOwnerFields();
            displayBookingRequests();
        }).catch((error) => {
            console.error("Lỗi khi xóa đặt sân:", error);
            alert("Có lỗi xảy ra khi xóa đặt sân!");
        });
    }).catch((error) => {
        console.error("Lỗi khi xóa sân:", error);
        alert("Có lỗi xảy ra khi xóa sân!");
    });
};

//------Hiển thị danh sách yêu cầu đặt sân------
/* Mô tả: Hiển thị danh sách yêu cầu đặt sân cho các sân thuộc sở hữu của chủ sân
   - Lấy dữ liệu từ node "sportsFields" và "bookings" trong Firebase
   - Lọc các yêu cầu dựa trên ownerId và lấy email người đặt từ node "users"
   - Hiển thị thông tin: tên sân, người đặt, giờ, trạng thái, và các nút xác nhận/hủy
   - Cải tiến: Định dạng thời gian thành khoảng (ví dụ: 7h-8h) và chuyển trạng thái sang tiếng Việt
*/
window.displayBookingRequests = function() {
    const bookingList = document.getElementById("booking-requests");
    if (!bookingList || !currentUser) return;
    bookingList.innerHTML = "<p>Đang tải yêu cầu đặt sân...</p>";

    database.ref("sportsFields").once("value").then((fieldsSnapshot) => {
        const fields = fieldsSnapshot.val() || {};
        const ownerFieldIds = Object.keys(fields).filter(key => fields[key].ownerId === currentUser.uid);

        database.ref("bookings").once("value").then((snapshot) => {
            const bookings = snapshot.val() || {};
            bookingList.innerHTML = ""; // Xóa thông báo "Đang tải"

            let hasRequests = false;
            const userPromises = [];

            Object.keys(bookings).forEach((key) => {
                const data = bookings[key];
                if (ownerFieldIds.includes(data.fieldId)) {
                    hasRequests = true;
                    userPromises.push(
                        database.ref("users").child(data.userId).once("value").then(userSnapshot => {
                            const userData = userSnapshot.val();
                            return { key, data, userEmail: userData ? userData.email : "Không xác định" };
                        })
                    );
                }
            });

            Promise.all(userPromises).then(results => {
                results.forEach(({ key, data, userEmail }) => {
                    // Định dạng thời gian từ bookedTime (giả sử là timestamp hoặc chuỗi)
                    let formattedTime = "Không có";
                    if (data.bookedTime) {
                        if (typeof data.bookedTime === 'string' && data.bookedTime.includes('-')) {
                            formattedTime = data.bookedTime; // Nếu đã là khoảng (ví dụ: "7h-8h")
                        } else if (typeof data.bookedTime === 'number') {
                            // Nếu là timestamp, chuyển thành giờ (cần điều chỉnh theo dữ liệu thực tế)
                            const startTime = new Date(data.bookedTime).getHours();
                            const endTime = startTime + 1; // Giả sử mỗi đặt sân là 1 giờ
                            formattedTime = `${startTime}h-${endTime}h`;
                        }
                    }

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

                    bookingList.innerHTML += `
                        <div class="field-card">
                            <h3>Sân: ${data.fieldName || "Không xác định"}</h3>
                            <p>Người đặt: ${userEmail} (${data.userId})</p>
                            <p>Giờ: ${formattedTime}</p>
                            <p>Ngày: ${data.date || "Không có"}</p>
                            <p>Trạng thái: ${statusText}</p>
                            ${data.status === "pending" ? `
                                <button onclick="confirmBooking('${key}')">Xác nhận</button>
                                <button onclick="cancelBooking('${key}')">Hủy</button>
                            ` : ""}
                        </div>
                    `;
                });
                if (!hasRequests) {
                    bookingList.innerHTML = "<p>Không có yêu cầu đặt sân nào.</p>";
                }
            }).catch((error) => {
                console.error("Lỗi khi lấy thông tin người dùng:", error);
            });
        }).catch((error) => {
            console.error("Lỗi khi lấy danh sách đặt sân:", error);
            bookingList.innerHTML = "<p>Có lỗi xảy ra khi tải yêu cầu đặt sân!</p>";
        });
    });
};
//------Xác nhận đặt sân------
/* Mô tả: Xác nhận yêu cầu đặt sân và cập nhật trạng thái thành "confirmed"
   - Cập nhật node "bookings" với trạng thái mới
   - Cập nhật danh sách yêu cầu đặt sân sau khi xác nhận
   - Hiển thị thông báo lỗi nếu thất bại
*/
window.confirmBooking = function(bookingId) {
    // Kiểm tra bookingId hợp lệ
    if (!bookingId) {
        alert("ID đặt sân không hợp lệ!");
        return;
    }

    // Kiểm tra trạng thái hiện tại của booking
    database.ref("bookings").child(bookingId).once("value").then((snapshot) => {
        const bookingData = snapshot.val();
        if (!bookingData) {
            alert("Không tìm thấy thông tin đặt sân!");
            return;
        }

        if (bookingData.status !== "pending") {
            alert("Đặt sân này đã được xử lý trước đó!");
            displayBookingRequests();
            return;
        }

        // Cập nhật trạng thái thành "confirmed"
        database.ref("bookings").child(bookingId).update({ 
            status: "confirmed",
            confirmedAt: Date.now() // Thêm timestamp xác nhận
        }).then(() => {
            alert("Xác nhận đặt sân thành công!");
            displayBookingRequests();
        }).catch((error) => {
            console.error("Lỗi khi xác nhận đặt sân:", error);
            alert("Có lỗi xảy ra khi xác nhận đặt sân: " + error.message);
        });
    }).catch((error) => {
        console.error("Lỗi khi kiểm tra thông tin đặt sân:", error);
        alert("Có lỗi xảy ra khi kiểm tra thông tin đặt sân: " + error.message);
    });
};

//------Hủy đặt sân (bởi chủ sân)------
/* Mô tả: Hủy yêu cầu đặt sân và cập nhật trạng thái thành "cancelled"
   - Cập nhật node "bookings" với trạng thái mới
   - Cập nhật danh sách yêu cầu đặt sân sau khi hủy
   - Hiển thị thông báo lỗi nếu thất bại
*/
window.cancelBooking = function(bookingId) {
    database.ref("bookings").child(bookingId).update({ status: "cancelled" }).then(() => {
        alert("Hủy đặt sân thành công!");
        displayBookingRequests();
    }).catch((error) => {
        console.error("Lỗi khi hủy:", error);
        alert("Có lỗi xảy ra khi hủy đặt sân!");
    });
};

//------Hiển thị thông tin tài khoản------
/* Mô tả: Hiển thị thông tin tài khoản của chủ sân
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
            document.getElementById("user-email").textContent = userData.email || "Chưa có thông tin"; // Hiển thị email ở đây
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

//------Xử lý đăng xuất------
/* Mô tả: Xử lý quá trình đăng xuất của chủ sân
   - Gọi phương thức signOut của Firebase Authentication
   - Hiển thị thông báo thành công hoặc lỗi nếu thất bại
*/
window.logout = function() {
    firebase.auth().signOut().then(() => {
        alert("Đăng xuất thành công!");
        window.location.href = "login.html";
    }).catch((error) => {
        console.error("Lỗi đăng xuất:", error);
        alert("Lỗi đăng xuất: " + error.message);
    });
};

// Hàm hiển thị danh sách sân và giờ đã đặt
window.displayBookedFields = function() {
    const bookedFieldsList = document.getElementById("booked-fields-list");
    if (!bookedFieldsList || !currentUser) return;
    bookedFieldsList.innerHTML = "<p>Đang tải danh sách sân và giờ đã đặt...</p>";

    // Lấy danh sách sân của chủ sân
    database.ref("sportsFields").once("value").then((fieldsSnapshot) => {
        const fields = fieldsSnapshot.val() || {};
        const ownerFields = Object.keys(fields)
            .filter(key => fields[key].ownerId === currentUser.uid)
            .map(key => ({ id: key, ...fields[key] }));

        if (ownerFields.length === 0) {
            bookedFieldsList.innerHTML = "<p>Bạn chưa có sân nào.</p>";
            return;
        }

        // Lấy danh sách đặt sân
        database.ref("bookings").once("value").then((bookingsSnapshot) => {
            const bookings = bookingsSnapshot.val() || {};
            bookedFieldsList.innerHTML = ""; // Xóa thông báo "Đang tải"

            let hasBookedFields = false;

            // Duyệt qua từng sân của chủ sân
            ownerFields.forEach((field) => {
                let bookedSlots = [];

                // Tìm các đặt sân liên quan đến sân này
                Object.keys(bookings).forEach((bookingId) => {
                    const booking = bookings[bookingId];
                    if (booking.fieldId === field.id && booking.status === "confirmed") {
                        let formattedTime = "Không có";
                        if (booking.bookedTime) {
                            if (typeof booking.bookedTime === 'string' && booking.bookedTime.includes('-')) {
                                formattedTime = booking.bookedTime;
                            } else if (typeof booking.bookedTime === 'number') {
                                const startTime = new Date(booking.bookedTime).getHours();
                                const endTime = startTime + 1;
                                formattedTime = `${startTime}h-${endTime}h`;
                            }
                        }
                        bookedSlots.push({
                            date: booking.date || "Không có",
                            time: formattedTime
                        });
                    }
                });

                // Hiển thị thông tin sân và giờ đã đặt
                let bookedSlotsHtml = "<p><strong>Giờ đã đặt:</strong> ";
                if (bookedSlots.length > 0) {
                    hasBookedFields = true;
                    bookedSlotsHtml += "<ul>";
                    bookedSlots.forEach((slot) => {
                        bookedSlotsHtml += `<li>${slot.date}: ${slot.time}</li>`;
                    });
                    bookedSlotsHtml += "</ul>";
                } else {
                    bookedSlotsHtml += "Chưa có giờ nào được đặt.";
                }
                bookedSlotsHtml += "</p>";

                const fieldCard = `
                    <div class="field-card">
                        <h3>${field.name || "Tên không có"} - ${field.fieldNumber || "Không có sân số"}</h3>
                        <p>Địa chỉ: ${field.location || "Vị trí không có"}</p>
                        <p>Loại: ${field.type || "Loại không có"} - Giá: ${field.price || 0} VND/giờ</p>
                        ${bookedSlotsHtml}
                    </div>
                `;
                bookedFieldsList.innerHTML += fieldCard;
            });

            if (!hasBookedFields) {
                bookedFieldsList.innerHTML = "<p>Chưa có sân nào được đặt.</p>";
            }
        }).catch((error) => {
            console.error("Lỗi khi lấy danh sách đặt sân:", error);
            bookedFieldsList.innerHTML = "<p>Có lỗi xảy ra khi tải danh sách giờ đã đặt!</p>";
        });
    }).catch((error) => {
        console.error("Lỗi khi lấy danh sách sân:", error);
        bookedFieldsList.innerHTML = "<p>Có lỗi xảy ra khi tải danh sách sân!</p>";
    });
};

// Hàm chuyển timestamp thành ngày (dd/mm/yyyy)
function formatDate(timestamp) {
    if (!timestamp) return "Không có";
    const date = new Date(timestamp);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
}

// Hàm lấy số tuần trong năm từ timestamp
function getWeekNumber(timestamp) {
    const date = new Date(timestamp);
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Hàm hiển thị thống kê đặt sân
window.displayStatistics = function() {
    const statsType = document.getElementById("stats-type").value;
    const startDateInput = document.getElementById("stats-start-date").value;
    const endDateInput = document.getElementById("stats-end-date").value;
    const statsResult = document.getElementById("statistics-result");
    if (!statsResult || !currentUser) return;
    statsResult.innerHTML = "<p>Đang tải thống kê...</p>";

    // Chuyển đổi ngày thành timestamp
    const startDate = startDateInput ? new Date(startDateInput).getTime() : null;
    const endDate = endDateInput ? new Date(endDateInput).setHours(23, 59, 59, 999) : null;

    // Lấy danh sách sân của chủ sân
    database.ref("sportsFields").once("value").then((fieldsSnapshot) => {
        const fields = fieldsSnapshot.val() || {};
        const ownerFieldIds = Object.keys(fields).filter(key => fields[key].ownerId === currentUser.uid);

        if (ownerFieldIds.length === 0) {
            statsResult.innerHTML = "<p>Bạn chưa có sân nào.</p>";
            return;
        }

        // Lấy danh sách đặt sân
        database.ref("bookings").once("value").then((bookingsSnapshot) => {
            const bookings = bookingsSnapshot.val() || {};
            statsResult.innerHTML = ""; // Xóa thông báo "Đang tải"

            let statsData = {};
            let totalBookings = 0;
            let totalRevenue = 0;

            // Xử lý dữ liệu đặt sân
            Object.keys(bookings).forEach((bookingId) => {
                const booking = bookings[bookingId];
                if (ownerFieldIds.includes(booking.fieldId) && booking.status === "confirmed") {
                    const bookedTime = booking.bookedTime;
                    if (!bookedTime || !booking.date) return;

                    const timestamp = typeof bookedTime === 'number' ? bookedTime : new Date(booking.date).getTime();

                    // Lọc theo khoảng thời gian
                    if (startDate && timestamp < startDate) return;
                    if (endDate && timestamp > endDate) return;

                    const date = new Date(timestamp);
                    let key;

                    if (statsType === "day") {
                        key = formatDate(timestamp);
                    } else if (statsType === "week") {
                        const week = getWeekNumber(timestamp);
                        const year = date.getFullYear();
                        key = `Tuần ${week} - ${year}`;
                    } else if (statsType === "month") {
                        const month = date.getMonth() + 1;
                        const year = date.getFullYear();
                        key = `Tháng ${month}/${year}`;
                    }

                    if (!statsData[key]) {
                        statsData[key] = { count: 0, revenue: 0 };
                    }
                    statsData[key].count++;

                    // Tính doanh thu dựa trên giá sân
                    const field = fields[booking.fieldId];
                    const price = field && field.price ? field.price : 0;
                    statsData[key].revenue += price;

                    totalBookings++;
                    totalRevenue += price;
                }
            });

            // Hiển thị kết quả thống kê
            if (Object.keys(statsData).length === 0) {
                statsResult.innerHTML = "<p>Chưa có đặt sân nào được xác nhận trong khoảng thời gian này.</p>";
                return;
            }

            let statsHtml = "<h3>Tổng quan</h3>";
            statsHtml += `<p>Tổng số đặt sân: ${totalBookings}</p>`;
            statsHtml += `<p>Tổng doanh thu: ${totalRevenue.toLocaleString()} VND</p>`;
            statsHtml += "<h3>Chi tiết</h3>";
            statsHtml += "<table><tr><th>Thời gian</th><th>Số lượng đặt sân</th><th>Doanh thu (VND)</th></tr>";
            Object.keys(statsData).sort().forEach((key) => {
                statsHtml += `<tr><td>${key}</td><td>${statsData[key].count}</td><td>${statsData[key].revenue.toLocaleString()}</td></tr>`;
            });
            statsHtml += "</table>";
            statsResult.innerHTML = statsHtml;
        }).catch((error) => {
            console.error("Lỗi khi lấy danh sách đặt sân:", error);
            statsResult.innerHTML = "<p>Có lỗi xảy ra khi tải thống kê!</p>";
        });
    }).catch((error) => {
        console.error("Lỗi khi lấy danh sách sân:", error);
        statsResult.innerHTML = "<p>Có lỗi xảy ra khi tải thống kê!</p>";
    });
};
// gui emai
document.addEventListener("DOMContentLoaded", function() {
    // Đảm bảo database đã được khởi tạo
    if (!database) {
        console.error("Database chưa được khởi tạo! Vui lòng kiểm tra phần khởi tạo Firebase.");
        return;
    }

    // Lắng nghe sự kiện khi có đặt sân mới
    database.ref("bookings").on("child_added", (snapshot) => {
        const bookingData = snapshot.val();
        const bookingId = snapshot.key;

        // Kiểm tra xem đã gửi email chưa
        if (bookingData.isNotified) {
            console.log('Đặt sân đã được thông báo trước đó:', bookingId);
            return; // Bỏ qua nếu đã gửi email
        }

        // Lấy thông tin sân và người đặt
        const fieldId = bookingData.fieldId;
        const userId = bookingData.userId;

        Promise.all([
            database.ref(`sportsFields/${fieldId}`).once("value"),
            database.ref(`users/${userId}`).once("value")
        ]).then(([fieldSnapshot, userSnapshot]) => {
            const fieldData = fieldSnapshot.val();
            const userData = userSnapshot.val();

            if (!fieldData) {
                console.log('Không tìm thấy thông tin sân!', { fieldId });
                return;
            }

            if (!userData) {
                console.log('Không tìm thấy thông tin người đặt!', { userId });
                return;
            }

            // Định dạng thời gian
            let formattedTime = "Không có";
            if (bookingData.bookedTime) {
                if (typeof bookingData.bookedTime === 'string' && bookingData.bookedTime.includes('-')) {
                    formattedTime = bookingData.bookedTime;
                } else if (typeof bookingData.bookedTime === 'number') {
                    const startTime = new Date(bookingData.bookedTime).getHours();
                    const endTime = startTime + 1;
                    formattedTime = `${startTime}h-${endTime}h`;
                }
            }

            // Gửi email thông báo qua EmailJS SDK v3
            emailjs.send("service_quz8m7n", "template_nf7g41q", {
                field_name: fieldData.name || "Không xác định",
                date: bookingData.date || "Không có",
                time: formattedTime,
                user_email: userData.email || "Không xác định",
                to_email: "dtc2054801030014@ictu.edu.vn" // Email cố định của chủ sân
            }, "9S0G2WrW4ghfm5qu-")
            .then(() => {
                console.log('Email thông báo đã được gửi đến dtc2054801030014@ictu.edu.vn!');
                // Cập nhật isNotified trong Firebase
                database.ref(`bookings/${bookingId}`).update({ isNotified: true })
                    .then(() => {
                        console.log('Đã cập nhật isNotified cho đặt sân:', bookingId);
                    })
                    .catch((error) => {
                        console.error('Lỗi khi cập nhật isNotified:', error);
                    });
            })
            .catch((error) => {
                console.error('Lỗi khi gửi email:', error);
            });
        }).catch((error) => {
            console.error('Lỗi khi lấy thông tin:', error);
        });
    });
});