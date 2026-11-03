# BMTH.K10

Website học phần Công nghệ thông tin gồm 5 chủ đề, nội dung chỉ đọc, chatbot Google AI Studio và chức năng tự kiểm tra kiến thức.

Người học có thể làm trắc nghiệm theo một chủ đề hoặc toàn bộ học phần. Mỗi lượt làm được tự trộn câu hỏi và 4 phương án, sau khi nộp bài sẽ có điểm, đáp án đúng và giải thích. Giảng viên có trang quản trị riêng để thêm, sửa, xóa hoặc nạp hàng loạt câu hỏi từ CSV.

## Cấu trúc

- `index.html`: giao diện bài giảng chính.
- `quiz.html`: giao diện tự kiểm tra kiến thức.
- `admin.html`: trang quản trị ngân hàng câu hỏi.
- `data/topics.js`: tên và nội dung 5 chủ đề.
- `data/media.js`: nội dung tóm tắt và đường dẫn video/âm thanh.
- `media/video/`, `media/audio/`: nơi lưu video và tệp âm thanh.
- `materials/`: nơi lưu tệp PDF bài giảng.
- `config.js`: địa chỉ API chatbot và API trắc nghiệm.
- `cloudflare-worker/`: Worker chatbot hiện có.
- `cloudflare-quiz-worker/`: Worker trắc nghiệm độc lập và cấu trúc D1.
- `samples/cau-hoi-mau.csv`: form nạp câu hỏi mẫu.

## Thay nội dung bài giảng

1. Mở `data/topics.js` để sửa tên, mô tả, mục tiêu và nội dung tóm lược của 5 chương.
2. Kho kiến thức đầy đủ của chatbot được đặt trong Cloudflare Worker để không công khai toàn văn trên GitHub Pages.
3. Commit thay đổi. GitHub Pages sẽ cập nhật tự động.

## Gán video hoặc âm thanh cho chủ đề

1. Tải video lên `media/video/` hoặc tệp âm thanh lên `media/audio/`.
2. Mở `data/media.js`, tìm đúng mã chủ đề và điền đường dẫn vào `video` hoặc `audio`.
3. Ví dụ: `video: "media/video/chuyen-doi-so.mp4"` hoặc `audio: "media/audio/chuyen-doi-so.mp3"`.
4. Có thể điền cả hai nếu muốn hiển thị đồng thời video và âm thanh. Để chuỗi rỗng `""` nếu không dùng.
5. Commit thay đổi và chờ GitHub Pages cập nhật.

Đường dẫn cũng có thể là URL tệp trực tiếp bắt đầu bằng `https://`. Liên kết trang xem YouTube không phải URL tệp video trực tiếp nên không dùng trong trường `video`.

## Bật GitHub Pages

1. Vào **Settings → Pages** của repository.
2. Ở **Build and deployment**, chọn **Deploy from a branch**.
3. Chọn nhánh **main**, thư mục **/(root)** rồi nhấn **Save**.

## Kết nối chatbot Google AI Studio an toàn

Không đặt API key trong `config.js`, `index.html` hoặc bất kỳ tệp nào trên GitHub Pages vì người khác có thể đọc được.

1. Tạo API key tại Google AI Studio.
2. Tạo Cloudflare Worker bằng nội dung trong `cloudflare-worker/worker.js`.
3. Tạo Secret `GEMINI_API_KEY` trong **Settings → Variables and Secrets** của Worker.
4. Tạo Variable `ALLOWED_ORIGINS` bằng origin GitHub Pages chính xác của website.
5. Có thể tạo Variable `GEMINI_MODEL`; mặc định website dùng model được ghi trong Worker.
6. Deploy Worker, sao chép URL và dán vào `chatApiUrl` trong `config.js`.

## Triển khai ngân hàng câu hỏi trắc nghiệm

Worker trắc nghiệm được tách riêng nên không làm thay đổi Worker chatbot đang chạy.

### Bước 1 — Tạo cơ sở dữ liệu D1

