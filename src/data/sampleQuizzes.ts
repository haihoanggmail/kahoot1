import { Quiz } from '../types/quiz';

export const INITIAL_QUIZZES: Quiz[] = [
  {
    id: 'quiz-sec-01',
    title: 'An toàn Thông tin & Bảo mật Dữ liệu Workspace 2026',
    description: 'Bài kiểm tra định kỳ về an toàn thông tin, nhận diện lừa đảo Phishing và quản trị mật khẩu cho nhân sự công ty.',
    category: 'Bảo mật & CNTT',
    targetDomain: 'hachihi.vn',
    isPublic: true,
    createdBy: 'admin@hachihi.vn',
    authorName: 'Security Team HACHIHI',
    createdAt: '2026-03-15',
    updatedAt: '2026-03-20',
    tags: ['Bảo mật', 'Google Workspace', 'Nội bộ'],
    questions: [
      {
        id: 'q1',
        text: 'Khi nhận được email khẩn cấp từ "CEO" yêu cầu mua thẻ nạp tiền hoặc chuyển tiền gấp qua tài khoản cá nhân, bạn cần làm gì?',
        type: 'single',
        options: [
          'Thực hiện ngay lập tức để không làm chậm trễ công việc cấp bách',
          'Xác minh trực tiếp qua cuộc gọi hoặc kênh nội bộ trước khi thực hiện',
          'Chuyển tiếp cho đồng nghiệp khác trong team thực hiện thay',
          'Nhấn vào link trong email để xem chi tiết hóa đơn thanh toán'
        ],
        correctAnswers: [1],
        timeLimit: 20,
        points: 1000,
        explanation: 'Đây là hình thức lừa đảo BEC (Business Email Compromise). Tuyệt đối luôn luôn xác minh 2 kênh (Out-of-band verification) trước các yêu cầu chuyển khoản hoặc mua sắm.'
      },
      {
        id: 'q2',
        text: 'Đâu là tiêu chí quan trọng nhất của một mật khẩu mạnh theo chuẩn NIST & Google Workspace?',
        type: 'single',
        options: [
          'Mật khẩu ngắn nhưng đổi 1 tuần 1 lần',
          'Độ dài từ 14-16 ký tự trở lên (Passphrase) kết hợp 2FA khóa bảo mật',
          'Sử dụng ngày tháng năm sinh đảo ngược và thêm số 123',
          'Mật khẩu giống nhau cho cả tài khoản cá nhân và tài khoản công ty'
        ],
        correctAnswers: [1],
        timeLimit: 20,
        points: 1000,
        explanation: 'Độ dài ký tự (Passphrase) và bảo mật 2 lớp (2FA/FIDO2) tạo rào cản an toàn nhất trước các cuộc tấn công Brute-force & Credential Stuffing.'
      },
      {
        id: 'q3',
        text: 'Xác thực 2 yếu tố (2FA) là bắt buộc đối với tất cả thành viên trong tổ chức HACHIHI?',
        type: 'boolean',
        options: [
          'ĐÚNG - Bắt buộc trên toàn bộ hệ thống Google Workspace',
          'SAI - Chỉ dành riêng cho phòng IT và Kế toán'
        ],
        correctAnswers: [0],
        timeLimit: 15,
        points: 1000,
        explanation: 'Chính sách bảo mật Zero-Trust yêu cầu 100% tài khoản công ty phải bật xác thực 2 lớp qua Google Authenticator hoặc Hardware Key.'
      },
      {
        id: 'q4',
        text: 'Hành động nào sau đây vi phạm nghiêm trọng quy định an toàn thông tin khi làm việc từ xa (Remote)?',
        type: 'single',
        options: [
          'Sử dụng VPN có mã hóa của công ty khi truy cập hệ thống',
          'Lưu trữ dữ liệu mật của khách hàng lên Google Drive cá nhân ngoài tổ chức',
          'Khóa màn hình máy tính (Win+L / Cmd+Ctrl+Q) khi rời vị trí',
          'Kiểm tra định kỳ các quyền cấp cho ứng dụng bên thứ ba (Third-party apps)'
        ],
        correctAnswers: [1],
        timeLimit: 20,
        points: 1000,
        explanation: 'Lưu trữ dữ liệu tổ chức sang tài khoản cá nhân không kiểm soát được tiềm ẩn nguy cơ rò rỉ dữ liệu (Data Leakage) và vi phạm chuẩn ISO 27001 / GDPR.'
      },
      {
        id: 'q5',
        text: 'Phương thức triển khai nào giúp Cloudflare Workers bảo vệ hệ thống khỏi các cuộc tấn công DDoS và BOT?',
        type: 'single',
        options: [
          'Chạy trên 1 máy chủ duy nhất tại văn phòng',
          'Anycast Network toàn cầu với Edge Rate Limiting và WebSockets xác thực',
          'Tắt toàn bộ cổng Internet và chỉ mở trong giờ hành chính',
          'Chỉ cho phép người dùng dùng trình duyệt Internet Explorer'
        ],
        correctAnswers: [1],
        timeLimit: 20,
        points: 2000,
        explanation: 'Cloudflare sở hữu mạng lưới Anycast tại hơn 300 thành phố, tự động chặn DDoS ở tầng Edge và hỗ trợ Rate Limiting miễn phí cho các ứng dụng Quiz.'
      }
    ]
  },
  {
    id: 'quiz-cloudflare-02',
    title: 'Kiến trúc Cloudflare Serverless & Edge Computing',
    description: 'Tìm hiểu về Cloudflare Pages, Workers, D1 Database, Durable Objects và giải pháp tối ưu chi phí 0đ cho MVP.',
    category: 'Kỹ thuật Cloud',
    targetDomain: 'hachihi.vn',
    isPublic: true,
    createdBy: 'techlead@hachihi.vn',
    authorName: 'DevOps & Architecture Team',
    createdAt: '2026-03-18',
    updatedAt: '2026-03-22',
    tags: ['Cloudflare', 'D1', 'Workers', 'WebSockets'],
    questions: [
      {
        id: 'cf-1',
        text: 'Cloudflare D1 là loại cơ sở dữ liệu nào và được xây dựng dựa trên engine gì?',
        type: 'single',
        options: [
          'NoSQL Document Database dựa trên MongoDB',
          'Serverless Relational SQL Database phân tán dựa trên SQLite',
          'In-memory Cache giống Redis đơn thuần',
          'Graph Database dựa trên Neo4j'
        ],
        correctAnswers: [1],
        timeLimit: 20,
        points: 1000,
        explanation: 'Cloudflare D1 là cơ sở dữ liệu quan hệ SQL phân tán ở Edge được xây dựng trên SQLite, miễn phí 5 triệu lượt đọc/ngày và 100.000 lượt ghi/ngày.'
      },
      {
        id: 'cf-2',
        text: 'Để duy trì phòng thi trực tiếp 50 người đồng bộ tức thời (Real-time latency < 50ms) trên Cloudflare, công nghệ nào phù hợp nhất?',
        type: 'single',
        options: [
          'HTTP Long-Polling liên tục mỗi 200ms',
          'Cloudflare Workers kết hợp WebSockets / Durable Objects',
          'Gửi email thông báo điểm sau mỗi câu hỏi',
          'Quét file tĩnh trên CDN định kỳ'
        ],
        correctAnswers: [1],
        timeLimit: 20,
        points: 1000,
        explanation: 'WebSockets duy trì kết nối 2 chiều liên tục (Full-duplex), giúp Host gửi câu hỏi và 50 người bấm đáp án với độ trễ tính bằng mili-giây.'
      },
      {
        id: 'cf-3',
        text: 'Gói miễn phí (Free Tier) của Cloudflare Workers cho phép bao nhiêu requests mỗi ngày?',
        type: 'single',
        options: [
          'Chỉ 1.000 requests/ngày',
          '100.000 requests/ngày (hoàn toàn đủ cho hàng chục phòng thi 50 người mỗi ngày)',
          '10.000 requests/tháng',
          'Không có gói miễn phí'
        ],
        correctAnswers: [1],
        timeLimit: 20,
        points: 1000,
        explanation: 'Cloudflare cung cấp 100.000 requests/ngày miễn phí vĩnh viễn trên Workers, cùng với băng thông không giới hạn trên Cloudflare Pages.'
      },
      {
        id: 'cf-4',
        text: 'Để kiểm tra người dùng có thuộc tổ chức Google Workspace chỉ định (ví dụ @hachihi.vn), cơ chế nào là an toàn nhất?',
        type: 'single',
        options: [
          'Chỉ hỏi người dùng gõ email vào ô text ở giao diện',
          'Giải mã và xác minh chữ ký Google ID Token JWT (hd claim & aud claim) tại Worker backend',
          'Lưu danh sách tên người dùng trong LocalStorage trình duyệt',
          'Không cần kiểm tra nếu người dùng nói họ là nhân viên'
        ],
        correctAnswers: [1],
        timeLimit: 20,
        points: 2000,
        explanation: 'Google ID Token chứa claim "hd" (hosted domain) được ký bằng private key của Google. Backend Worker verify public certs của Google để chống giả mạo 100%.'
      }
    ]
  },
  {
    id: 'quiz-culture-03',
    title: 'HACHIHI Culture & Sprint Kickoff Quiz',
    description: 'Bộ câu hỏi nhanh về văn hóa làm việc Agile, tinh thần đồng đội và các cột mốc mục tiêu của HACHIHI.',
    category: 'Văn hóa & Team',
    targetDomain: 'hachihi.vn',
    isPublic: true,
    createdBy: 'hr@hachihi.vn',
    authorName: 'HR & People Team',
    createdAt: '2026-03-10',
    updatedAt: '2026-03-21',
    tags: ['Văn hóa', 'Agile', 'Team Building'],
    questions: [
      {
        id: 'cul-1',
        text: 'Một buổi Daily Standup trong quy trình Agile chuẩn nên kéo dài tối đa bao nhiêu phút?',
        type: 'single',
        options: [
          '60 phút để tranh luận chi tiết thiết kế',
          '15 phút tập trung vào 3 câu hỏi: đã làm gì, sẽ làm gì, có vướng mắc gì',
          'Chỉ khi nào có lỗi nghiêm trọng mới họp',
          'Toàn bộ buổi sáng'
        ],
        correctAnswers: [1],
        timeLimit: 15,
        points: 1000,
        explanation: 'Daily Standup ngắn gọn 15 phút giúp đồng bộ tiến độ mà không làm phân mảnh thời gian Deep Work của kỹ sư.'
      },
      {
        id: 'cul-2',
        text: 'Tôn chỉ phát triển sản phẩm MVP của HACHIHI là gì?',
        type: 'single',
        options: [
          'Làm thật nhiều tính năng phức tạp cùng lúc dù không ai dùng',
          'Tập trung giải quyết bài toán cốt lõi nhanh nhất, mượt mà, ổn định và chi phí tối ưu',
          'Sao chép 100% không cải tiến gì',
          'Chỉ viết tài liệu mà không cần chạy code thực tế'
        ],
        correctAnswers: [1],
        timeLimit: 15,
        points: 1000,
        explanation: 'MVP hiệu quả là giải quyết trọn vẹn nỗi đau cốt lõi với hiệu năng cao nhất và chi phí vận hành thấp nhất.'
      }
    ]
  }
];
