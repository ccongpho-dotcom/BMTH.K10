// Ngân hàng câu trả lời nhanh của BMTH.K10.
// Các câu hỏi khớp với nội dung dưới đây được trả lời ngay trên trình duyệt,
// không gọi Gemini API và không tính vào hạn mức Google AI Studio.
window.BMTH_FAQ = [
  {
    id: "general-topics",
    topicId: "general",
    question: "Học phần Công nghệ thông tin gồm những chủ đề nào?",
    patterns: ["hoc phan gom nhung chu de nao", "hoc phan co may chu de", "noi dung hoc phan", "5 chu de cua hoc phan"],
    keywords: ["hoc phan", "chu de", "noi dung"],
    answer: "Học phần gồm 5 chủ đề: (1) Chuyển đổi số; (2) Tự động hóa chỉ huy và phần mềm dùng chung; (3) Sử dụng MicroStation V8i; (4) Trí tuệ nhân tạo và một số công cụ AI; (5) An toàn thông tin và an ninh mạng."
  },
  {
    id: "general-use",
    topicId: "general",
    question: "Cách sử dụng website BMTH.K10 như thế nào?",
    patterns: ["cach su dung website", "cach hoc tren bmth", "huong dan su dung bmth", "su dung trang web nhu the nao"],
    keywords: ["cach", "su dung", "website", "bmth"],
    answer: "Đồng chí chọn một chủ đề ở danh mục bên trái để đọc nội dung, xem hoặc nghe phần tóm tắt nếu có học liệu đa phương tiện. Có thể bấm “Tự kiểm tra” để làm trắc nghiệm và mở biểu tượng chatbot ở góc dưới bên phải để hỏi nội dung chưa rõ."
  },
  {
    id: "general-quiz",
    topicId: "general",
    question: "Chức năng tự kiểm tra hoạt động như thế nào?",
    patterns: ["chuc nang tu kiem tra", "lam trac nghiem nhu the nao", "cach lam bai trac nghiem", "tu kiem tra kien thuc"],
    keywords: ["tu kiem tra", "trac nghiem", "cau hoi", "dap an"],
    answer: "Người học chọn phạm vi một chủ đề hoặc toàn bộ học phần, sau đó chọn số lượng câu hỏi và bắt đầu làm bài. Hệ thống tự trộn câu hỏi, trộn bốn phương án và chỉ hiển thị đáp án đúng cùng phần giải thích sau khi nộp bài."
  },
  {
    id: "general-chatbot",
    topicId: "general",
    question: "Chatbot có thể trả lời những nội dung nào?",
    patterns: ["chatbot tra loi noi dung nao", "co the hoi chatbot gi", "pham vi tra loi cua chatbot", "tro ly ai tra loi gi"],
    keywords: ["chatbot", "tra loi", "noi dung", "pham vi"],
    answer: "Chatbot hỗ trợ giải đáp nội dung thuộc toàn bộ 5 chủ đề của học phần. Người học không cần mở đúng chủ đề trước khi hỏi. Với nội dung chưa có trong bài giảng, trợ lý sẽ đề nghị trao đổi trực tiếp với giảng viên."
  },
  {
    id: "general-readonly",
    topicId: "general",
    question: "Vì sao nội dung bài giảng được đặt ở chế độ chỉ đọc?",
    patterns: ["vi sao chi doc", "tai sao khong sao chep", "che do chi doc", "khong copy duoc"],
    keywords: ["chi doc", "sao chep", "copy", "bai giang"],
    answer: "Chế độ chỉ đọc nhằm hạn chế thao tác sao chép, in hoặc phát tán tài liệu trong quá trình học tập. Đây là biện pháp nhắc nhở và hạn chế thao tác thông thường, không phải cơ chế chống sao chép tuyệt đối."
  },

  // Chủ đề 1: Chuyển đổi số
  {
    id: "cds-definition",
    topicId: "chuyen-doi-so",
    question: "Chuyển đổi số là gì?",
    patterns: ["chuyen doi so la gi", "khai niem chuyen doi so", "the nao la chuyen doi so"],
    keywords: ["chuyen doi so", "khai niem"],
    answer: "Chuyển đổi số là quá trình thay đổi tổng thể và có hệ thống hoạt động của tổ chức dựa trên dữ liệu, công nghệ số và phương thức làm việc mới. Nội dung này không chỉ là đưa thiết bị hay phần mềm vào sử dụng mà còn bao gồm đổi mới quy trình, con người và văn hóa tổ chức."
  },
  {
    id: "cds-pillars",
    topicId: "chuyen-doi-so",
    question: "Ba trụ cột của Chương trình chuyển đổi số quốc gia là gì?",
    patterns: ["ba tru cot chuyen doi so", "3 tru cot chuyen doi so", "tru cot cua chuyen doi so quoc gia"],
    keywords: ["tru cot", "chuyen doi so", "quoc gia"],
    answer: "Ba trụ cột của Chương trình chuyển đổi số quốc gia là Chính phủ số, kinh tế số và xã hội số. Ba trụ cột có quan hệ chặt chẽ, cùng dựa trên thể chế số, hạ tầng số, dữ liệu số, nền tảng số, nhân lực số và bảo đảm an toàn thông tin."
  },
  {
    id: "cds-components",
    topicId: "chuyen-doi-so",
    question: "Những thành phần chủ yếu của chuyển đổi số là gì?",
    patterns: ["thanh phan cua chuyen doi so", "chuyen doi so gom nhung gi", "yeu to cua chuyen doi so"],
    keywords: ["thanh phan", "yeu to", "chuyen doi so"],
    answer: "Các thành phần chủ yếu gồm thể chế và cơ chế quản lý; hạ tầng số; dữ liệu; nền tảng và công nghệ số; quy trình nghiệp vụ; nguồn nhân lực; kỹ năng và văn hóa số; cùng hệ thống bảo đảm an toàn, an ninh mạng."
  },
  {
    id: "cds-data",
    topicId: "chuyen-doi-so",
    question: "Dữ liệu có vai trò gì trong chuyển đổi số?",
    patterns: ["vai tro cua du lieu trong chuyen doi so", "tai sao du lieu quan trong", "du lieu la tai nguyen"],
    keywords: ["du lieu", "vai tro", "chuyen doi so"],
    answer: "Dữ liệu là tài nguyên chiến lược của chuyển đổi số. Dữ liệu đầy đủ, chính xác, được chuẩn hóa và chia sẻ đúng thẩm quyền giúp phân tích tình hình, hỗ trợ ra quyết định, tự động hóa quy trình và nâng cao chất lượng hoạt động."
  },
  {
    id: "cds-bqp",
    topicId: "chuyen-doi-so",
    question: "Chuyển đổi số trong Bộ Quốc phòng tập trung vào những nội dung nào?",
    patterns: ["chuyen doi so trong bo quoc phong", "chuyen doi so bqp", "noi dung chuyen doi so quan doi"],
    keywords: ["chuyen doi so", "bo quoc phong", "quan doi"],
    answer: "Chuyển đổi số trong Bộ Quốc phòng tập trung vào hoàn thiện thể chế; phát triển hạ tầng, dữ liệu và nền tảng số; số hóa và đổi mới quy trình; phát triển nhân lực số; nâng cao năng lực chỉ huy, quản lý, huấn luyện và bảo đảm kỹ thuật; đồng thời giữ vững an toàn, bảo mật và chủ quyền số."
  },
  {
    id: "cds-success",
    topicId: "chuyen-doi-so",
    question: "Điều kiện để chuyển đổi số thành công là gì?",
    patterns: ["dieu kien chuyen doi so thanh cong", "lam gi de chuyen doi so thanh cong", "yeu cau chuyen doi so"],
    keywords: ["dieu kien", "thanh cong", "chuyen doi so"],
    answer: "Chuyển đổi số thành công cần có quyết tâm của người đứng đầu, mục tiêu rõ ràng, quy trình phù hợp, dữ liệu có chất lượng, hạ tầng và nền tảng đồng bộ, nhân lực có kỹ năng số, cơ chế phối hợp hiệu quả và bảo đảm an toàn thông tin ngay từ đầu."
  },
  {
    id: "cds-public-service",
    topicId: "chuyen-doi-so",
    question: "Dịch vụ công trực tuyến là gì?",
    patterns: ["dich vu cong truc tuyen la gi", "khai niem dich vu cong truc tuyen"],
    keywords: ["dich vu cong", "truc tuyen", "khai niem"],
    answer: "Dịch vụ công trực tuyến là dịch vụ hành chính công và các dịch vụ khác của cơ quan nhà nước được cung cấp cho tổ chức, cá nhân trên môi trường mạng. Mục tiêu là nâng cao tính thuận tiện, minh bạch, giảm thời gian và chi phí thực hiện thủ tục."
  },

  // Chủ đề 2: Tự động hóa chỉ huy
  {
    id: "tdh-definition",
    topicId: "tu-dong-hoa-chi-huy",
    question: "Tự động hóa chỉ huy là gì?",
    patterns: ["tu dong hoa chi huy la gi", "khai niem tu dong hoa chi huy"],
    keywords: ["tu dong hoa", "chi huy", "khai niem"],
    answer: "Tự động hóa chỉ huy là việc ứng dụng hệ thống thông tin, máy tính, truyền thông, phần mềm và các phương tiện kỹ thuật để thu thập, xử lý, truyền đạt thông tin và hỗ trợ người chỉ huy ra quyết định nhanh, chính xác, kịp thời."
  },
  {
    id: "c4isr-meaning",
    topicId: "tu-dong-hoa-chi-huy",
    question: "C4ISR là gì?",
    patterns: ["c4isr la gi", "c4isr viet tat", "khai niem c4isr"],
    keywords: ["c4isr", "khai niem", "viet tat"],
    answer: "C4ISR là mô hình tích hợp các thành phần: Chỉ huy, Điều khiển, Thông tin liên lạc, Máy tính, Tình báo, Giám sát và Trinh sát. Hệ thống giúp hình thành bức tranh tình huống thống nhất và hỗ trợ quá trình chỉ huy, điều hành, ra quyết định."
  },
  {
    id: "c4isr-role",
    topicId: "tu-dong-hoa-chi-huy",
    question: "C4ISR có vai trò như thế nào?",
    patterns: ["vai tro cua c4isr", "c4isr co tac dung gi", "loi ich c4isr"],
    keywords: ["c4isr", "vai tro", "tac dung"],
    answer: "C4ISR hỗ trợ thu thập và hợp nhất thông tin từ nhiều nguồn, nâng cao nhận thức tình huống, rút ngắn thời gian xử lý, tăng chất lượng tham mưu và giúp người chỉ huy lựa chọn phương án phù hợp. Hiệu quả của hệ thống phụ thuộc vào dữ liệu chính xác, kết nối ổn định và tổ chức sử dụng đúng quy định."
  },
  {
    id: "c4isr-components",
    topicId: "tu-dong-hoa-chi-huy",
    question: "Các thành phần của C4ISR liên hệ với nhau như thế nào?",
    patterns: ["thanh phan c4isr", "c4isr gom nhung gi", "moi lien he trong c4isr"],
    keywords: ["c4isr", "thanh phan", "lien he"],
    answer: "Các thành phần C4ISR tạo thành một chu trình liên tục: lực lượng tình báo, giám sát và trinh sát thu thập dữ liệu; hệ thống thông tin liên lạc và máy tính truyền, lưu trữ, xử lý; bộ phận chỉ huy và điều khiển khai thác kết quả để tổ chức, điều hành và ra quyết định."
  },
  {
    id: "tdh-requirements",
    topicId: "tu-dong-hoa-chi-huy",
    question: "Hệ thống tự động hóa chỉ huy cần đáp ứng yêu cầu gì?",
    patterns: ["yeu cau he thong tu dong hoa chi huy", "tu dong hoa chi huy can gi"],
    keywords: ["yeu cau", "he thong", "tu dong hoa", "chi huy"],
    answer: "Hệ thống cần bảo đảm thông tin chính xác, kịp thời, liên tục; khả năng kết nối và phối hợp giữa các thành phần; tính sẵn sàng, an toàn, bảo mật; giao diện phù hợp với người sử dụng; đồng thời có phương án dự phòng và quy trình vận hành rõ ràng."
  },
  {
    id: "shared-software",
    topicId: "tu-dong-hoa-chi-huy",
    question: "Phần mềm dùng chung có vai trò gì?",
    patterns: ["phan mem dung chung la gi", "vai tro phan mem dung chung", "phan mem dung chung trong bo quoc phong"],
    keywords: ["phan mem dung chung", "vai tro", "bo quoc phong"],
    answer: "Phần mềm dùng chung giúp chuẩn hóa quy trình, hỗ trợ trao đổi và xử lý công việc trên một nền tảng thống nhất, giảm trùng lặp dữ liệu và nâng cao hiệu quả phối hợp. Việc sử dụng phải đúng mục đích, đúng tài khoản, đúng thẩm quyền và tuân thủ quy định bảo mật."
  },
  {
    id: "qime-use",
    topicId: "tu-dong-hoa-chi-huy",
    question: "Khi sử dụng QiMe cần lưu ý điều gì?",
    patterns: ["su dung qime", "qime la gi", "luu y khi dung qime"],
    keywords: ["qime", "su dung", "luu y"],
    answer: "Khi sử dụng QiMe cần đăng nhập đúng tài khoản, khai thác đúng chức năng và thẩm quyền, kiểm tra đối tượng nhận trước khi trao đổi, không chia sẻ thông tin hoặc tệp trái quy định, bảo vệ thiết bị và báo cáo kịp thời khi phát hiện dấu hiệu bất thường."
  },

  // Chủ đề 3: MicroStation V8i
  {
    id: "micro-definition",
    topicId: "microstation-v8i",
    question: "MicroStation V8i là gì?",
    patterns: ["microstation v8i la gi", "khai niem microstation", "phan mem microstation"],
    keywords: ["microstation", "v8i", "phan mem"],
    answer: "MicroStation V8i là phần mềm đồ họa kỹ thuật dùng để tạo, quản lý và chỉnh sửa bản vẽ số. Trong học phần, phần mềm được sử dụng để thực hành các công cụ vẽ, thao tác đối tượng, xây dựng ký hiệu và phục vụ tạo lập văn kiện tác chiến số."
  },
  {
    id: "micro-purpose",
    topicId: "microstation-v8i",
    question: "MicroStation V8i được dùng để làm gì?",
    patterns: ["microstation dung de lam gi", "cong dung microstation v8i", "tac dung microstation"],
    keywords: ["microstation", "cong dung", "su dung"],
    answer: "MicroStation V8i được dùng để tạo và chỉnh sửa các đối tượng đồ họa, tổ chức bản vẽ theo lớp và thuộc tính, xây dựng ký hiệu hoặc kiểu đường, trình bày sản phẩm số, lưu trữ và in ấn bản vẽ theo yêu cầu."
  },
  {
    id: "micro-interface",
    topicId: "microstation-v8i",
    question: "Giao diện MicroStation V8i gồm những thành phần nào?",
    patterns: ["giao dien microstation", "thanh phan giao dien microstation", "cua so lam viec microstation"],
    keywords: ["microstation", "giao dien", "cua so", "thanh cong cu"],
    answer: "Giao diện làm việc thường gồm vùng bản vẽ, thanh menu, các hộp hoặc thanh công cụ, khu vực quản lý thuộc tính và dòng trạng thái. Người học cần nắm vị trí công cụ, chế độ bắt điểm, lớp, màu, kiểu nét và độ dày nét trước khi thao tác."
  },
  {
    id: "micro-draw",
    topicId: "microstation-v8i",
    question: "Các bước cơ bản để vẽ một đối tượng trong MicroStation là gì?",
    patterns: ["cach ve doi tuong microstation", "cac buoc ve trong microstation", "ve doi tuong v8i"],
    keywords: ["microstation", "ve", "doi tuong", "cac buoc"],
    answer: "Các bước cơ bản gồm: chọn đúng lớp và thuộc tính; chọn công cụ vẽ; xác định điểm bắt đầu và các điểm tiếp theo; nhập tham số nếu cần; kết thúc lệnh; sau đó kiểm tra vị trí, kích thước, màu, kiểu nét và lớp của đối tượng."
  },
  {
    id: "micro-edit",
    topicId: "microstation-v8i",
    question: "Có thể chỉnh sửa đối tượng trong MicroStation bằng những thao tác nào?",
    patterns: ["chinh sua doi tuong microstation", "thao tac doi tuong microstation", "sao chep di chuyen xoay microstation"],
    keywords: ["microstation", "chinh sua", "doi tuong", "sao chep", "di chuyen"],
    answer: "Các thao tác thường dùng gồm lựa chọn, sao chép, di chuyển, xoay, thay đổi tỷ lệ, xóa, thay đổi thuộc tính và hiệu chỉnh hình dạng. Trước khi thực hiện cần chọn chính xác đối tượng và kiểm tra chế độ bắt điểm để tránh sai lệch."
  },
  {
    id: "micro-symbols",
    topicId: "microstation-v8i",
    question: "Khi xây dựng ký hiệu quân sự cần lưu ý gì?",
    patterns: ["xay dung ky hieu quan su", "ky hieu quan su microstation", "luu y ky hieu microstation"],
    keywords: ["ky hieu", "quan su", "microstation", "tham so"],
    answer: "Cần chọn đúng bảng màu, lớp, tỷ lệ, kiểu đường và bộ ký hiệu theo quy định; đặt ký hiệu đúng vị trí, hướng và kích thước; kiểm tra khả năng hiển thị trước khi lưu hoặc in; không tự ý thay đổi ý nghĩa hoặc hình thức ký hiệu."
  },
  {
    id: "micro-save-print",
    topicId: "microstation-v8i",
    question: "Cần kiểm tra gì trước khi lưu hoặc in bản vẽ MicroStation?",
    patterns: ["luu in ban ve microstation", "kiem tra truoc khi in microstation", "luu file microstation"],
    keywords: ["microstation", "luu", "in", "kiem tra", "ban ve"],
    answer: "Trước khi lưu hoặc in cần kiểm tra lớp và thuộc tính đối tượng, ký hiệu, kiểu đường, tỷ lệ, phạm vi in, khổ giấy, hướng giấy, độ rõ của chữ và đường nét. Nên lưu phiên bản dự phòng trước khi thực hiện thay đổi lớn hoặc in sản phẩm."
  },

  // Chủ đề 4: Trí tuệ nhân tạo
  {
    id: "ai-definition",
    topicId: "tri-tue-nhan-tao",
    question: "Trí tuệ nhân tạo là gì?",
    patterns: ["tri tue nhan tao la gi", "ai la gi", "khai niem ai", "khai niem tri tue nhan tao"],
    keywords: ["tri tue nhan tao", "ai", "khai niem"],
    answer: "Trí tuệ nhân tạo là lĩnh vực nghiên cứu và phát triển các hệ thống máy tính có khả năng thực hiện một số nhiệm vụ thường đòi hỏi trí tuệ con người, như nhận biết, học từ dữ liệu, suy luận, xử lý ngôn ngữ, dự đoán và hỗ trợ ra quyết định."
  },
  {
    id: "ai-types",
    topicId: "tri-tue-nhan-tao",
    question: "Có thể phân loại trí tuệ nhân tạo như thế nào?",
    patterns: ["phan loai tri tue nhan tao", "cac loai ai", "ai gom nhung loai nao"],
    keywords: ["tri tue nhan tao", "ai", "phan loai"],
    answer: "Có thể phân loại AI theo phạm vi năng lực hoặc theo kỹ thuật và chức năng. Trong thực tế hiện nay, phần lớn hệ thống là AI chuyên biệt, được thiết kế để thực hiện một nhóm nhiệm vụ cụ thể như nhận dạng, dự báo, dịch thuật, trợ lý hội thoại hoặc tạo nội dung."
  },
  {
    id: "generative-ai",
    topicId: "tri-tue-nhan-tao",
    question: "AI tạo sinh là gì?",
    patterns: ["ai tao sinh la gi", "tri tue nhan tao tao sinh", "generative ai la gi"],
    keywords: ["ai tao sinh", "generative", "tao noi dung"],
    answer: "AI tạo sinh là nhóm hệ thống AI có khả năng tạo ra nội dung mới như văn bản, hình ảnh, âm thanh, bài trình chiếu, mã chương trình hoặc video dựa trên dữ liệu và yêu cầu của người dùng. Kết quả cần được kiểm tra vì mô hình có thể tạo thông tin chưa chính xác."
  },
  {
    id: "prompt-definition",
    topicId: "tri-tue-nhan-tao",
    question: "Prompt là gì?",
    patterns: ["prompt la gi", "cau lenh ai la gi", "yeu cau cho ai la gi"],
    keywords: ["prompt", "cau lenh", "yeu cau", "ai"],
    answer: "Prompt là yêu cầu hoặc chỉ dẫn người dùng cung cấp cho hệ thống AI. Prompt có thể gồm vai trò, bối cảnh, nhiệm vụ, dữ liệu đầu vào, yêu cầu về định dạng và tiêu chí đánh giá kết quả."
  },
  {
    id: "prompt-structure",
    topicId: "tri-tue-nhan-tao",
    question: "Một prompt hiệu quả cần có những thành phần nào?",
    patterns: ["cau truc prompt", "viet prompt hieu qua", "thanh phan cua prompt", "cach viet cau lenh ai"],
    keywords: ["prompt", "cau truc", "hieu qua", "boi canh", "nhiem vu"],
    answer: "Một prompt hiệu quả nên nêu rõ: vai trò của AI; bối cảnh và đối tượng; nhiệm vụ cụ thể; dữ liệu hoặc phạm vi được phép sử dụng; định dạng đầu ra; độ dài, giọng điệu và tiêu chí cần đáp ứng. Sau khi nhận kết quả cần tiếp tục kiểm tra và hiệu chỉnh yêu cầu."
  },
  {
    id: "ai-risks",
    topicId: "tri-tue-nhan-tao",
    question: "Những hạn chế và rủi ro khi sử dụng AI là gì?",
    patterns: ["han che cua ai", "rui ro khi su dung ai", "ai co the sai khong", "tac hai cua tri tue nhan tao"],
    keywords: ["ai", "han che", "rui ro", "sai", "bao mat"],
    answer: "AI có thể tạo thông tin sai, thiếu bối cảnh, thiên lệch hoặc không cập nhật; có nguy cơ làm lộ dữ liệu nếu người dùng nhập thông tin nhạy cảm; đồng thời có thể dẫn đến phụ thuộc và vi phạm bản quyền. Vì vậy phải kiểm chứng kết quả, bảo vệ dữ liệu và chịu trách nhiệm về sản phẩm cuối cùng."
  },
  {
    id: "ai-applications",
    topicId: "tri-tue-nhan-tao",
    question: "AI có thể hỗ trợ những công việc nào trong học tập và công tác?",
    patterns: ["ung dung ai trong hoc tap", "ai ho tro cong viec gi", "ung dung tri tue nhan tao", "dung ai de lam gi"],
    keywords: ["ai", "ung dung", "hoc tap", "cong tac", "ho tro"],
    answer: "AI có thể hỗ trợ tìm ý, tóm tắt, xây dựng dàn ý, tạo câu hỏi, luyện tập, dịch thuật, xử lý văn bản, tạo giọng nói, hình ảnh, bài trình chiếu và video. AI chỉ đóng vai trò hỗ trợ; người dùng phải lựa chọn, kiểm chứng và hoàn thiện nội dung."
  },
  {
    id: "ai-responsible",
    topicId: "tri-tue-nhan-tao",
    question: "Sử dụng AI có trách nhiệm cần tuân thủ những nguyên tắc nào?",
    patterns: ["su dung ai co trach nhiem", "nguyen tac su dung ai", "dung ai an toan", "bao ve du lieu khi dung ai"],
    keywords: ["ai", "trach nhiem", "nguyen tac", "bao ve du lieu"],
    answer: "Cần xác định rõ mục đích sử dụng; không nhập dữ liệu bí mật hoặc thông tin cá nhân trái quy định; kiểm chứng nội dung; tôn trọng bản quyền; minh bạch khi cần thiết; không giao toàn bộ quyết định quan trọng cho AI và người sử dụng phải chịu trách nhiệm về kết quả cuối cùng."
  },

  // Chủ đề 5: An toàn thông tin và an ninh mạng
  {
    id: "security-difference",
    topicId: "an-toan-thong-tin",
    question: "An toàn thông tin và an ninh mạng khác nhau như thế nào?",
    patterns: ["phan biet an toan thong tin va an ninh mang", "an toan thong tin khac an ninh mang", "an toan thong tin la gi"],
    keywords: ["an toan thong tin", "an ninh mang", "phan biet"],
    answer: "An toàn thông tin tập trung bảo vệ thông tin và hệ thống bảo đảm bí mật, toàn vẹn và sẵn sàng. An ninh mạng có phạm vi rộng hơn, gắn với việc bảo vệ hoạt động trên không gian mạng, phòng ngừa và xử lý hành vi xâm phạm an ninh, trật tự, quyền và lợi ích hợp pháp."
  },
  {
    id: "security-cia",
    topicId: "an-toan-thong-tin",
    question: "Ba thuộc tính cơ bản của an toàn thông tin là gì?",
    patterns: ["ba thuoc tinh an toan thong tin", "3 thuoc tinh an toan thong tin", "bi mat toan ven san sang"],
    keywords: ["an toan thong tin", "bi mat", "toan ven", "san sang"],
    answer: "Ba thuộc tính cơ bản là: bí mật – thông tin chỉ được tiếp cận bởi người có thẩm quyền; toàn vẹn – thông tin không bị sửa đổi trái phép; sẵn sàng – thông tin và hệ thống có thể được sử dụng đúng lúc khi có nhu cầu hợp lệ."
  },
  {
    id: "security-threats",
    topicId: "an-toan-thong-tin",
    question: "Những nguy cơ an toàn thông tin phổ biến là gì?",
    patterns: ["nguy co an toan thong tin", "cac moi de doa an ninh mang", "rui ro tren khong gian mang"],
    keywords: ["nguy co", "an toan thong tin", "an ninh mang", "ma doc", "lua dao"],
    answer: "Nguy cơ phổ biến gồm mã độc; lừa đảo và giả mạo; đánh cắp tài khoản; mật khẩu yếu; thiết bị hoặc phần mềm không cập nhật; kết nối mạng không an toàn; chia sẻ dữ liệu sai đối tượng; cài đặt ứng dụng không rõ nguồn gốc và hành vi bất cẩn của người sử dụng."
  },
  {
    id: "security-phishing",
    topicId: "an-toan-thong-tin",
    question: "Làm thế nào để nhận diện lừa đảo trực tuyến?",
    patterns: ["nhan dien lua dao truc tuyen", "phishing la gi", "dau hieu lua dao", "email lua dao"],
    keywords: ["lua dao", "phishing", "gia mao", "duong link"],
    answer: "Dấu hiệu thường gặp là nội dung thúc giục hoặc đe dọa, yêu cầu cung cấp mật khẩu hoặc mã xác thực, địa chỉ gửi bất thường, đường dẫn gần giống trang thật, tệp đính kèm không rõ nguồn gốc và lời mời lợi ích quá lớn. Khi nghi ngờ, không bấm liên kết, không cung cấp thông tin và xác minh qua kênh chính thức."
  },
  {
    id: "security-password",
    topicId: "an-toan-thong-tin",
    question: "Cách tạo và bảo vệ mật khẩu an toàn như thế nào?",
    patterns: ["mat khau an toan", "cach tao mat khau manh", "bao ve tai khoan", "bao mat mat khau"],
    keywords: ["mat khau", "an toan", "tai khoan", "xac thuc"],
    answer: "Nên dùng mật khẩu dài, khó đoán và khác nhau cho từng tài khoản; không chia sẻ mật khẩu; bật xác thực nhiều yếu tố; không lưu mật khẩu trên thiết bị công cộng; thay đổi ngay khi nghi bị lộ và sử dụng trình quản lý mật khẩu phù hợp nếu được phép."
  },
  {
    id: "security-device",
    topicId: "an-toan-thong-tin",
    question: "Làm thế nào để bảo vệ thiết bị và dữ liệu?",
    patterns: ["bao ve thiet bi va du lieu", "an toan may tinh", "bao ve du lieu ca nhan", "bao mat thiet bi"],
    keywords: ["bao ve", "thiet bi", "du lieu", "cap nhat", "sao luu"],
    answer: "Cần cập nhật hệ điều hành và phần mềm, sử dụng công cụ bảo vệ phù hợp, khóa màn hình, kiểm soát thiết bị lưu trữ, sao lưu dữ liệu, chỉ cài ứng dụng từ nguồn tin cậy, hạn chế dùng mạng công cộng và không đưa dữ liệu nhạy cảm lên dịch vụ chưa được phép."
  },
  {
    id: "security-depth",
    topicId: "an-toan-thong-tin",
    question: "Phòng thủ theo chiều sâu là gì?",
    patterns: ["phong thu theo chieu sau la gi", "mo hinh phong thu chieu sau", "bao mat nhieu lop"],
    keywords: ["phong thu", "chieu sau", "nhieu lop", "an toan thong tin"],
    answer: "Phòng thủ theo chiều sâu là tổ chức nhiều lớp bảo vệ liên tiếp, kết hợp con người, quy định quản lý và biện pháp kỹ thuật. Nếu một lớp bị vượt qua, các lớp còn lại vẫn có khả năng phát hiện, ngăn chặn hoặc giảm thiểu hậu quả."
  },
  {
    id: "security-incident",
    topicId: "an-toan-thong-tin",
    question: "Cần làm gì khi phát hiện sự cố an toàn thông tin?",
    patterns: ["xu ly su co an toan thong tin", "phat hien su co mang", "may tinh bi ma doc phai lam gi", "tai khoan bi lo"],
    keywords: ["su co", "an toan thong tin", "bao cao", "co lap", "ma doc"],
    answer: "Khi phát hiện dấu hiệu bất thường cần dừng thao tác có nguy cơ, hạn chế kết nối nếu phù hợp, giữ nguyên thông tin phục vụ xác minh, báo cáo ngay cho người phụ trách hoặc bộ phận chuyên môn và thực hiện theo quy trình xử lý. Không tự ý che giấu, xóa dấu vết hoặc phát tán thông tin sự cố."
  }
];
