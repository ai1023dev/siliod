const express = require('express');
const path = require('path');
const app = express();
const port = 8080;
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const nodemailer = require("nodemailer");
const { EC2Client, StartInstancesCommand, DescribeInstancesCommand, RunInstancesCommand, RebootInstancesCommand, StopInstancesCommand, TerminateInstancesCommand } = require("@aws-sdk/client-ec2");
const { Route53Client, ChangeResourceRecordSetsCommand } = require("@aws-sdk/client-route-53");
const { exec } = require("child_process");
const fs = require("fs");
const dotenv = require("dotenv");

dotenv.config();



app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
const { MongoClient } = require('mongodb');
let db;

async function startServer() {
    try {
        const client = await MongoClient.connect("mongodb://localhost:27017/", {}); db = client.db('siliod');

        ////////////////////////////////////////////////////////////////////////////////////
        ////////////////////////////////////////////////////////////////////////////////////
        ////////////////////////////////////////////////////////////////////////////////////

        // 비번 변경, 인증서

        // AWS EC2 클라이언트 생성
        const aws_client = new EC2Client({
            region: "us-east-2",
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
        });

        // Route 53 클라이언트 생성
        const route53Client = new Route53Client({
            region: "us-east-2",
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
        });



        // 🔹 새 EC2 인스턴스를 생성하는 함수
        async function createEC2Instance() {
            try {
                const params = {
                    ImageId: "ami-0cb91c7de36eed2cb", // 우분투 AMI ID
                    InstanceType: "t3.medium", // 인스턴스 유형
                    KeyName: "keypair", // 🔹 기존 키 페어 이름 입력
                    SecurityGroupIds: ["sg-0c75bf8745ed0900f"], // 🔹 보안 그룹 ID
                    SubnetId: "subnet-0d2fb1c4561c35943",
                    MinCount: 1,
                    MaxCount: 1
                };

                const command = new RunInstancesCommand(params);
                const response = await aws_client.send(command);

                const instanceId = response.Instances[0].InstanceId;
                console.log(`✅ EC2 인스턴스 생성 완료: ${instanceId}`);
                return instanceId;
            } catch (error) {
                console.error("❌ EC2 인스턴스 생성 실패:", error);
            }
        }

        async function runSSHCommand(ip, command) {
            const ssh_command = `ssh -i "C:/Users/포토박스반짝/Desktop/keypair.pem" -o StrictHostKeyChecking=no -o ConnectTimeout=180 ubuntu@ec2-${ip.replace(/\./g, '-')}.us-east-2.compute.amazonaws.com "${command}"`
            console.log(ssh_command)
            return new Promise((resolve, reject) => {
                exec(ssh_command, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`❌ SSH 명령 실행 오류: ${error.message}`);
                        reject(error);
                        return;
                    }
                    if (stderr) {
                        console.error(`⚠️ SSH stderr: ${stderr}`);
                    }
                    console.log(`✅ SSH 명령 실행 결과: ${stdout}`);
                    resolve(stdout);
                });
            });
        }


        // EC2 인스턴스의 퍼블릭 IP 가져오기
        async function getPublicIP(instanceId) {
            let publicIp = null;
            let attempts = 0;
            const maxAttempts = 20;

            while (!publicIp && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 3000));
                const command = new DescribeInstancesCommand({ InstanceIds: [instanceId] });
                const response = await aws_client.send(command);
                const instance = response.Reservations[0].Instances[0];

                // 퍼블릭 IP 확인
                publicIp = instance.PublicIpAddress;
                console.log(`퍼블릭 IP 확인 중... 현재 상태: ${publicIp || '할당 대기 중'}`);
                attempts++;
            }

            if (!publicIp) {
                throw new Error("퍼블릭 IP를 할당받지 못했습니다.");
            }

            console.log(`퍼블릭 IP: ${publicIp}`);
            return publicIp;
        }

        // Route 53 A 레코드 업데이트 함수
        async function updateRoute53Record(instanceId, ipAddress) {
            const hostedZoneId = "Z070832120OJZ8UY8BSCI"; // 네임서버가 있는 Hosted Zone ID 입력
            const domainName = instanceId.substring(2) + ".siliod.com"; // 사용할 도메인 입력

            const params = {
                HostedZoneId: hostedZoneId,
                ChangeBatch: {
                    Changes: [
                        {
                            Action: "UPSERT", // 기존 값이 있으면 업데이트, 없으면 추가
                            ResourceRecordSet: {
                                Name: domainName,
                                Type: "A",
                                TTL: 300, // 5분 캐시
                                ResourceRecords: [{ Value: ipAddress }]
                            }
                        }
                    ]
                }
            };

            const command = new ChangeResourceRecordSetsCommand(params);
            await route53Client.send(command);
            console.log(`Route 53 A 레코드 업데이트 완료: ${domainName} -> ${ipAddress}`);
        }



        // const instanceId = await createEC2Instance();
        // ready_instance(instanceId, true)

        async function ready_instance(instanceId, ready) {
            try {
                const publicIp = await getPublicIP(instanceId); // 퍼블릭 IP 가져오기
                await updateRoute53Record(instanceId, publicIp);

                // 시스템 준비 명령어 리스트
                const commands = [
                    "sudo apt-get update -y",
                    "sudo apt-get upgrade -y",
                    'echo "debconf debconf/frontend select Noninteractive" | sudo debconf-set-selections',
                    'echo "lightdm shared/default-x-display-manager select lightdm" | sudo debconf-set-selections',
                    "sudo DEBIAN_FRONTEND=noninteractive apt-get install -y ubuntu-desktop tigervnc-standalone-server tigervnc-xorg-extension tigervnc-viewer xfce4 xfce4-goodies lightdm thunar certbot dbus-x11"
                ];

                // 실행 전 딜레이 (기존에 30초 줬던 것 반영)
                await new Promise(resolve => setTimeout(resolve, 30 * 1000));

                // 명령어 순차 실행
                for (const cmd of commands) {
                    await runSSHCommand(publicIp, cmd);
                }

                console.log('✅ 시스템 준비 완료');

                if (ready) {
                    // DB에 준비된 인스턴스 등록
                    await db.collection('ready_instance').insertOne({
                        instance_id: instanceId.substring(2)
                    });

                    // 인스턴스 정지
                    await stop_instance(instanceId);
                }

                // 준비 실패 감지용 타이머 (백그라운드 실행)
                setTimeout(async () => {
                    const success = await db.collection('ready_instance').findOne({
                        instance_id: instanceId.substring(2)
                    });

                    if (!success) {
                        console.log('❌ 인스턴스 준비 실패. 종료 처리');
                        await terminate_instance(instanceId);
                    }
                }, 20 * 60 * 1000);

            } catch (error) {
                console.error("❌ ready_instance 중 오류:", error);
            }
        }





        async function create_instance(short_instanceId, name, ubuntu_password, vnc_password, id, res) {
            try {
                let instanceId
                let time


                if (short_instanceId) {
                    instanceId = 'i-' + short_instanceId.instance_id
                    res.send({ instanceId, ready: true }) // 짧게 기다림
                    time = 60 * 1000
                    await start_instance(instanceId)
                    const publicIp = await getPublicIP(instanceId);
                    await updateRoute53Record(instanceId, publicIp);
                    await create_command(publicIp, id, name, time, ubuntu_password, vnc_password, instanceId)

                    // 준비 완료 목록에서 제거
                    await db.collection('ready_instance').deleteOne({
                        instance_id: instanceId.substring(2)
                    });

                    // const ready_instanceId = await createEC2Instance();
                    // ready_instance(ready_instanceId, true)

                    // start
                } else {
                    instanceId = await createEC2Instance();
                    res.send({ instanceId, ready: false }) // 길게 기다림
                    await ready_instance(instanceId, false)
                    time = 0
                    const publicIp = await getPublicIP(instanceId);
                    await create_command(publicIp, id, name, time, ubuntu_password, vnc_password, instanceId)
                }
            } catch (error) {
                console.error("❌ 전체 실행 중 에러 발생:", error);
            }
        };

        async function create_command(publicIp, id, name, time, ubuntu_password, vnc_password, instanceId) {
            // 시간만큼 대기 (예: short_instanceId는 60초 대기)
            if (time > 0) {
                await new Promise(resolve => setTimeout(resolve, time));
            }

            // 실행할 SSH 명령어 리스트
            const domain = `${instanceId.substring(2)}.siliod.com`;
            const command = [
                `echo 'ubuntu:${ubuntu_password}' | sudo chpasswd`,
                `mkdir -p ~/.vnc`,
                `echo "${vnc_password}" | vncpasswd -f > ~/.vnc/passwd`,
                `chmod 600 ~/.vnc/passwd > /dev/null 2>&1`,
                `echo '#!/bin/bash' > ~/.vnc/xstartup && echo 'xrdb $HOME/.Xresources' >> ~/.vnc/xstartup && echo 'export $(dbus-launch)' >> ~/.vnc/xstartup && echo 'startxfce4' >> ~/.vnc/xstartup && sudo chmod +x ~/.vnc/xstartup`,
                `echo '[Resolve]' | sudo tee /etc/systemd/resolved.conf > /dev/null && echo 'DNS=8.8.8.8 8.8.4.4' | sudo tee -a /etc/systemd/resolved.conf > /dev/null && echo 'FallbackDNS=1.1.1.1 1.0.0.1' | sudo tee -a /etc/systemd/resolved.conf > /dev/null && sudo systemctl restart systemd-resolved`,
                `sudo certbot certonly --standalone -d ${domain} --non-interactive --agree-tos --email siliod.official@gmail.com`,
                `git clone https://github.com/ai1023dev/novnc.git ~/.novnc`,
                `sudo chmod +x ~/.novnc/start.sh > /dev/null 2>&1`,
                `(crontab -l 2>/dev/null; echo "@reboot ~/.novnc/start.sh ${instanceId.substring(2)}") | crontab -`,
                `vncserver :1`,
                `nohup sudo /home/ubuntu/.novnc/utils/novnc_proxy --vnc localhost:5901 --cert /etc/letsencrypt/live/${domain}/fullchain.pem --key /etc/letsencrypt/live/${domain}/privkey.pem --listen 443 > /dev/null 2>&1 & disown`
            ];

            // 순차적으로 SSH 명령 실행
            for (const cmd of command) {
                await runSSHCommand(publicIp, cmd);
            }

            // 인스턴스 DB에 등록
            await db.collection('instance').insertOne({
                user: id,
                name,
                instance_id: instanceId.substring(2)
            });

            // 5분 후 실패 체크 타이머 (백그라운드 실행)
            setTimeout(async () => {
                const success = await db.collection('instance').findOne({
                    user: id,
                    name,
                    instance_id: instanceId.substring(2)
                });

                if (!success) {
                    console.log('fail');
                    await terminate_instance(instanceId);
                }
            }, 5 * 60 * 1000);
        }


        async function reboot_instance(instanceId) {
            try {
                const command = new RebootInstancesCommand({ InstanceIds: [instanceId] });
                await aws_client.send(command);
                console.log(`✅ EC2 인스턴스 재시작 요청 완료: ${instanceId}`);
            } catch (error) {
                console.error("❌ EC2 인스턴스 재시작 실패:", error);
            }
        }



        // 기존 EC2 인스턴스 시작 함수
        async function start_instance(instanceId) {
            try {
                const command = new StartInstancesCommand({ InstanceIds: [instanceId] });
                await aws_client.send(command);
                console.log(`EC2 인스턴스 시작 요청 완료: ${instanceId}`);
                const publicIp = await getPublicIP(instanceId);
                await updateRoute53Record(instanceId, publicIp);
            } catch (error) {
                console.error("❌ EC2 인스턴스 시작 실패:", error);
            }
        }

        async function stop_instance(instanceId) {
            try {
                const command = new StopInstancesCommand({ InstanceIds: [instanceId] });
                await aws_client.send(command);
                console.log(`✅ EC2 인스턴스 중지 요청 완료: ${instanceId}`);
            } catch (error) {
                console.error("❌ EC2 인스턴스 중지 실패:", error);
            }
        }

        async function terminate_instance(instanceId) {
            try {
                const command = new TerminateInstancesCommand({ InstanceIds: [instanceId] });
                await aws_client.send(command);
                console.log(`✅ EC2 인스턴스 삭제 요청 완료: ${instanceId}`);
            } catch (error) {
                console.error("❌ EC2 인스턴스 삭제 실패:", error);
            }
        }






        // 메인 페이지
        app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public/web/main/main.html'));
        });

        // 메인 페이지
        app.get('/my_data', async (req, res) => {
            const id = login_check(req)

            const user = await db.collection('user').findOne({ id });

            const instance = await db.collection('instance').find({ user: id }).toArray();

            res.send({ user, instance });
        });

        app.post('/create_instance', async (req, res) => {
            const id = login_check(req)

            const instanceId = await db.collection('ready_instance').findOne({});
            create_instance(instanceId, req.body.name, req.body.ubuntu_password, req.body.vnc_password, id, res)
        });

        app.post('/reboot_instance', (req, res) => {
            res.send(true)
            reboot_instance('i-' + req.body.instance_id)
        });

        app.post('/start_instance', (req, res) => {
            res.send(true)
            start_instance('i-' + req.body.instance_id)
        });

        app.post('/stop_instance', (req, res) => {
            res.send(true)
            stop_instance('i-' + req.body.instance_id)
        });

        app.post('/delete_instance', (req, res) => {
            res.send(true)
            terminate_instance('i-' + req.body.instance_id)

            db.collection('instance').deleteOne({
                instance_id: req.body.instance_id
            });
        });


        // 결제 페이지
        app.get('/pay', (req, res) => {
            res.sendFile(path.join(__dirname, 'public/web/pay/pay.html'));
        });

        app.get('/mail', (req, res) => {
            sendEmail("ai1023dev@gmail.com", "테스트 이메일", "이메일 전송이 정상적으로 이루어졌습니다.");
        });

        // SMTP 설정
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: "siliod.official@gmail.com", // 본인 이메일
                pass: process.env.GMAIL_APP_PASSWORD, // Gmail의 앱 비밀번호 사용
            },
        });

        // 이메일 전송 함수
        async function sendEmail(to, subject, text) {
            try {
                await transporter.sendMail({
                    from: "siliod.official@gmail.com",
                    to,
                    subject,
                    text,
                });
                console.log("이메일 전송 성공!");
            } catch (error) {
                console.error("이메일 전송 실패:", error);
            }
        }



        //////////////////////////////////// 로그인 /////////////////////////////////////

        const secretKey = 'qwertyuiop' // process.env.SECRET_KEY

        // 옵션 설정 (선택 사항)
        const options = {
            algorithm: 'HS256',
            expiresIn: '3h'
        };

        function give_jwt(id, res) {
            try {
                console.log('받은 아이디')
                console.log(id)
                const payload = { id: id }

                const token = jwt.sign(payload, secretKey, options);
                console.log(token); // 생성된 토큰을 콘솔에 출력하여 확인

                res.cookie('account', token, {
                    httpOnly: true, // 클라이언트 측 스크립트에서 쿠키에 접근 불가
                    secure: true, // HTTPS 연결에서만 쿠키 전송
                    maxAge: 3 * 60 * 60 * 1000, // 3hour 유효한 쿠키 생성
                });
                return true
            } catch (error) {
                return 'err'
            }
        }

        function login_check(req) {
            if (req.cookies && req.cookies.account) {
                const token = req.cookies.account;

                const decoded = check_token(token);
                if (decoded !== false) {  // 조건문 수정
                    console.log('해석한 쿠키:', decoded.id);
                    console.log('생산 날짜:', timestampToDate(decoded.iat));
                    console.log('유효날짜:', timestampToDate(decoded.exp));

                    return decoded.id;
                } else {
                    return false;
                }
            } else {
                console.log('쿠키가 존재하지 않습니다.');
                return false;
            }
        }

        function timestampToDate(timestamp) {
            return new Date(timestamp * 1000).toLocaleString();
        }

        // JWT 검증 함수
        function check_token(token) {
            try {
                return jwt.verify(token, secretKey);
            } catch (err) {
                console.log('fdggdfgd')
                return false
            }
        }



        //////////////////////////////////// 구글 로그인 /////////////////////////////////////

        app.get('/login/google', (req, res) => {
            console.log(req.query.state);
            let url = 'https://accounts.google.com/o/oauth2/v2/auth';

            url += `?client_id=612283661754-r0ffeqvtuptro27vsebaiojd9cqv7lmf.apps.googleusercontent.com`;

            let redirectUri = req.query.state === 'google_login'
                ? 'http://localhost:8080/login/google/redirect'
                : 'http://localhost:8080/join/google/redirect';

            url += `&redirect_uri=${encodeURIComponent(redirectUri)}`;
            url += '&response_type=code';
            url += '&scope=profile email';

            res.redirect(url);
        });


        const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
        const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

        app.get('/login/google/redirect', async (req, res) => {
            google_login(req, res, 'login')
        });

        app.get('/join/google/redirect', async (req, res) => {
            google_login(req, res, 'join')
        });

        async function google_login(req, res, params) {
            const { code } = req.query;
            console.log(`code: ${code}`);

            try {
                // access_token, refresh_token 등의 구글 토큰 정보 가져오기
                const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        code,
                        client_id: '612283661754-r0ffeqvtuptro27vsebaiojd9cqv7lmf.apps.googleusercontent.com',
                        client_secret: process.env.GOOGLE_SECRET,
                        redirect_uri: `http://localhost:8080/${params}/google/redirect`,
                        grant_type: 'authorization_code',
                    }),
                });

                const tokenData = await tokenResponse.json();

                if (!tokenResponse.ok) {
                    throw new Error(`Error fetching tokens: ${tokenData.error}`);
                }

                // email, google id 등의 사용자 구글 계정 정보 가져오기
                const userResponse = await fetch(GOOGLE_USERINFO_URL, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${tokenData.access_token}`,
                    },
                });

                const userData = await userResponse.json();

                if (!userResponse.ok) {
                    throw new Error(`Error fetching user info: ${userData.error}`);
                }

                console.log('Google User Data:', userData);

                // DB에서 사용자 조회
                const user = await db.collection('user').findOne({ id: userData.id });

                if (user) {
                    // 기존 회원 → JWT 발급 후 로그인 처리
                    give_jwt(userData.id, res);
                    return res.redirect("/");
                } else {
                    if (params === 'login') {
                        // 로그인 시도했으나 회원가입 안 되어 있음 → 회원가입 페이지로 리다이렉트
                        return res.redirect('/?state=google_join');
                    } else {
                        // 회원가입 진행
                        await db.collection('user').insertOne({
                            type: 'google',
                            id: userData.id,
                            name: userData.name,
                            avatar_url: userData.picture,
                            email: userData.email
                        });

                        // JWT 발급 후 로그인 처리
                        give_jwt(userData.id, res);
                        return res.redirect("/");
                    }
                }
            } catch (error) {
                console.error('Google OAuth Error:', error);
                res.status(500).json({ error: 'Failed to authenticate with Google' });
            }
        }


        ////////////////////////////////////////////////////////////////////////////////////
        ////////////////////////////////////////////////////////////////////////////////////
        ////////////////////////////////////////////////////////////////////////////////////

        app.listen(port, function () {
            console.log(`Server is listening on port ${port}`);
        });
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
    }
}

// Call the top-level async function to start the server
(async () => {
    try {
        await startServer();
    } catch (err) {
        console.error('Error starting server:', err);
    }
})();