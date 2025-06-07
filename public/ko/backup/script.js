const params = new URLSearchParams(window.location.search);
const instance_id = params.get("instance")
$('h3').text('백업용 쉘 - ' + instance_id)

$.ajax({
    method: 'POST',
    url: `/instance_info_ip`,
    data: { instance_id },
    success: function (data) {
        console.log(data); // 예: "3.144.7.85"

        if (data) {
            const ip = data; // 받아온 IP

            // WebSocket 연결
            const ws = new WebSocket('ws://localhost:8000');

            const output = document.getElementById('output');

            ws.onmessage = (e) => {
                const msg = e.data.trim();

                // 불필요한 메시지 무시
                if (msg.includes('[SSH 종료 코드: null]') || msg.includes('[⛔ 실행 중단 요청됨]')) return;

                // 메시지를 위로 출력
                const line = document.createElement('div');
                line.textContent = msg;
                output.prepend(line);
            };

            document.getElementById('run').onclick = () => {
                const cmd = document.getElementById('cmd').value.trim();
                if (cmd) {
                    ws.send(JSON.stringify({ type: 'run', ip: ip, command: cmd }));
                }
            };

            document.getElementById('stop').onclick = () => {
                ws.send(JSON.stringify({ type: 'stop' }));
            };
        } else {
            alert('인스턴스가 실행되지 않음');
        }
    },
    error: function (xhr, status, error) {
        alert('서버 측 에러')
    }
});