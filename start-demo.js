#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 启动 Frigate Configuration UI 演示环境');

// 启动后端服务器
console.log('📡 启动后端服务器...');
const server = spawn('node', ['server.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

server.on('error', (error) => {
  console.error('❌ 后端服务器启动失败:', error.message);
  console.log('💡 请先安装后端依赖: npm install express ws cors nodemon');
  process.exit(1);
});

// 等待3秒后启动前端开发服务器
setTimeout(() => {
  console.log('🌐 启动前端开发服务器...');
  const frontend = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    cwd: __dirname
  });

  frontend.on('error', (error) => {
    console.error('❌ 前端服务器启动失败:', error.message);
  });

  frontend.on('close', (code) => {
    console.log(`前端服务器关闭，退出码: ${code}`);
    server.kill();
  });

}, 3000);

// 处理程序退出
process.on('SIGINT', () => {
  console.log('\n👋 正在关闭服务器...');
  server.kill();
  process.exit(0);
});

console.log('✅ 服务启动中...');
console.log('📍 前端地址: http://localhost:5173');
console.log('📍 后端API: http://localhost:8000');
console.log('📍 WebSocket: ws://localhost:8000');
console.log('\n按 Ctrl+C 停止服务');