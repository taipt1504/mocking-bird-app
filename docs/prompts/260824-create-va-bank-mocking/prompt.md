# Task: Tạo project webapp mocking flow thanh toán VA từ phía BANK

**Mocking webapp nhầm giả lập flow thanh toán VA từ phía app của ngân hàng**

## Docs references:

- Knowledge base integrate hiện tại ở va-ms: `/Users/taiphan/Documents/Projects/ewallet-workspace/va-ms/.claude/claudehut/tasks/0006-va-management-core`
- Source integrate ở va-ms: `/Users/taiphan/Documents/Projects/ewallet-workspace/va-ms/src/main/java/inc/newera/va/domain/tcb`
- Mocking bird service: `/Users/taiphan/Documents/Projects/ewallet-workspace/mocking-bird-ms`
  - Đây là service giả lập TCB thực hệnn thanh toán VA
  - Simulator va controller: `/Users/taiphan/Documents/Projects/ewallet-workspace/mocking-bird-ms/src/main/java/io/f8a/mockingbird/provider/tcbva/TcbVaSimulationController.java` -> đây là controller expose các APIs để thực hiện integrate build app bank simulator

## FLows:

1. Real Flow mà APP ngân hàng khi thực hiện thanh toán VA:

- Explore deep dive section Docs references để nắm về flow thực hiện payment VA
- Overview về flow ở Phía APP Bank sẽ thực hiện các flow sau khi thực hiện integrate với va-ms:
  - TCB gọi inquiry api ở va-ms để truy vấn thông tin VA
  - Thực hiện thanh toán ở ngân hàng -> TCB thực hiện confirm các transaction thanh toán trên VA đó, ở đây 1 VA có thể có nhiều transaction payment thành công -> do đó cần flow confirm transaction
- Overview về flow refund VA:
  - phía va-ms sẽ gọi TCB thực hiện init refund
  - Sau đó TCB thực hiện refund -> tiếp theo sau khi refund xong TCB gọi va-ms để callback notify status của refund transaction

2. Flow simulator cần thực hiện ở đây:

- Ở đây cần build 1 webapp giả lập app ngân hàng thực hiện thanh toán VA:
  - Giả lập flow gọi inquiry bằng việc input va number để trigger gọi inquiry
  - Giả lập thực hiện payment flow, design cover được nhiều case payment nhất như single payment, concurency payment,...

## Yêu cầu:

- Explore deep dive các tài liệu docs references để có đầy đủ context từ đó design build app simulator best practice nhất
- Design app dễ dàng sử dụng cover nhiều test case nhất có thể
