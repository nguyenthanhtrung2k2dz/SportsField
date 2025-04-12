// Khai báo biến toàn cục
let database;
let currentUser = null;
let userType = null;

//------Khởi tạo và theo dõi trạng thái khi tải trang------
/* Mô tả: Khởi tạo Firebase và theo dõi trạng thái đăng nhập khi tải trang signup.html
   - Kiểm tra Firebase SDK
   - Cấu hình và khởi tạo Firebase
   - Theo dõi trạng thái đăng nhập và kiểm tra vai trò
*/
document.addEventListener("DOMContentLoaded", function() {
    if (typeof firebase === "undefined") {
        console.error("Firebase SDK chưa được tải!");
        return;
    }

    const firebaseConfig = {
        apiKey: "AIzaSyDd4KmOJms1VR5ekbonEETa7HJUqFl5InY",
        authDomain: "sports-field-f538f.firebaseapp.com",
        databaseURL: "https://sports-field-f538f-default-rtdb.firebaseio.com",
        projectId: "sports-field-f538f",
        storageBucket: "sports-field-f538f.appspot.com",
        messagingSenderId: "548893788178",
        appId: "1:548893788178:web:5556f1695cfbee3f1770cb"
    };

    firebase.initializeApp(firebaseConfig);
    database = firebase.database();

    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            database.ref("users").child(user.uid).once("value").then((snapshot) => {
                const userData = snapshot.val();
                if (userData && userData.role) {
                    userType = userData.role;
                    document.getElementById("signup-form").style.display = "none";
                    document.getElementById("user-info").style.display = "block";
                    document.getElementById("user-email").textContent = `Xin chào, ${user.email} (${userType})`;
                } else {
                    alert("Vai trò chưa được gán. Liên hệ admin để gán quyền!");
                    firebase.auth().signOut();
                }
            }).catch((error) => {
                console.error("Lỗi khi lấy vai trò:", error);
            });
        } else {
            currentUser = null;
            userType = null;
            document.getElementById("signup-form").style.display = "block";
            document.getElementById("user-info").style.display = "none";
        }
    });
});

//------Chuyển đổi vai trò------
/* Mô tả: Xử lý chuyển đổi vai trò khi người dùng bấm vào nút công tắc
   - Chuyển đổi giữa "user" và "owner"
   - Cập nhật nhãn hiển thị bên dưới nút công tắc
   - Đổi màu giao diện dựa trên vai trò
*/
window.toggleRole = function() {
    const toggle = document.getElementById("role-toggle");
    const roleLabel = document.getElementById("role-label");
    const userTypeInput = document.getElementById("user-type");
    const signupContainer = document.querySelector(".signup-container");

    if (toggle.checked) {
        roleLabel.textContent = "Chủ sân";
        userTypeInput.value = "owner";
        signupContainer.classList.add("owner");
    } else {
        roleLabel.textContent = "Người dùng";
        userTypeInput.value = "user";
        signupContainer.classList.remove("owner");
    }
};

//------Xử lý đăng ký------
/* Mô tả: Xử lý quá trình đăng ký của người dùng
   - Lấy thông tin từ form (họ và tên, email, số điện thoại, mật khẩu, nhập lại mật khẩu, vai trò)
   - Kiểm tra các trường bắt buộc và khớp mật khẩu
   - Tạo tài khoản mới qua Firebase Authentication
   - Lưu thông tin (họ và tên, email, số điện thoại, vai trò) vào Firebase Realtime Database
   - Chuyển hướng dựa trên vai trò sau khi đăng ký thành công
   - Hiển thị thông báo lỗi nếu thất bại
*/
window.signup = function() {
    const fullname = document.getElementById("fullname").value;
    const email = document.getElementById("email").value;
    const phone = document.getElementById("phone").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;
    const role = document.getElementById("user-type").value; // Lấy giá trị từ input ẩn
    console.log("Role selected:", role); // Debug

    // Kiểm tra các trường bắt buộc
    if (!fullname || !email || !phone || !password || !confirmPassword) {
        alert("Vui lòng điền đầy đủ thông tin!");
        return;
    }

    // Kiểm tra mật khẩu khớp
    if (password !== confirmPassword) {
        alert("Mật khẩu nhập lại không khớp!");
        return;
    }

    firebase.auth().createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            return database.ref("users").child(user.uid).set({
                fullname: fullname,
                email: email,
                phone: phone,
                role: role
            }).then(() => {
                console.log("Đăng ký thành công, UID:", user.uid, "Vai trò:", role);
                console.log("Thông tin đã lưu:", { fullname, email, phone, role }); // Debug
                return { user: user, role: role };
            });
        })
        .then(({ user, role }) => {
            userType = role;
            alert("Đăng ký thành công!");
            console.log("Vai trò sau đăng ký:", userType); // Debug
            if (userType === "user") {
                window.location.href = "index.html";
            } else if (userType === "owner") {
                window.location.href = "owner.html";
            }
        })
        .catch((error) => {
            console.error("Lỗi đăng ký:", error.code, error.message);
            alert("Lỗi đăng ký: " + error.message);
        });
};