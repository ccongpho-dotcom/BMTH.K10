# BMTH.K10

Website học phần Công nghệ thông tin gồm 5 chủ đề, nội dung chỉ đọc và chatbot sử dụng Gemini API của Google AI Studio.

## Cấu trúc

- `index.html`: giao diện chính.
- `data/topics.js`: tên và nội dung 5 chủ đề.
- `materials/`: nơi lưu tệp PDF bài giảng.
- `config.js`: địa chỉ API chatbot.
- `cloudflare-worker/`: backend bảo vệ Gemini API key.

## Thay nội dung bài giảng

1. Mở `data/topics.js` để sửa tên, mô tả, mục tiêu và nội dung tóm lược của 5 chương.
2. Kho kiến thức đầy đủ của chatbot được đặt trong Cloudflare Worker để không công khai toàn văn trên GitHub Pages.
3. Commit thay đổi. GitHub Pages sẽ cập nhật tự động.

## Bật GitHub Pages

1. Vào **Settings → Pages** của repository.
2. Ở **Build and deployment**, chọn **Deploy from a branch**.
3. Chọn nhánh **main**, thư mục **/(root)** rồi nhấn **Save**.

## Kết nối chatbot Google AI Studio an toàn

Không đặt API key trong `config.js`, `index.html` hoặc bất kỳ tệp nào trên GitHub Pages vì người khác có thể đọc được.

1. Tạo API key tại Google AI Studio.
2. Tạo Cloudflare Worker bằng nội dung trong `cloudflare-worker/worker.js`.
3. Tạo secret có tên `GEMINI_API_KEY` trong phần **Settings → Variables and Secrets** của Worker.
4. Tạo biến `ALLOWED_ORIGINS` bằng URL GitHub Pages chính xác của website.
5. Có thể tạo biến `GEMINI_MODEL`; mặc định website dùng `gemini-3.8-flash`.
6. Deploy Worker, sao chép URL và dán vào `chatApiUrl` trong `config.js`.

## Giới hạn chế độ chỉ đọc

Website chặn chọn chữ, chuột phải, in và một số phím tắt trong vùng bài giảng. Đây chỉ là biện pháp hạn chế thao tác thông thường; mọi nội dung hiển thị trên trình duyệt vẫn có thể bị chụp màn hình hoặc truy xuất bởi người có kiến thức kỹ thuật. Nếu tài liệu nhạy cảm, nên thêm đăng nhập/phân quyền và không lưu công khai trong GitHub Pages.
