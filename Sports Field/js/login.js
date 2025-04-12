// Khai báo biến toàn cục
let database;
let currentUser = null;
let userType = null;

//------Khởi tạo và theo dõi trạng thái khi tải trang------
/* Mô tả: Khởi tạo Firebase và theo dõi trạng thái đăng nhập của người dùng khi trang login.html được tải
   - Kiểm tra Firebase SDK
   - Cấu hình và khởi tạo Firebase
   - Theo dõi thay đổi trạng thái đăng nhập (đã đăng nhập thì ẩn form, chưa thì hiển thị form)
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
    
    // Khởi tạo Firebase và gán database
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
                    document.getElementById("login-form").style.display = "none";
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
            document.getElementById("login-form").style.display = "block";
            document.getElementById("user-info").style.display = "none";
        }
    });
});

//------Xử lý đăng nhập------
/* Mô tả: Xử lý quá trình đăng nhập của người dùng
   - Lấy email và mật khẩu từ input
   - Gửi yêu cầu đăng nhập qua Firebase Authentication
   - Kiểm tra vai trò từ database và chuyển hướng dựa trên vai trò (user -> index.html, owner -> owner.html)
   - Hiển thị thông báo lỗi nếu thất bại
*/
window.login = function() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            console.log("Đăng nhập thành công:", userCredential.user);
            return database.ref("users").child(userCredential.user.uid).once("value");
        })
        .then((snapshot) => {
            const userData = snapshot.val();
            if (userData && userData.role) {
                userType = userData.role;
                alert("Đăng nhập thành công!");
                console.log("Vai trò hiện tại:", userType); // Debug
                if (userType === "user") {
                    window.location.href = "index.html";
                } else if (userType === "owner") {
                    window.location.href = "owner.html";
                }
            } else {
                alert("Vai trò chưa được gán. Vui lòng đăng ký hoặc liên hệ admin!");
                firebase.auth().signOut();
            }
        })
        .catch((error) => {
            console.error("tài khoản hoặc mật khẩu sai");
            alert("tài khoản hoặc mật khẩu sai");
        });
};
//------Xử lý đăng xuất------
/* Mô tả: Xử lý quá trình đăng xuất của người dùng
   - Gọi phương thức signOut của Firebase Authentication
   - Đặt lại biến currentUser và userType
   - Hiển thị lại form đăng nhập và thông báo thành công
   - Hiển thị thông báo lỗi nếu thất bại
*/
window.logout = function() {
    firebase.auth().signOut().then(() => {
        currentUser = null;
        userType = null;
        document.getElementById("login-form").style.display = "block";
        document.getElementById("user-info").style.display = "none";
        alert("Đăng xuất thành công!");
    }).catch((error) => {
        console.error("Lỗi đăng xuất:", error);
        alert("Lỗi đăng xuất: " + error.message);
    });
};