const API_KEY = "sk-D5BRmkk3SmayN5k7pum6psVvQ8yxseW1NDLmpe03wATeVEMg"; // API key trung gian của bạn
const chatContainer = document.getElementById("chat-container");
const chatToggle = document.getElementById("chat-toggle");
const chatClose = document.getElementById("chat-close");
const chatHeader = document.getElementById("chat-header");

async function sendMessage() {
    const userInput = document.getElementById("user-input");
    const chatBox = document.getElementById("chat-box");
    const message = userInput.value.trim();
    if (!message) return;

    appendMessage(message, "user");

    try {
        const response = await fetch("https://two.keyai.shop/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: `
                        Bạn là một chatbot hỗ trợ khách hàng. Bạn chỉ có thể trả lời dựa trên thông tin sau:
                        ai chào bạn, bạn hãy chào lại là " xin chào tôi có thể giúp gì cho bạn 
                        ai hỏi bạn là ai , bạn trả lời Tôi là Hỗ Trợ Tự Động của Sport Field 
                        Nếu câu hỏi không liên quan đến thông tin này, hãy trả lời: "Xin lỗi, admin Trung không cho phép tôi trả lời thông tin này"
                        ai hỏi tôi muốn đặt sân hay cách đặt sân thì trả lời:
                        - chọn đặt sân trên thanh công cụ
                        - chọn loại sân muốn hiển thị/ tìm kiếm
                        - bấm nút đặt sân
                        - chọn ngày và khoảng thời gian muốn đặt
                        - bấm đặt sân và kiểm tra lịch hẹn trong phần "Lịch Hẹn"
                        những câu như: cảm ơn chào bạn hay câu chào thiện cảm khác hãy nói: tôi rất vui khi được hỗ trợ bạn
                        ai hỏi muốn quản lý sân hãy nói: hãy đăng ký tài khoản owner để sử dụng dịch vụ quản lý sân
                        cách thêm sân khi ai hỏi là: chọn "Quản lý sân" trên thanh công cụ - chọn "Thêm sân mới" - nhập đầy đủ thông tin về sân - bấm " Thêm sân" - theo dõi thông tin về sân trong "Quản lý sân"
                        cách sửa thông tin sân khi ai hỏi là: chọn "Quản lý sân" trên thanh công cụ - chọn "Chỉnh sửa" - nhập đầy đủ thông tin về sân - bấm " lưu" - theo dõi thông tin về sân trong "Quản lý sân"
                        cách xóa sân khi ai hỏi là: chọn "Quản lý sân" trên thanh công cụ - chọn "Xóa sân" - nhấn xác nhận - theo dõi thông tin về sân trong "Quản lý sân"
                        những thông tin về website khi ai hỏi website này làm gì hay mục đích gì: website được bạn Nguyễn Thành Trung xây dựng làm đồ án tốt nghiệp , website có 2 giao diện chính là User và Owner , User là người chơi thể thao muốn đặt sân, Owner là người chủ sân muốn quản lý sân của mình
                    
                        `},
                    { role: "user", content: message }
                ]
            })
        });

        const data = await response.json();
        const reply = data.choices[0].message.content;

        appendMessage(reply, "bot");
    } catch (error) {
        appendMessage("Có lỗi xảy ra, vui lòng thử lại!", "bot");
        console.error(error);
    }

    userInput.value = "";
    chatBox.scrollTop = chatBox.scrollHeight;
}

function appendMessage(text, sender) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", sender);
    messageDiv.textContent = text;
    document.getElementById("chat-box").appendChild(messageDiv);
}

// Bật/tắt chatbox
chatToggle.addEventListener("click", () => {
    chatContainer.classList.add("active");
});

chatClose.addEventListener("click", () => {
    chatContainer.classList.remove("active");
});

// Gửi tin nhắn bằng phím Enter
document.getElementById("user-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});

// Logic kéo-thả chatbox
let isDragging = false;
let currentX;
let currentY;
let initialX;
let initialY;

chatHeader.addEventListener("mousedown", (e) => {
    isDragging = true;
    initialX = e.clientX - currentX;
    initialY = e.clientY - currentY;
});

document.addEventListener("mousemove", (e) => {
    if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;

        const maxX = window.innerWidth - chatContainer.offsetWidth;
        const maxY = window.innerHeight - chatContainer.offsetHeight;
        currentX = Math.max(0, Math.min(currentX, maxX));
        currentY = Math.max(0, Math.min(currentY, maxY));

        chatContainer.style.left = currentX + "px";
        chatContainer.style.top = currentY + "px";
    }
});

document.addEventListener("mouseup", () => {
    isDragging = false;
});

// Khởi tạo vị trí ban đầu
currentX = 1080;
currentY = 150;
chatContainer.style.left = currentX + "px";
chatContainer.style.top = currentY + "px";