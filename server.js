process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

require('express-async-errors');


const express = require('express');
const path = require('path');
const app = express(); // HTTPS 용 앱
const redirectApp = express(); // HTTP 리다이렉션 용 앱
const port = 443;
const httpPort = 80;
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const nodemailer = require("nodemailer");
const { EC2Client, DescribeInstanceStatusCommand, DescribeVolumesCommand, ModifyVolumeCommand, StartInstancesCommand, DescribeInstancesCommand, DescribeSecurityGroupsCommand, RunInstancesCommand, RebootInstancesCommand, StopInstancesCommand, TerminateInstancesCommand, CreateVolumeCommand, AttachVolumeCommand, waitUntilVolumeAvailable, CreateSecurityGroupCommand, AuthorizeSecurityGroupIngressCommand, RevokeSecurityGroupIngressCommand } = require("@aws-sdk/client-ec2");
const { Route53Client, ChangeResourceRecordSetsCommand } = require("@aws-sdk/client-route-53");
const { exec, spawn } = require("child_process");
const WebSocket = require('ws');
const dotenv = require("dotenv");
const https = require('https');
const http = require('http');
const fs = require('fs');
const compression = require('compression')
const requestIp = require('request-ip');
app.use(requestIp.mw());
const geoip = require('geoip-lite');
app.use(compression())
const helmet = require('helmet');
app.use(helmet({
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
            "script-src": [
                "'self'",
                "https://code.jquery.com",
                "https://js.tosspayments.com",
                "https://cdnjs.cloudflare.com",
                "https://us.i.posthog.com",
                "https://us-assets.i.posthog.com"
            ],
            "connect-src": [
                "'self'",
                "https://api.ipify.org",
                "https://us.i.posthog.com",
                "https://log.tosspayments.com",
                "https://js.tosspayments.com",
                "https://apigw-sandbox.tosspayments.com",
                "https://event.tosspayments.com",
                "https://api.tosspayments.com",
                "wss://siliod.com:8443"
            ],
            "frame-src": ["*"],
            "style-src": ["'self'", "'unsafe-inline'"],
            "img-src": [
                "'self'",
                "data:",
                "https://lh3.googleusercontent.com"  // ✅ 이미지 허용 도메인 추가
            ]
        }
    },
    frameguard: false
}));


// 인증서 로드
const https_options = {
    key: fs.readFileSync('/etc/letsencrypt/live/siliod.com/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/siliod.com/fullchain.pem')
};

dotenv.config();



