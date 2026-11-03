# Worker trắc nghiệm BMTH.K10

Worker này hoạt động độc lập với Worker chatbot. Dữ liệu câu hỏi lưu trong Cloudflare D1 và mật khẩu quản trị chỉ lưu dưới dạng Secret của Worker.

## Biến và Secret

- D1 binding: `DB`
- Variable `ALLOWED_ORIGINS`: URL website, nhiều URL cách nhau bằng dấu phẩy.
- Variable `QUIZ_ADMIN_USERNAME`: tên đăng nhập, mặc định `admin`.
- Secret `QUIZ_ADMIN_PASSWORD`: mật khẩu quản trị.
- Secret `QUIZ_TOKEN_SECRET`: chuỗi ngẫu nhiên tối thiểu 32 ký tự để ký phiên làm bài và phiên quản trị.

Không đưa hai Secret trên vào GitHub.