1. Trong Cloudflare Dashboard, mở **Storage & Databases → D1 SQL Database → Create database**.
2. Đặt tên `bmth-k10-quiz`.
3. Mở thẻ **Console** của database, sao chép toàn bộ nội dung `cloudflare-quiz-worker/schema.sql`, dán vào và nhấn **Execute**.

### Bước 2 — Tạo Worker trắc nghiệm

1. Mở **Workers & Pages → Create → Worker** và đặt tên `bmth-k10-quiz`.
2. Mở phần chỉnh sửa mã, thay mã mẫu bằng toàn bộ nội dung `cloudflare-quiz-worker/worker.js`, sau đó deploy.
3. Trong **Settings → Bindings**, thêm **D1 database binding**:
   - Variable name: `DB`
   - Database: `bmth-k10-quiz`
4. Trong **Settings → Variables and Secrets**, tạo:
   - Variable `ALLOWED_ORIGINS` = `https://ccongpho-dotcom.github.io`
   - Variable `QUIZ_ADMIN_USERNAME` = `admin` (có thể đổi)
   - Secret `QUIZ_ADMIN_PASSWORD` = mật khẩu mạnh do quản trị viên tự đặt
   - Secret `QUIZ_TOKEN_SECRET` = chuỗi ngẫu nhiên tối thiểu 32 ký tự
5. Deploy lại Worker và sao chép URL, ví dụ `https://bmth-k10-quiz.ten-tai-khoan.workers.dev`.

Nếu dùng thêm tên miền riêng, thêm origin của tên miền đó vào `ALLOWED_ORIGINS`, cách nhau bằng dấu phẩy. Origin chỉ gồm giao thức và tên miền, không gồm đường dẫn phía sau.

### Bước 3 — Kết nối website

Mở `config.js` và điền URL Worker:

```js
window.BMTH_CONFIG = {
  chatApiUrl: "https://bmth-k10-chatbot.ccongpho.workers.dev/",
  quizApiUrl: "https://bmth-k10-quiz.ten-tai-khoan.workers.dev",
  siteName: "BMTH.K10"
};
```

Commit các tệp lên nhánh `main`. Sau khi GitHub Pages cập nhật:

- Người học mở `quiz.html` hoặc bấm **Tự kiểm tra** trên giao diện.
- Quản trị viên mở `admin.html`, đăng nhập bằng tài khoản đã cấu hình.

## Nạp câu hỏi bằng form CSV

1. Trong `admin.html`, bấm **Tải form mẫu**.
2. Mỗi dòng là một câu hỏi, có đúng 4 đáp án A–D và một đáp án đúng.
3. Giữ nguyên tên cột và lưu dạng **CSV UTF-8 (Comma delimited)**.
4. Bấm **Nạp file CSV**. Mỗi lần có thể nạp tối đa 500 câu.

Các mã chủ đề hợp lệ:

| Chủ đề | Mã dùng trong CSV |
|---|---|
| Chuyển đổi số | `chuyen-doi-so` |
| Tự động hóa chỉ huy | `tu-dong-hoa-chi-huy` |
| MicroStation V8i | `microstation-v8i` |
| Trí tuệ nhân tạo | `tri-tue-nhan-tao` |
| An toàn thông tin | `an-toan-thong-tin` |

Cột `dap_an_dung` chỉ nhận `A`, `B`, `C` hoặc `D`. Cột `muc_do` nhận `co-ban`, `thong-hieu` hoặc `van-dung`. Cột `trang_thai` đặt `1` để sử dụng và `0` để tạm ẩn.

## Bảo mật và giới hạn chế độ chỉ đọc

- Không ghi mật khẩu quản trị, `QUIZ_TOKEN_SECRET` hoặc API key vào GitHub.
- Câu hỏi và đáp án đúng lưu trong D1; đề gửi cho người học không chứa đáp án đúng.
- Website chặn chọn chữ, chuột phải, in và một số phím tắt trong vùng bài giảng. Đây chỉ là biện pháp hạn chế thao tác thông thường; nội dung hiển thị trên trình duyệt vẫn có thể bị chụp màn hình hoặc truy xuất bởi người có kiến thức kỹ thuật.
- Nếu tài liệu nhạy cảm, cần thêm đăng nhập/phân quyền và không lưu công khai trên GitHub Pages.
