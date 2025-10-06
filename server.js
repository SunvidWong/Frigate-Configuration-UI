const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('dist'));

// 模拟数据存储
let cameras = [
  {
    id: '1',
    name: '前门摄像头',
    status: 'online',
    url: 'rtsp://192.168.1.100:554/stream1',
    username: 'admin',
    resolution: '1920x1080',
    fps: 30,
    codec: 'h264',
    audioEnabled: true,
    detectionZones: [],
    hardwareAccelerator: 'nvidia-gtx-1660',
    lastSeen: new Date(),
    manufacturer: 'Hikvision',
    model: 'DS-2CD2032-I',
    firmware: 'V5.5.0'
  },
  {
    id: '2',
    name: '后院摄像头',
    status: 'online',
    url: 'rtsp://192.168.1.101:554/stream1',
    username: 'admin',
    resolution: '1920x1080',
    fps: 25,
    codec: 'h264',
    audioEnabled: false,
    detectionZones: [],
    lastSeen: new Date(),
    manufacturer: 'Dahua',
    model: 'IPC-HFW2431S',
    firmware: 'V2.622'
  }
];

let hardwareAccelerators = [
  {
    id: 'nvidia-gtx-1660',
    name: 'NVIDIA GTX 1660',
    type: 'nvidia',
    status: 'available',
    driverInstalled: true,
    version: '531.14',
    capabilities: ['CUDA', 'TensorRT', 'Video Encode/Decode'],
    description: 'NVIDIA GPU with CUDA acceleration support',
    documentation: 'https://docs.nvidia.com/cuda/'
  },
  {
    id: 'apple-silicon-gpu',
    name: 'Apple Silicon GPU',
    type: 'apple',
    status: 'available',
    driverInstalled: true,
    capabilities: ['Metal Performance Shaders', 'Core ML'],
    description: 'Apple Silicon GPU with Metal acceleration',
    documentation: 'https://developer.apple.com/metal/'
  }
];

// WebSocket连接管理
const clients = new Set();

wss.on('connection', (ws) => {
  console.log('新的WebSocket连接');
  clients.add(ws);

  ws.on('message', (message) => {
    console.log('收到消息:', message.toString());
  });

  ws.on('close', () => {
    console.log('WebSocket连接关闭');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket错误:', error);
    clients.delete(ws);
  });

  // 发送初始数据
  ws.send(JSON.stringify({
    type: 'system_status_update',
    data: { status: 'connected', timestamp: new Date().toISOString() },
    timestamp: new Date().toISOString(),
    id: Math.random().toString(36).substr(2, 9)
  }));
});

// 广播函数
function broadcast(message) {
  const messageStr = JSON.stringify(message);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

// 模拟摄像头状态变化
setInterval(() => {
  const camera = cameras[Math.floor(Math.random() * cameras.length)];
  const newStatus = Math.random() > 0.1 ? 'online' : 'offline';

  if (camera.status !== newStatus) {
    camera.status = newStatus;
    camera.lastSeen = new Date();

    broadcast({
      type: 'camera_status_change',
      data: {
        cameraId: camera.id,
        status: newStatus,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      id: Math.random().toString(36).substr(2, 9)
    });
  }
}, 30000); // 每30秒检查一次

// API 路由

// 系统信息
app.get('/api/system/info', (req, res) => {
  res.json({
    success: true,
    data: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    }
  });
});

// 摄像头管理
app.get('/api/cameras', (req, res) => {
  res.json({
    success: true,
    data: cameras
  });
});

app.get('/api/cameras/:id', (req, res) => {
  const camera = cameras.find(c => c.id === req.params.id);
  if (camera) {
    res.json({
      success: true,
      data: camera
    });
  } else {
    res.status(404).json({
      success: false,
      message: '摄像头未找到'
    });
  }
});

app.post('/api/cameras', (req, res) => {
  const newCamera = {
    ...req.body,
    id: Date.now().toString(),
    lastSeen: new Date()
  };

  cameras.push(newCamera);

  // 通知WebSocket客户端
  broadcast({
    type: 'camera_status_change',
    data: {
      cameraId: newCamera.id,
      status: 'added',
      timestamp: new Date().toISOString()
    },
    timestamp: new Date().toISOString(),
    id: Math.random().toString(36).substr(2, 9)
  });

  res.json({
    success: true,
    data: newCamera
  });
});

app.put('/api/cameras/:id', (req, res) => {
  const index = cameras.findIndex(c => c.id === req.params.id);
  if (index !== -1) {
    cameras[index] = { ...cameras[index], ...req.body, lastSeen: new Date() };

    // 通知WebSocket客户端
    broadcast({
      type: 'camera_status_change',
      data: {
        cameraId: cameras[index].id,
        status: 'updated',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      id: Math.random().toString(36).substr(2, 9)
    });

    res.json({
      success: true,
      data: cameras[index]
    });
  } else {
    res.status(404).json({
      success: false,
      message: '摄像头未找到'
    });
  }
});

app.delete('/api/cameras/:id', (req, res) => {
  const index = cameras.findIndex(c => c.id === req.params.id);
  if (index !== -1) {
    const deletedCamera = cameras.splice(index, 1)[0];

    // 通知WebSocket客户端
    broadcast({
      type: 'camera_status_change',
      data: {
        cameraId: deletedCamera.id,
        status: 'deleted',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      id: Math.random().toString(36).substr(2, 9)
    });

    res.json({
      success: true,
      data: null
    });
  } else {
    res.status(404).json({
      success: false,
      message: '摄像头未找到'
    });
  }
});

app.post('/api/cameras/discover', (req, res) => {
  // 模拟摄像头发现
  setTimeout(() => {
    res.json({
      success: true,
      data: [
        {
          ip: '192.168.1.103',
          port: 554,
          manufacturer: 'Hikvision',
          model: 'DS-2CD2042WD-I',
          name: '发现的摄像头1',
          urls: ['rtsp://192.168.1.103:554/stream1'],
          protocols: ['RTSP', 'ONVIF'],
          credentials: {
            usernames: ['admin', 'user'],
            passwordRequired: true
          }
        },
        {
          ip: '192.168.1.104',
          port: 554,
          manufacturer: 'Dahua',
          model: 'IPC-HDW2831T',
          name: '发现的摄像头2',
          urls: ['rtsp://192.168.1.104:554/live'],
          protocols: ['RTSP'],
          credentials: {
            usernames: ['admin'],
            passwordRequired: false
          }
        }
      ]
    });
  }, 2000); // 模拟2秒的发现过程
});

app.post('/api/cameras/:id/test', (req, res) => {
  // 模拟连接测试
  setTimeout(() => {
    const success = Math.random() > 0.3; // 70%成功率
    res.json({
      success: true,
      data: {
        success,
        message: success ? '连接成功' : '连接失败'
      }
    });
  }, 1500);
});

// 硬件加速器
app.get('/api/hardware/accelerators', (req, res) => {
  res.json({
    success: true,
    data: hardwareAccelerators
  });
});

app.post('/api/hardware/detect', (req, res) => {
  // 模拟硬件检测
  setTimeout(() => {
    res.json({
      success: true,
      data: hardwareAccelerators
    });
  }, 3000);
});

// 静态文件服务
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// 启动服务器
const PORT = process.env.PORT || 8000;

server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`WebSocket服务运行在 ws://localhost:${PORT}`);
  console.log(`API基础URL: http://localhost:${PORT}/api`);
});