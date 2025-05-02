const express = require('express');
const path = require('path');
const app = express();
const port = 8080;
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const nodemailer = require("nodemailer");
const { EC2Client, DescribeInstanceStatusCommand, StartInstancesCommand, DescribeInstancesCommand, DescribeSecurityGroupsCommand, RunInstancesCommand, RebootInstancesCommand, StopInstancesCommand, TerminateInstancesCommand, CreateVolumeCommand, AttachVolumeCommand, waitUntilVolumeAvailable, CreateSecurityGroupCommand, AuthorizeSecurityGroupIngressCommand, RevokeSecurityGroupIngressCommand } = require("@aws-sdk/client-ec2");
const { Route53Client, ChangeResourceRecordSetsCommand } = require("@aws-sdk/client-route-53");
const { exec } = require("child_process");
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

                await addIngressRule(instanceId, 'tcp', 22, 22, '116.47.133.210/32') // 서버의 아이피로 변경
                await addIngressRule(instanceId, 'tcp', 80, 80, '0.0.0.0/0')

                return instanceId;
            } catch (error) {
                console.error("❌ EC2 인스턴스 생성 실패:", error);
            }
        }

        async function createSecurityGroup() {
            const params = {
                GroupName: "SecurityGroup" + Date.now(),  // 고유한 이름 생성
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


        const attachVolume = async (instanceId, size) => {
            try {
                // 1. 인스턴스 AZ 조회
                const descCommand = new DescribeInstancesCommand({ InstanceIds: [instanceId] });
                const descResult = await aws_client.send(descCommand);
                const az = descResult.Reservations[0].Instances[0].Placement.AvailabilityZone;
                console.log(`🔍 인스턴스 ${instanceId} 의 AZ: ${az}`);

                // 2. 볼륨 생성
                const createParams = {
                    AvailabilityZone: az,
                    Size: size,
                    VolumeType: "gp3"
                };
                const createCommand = new CreateVolumeCommand(createParams);
                const createResult = await aws_client.send(createCommand);
                const volumeId = createResult.VolumeId;
                console.log("✅ 볼륨 생성 완료:", volumeId);

                await waitUntilVolumeAvailable({ client: aws_client, maxWaitTime: 60 }, { VolumeIds: [volumeId] });
                console.log("✅ 볼륨이 사용 가능 상태입니다.");

                // 3. 볼륨 연결
                const attachParams = {
                    Device: "/dev/xvdf",
                    InstanceId: instanceId,
                    VolumeId: volumeId
                };
                const attachCommand = new AttachVolumeCommand(attachParams);
                await aws_client.send(attachCommand);
                console.log(`✅ ${volumeId} 볼륨을 ${instanceId} 인스턴스에 연결 완료`);
            } catch (error) {
                console.error("❌ 볼륨 생성 또는 연결 실패:", error);
            }
        };


        async function runSSHCommand(ip, command) {
            const ssh_command = `ssh -i "C:/Users/포토박스반짝/Desktop/keypair.pem" -o StrictHostKeyChecking=no -o ConnectTimeout=180 ubuntu@ec2-${ip.replace(/\./g, '-')}.us-east-2.compute.amazonaws.com "${command}"`
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
                    console.log(`✅ SSH 명령 실행 결과: ${stdout}`);
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





        // const instanceId1 = await createEC2Instance('medium');
        // ready_instance(instanceId1, true, false, 'medium')
        // const instanceId2 = await createEC2Instance('medium');
        // ready_instance(instanceId2, true, false, 'medium')
        // const instanceId3 = await createEC2Instance('large');
        // ready_instance(instanceId3, true, false, 'large')
        // const instanceId4 = await createEC2Instance('medium');
        // ready_instance(instanceId4, true, true, 'medium')
        // const instanceId5 = await createEC2Instance('medium');
        // ready_instance(instanceId5, true, true, 'medium')
        // const instanceId6 = await createEC2Instance('large');
        // ready_instance(instanceId6, true, true, 'large')


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
                    "sudo DEBIAN_FRONTEND=noninteractive apt-get install -y ubuntu-desktop tigervnc-standalone-server tigervnc-xorg-extension tigervnc-viewer xfce4 xfce4-goodies lightdm thunar certbot dbus-x11",
                    `mkdir -p ~/.vnc`,
                    `echo '#!/bin/bash' > ~/.vnc/xstartup && echo 'xrdb $HOME/.Xresources' >> ~/.vnc/xstartup && echo 'export $(dbus-launch)' >> ~/.vnc/xstartup && echo 'startxfce4' >> ~/.vnc/xstartup && sudo chmod +x ~/.vnc/xstartup`,
                    `echo '[Resolve]' | sudo tee /etc/systemd/resolved.conf > /dev/null && echo 'DNS=8.8.8.8 8.8.4.4' | sudo tee -a /etc/systemd/resolved.conf > /dev/null && echo 'FallbackDNS=1.1.1.1 1.0.0.1' | sudo tee -a /etc/systemd/resolved.conf > /dev/null && sudo systemctl restart systemd-resolved`,
                    `sudo certbot certonly --standalone -d ${domain} --non-interactive --agree-tos --email siliod.official@gmail.com`,
                    `git clone https://github.com/ai1023dev/novnc.git ~/.novnc`,
                    `sudo chmod +x ~/.novnc/start.sh > /dev/null 2>&1`,
                ];
                // const gui_ready_commands = [
                //     "sudo apt-get update -y",
                //     "sudo apt-get upgrade -y",
                //     'echo "debconf debconf/frontend select Noninteractive" | sudo debconf-set-selections',
                //     'echo "lightdm shared/default-x-display-manager select lightdm" | sudo debconf-set-selections',
                //     "sudo DEBIAN_FRONTEND=noninteractive apt-get install -y ubuntu-desktop tigervnc-standalone-server tigervnc-xorg-extension tigervnc-viewer xfce4 xfce4-goodies lightdm thunar certbot dbus-x11"
                // ];

                const cli_ready_commands = [
                    "sudo apt-get update -y",
                    "sudo apt-get upgrade -y",
                    "sudo apt-get install -y cmake g++ libjson-c-dev libwebsockets-dev libssl-dev certbot",
                    "git clone https://github.com/tsl0922/ttyd.git /home/ubuntu/.ttyd",
                    "mkdir /home/ubuntu/.ttyd/build",
                    "cmake /home/ubuntu/.ttyd -B /home/ubuntu/.ttyd/build",
                    "make -C /home/ubuntu/.ttyd/build",
                    "sudo make -C /home/ubuntu/.ttyd/build install",
                    `sudo certbot certonly --standalone -d ${domain} --non-interactive --agree-tos --email siliod.official@gmail.com`
                    // `(crontab -l 2>/dev/null; echo "@reboot sudo /home/ubuntu/.ttyd/build/ttyd --port 443 --ssl --ssl-cert /etc/letsencrypt/live/${domain}/fullchain.pem --ssl-key /etc/letsencrypt/live/${domain}/privkey.pem --writable --credential ubuntu:password sudo -u ubuntu bash") | crontab -`,
                    // `nohup sudo /home/ubuntu/.ttyd/build/ttyd --port 443 --ssl --ssl-cert /etc/letsencrypt/live/${domain}/fullchain.pem --ssl-key /etc/letsencrypt/live/${domain}/privkey.pem --writable --credential ubuntu:password sudo -u ubuntu bash > /dev/null 2>&1 & disown`
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
                    // const ready_instanceId = await createEC2Instance();
                    // ready_instance(ready_instan true,ceId, true)

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
                `nohup sudo /home/ubuntu/.novnc/utils/novnc_proxy --vnc localhost:5901 --cert /etc/letsencrypt/live/${domain}/fullchain.pem --key /etc/letsencrypt/live/${domain}/privkey.pem --listen 443 > /dev/null 2>&1 & disown`
            ];

            const cli_command = [
                `echo 'ubuntu:${ubuntu_password}' | sudo chpasswd`,
                `(crontab -l 2>/dev/null; echo "@reboot sudo /home/ubuntu/.ttyd/build/ttyd --port 443 --ssl --ssl-cert /etc/letsencrypt/live/${domain}/fullchain.pem --ssl-key /etc/letsencrypt/live/${domain}/privkey.pem --writable --credential admin:${connect_password} sudo -u ubuntu bash") | crontab -`,
                `nohup sudo /home/ubuntu/.ttyd/build/ttyd --port 443 --ssl --ssl-cert /etc/letsencrypt/live/${domain}/fullchain.pem --ssl-key /etc/letsencrypt/live/${domain}/privkey.pem --writable --credential admin:${connect_password} sudo -u ubuntu bash > /dev/null 2>&1 & disown`
            ];

            const ebs_command = [
                `sudo mkfs -t ext4 /dev/nvme1n1`,
                `sudo mkdir /mnt/ebs`,
                `sudo mount /dev/nvme1n1 /mnt/ebs`,
            ];

            let command
            if (type) {
                command = gui_command
            } else {
                command = cli_command
            }

            if (size !== 0) {
                await attachVolume(instanceId, size);
                for (const cmd of ebs_command) {
                    await runSSHCommand(publicIp, cmd);
                }
            }

            // 순차적으로 SSH 명령 실행
            for (const cmd of command) {
                await runSSHCommand(publicIp, cmd);
            }


            await removeIngressRule(instanceId, 'tcp', 22, 22, '116.47.133.210/32') // 서버의 아이피로 변경
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
        async function start_instance(instanceId, maxRetry = 20, retryInterval = 15000) {
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






        // 메인 페이지
        app.get('/test', (req, res) => {
            res.sendFile(path.join(__dirname, 'public/web/test/test.html'));
        });

        // 메인 페이지
        app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public/web/main/main.html'));
        });

        app.get('/create', (req, res) => {
            res.sendFile(path.join(__dirname, 'public/web/create/create.html'));
        });

        app.get('/more', (req, res) => {
            res.sendFile(path.join(__dirname, 'public/web/more/more.html'));
        });

        app.get('/dino', (req, res) => {
            res.sendFile(path.join(__dirname, 'public/web/dino/index.html'));
        });

        app.get('/credit', (req, res) => {
            res.sendFile(path.join(__dirname, 'public/web/credit/credit.html'));
        });

        app.get('/pay', (req, res) => {
            res.sendFile(path.join(__dirname, 'public/web/pay/pay.html'));
        });

        app.get('/pay/success', (req, res) => {
            res.sendFile(path.join(__dirname, 'public/web/pay/success/success.html'));
        });

        app.get('/pay/fail', (req, res) => {
            res.sendFile(path.join(__dirname, 'public/web/pay/fail/fail.html'));
        });






        app.get('/my_data', async (req, res) => {
            const id = login_check(req)
            const user = await db.collection('user').findOne({ id });
            const instance = await db.collection('instance').find({ user: id }).toArray();

            res.send({ user, instance });
        });

        app.get('/login_check', async (req, res) => {
            const id = login_check(req)
            const user = await db.collection('user').findOne({ id });

            res.send(user);
        });

        // 메인 페이지
        app.get('/status', async (req, res) => {
            const id = login_check(req)

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
            const id = login_check(req)

            console.log(req.body)
            const instanceId = await db.collection('ready_instance').findOne({ type: req.body.type, grade: req.body.grade });
            const size = Number(req.body.storage) - 8
            create_instance(instanceId, req.body.type, req.body.name, req.body.grade,
                req.body.ubuntu_password, req.body.connect_password, size, req.body.source, id, res)
        });

        app.post('/reboot_instance', (req, res) => {
            res.send(true)
            reboot_instance('i-' + req.body.instance_id)
        });

        app.post('/start_instance', async (req, res) => {
            const success = await start_instance('i-' + req.body.instance_id)
            if (success) {
                res.send(true)
            } else {
                res.send(false)
            }
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


        app.post('/instance_info', async (req, res) => {
            const id = login_check(req)
            const instance = await db.collection('instance').findOne({ user: id, instance_id: req.body.instance_id })
            const state = await getInstanceStatus('i-' + req.body.instance_id)
            res.send({ instance, state: state.instanceState })
        });

        app.post('/instance_info_ip', async (req, res) => {
            login_check(req)
            const state = await getInstanceStatus('i-' + req.body.instance_id)
            if (state.instanceState === 'pending' || state.instanceState === 'running') {
                const publicIp = await getPublicIP('i-' + req.body.instance_id);
                res.send(publicIp)
            } else {
                res.send(false)
            }
        });

        app.post('/port_info', async (req, res) => {
            login_check(req)

            const ports = await getOpenPorts('i-' + req.body.instance_id);
            console.log("열려있는 포트:", ports);
            res.send(ports)
        });

        app.post('/add_port', async (req, res) => {
            login_check(req)

            console.log(req.body)

            await addIngressRule('i-' + req.body.instance_id, req.body.rule.protocol,
                Number(req.body.rule.fromPort), Number(req.body.rule.toPort), req.body.rule.sources)
            res.send(true)
        });

        app.post('/edit_port', async (req, res) => {
            login_check(req)

            console.log(req.body)

            await removeIngressRule('i-' + req.body.instance_id, req.body.delete_port.protocol,
                req.body.delete_port.fromPort, req.body.delete_port.toPort, req.body.delete_port.sources)

            await addIngressRule('i-' + req.body.instance_id, req.body.rule.protocol,
                Number(req.body.rule.fromPort), Number(req.body.rule.toPort), req.body.rule.sources)
            res.send(true)
        });

        app.post('/remove_port', async (req, res) => {
            login_check(req)

            console.log(req.body)

            await removeIngressRule('i-' + req.body.instance_id, req.body.rule.protocol,
                Number(req.body.rule.fromPort), Number(req.body.rule.toPort), req.body.rule.sources)
            res.send(true)
        });

        app.post('/instance_build', async (req, res) => {
            const id = login_check(req)
            const instance = await db.collection('instance').findOne({ user: id, instance_id: req.body.instance_id })
            if (!instance || !instance.build) {
                res.send(true)
            } else {
                res.send(false)
            }
        });






        // 결제 페이지

        // TODO: 개발자센터에 로그인해서 내 결제위젯 연동 키 > 시크릿 키를 입력하세요. 시크릿 키는 외부에 공개되면 안돼요.
        // @docs https://docs.tosspayments.com/reference/using-api/api-keys

        app.post("/confirm", async function (req, res) {
            // 클라이언트에서 받은 JSON 요청 바디입니다.
            const { paymentKey, orderId, amount } = req.body;

            // 토스페이먼츠 API는 시크릿 키를 사용자 ID로 사용하고, 비밀번호는 사용하지 않습니다.
            // 비밀번호가 없다는 것을 알리기 위해 시크릿 키 뒤에 콜론을 추가합니다.
            const widgetSecretKey = "test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6";
            const encryptedSecretKey =
                "Basic " + Buffer.from(widgetSecretKey + ":").toString("base64");

            const id = login_check(req)

            if (id === orderId.split("_")[0]) {
                const { default: got } = await import('got');

                // 결제를 승인하면 결제수단에서 금액이 차감돼요.
                got.post("https://api.tosspayments.com/v1/payments/confirm", {
                    headers: {
                        Authorization: encryptedSecretKey,
                        "Content-Type": "application/json",
                    },
                    json: {
                        orderId: orderId,
                        amount: amount,
                        paymentKey: paymentKey,
                    },
                    responseType: "json",
                })
                    .then(async function (response) {
                        // 결제 성공 비즈니스 로직을 구현하세요.
                        const user_data = await db.collection('user').findOne({ id: id });

                        sendEmail(user_data.email, "siliod 충전", response.body.totalAmount + "원 충전됨여여.")
                        await db.collection('user').updateOne(
                            { id: id }, // 조건
                            { $inc: { amount: response.body.totalAmount } } // 수정 내용
                        );

                        await db.collection('receipt').insertOne({ id: id, amount: response.body.totalAmount, receipt: response.body.receipt.url });

                        console.log(response.body);
                        res.status(response.statusCode).json(response.body)
                    })
                    .catch(function (error) {
                        // 결제 실패 비즈니스 로직을 구현하세요.
                        console.log(error.response.body);
                        res.status(error.response.statusCode).json(error.response.body)
                    });
            } else {
                res.status(401).json({ message: "인증되지 않은 요청입니다." });
            }
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
                console.log(token); // 생성된 토큰을 콘솔에 출력하여 확인

                res.cookie('account', token, {
                    httpOnly: true, // 클라이언트 측 스크립트에서 쿠키에 접근 불가
                    secure: true, // HTTPS 연결에서만 쿠키 전송
                    maxAge: 15 * 60 * 60 * 1000, // 3hour 유효한 쿠키 생성
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
                console.log('fdggdfgd')
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

            let redirectUri = 'http://localhost:8080/login/google/redirect'

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
                        redirect_uri: `http://localhost:8080/login/google/redirect`,
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
                        amount: 1000
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