app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// app.use(helmet());

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
        async function createEC2Instance(grade) {
            try {
                const securityGroupId = await createSecurityGroup();

                const params = {
                    ImageId: "ami-0cb91c7de36eed2cb", // 우분투 AMI ID
                    InstanceType: 't3.' + grade, // 동적으로 인스턴스 유형 설정
                    KeyName: "keypair", // 🔹 기존 키 페어 이름 입력
                    SecurityGroupIds: [securityGroupId],
                    SubnetId: "subnet-0d2fb1c4561c35943",
                    MinCount: 1,
                    MaxCount: 1
                };

                const command = new RunInstancesCommand(params);
                const response = await aws_client.send(command);

                const instanceId = response.Instances[0].InstanceId;
                console.log(`✅ EC2 인스턴스 생성 완료: ${instanceId}`);

                await new Promise(resolve => setTimeout(resolve, 5000));

                await addIngressRule(instanceId, 'tcp', 22, 22, '0.0.0.0/0')
                await addIngressRule(instanceId, 'tcp', 80, 80, '0.0.0.0/0')

                return instanceId;
            } catch (error) {
                console.error("❌ EC2 인스턴스 생성 실패:", error);
            }
        }

        async function createSecurityGroup() {
            const params = {
                GroupName: "SecurityGroup" + Date.now() + Math.random(),  // 고유한 이름 생성
                VpcId: "vpc-0899762b3597175ba",          // VPC ID
                Description: "temporary"
            };

            const command = new CreateSecurityGroupCommand(params);
            const response = await aws_client.send(command);
            return response.GroupId; // 반환: 보안 그룹 ID
        }

        async function addIngressRule(instanceId, protocol, from_port, to_port, source) {
            const groupId = await getSecurityGroupId(instanceId);
            const params = {
                GroupId: groupId,
                IpPermissions: [
                    {
                        IpProtocol: protocol,
                        FromPort: from_port,
                        ToPort: to_port,
                        IpRanges: [{ CidrIp: source }] // 모든 IP에서 접근 가능
                    }
                ]
            };

            const command = new AuthorizeSecurityGroupIngressCommand(params);
            await aws_client.send(command);
            console.log(`✅ 보안 그룹에 포트 ${from_port}-${to_port} 허용 규칙 추가 완료`);
        }

        async function removeIngressRule(instanceId, protocol, from_port, to_port, source) {
            const groupId = await getSecurityGroupId(instanceId);
            const params = {
                GroupId: groupId,
                IpPermissions: [
                    {
                        IpProtocol: protocol,
                        FromPort: from_port,
                        ToPort: to_port,
                        IpRanges: [{ CidrIp: source }]
                    }
                ]
            };

            const command = new RevokeSecurityGroupIngressCommand(params);
            await aws_client.send(command);
            console.log(`✅ 보안 그룹에서 포트 ${from_port}-${to_port} 허용 규칙 삭제 완료`);
        }


        async function getSecurityGroupId(instanceId) {
            const params = {
                InstanceIds: [instanceId]
            };

            const command = new DescribeInstancesCommand(params);
            const data = await aws_client.send(command);

            // 인스턴스의 보안 그룹 ID 가져오기
            const securityGroupId = data.Reservations[0].Instances[0].SecurityGroups[0].GroupId;
            return securityGroupId;
        }


        // const attachVolume = async (instanceId, size) => {
        const modifyAttachedVolume = async (instanceId, newSize) => {
            try {
                // 1. 인스턴스 정보 조회
                const descCommand = new DescribeInstancesCommand({ InstanceIds: [instanceId] });
                const descResult = await aws_client.send(descCommand);
                const instance = descResult.Reservations[0].Instances[0];

                // 2. 루트 디바이스 또는 /dev/xvdf 같은 이름으로 붙은 볼륨 찾기
                const volume = instance.BlockDeviceMappings.find(b => b.DeviceName === '/dev/sda1'); // 필요시 변경
                if (!volume) throw new Error("지정된 디바이스에 연결된 볼륨이 없습니다.");

                const volumeId = volume.Ebs.VolumeId;
                console.log(`🔍 연결된 볼륨 ID: ${volumeId}`);

                // 3. 볼륨 정보 조회
                const volDesc = new DescribeVolumesCommand({ VolumeIds: [volumeId] });
                const volResult = await aws_client.send(volDesc);
                const currentSize = volResult.Volumes[0].Size;

                console.log(`📏 현재 크기: ${currentSize} GiB, 요청 크기: ${newSize} GiB`);

                if (newSize <= currentSize) {
                    throw new Error("ℹ️ 요청한 크기가 현재보다 작거나 같으므로 변경하지 않습니다.");
                }

                // 4. 볼륨 크기 수정
                const modifyCommand = new ModifyVolumeCommand({
                    VolumeId: volumeId,
                    Size: newSize
                });
                await aws_client.send(modifyCommand);
                console.log("🔧 볼륨 크기 수정 요청 완료");

                // ⚠️ 파일 시스템 확장은 EC2 내부에서 실행 필요 (수동 또는 SSM 사용)
                console.log("⚠️ 인스턴스 내부에서 파일 시스템도 확장해 주세요.");
                return true

            } catch (error) {
                console.error("❌ 볼륨 크기 확장 실패:", error);
                return error
            }
        };



        async function runSSHCommand(ip, command) {
            const ssh_command = `ssh -i "/home/ubuntu/siliod/keypair.pem" -o StrictHostKeyChecking=no -o ConnectTimeout=180 ubuntu@ec2-${ip.replace(/\./g, '-')}.us-east-2.compute.amazonaws.com "${command}"`
            console.log(command)
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
                    // console.log(`✅ SSH 명령 실행 결과: ${stdout}`);
                    resolve(stdout);
                });
            });
        }

        // 인스턴트 상태검사
        async function getInstanceStatus(instanceId) {
            try {
                const command = new DescribeInstanceStatusCommand({
                    InstanceIds: [instanceId],
                    IncludeAllInstances: true, // 중지 상태 인스턴스도 포함
                });

                const response = await aws_client.send(command);

                const instance = response.InstanceStatuses[0];
                if (!instance) {
                    console.log("📭 인스턴스 정보 없음");
                    return null;
                }

                return {
                    instanceState: instance.InstanceState.Name, // "running", "stopped", "pending" 등
                    systemStatus: instance.SystemStatus.Status, // "ok", "impaired", etc
                    instanceStatus: instance.InstanceStatus.Status // "ok", "impaired", etc
                };
            } catch (error) {
                console.error("❌ 인스턴스 상태 조회 실패:", error);
                return null;
            }
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

        // EC2 인스턴스의 내부 IP 가져오기
        async function getPrivateIP(instanceId) {
            let privateIp = null;
            let attempts = 0;
            const maxAttempts = 20;

            while (!privateIp && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 3000));
                const command = new DescribeInstancesCommand({ InstanceIds: [instanceId] });
                const response = await aws_client.send(command);
                const instance = response.Reservations[0].Instances[0];

                // 내부 IP 확인
                privateIp = instance.PrivateIpAddress;
                console.log(`내부 IP 확인 중... 현재 상태: ${privateIp || '할당 대기 중'}`);
                attempts++;
            }

            if (!privateIp) {
                throw new Error("내부 IP를 할당받지 못했습니다.");
            }

            console.log(`내부 IP: ${privateIp}`);
            return privateIp;
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


        async function getOpenPorts(instanceId) {
            // 인스턴스 정보 가져오기
            const instanceCommand = new DescribeInstancesCommand({ InstanceIds: [instanceId] });
            const instanceResponse = await aws_client.send(instanceCommand);
            const instance = instanceResponse.Reservations[0].Instances[0];

            const securityGroupIds = instance.SecurityGroups.map(sg => sg.GroupId);

            // 보안 그룹 정보 가져오기
            const sgCommand = new DescribeSecurityGroupsCommand({ GroupIds: securityGroupIds });
            const sgResponse = await aws_client.send(sgCommand);

            const openPorts = [];

            sgResponse.SecurityGroups.forEach(sg => {
                sg.IpPermissions.forEach(permission => {
                    if (permission.FromPort !== undefined && permission.ToPort !== undefined) {
                        openPorts.push({
                            protocol: permission.IpProtocol,
                            fromPort: permission.FromPort,
                            toPort: permission.ToPort,
                            sources: [
                                ...(permission.IpRanges || []).map(range => range.CidrIp),
                                ...(permission.Ipv6Ranges || []).map(range => range.CidrIpv6)
                            ]
                        });
                    }
                });
            });

            return openPorts;
        }




        // async function launchInstances() {
        //     const types = [
        //         { type: 'nano', count: 5 },
        //         { type: 'micro', count: 5 },
        //         { type: 'small', count: 5 },
        //         { type: 'medium', count: 10 }, // 10
        //         { type: 'large', count: 5 },
        //         { type: 'xlarge', count: 5 },
        //     ];

        //     const allJobs = [];

        //     // 첫 번째 그룹: ready_instance(..., true, false, type)
        //     for (const { type, count } of types) {
        //         for (let i = 0; i < count; i++) {
        //             allJobs.push(async () => {
        //                 const instanceId = await createEC2Instance(type);
        //                 await new Promise(resolve => setTimeout(resolve, 10000));
        //                 await ready_instance(instanceId, true, false, type);
        //                 await new Promise(resolve => setTimeout(resolve, 10000));
        //             });
        //         }
        //     }

        //     // 두 번째 그룹: ready_instance(..., true, true, type)
        //     for (const { type, count } of types) {
        //         for (let i = 0; i < count; i++) {
        //             allJobs.push(async () => {
        //                 const instanceId = await createEC2Instance(type);
        //                 await new Promise(resolve => setTimeout(resolve, 10000));
        //                 await ready_instance(instanceId, true, true, type);
        //                 await new Promise(resolve => setTimeout(resolve, 10000));
        //             });
        //         }
        //     }

        //     // 순차 실행
        //     for (const job of allJobs) {
        //         await job(); // 한 작업이 끝날 때까지 기다림
        //     }
        // }

        // launchInstances()
        //     .then(() => {
        //         console.log('모든 인스턴스 생성 및 준비 완료 (순차 실행)');
        //     })
        //     .catch(console.error);




        async function ready_instance(instanceId, ready, type, grade) {
            try {
                const publicIp = await getPublicIP(instanceId); // 퍼블릭 IP 가져오기

                await updateRoute53Record(instanceId, publicIp);

                await check_command(publicIp)

                const domain = `${instanceId.substring(2)}.siliod.com`;

                let commands = []

                // 시스템 준비 명령어 리스트
                const gui_ready_commands = [
                    "sudo apt-get update -y",
                    "sudo apt-get upgrade -y",
                    'echo "debconf debconf/frontend select Noninteractive" | sudo debconf-set-selections',
                    'echo "lightdm shared/default-x-display-manager select lightdm" | sudo debconf-set-selections',
                    "sudo DEBIAN_FRONTEND=noninteractive apt-get install -y ubuntu-desktop tigervnc-standalone-server tigervnc-xorg-extension tigervnc-viewer xfce4 xfce4-goodies lightdm thunar dbus-x11 socat",
                    "mkdir -p ~/.vnc",
                    "echo '#!/bin/bash' > ~/.vnc/xstartup && echo 'xrdb $HOME/.Xresources' >> ~/.vnc/xstartup && echo 'export $(dbus-launch)' >> ~/.vnc/xstartup && echo 'startxfce4' >> ~/.vnc/xstartup && sudo chmod +x ~/.vnc/xstartup",
                    "echo '[Resolve]' | sudo tee /etc/systemd/resolved.conf > /dev/null && echo 'DNS=8.8.8.8 8.8.4.4' | sudo tee -a /etc/systemd/resolved.conf > /dev/null && echo 'FallbackDNS=1.1.1.1 1.0.0.1' | sudo tee -a /etc/systemd/resolved.conf > /dev/null && sudo systemctl restart systemd-resolved",
                    "git clone https://github.com/ai1023dev/novnc.git ~/.novnc",
                    "sudo chmod +x ~/.novnc/start.sh > /dev/null 2>&1",
                    "curl https://get.acme.sh | sh",
                    "~/.acme.sh/acme.sh --set-default-ca --server https://api.buypass.com/acme/directory",
                    `sudo ~/.acme.sh/acme.sh --issue --debug --standalone -d ${domain} --accountemail siliod.official@gmail.com`,
                    `sudo ~/.acme.sh/acme.sh --install-cert -d ${domain} --key-file /etc/ssl/private/${domain}.key --fullchain-file /etc/ssl/certs/${domain}.crt`
                ];


                const cli_ready_commands = [
                    "sudo apt-get update -y",
                    "sudo apt-get upgrade -y",
                    "sudo apt-get install -y cmake g++ libjson-c-dev libwebsockets-dev libssl-dev socat",
                    "git clone -b siliod-ttyd https://github.com/ai1023dev/ttyd.git /home/ubuntu/.ttyd",
                    "mkdir /home/ubuntu/.ttyd/build",
                    "cmake /home/ubuntu/.ttyd -B /home/ubuntu/.ttyd/build",
                    "make -C /home/ubuntu/.ttyd/build",
                    "sudo make -C /home/ubuntu/.ttyd/build install",
                    "curl https://get.acme.sh | sh",
                    "~/.acme.sh/acme.sh --set-default-ca --server https://api.buypass.com/acme/directory",
                    `sudo ~/.acme.sh/acme.sh --issue --debug --standalone -d ${domain} --accountemail siliod.official@gmail.com`,
                    `sudo ~/.acme.sh/acme.sh --install-cert -d ${domain} --key-file /etc/ssl/private/${domain}.key --fullchain-file /etc/ssl/certs/${domain}.crt`
                ];



                if (type) {
                    commands = gui_ready_commands
                } else {
                    commands = cli_ready_commands
                }

                // 명령어 순차 실행
                for (const cmd of commands) {
                    await runSSHCommand(publicIp, cmd);
                }

                console.log('✅ 시스템 준비 완료');

                if (ready) {
                    // DB에 준비된 인스턴스 등록
                    await db.collection('ready_instance').insertOne({
                        instance_id: instanceId.substring(2), type, grade
                    });

                    // 인스턴스 정지
                    await stop_instance(instanceId);
                } else {
                    return publicIp
                }

                // 준비 실패 감지용 타이머 (백그라운드 실행)
                setTimeout(async () => {
                    const success = await db.collection('ready_instance').findOne({
                        instance_id: instanceId.substring(2)
                    });

                    const used_success = await db.collection('instance').findOne({
                        instance_id: instanceId.substring(2)
                    });

                    if (!success && !used_success) {
                        console.log('❌ 인스턴스 준비 실패. 종료 처리');
                        await terminate_instance(instanceId);
                    }
                }, 20 * 60 * 1000);

            } catch (error) {
                console.error("❌ ready_instance 중 오류:", error);
            }
        }





        async function create_instance(short_instanceId, type, name, grade, ubuntu_password, connect_password, size, source, id, res) {
            try {
                if (short_instanceId) {
                    // 준비 인스턴트 다시 생성성
                    const ready_instanceId = await createEC2Instance();
                    ready_instance(ready_instanceId, true, type, grade)

                    const instanceId = 'i-' + short_instanceId.instance_id
                    res.send({ instanceId, ready: true }) // 짧게 기다림


                    // 준비 완료 목록에서 제거
                    await db.collection('ready_instance').deleteOne({
                        instance_id: instanceId.substring(2)
                    });

                    const privateIP = await getPrivateIP(instanceId);
                    await db.collection('instance').insertOne({
                        user: id,
                        name,
                        type,
                        grade,
                        size,
                        build: true,
                        instance_id: instanceId.substring(2),
                        private_ip: privateIP
                    });


                    await addIngressRule(instanceId, 'tcp', 443, 443, source)

                    const publicIp = await start_instance(instanceId)
                    await updateRoute53Record(instanceId, publicIp);
                    console.log(publicIp)
                    await check_command(publicIp)
                    await create_command(publicIp, type, ubuntu_password, connect_password, instanceId, size)
                } else {
                    const instanceId = await createEC2Instance(grade);
                    res.send({ instanceId, ready: false }) // 길게 기다림

                    const privateIP = await getPrivateIP(instanceId);
                    await db.collection('instance').insertOne({
                        user: id,
                        name,
                        type,
                        grade,
                        size,
                        build: true,
                        instance_id: instanceId.substring(2),
                        private_ip: privateIP
                    });

                    await addIngressRule(instanceId, 'tcp', 443, 443, source)

                    const publicIp = await ready_instance(instanceId, false, type, grade)

                    console.log(publicIp)
                    await create_command(publicIp, type, ubuntu_password, connect_password, instanceId, size)
                }
            } catch (error) {
                console.error("❌ 전체 실행 중 에러 발생:", error);
            }
        };

        async function check_command(publicIp) {
            const maxAttempts = 20;
            const interval = 15000; // 15초

            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    await runSSHCommand(publicIp, 'pwd');
                    console.log(`✅ 연결 확인 성공 (시도 ${attempt})`);
                    return; // 성공 시 반복 종료
                } catch (err) {
                    console.log(`❌ 연결 확인 실패 (시도 ${attempt})`);
                    if (attempt < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, interval));
                    } else {
                        console.error('⛔ 최대 시도 횟수 초과로 중단됨');
                        throw err;
                    }
                }
            }
        }



        async function create_command(publicIp, type, ubuntu_password, connect_password, instanceId, size) {
            // 실행할 SSH 명령어 리스트
            const domain = `${instanceId.substring(2)}.siliod.com`;
            const gui_command = [
                `echo 'ubuntu:${ubuntu_password}' | sudo chpasswd`,
                `echo "${connect_password}" | vncpasswd -f > ~/.vnc/passwd`,
                `chmod 600 ~/.vnc/passwd > /dev/null 2>&1`,
                `(crontab -l 2>/dev/null; echo "@reboot ~/.novnc/start.sh ${instanceId.substring(2)}") | crontab -`,
                `vncserver :1`,
                `nohup sudo /home/ubuntu/.novnc/utils/novnc_proxy --vnc localhost:5901 --cert /etc/ssl/certs/${domain}.crt --key /etc/ssl/private/${domain}.key --listen 443 > /dev/null 2>&1 & disown`
            ];


            const cli_command = [
                `echo 'ubuntu:${ubuntu_password}' | sudo chpasswd`,
                `(crontab -l 2>/dev/null; echo "@reboot sudo /home/ubuntu/.ttyd/build/ttyd --port 443 --ssl --ssl-cert /etc/ssl/certs/${domain}.crt --ssl-key /etc/ssl/private/${domain}.key --writable --credential admin:${connect_password} sudo -u ubuntu bash") | crontab -`,
                `nohup sudo /home/ubuntu/.ttyd/build/ttyd --port 443 --ssl --ssl-cert /etc/ssl/certs/${domain}.crt --ssl-key /etc/ssl/private/${domain}.key --writable --credential admin:${connect_password} sudo -u ubuntu bash > /dev/null 2>&1 & disown`
            ];


            const ebs_command = [
                `sudo growpart /dev/nvme0n1 1`,
                `sudo resize2fs /dev/nvme0n1p1`
            ];

            let command
            if (type) {
                command = gui_command
            } else {
                command = cli_command
            }

            // 순차적으로 SSH 명령 실행
            for (const cmd of command) {
                await runSSHCommand(publicIp, cmd);
            }

            if (size !== 8) {
                await modifyAttachedVolume(instanceId, size);
                await new Promise(resolve => setTimeout(resolve, 5000));
                for (const cmd of ebs_command) {
                    await runSSHCommand(publicIp, cmd);
                }
            }


            await removeIngressRule(instanceId, 'tcp', 22, 22, '0.0.0.0/0') // 서버의 아이피로 변경
            await removeIngressRule(instanceId, 'tcp', 80, 80, '0.0.0.0/0')

            // 인스턴스 DB에 등록
            await db.collection('instance').updateOne(
                { instance_id: instanceId.substring(2) },
                { $set: { build: false } }
            );


            // 5분 후 실패 체크 타이머 (백그라운드 실행)
            setTimeout(async () => {
                const fail = await db.collection('instance').findOne({
                    build: true,
                    instance_id: instanceId.substring(2)
                });

                if (fail) {
                    console.log('fail');
                    await db.collection('instance').deleteOne({
                        instance_id: instanceId.substring(2)
                    });
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
                console.log(`✅ EC2 인스턴스 시작 요청 완료: ${instanceId}`);

                // 인스턴스 시작 요청이 성공하면 IP 조회 후 도메인 업데이트
                const publicIp = await getPublicIP(instanceId);
                await updateRoute53Record(instanceId, publicIp);
                return publicIp;
            } catch (error) {
                console.error("❌ EC2 인스턴스 시작 처리 중 에러:", error);
                return false
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




        // setInterval(async () => {
        //     const instance = await db.collection('instance').find({}).toArray();
        //     for (let i = 0; i < instance.length; i++) {
        //         const status = await getInstanceStatus('i-' + instance[i].instance_id)

        //         if (status.instanceState === 'running') {
        //             let amount
        //             switch (instance[i].grade) {
        //                 case 'nano':
        //                     amount = 0.75;
        //                     break;
        //                 case 'micro':
        //                     amount = 1.25;
        //                     break;
        //                 case 'small':
        //                     amount = 1.75;
        //                     break;
        //                 case 'medium':
        //                     amount = 2.5;
        //                     break;
        //                 case 'large':
        //                     amount = 5;
        //                     break;
        //                 case 'xlarge':
        //                     amount = 10;
        //                     break;
        //             }

        //         await db.collection('user').updateOne(
        //             { id: instance[i].user }, // 조건
        //             { $inc: { amount: amount } } // 수정 내용
        //         );

        //         console.log(instance[i].instance_id)
        //         console.log(status)
        //     }
        // }
        // }, 30000);
        // }, 15 * 60 * 1000);



        async function login_test(req, instance_id) {
            const id = get_user_id(req)

            const instance = await db.collection('instance').findOne({ user: id, instance_id });
            if (!instance) {
                res.status(403).send('403 Forbidden');
                return
            }
        }



        function check_country(req, res, page) {
            if (req.cookies.visited) {
                let country
                if (req.cookies.language) {
                    country = req.cookies.language
                } else {
                    const ip = req.clientIp;
                    const geo = geoip.lookup(ip);
                    country = geo?.country || 'US';
                }
                const filePath = country === 'KR'
                    ? path.join(__dirname, `public/ko/${page}/${page}.html`)
                    : path.join(__dirname, `public/en/${page}/${page}.html`);

                res.sendFile(filePath);
            } else {
                // 방문한 적이 없음 → 쿠키 설정하고 /home으로 리디렉션
                const hundred_year = new Date();
                hundred_year.setFullYear(hundred_year.getFullYear() + 100);

                res.cookie('visited', 'true', {
                    httpOnly: true,
                    secure: true,
                    expires: hundred_year,
                });
                res.redirect('/home');
            }
        }

        // 홈 페이지
        app.get('/home', (req, res) => {
            check_country(req, res, 'home')
        });

        // 메인 페이지
        app.get('/', (req, res) => {
            check_country(req, res, 'main')
        });

        app.get('/create', (req, res) => {
            check_country(req, res, 'create')
        });

        app.get('/more', (req, res) => {
            check_country(req, res, 'more')
        });

        app.get('/guide', (req, res) => {
            check_country(req, res, 'guide')
        });

        app.get('/billing', (req, res) => {
            check_country(req, res, 'billing')
        });

        app.get('/pay', (req, res) => {
            check_country(req, res, 'pay')
        });

        app.get('/setting', (req, res) => {
            check_country(req, res, 'setting')
        });

        app.get('/backup', (req, res) => {
            check_country(req, res, 'backup')
        });

        app.get('/dino', (req, res) => {
            res.sendFile(path.join(__dirname, 'public/dino/index.html'));
        });

        app.get('/terms', (req, res) => {
            res.sendFile(path.join(__dirname, 'public/terms.html'));
        });






        app.get('/test_login', async (req, res) => {
            give_jwt('test_login', res);
            res.send(true);
        });





        app.get('/get_card', async (req, res) => {
            const id = get_user_id(req)
            let card = await db.collection('card').findOne({ userId: id });

            if (card) {
                card.billingKey = null;
                card.customerKey = null;

                res.send(card);
            } else {
                res.send(false);
            }

        });

        app.get('/del_card', async (req, res) => {
            const id = get_user_id(req)
            await db.collection('card').deleteOne({ userId: id });
        });

        const { default: got } = await import('got');

        app.get('/billing/success', async (req, res) => {
            const id = get_user_id(req)
            const { authKey, customerKey } = req.query;
            const response = await got.post(
                'https://api.tosspayments.com/v1/billing/authorizations/issue',
                {
                    headers: {
                        Authorization: 'Basic ' + Buffer.from(process.env.TOSS_SECRET_KEY + ':').toString('base64'),
                        'Content-Type': 'application/json',
                    },
                    json: { authKey, customerKey },
                    responseType: 'json'
                }
            );

            if (id === customerKey.split('-')[0]) {
                // requestPayment(response.body.billingKey, customerKey, 10000, 'orderId0001'+Math.random())

                try {
                    await db.collection('card').deleteOne({ userId: id });
                } catch (error) { }

                // DB에 저장
                await db.collection('card').insertOne({
                    userId: id,
                    customerKey: customerKey,
                    billingKey: response.body.billingKey,
                    cardCompany: response.body.cardCompany,
                    cardNumber: response.body.card.number,
                    cardType: response.body.card.cardType,
                });

                res.redirect('/billing')
            }
        });


        async function requestPayment(billingKey, customerKey, amount, orderId) {
            const secretKey = process.env.TOSS_SECRET_KEY;

            const response = await got.post('https://api.tosspayments.com/v1/billing/charges', {
                headers: {
                    Authorization: 'Basic ' + Buffer.from(secretKey + ':').toString('base64'),
                    'Content-Type': 'application/json',
                },
                json: {
                    billingKey: billingKey,
                    customerKey: customerKey,         // billingKey와 매칭된 값
                    amount: amount,                    // 결제 금액 (정수)
                    orderId: orderId,                  // 고유 주문번호 (중복 불가)
                    orderName: 'siliod 정기 결제'              // 주문명 (ex: '정기 구독')
                },
                responseType: 'json'
            });

            return response.body;
        }







        app.get('/my_data', async (req, res) => {
            const id = get_user_id(req)
            const user = await db.collection('user').findOne({ id });
            const instance = await db.collection('instance').find({ user: id }).toArray();

            res.send({ user, instance });
        });

        app.get('/login_check', async (req, res) => {
            const id = get_user_id(req)
            const user = await db.collection('user').findOne({ id });

            res.send(user);
        });

        // 메인 페이지
        app.get('/status', async (req, res) => {
            const id = get_user_id(req)

            const instance = await db.collection('instance').find({ user: id }).toArray();

            let status = []
            for (let i = 0; i < instance.length; i++) {
                if (instance[i].build) {
                    status[i] = { instance_id: instance[i].instance_id, status: 'building' }
                } else {
                    const status_one = await getInstanceStatus('i-' + instance[i].instance_id)
                    status[i] = { instance_id: instance[i].instance_id, status: status_one.instanceState }
                }
            }

            res.send(status);
        });

        app.post('/create_instance', async (req, res) => {
            const id = get_user_id(req)

            console.log(req.body)

            const unsafeChars = /[;&|`$<>\\]/;
            if (unsafeChars.test(req.body.ubuntu_password) || unsafeChars.test(req.body.connect_password)) {
                res.send(false)
                return
            }
            const instanceId = await db.collection('ready_instance').findOne({ type: req.body.type, grade: req.body.grade });
            const size = Number(req.body.storage)
            create_instance(instanceId, req.body.type, req.body.name, req.body.grade,
                req.body.ubuntu_password, req.body.connect_password, size, req.body.source, id, res)
        });

        app.post('/reboot_instance', (req, res) => {
            res.send(true)
            reboot_instance('i-' + req.body.instance_id)
        });

        app.post('/start_instance', async (req, res) => {
            await login_test(req, req.body.instance_id)
            const success = await start_instance('i-' + req.body.instance_id)
            if (success) {
                res.send(true)
            } else {
                res.send(false)
            }
        });

        app.post('/stop_instance', async (req, res) => {
            await login_test(req, req.body.instance_id)
            res.send(true)
            stop_instance('i-' + req.body.instance_id)
        });

        app.post('/delete_instance', async (req, res) => {
            await login_test(req, req.body.instance_id)

            res.send(true)
            terminate_instance('i-' + req.body.instance_id)

            db.collection('instance').deleteOne({
                instance_id: req.body.instance_id
            });
        });


        app.post('/instance_info', async (req, res) => {
            const id = get_user_id(req)
            const instance = await db.collection('instance').findOne({ user: id, instance_id: req.body.instance_id })
            const state = await getInstanceStatus('i-' + req.body.instance_id)
            res.send({ instance, state: state.instanceState })
        });

        app.post('/instance_info_ip', async (req, res) => {
            await login_test(req, req.body.instance_id)
            const state = await getInstanceStatus('i-' + req.body.instance_id)
            if (state.instanceState === 'pending' || state.instanceState === 'running') {
                const publicIp = await getPublicIP('i-' + req.body.instance_id);
                res.send(publicIp)
            } else {
                res.send(false)
            }
        });

        app.post('/port_info', async (req, res) => {
            await login_test(req, req.body.instance_id)

            const ports = await getOpenPorts('i-' + req.body.instance_id);
            console.log("열려있는 포트:", ports);
            res.send(ports)
        });

        app.post('/add_port', async (req, res) => {
            await login_test(req, req.body.instance_id)

            console.log(req.body)

            await addIngressRule('i-' + req.body.instance_id, req.body.rule.protocol,
                Number(req.body.rule.fromPort), Number(req.body.rule.toPort), req.body.rule.sources)
            res.send(true)
        });

        app.post('/edit_port', async (req, res) => {
            await login_test(req, req.body.instance_id)

            console.log(req.body)

            await removeIngressRule('i-' + req.body.instance_id, req.body.delete_port.protocol,
                req.body.delete_port.fromPort, req.body.delete_port.toPort, req.body.delete_port.sources)

            await addIngressRule('i-' + req.body.instance_id, req.body.rule.protocol,
                Number(req.body.rule.fromPort), Number(req.body.rule.toPort), req.body.rule.sources)
            res.send(true)
        });

        app.post('/remove_port', async (req, res) => {
            await login_test(req, req.body.instance_id)

            console.log(req.body)

            await removeIngressRule('i-' + req.body.instance_id, req.body.rule.protocol,
                Number(req.body.rule.fromPort), Number(req.body.rule.toPort), req.body.rule.sources)
            res.send(true)
        });

        app.post('/resize_volume', async (req, res) => {
            await login_test(req, req.body.instance_id)

            console.log(req.body)

            const resize_volume_result = await modifyAttachedVolume('i-' + req.body.instance_id, req.body.size);

            // DB 업데이트
            console.log(resize_volume_result);
            if (resize_volume_result === true) {
                await db.collection('instance').updateOne(
                    { instance_id: req.body.instance_id },
                    { $set: { size: req.body.size } }
                );
                res.send(true)
            } else {
                if (resize_volume_result.Code === 'VolumeModificationRateExceeded') {
                    res.send('6time err');
                } else {
                    res.status(500).send('server error');
                }
            }
        });

        app.post('/instance_build', async (req, res) => {
            const id = get_user_id(req)
            const instance = await db.collection('instance').findOne({ user: id, instance_id: req.body.instance_id })
            if (!instance || !instance.build) {
                res.send(true)
            } else {
                res.send(false)
            }
        });

        app.get('/receipt', async (req, res) => {
            const id = get_user_id(req)
            const receipt = await db.collection('receipt').find({ id }).toArray();
            res.send(receipt)
        });

        app.post('/change_language', (req, res) => {
            const hundred_year = new Date();
            hundred_year.setFullYear(hundred_year.getFullYear() + 100);

            res.cookie('language', req.body.language, {
                httpOnly: true,
                secure: true,
                expires: hundred_year, // <-- 만료일 설정으로 영구 쿠키
            });
            res.send(true)
        });





        // sendEmail("ai1023dev@gmail.com", "테스트 이메일", "이메일 전송이 정상적으로 이루어졌습니다.");


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

        const secretKey = process.env.JWT_SECRET_KEY

        // 옵션 설정 (선택 사항)
        const options = {
            algorithm: 'HS256',
            expiresIn: '15h'
        };

        function give_jwt(id, res) {
            try {
                console.log('받은 아이디')
                console.log(id)
                const payload = { id: id }

                const token = jwt.sign(payload, secretKey, options);
                // console.log(token); // 생성된 토큰을 콘솔에 출력하여 확인

                res.cookie('account', token, {
                    httpOnly: true, // 클라이언트 측 스크립트에서 쿠키에 접근 불가
                    secure: true, // HTTPS 연결에서만 쿠키 전송
                    maxAge: 15 * 60 * 60 * 1000, // 15hour 유효한 쿠키 생성
                });
                return true
            } catch (error) {
                return 'err'
            }
        }

        function get_user_id(req) {
            if (req.cookies && req.cookies.account) {
                const token = req.cookies.account;

                const decoded = check_token(token);
                if (decoded !== false) {  // 조건문 수정
                    return decoded.id;
                } else {
                    return false;
                }
            } else {
                console.log('쿠키가 존재하지 않습니다.');
                return false;
            }
        }


        // JWT 검증 함수
        function check_token(token) {
            try {
                return jwt.verify(token, secretKey);
            } catch (err) {
                return false
            }
        }

        ////////////////////////// 로그아웃 /////////////////////////////////
        app.get('/logout', (req, res) => {
            // 예시: JWT 쿠키 삭제
            res.clearCookie('account');
            res.send(true);
        });



        //////////////////////////////////// 구글 로그인 /////////////////////////////////////

        app.get('/login/google', (req, res) => {
            console.log(req.query.state);
            let url = 'https://accounts.google.com/o/oauth2/v2/auth';

            url += `?client_id=612283661754-r0ffeqvtuptro27vsebaiojd9cqv7lmf.apps.googleusercontent.com`;

            let redirectUri = 'https://siliod.com/login/google/redirect'

            url += `&redirect_uri=${encodeURIComponent(redirectUri)}`;
            url += '&response_type=code';
            url += '&scope=profile email';

            res.redirect(url);
        });


        const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
        const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

        app.get('/login/google/redirect', async (req, res) => {
            google_login(req, res)
        });

        async function google_login(req, res) {
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
                        redirect_uri: `https://siliod.com/login/google/redirect`,
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
                give_jwt(userData.id, res);
                const user = await db.collection('user').findOne({ id: userData.id });

                if (user) {
                    return res.redirect("/");
                } else {
                    // 회원가입 진행
                    await db.collection('user').insertOne({
                        id: userData.id,
                        name: userData.name,
                        avatar_url: userData.picture,
                        email: userData.email,
                        amount: 0
                    });

                    // JWT 발급 후 로그인 처리
                    return res.redirect("/?new=new");
                }
            } catch (error) {
                console.error('Google OAuth Error:', error);
                res.status(500).json({ error: 'Failed to authenticate with Google' });
            }
        }


        ////////////////////////////////////////////////////////////////////////////////////
        ////////////////////////////////////////////////////////////////////////////////////
        ////////////////////////////////////////////////////////////////////////////////////

        app.use((err, req, res, next) => {
            console.error(err.stack); // 서버 로그
            res.status(500).json({ message: 'Internal Server Error' }); // 사용자에게는 노출 X
        });

        // HTTPS 서버 실행
        const server = https.createServer(https_options, app).listen(port, () => {
            console.log(`Server is listening on https://localhost:${port}`);
        });

        const wss = new WebSocket.Server({ server });

        wss.on('connection', (ws) => {
            console.log('클라이언트 연결됨');
            let sshProcess = null;

            ws.on('message', (message) => {
                const msg = JSON.parse(message);

                if (msg.type === 'run') {
                    const command = msg.command.trim();
                    if (!command) return;

                    if (sshProcess) {
                        ws.send('[⚠️ A command is already running. Please stop it before starting a new one.]');
                        return;
                    }

                    const sshArgs = [
                        '-i', '/home/ubuntu/siliod/keypair.pem',
                        '-o', 'StrictHostKeyChecking=no',
                        '-o', 'ConnectTimeout=180',
                        `ubuntu@ec2-${msg.ip.replace(/\./g, '-')}.us-east-2.compute.amazonaws.com`,
                        command
                    ];

                    sshProcess = spawn('ssh', sshArgs);

                    sshProcess.stdout.on('data', (data) => {
                        ws.send(data.toString());
                    });

                    sshProcess.stderr.on('data', (data) => {
                        ws.send('[stderr] ' + data.toString());
                    });

                    sshProcess.on('close', (code) => {
                        ws.send(`\n`);
                        sshProcess = null;
                    });

                    sshProcess.on('error', (err) => {
                        ws.send(`[❌ SSH error] ${err.message}`);
                        sshProcess = null;
                    });
                }

                if (msg.type === 'stop') {
                    if (sshProcess) {
                        sshProcess.kill('SIGTERM'); // 또는 SIGKILL
                        ws.send(`\n`);
                    } else {
                        ws.send('[ℹ️ No process is currently running.]');
                    }
                }
            });

            ws.on('close', () => {
                if (sshProcess) sshProcess.kill('SIGTERM');
                console.log('클라이언트 연결 종료');
            });
        });

        // HTTP → HTTPS 리다이렉션
        redirectApp.all('*', (req, res) => {
            res.redirect(301, `https://siliod.com${req.url}`);
        });

        http.createServer(redirectApp).listen(httpPort, () => {
            console.log(`HTTP 리다이렉션 서버가 http://siliod.com:${httpPort}에서 실행 중입니다.`);
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