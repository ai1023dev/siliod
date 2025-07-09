const params = new URLSearchParams(window.location.search);
const instance_id = params.get("instance");

// ✅ 사용자에게 보이는 텍스트만 영어로 변경
$('h3').text('Backup Shell - ' + instance_id)

$.ajax({
    method: 'POST',
    url: `/instance_info_ip`,
    data: { instance_id },
    success: function (data) {
        console.log(data); // Example: "3.144.7.85"

        if (data) {
            const ip = data; // Retrieved IP

            // WebSocket connection
            const ws = new WebSocket('wss://siliod.com');

            const output = document.getElementById('output');

            ws.onmessage = (e) => {
                const msg = e.data.trim();

                // Ignore unnecessary messages
                if (msg.includes('[SSH 종료 코드: null]') || msg.includes('[⛔ 실행 중단 요청됨]')) return;

                // Display message at the top
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
            alert('Instance is not running');
        }
    },
    error: function (xhr, status, error) {
        alert('Server-side error');
    }
});