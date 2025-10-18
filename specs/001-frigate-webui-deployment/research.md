# Phase 0 Research: Frigate Configuration UI

**Feature Branch**: `001-frigate-webui-deployment`
**Research Date**: 2025-10-18
**Status**: Complete

## R1: Docker SDK for Python Best Practices

### 1.1 Managing Containers from Within a Parent Container

**Approach**: Bind-mount the host Docker socket to enable container-in-container management.

```bash
docker run -v /var/run/docker.sock:/var/run/docker.sock <parent-image>
```

**Security Warning**: Access to `/var/run/docker.sock` provides root-equivalent access to the host system. Any user or process with socket access can trivially gain root privileges on the host.

**SDK Initialization**:
```python
import docker

# Auto-detect from environment (uses DOCKER_HOST or defaults to unix:///var/run/docker.sock)
client = docker.from_env()
```

### 1.2 Docker Socket Permission Checks

**Recommended Permission Strategy**:
1. **DO NOT** use `chmod 777 /var/run/docker.sock` (exposes root access to all users)
2. **DO** add the container user to the `docker` group on the host
3. **Verify** socket accessibility before operations

**Pre-flight Check Pattern**:
```python
import docker
from docker.errors import DockerException
import os

def verify_docker_socket():
    """FR-001: Check Docker socket is mounted and accessible"""
    socket_path = '/var/run/docker.sock'

    # Check if socket exists
    if not os.path.exists(socket_path):
        raise DockerException(
            "[ERROR][DOCKER_SOCKET] 未挂载 /var/run/docker.sock。"
            "请在 docker-compose.yml 中添加 volumes: - /var/run/docker.sock:/var/run/docker.sock"
        )

    # Check if socket is accessible
    try:
        client = docker.from_env()
        client.ping()  # Test connectivity to daemon
        return client
    except DockerException as e:
        raise DockerException(
            f"[ERROR][DOCKER_DAEMON] Docker daemon 不可达: {e}"
        )
```

**Best Practices**:
- Perform socket checks during container startup (FR-001, FR-002)
- Set parent container `restart: no` for fast-fail behavior (FR-003)
- Log errors with Chinese descriptions and remediation steps (FR-004)

### 1.3 Hardware Availability Detection via Docker API

**Detecting NVIDIA Runtime**:
```python
def detect_nvidia_runtime(client):
    """FR-010: Detect NVIDIA runtime availability"""
    try:
        info = client.info()
        runtimes = info.get('Runtimes', {})

        if 'nvidia' in runtimes:
            return True
        return False
    except Exception as e:
        # Runtime detection failed
        return False
```

**Testing GPU Accessibility**:
```python
import docker.types

def test_gpu_available(client):
    """Test if GPU is actually accessible (not just runtime present)"""
    try:
        container = client.containers.run(
            'nvidia/cuda:12.0-base',
            'nvidia-smi',
            device_requests=[
                docker.types.DeviceRequest(
                    count=-1,  # all GPUs
                    capabilities=[['gpu']]
                )
            ],
            remove=True,
            detach=False
        )
        return True
    except docker.errors.ContainerError:
        return False
```

**Hardware Mode Configuration**:
```python
def get_device_requests(hardware_mode):
    """FR-029: Generate device requests based on hardware mode"""
    if hardware_mode == 'nvidia':
        return [
            docker.types.DeviceRequest(
                count=-1,
                capabilities=[['gpu']]
            )
        ]
    elif hardware_mode == 'hailo':
        # Hailo 8L uses device plugins, not Docker runtime
        # Requires host device mapping
        return None
    else:  # CPU mode
        return None
```

**Key Environment Variables** (for created containers):
- `NVIDIA_VISIBLE_DEVICES`: Controls which GPUs are accessible (default: all)
- `NVIDIA_DRIVER_CAPABILITIES`: Controls which driver libraries are mounted

### 1.4 Container Lifecycle Management Patterns

**Create and Start Pattern**:
```python
def create_frigate_instance(client, config):
    """FR-026: Create Frigate container instance"""

    # Prepare container configuration
    container_config = {
        'name': f"frigate-instance-{config['name']}",
        'image': f"ghcr.io/blakeblackshear/frigate:{config['tag']}",
        'detach': True,
        'ports': {
            '5000/tcp': config['ui_port'],   # Frigate UI
            '8554/tcp': config['rtsp_port'],  # RTSP restreamer
            '8555/tcp': config['webrtc_port'] # WebRTC
        },
        'volumes': {
            config['data_dir']: {'bind': '/media/frigate', 'mode': 'rw'},
            config['config_file']: {'bind': '/config/config.yml', 'mode': 'ro'},
            '/etc/localtime': {'bind': '/etc/localtime', 'mode': 'ro'}
        },
        'environment': {
            'TZ': config['timezone']  # FR-030
        },
        'healthcheck': {
            'test': ['CMD', 'curl', '-f', 'http://localhost:5000/api/stats'],
            'interval': 30000000000,  # 30s in nanoseconds
            'timeout': 10000000000,   # 10s
            'retries': 3,
            'start_period': 60000000000  # 60s startup grace period
        }
    }

    # Add hardware acceleration if needed (FR-029)
    if config['hardware_mode'] == 'nvidia':
        container_config['device_requests'] = get_device_requests('nvidia')
        container_config['runtime'] = 'nvidia'
    elif config['hardware_mode'] == 'hailo':
        container_config['devices'] = ['/dev/hailo0:/dev/hailo0']

    try:
        container = client.containers.create(**container_config)
        container.start()
        return container
    except docker.errors.ImageNotFound:
        raise Exception("[ERROR][IMAGE_PULL] 镜像不存在且拉取失败")
    except docker.errors.APIError as e:
        if 'port is already allocated' in str(e):
            raise Exception("[ERROR][PORT_CONFLICT] 端口已被占用")
        raise
```

**Stop and Remove Pattern**:
```python
def stop_instance(client, instance_name):
    """FR-033: Stop a Frigate instance"""
    try:
        container = client.containers.get(f"frigate-instance-{instance_name}")
        container.stop(timeout=10)  # Graceful shutdown
        return True
    except docker.errors.NotFound:
        raise Exception(f"实例 {instance_name} 不存在")

def delete_instance(client, instance_name):
    """FR-033: Delete a Frigate instance"""
    try:
        container = client.containers.get(f"frigate-instance-{instance_name}")
        container.stop(timeout=10)
        container.remove()
        # FR-036: Release port block and optionally clean data dir
        return True
    except docker.errors.NotFound:
        raise Exception(f"实例 {instance_name} 不存在")
```

**Health Check Monitoring**:
```python
from docker import APIClient
from time import sleep

def wait_for_healthy(container, timeout=60):
    """FR-031: Wait for container to become healthy"""
    api_client = APIClient()
    elapsed = 0

    while elapsed < timeout:
        inspect_data = api_client.inspect_container(container.id)
        health = inspect_data.get('State', {}).get('Health', {})
        status = health.get('Status', 'starting')

        if status == 'healthy':
            return True
        elif status == 'unhealthy':
            return False

        sleep(2)
        elapsed += 2

    return False  # Timeout

def get_container_status(container):
    """FR-032: Get current container status"""
    api_client = APIClient()
    inspect_data = api_client.inspect_container(container.id)

    state = inspect_data['State']
    if state['Running']:
        health = state.get('Health', {}).get('Status')
        if health:
            return health  # 'starting', 'healthy', 'unhealthy'
        return 'running'
    elif state['Status'] == 'created':
        return 'created'
    elif state['Status'] == 'exited':
        return 'stopped'
    else:
        return state['Status']
```

### 1.5 Error Handling Patterns for Docker API

**Exception Hierarchy**:
```python
from docker.errors import (
    DockerException,     # Base class for all Docker SDK errors
    APIError,            # Server returned an error
    ImageNotFound,       # Image doesn't exist (404)
    NotFound,            # General resource not found (404)
    ContainerError       # Container exit with non-zero status
)
```

**Comprehensive Error Handling**:
```python
def safe_container_operation(operation_func, *args, **kwargs):
    """Wrapper for Docker operations with retry logic"""
    max_retries = 3
    retry_delay = 2

    for attempt in range(max_retries):
        try:
            return operation_func(*args, **kwargs)

        except ImageNotFound as e:
            # Don't retry - image definitely doesn't exist
            raise Exception("[ERROR][IMAGE_NOT_FOUND] 镜像不存在")

        except docker.errors.APIError as e:
            error_msg = str(e).lower()

            # Port conflict - don't retry
            if 'port is already allocated' in error_msg:
                raise Exception("[ERROR][PORT_CONFLICT] 端口已被占用")

            # Address already in use - don't retry
            if 'address already in use' in error_msg:
                raise Exception("[ERROR][PORT_CONFLICT] 地址已被使用")

            # Permission denied - don't retry
            if 'permission denied' in error_msg:
                raise Exception("[ERROR][DOCKER_SOCKET] Docker socket 权限不足")

            # Network timeout - retry
            if 'timeout' in error_msg or 'timed out' in error_msg:
                if attempt < max_retries - 1:
                    sleep(retry_delay)
                    continue
                raise Exception("[ERROR][TIMEOUT] 操作超时")

            # Generic API error
            raise Exception(f"[ERROR][DOCKER_API] {e}")

        except ContainerError as e:
            # Container failed to run
            raise Exception(
                f"[ERROR][CONTAINER_FAILED] 容器启动失败: {e.stderr.decode()}"
            )

        except ConnectionError:
            # Docker daemon unreachable - retry
            if attempt < max_retries - 1:
                sleep(retry_delay)
                continue
            raise Exception("[ERROR][DOCKER_DAEMON] 无法连接到 Docker daemon")
```

**Image Pull with Fallback to Cache**:
```python
def ensure_image(client, image_tag):
    """FR-013: Pull image or use local cache"""
    try:
        # Check if image exists locally
        client.images.get(image_tag)
        return True
    except ImageNotFound:
        pass

    # Try to pull
    try:
        for line in client.api.pull(image_tag, stream=True, decode=True):
            status = line.get('status', '')
            if 'progress' in line:
                # Log progress for UI feedback
                pass
        return True
    except Exception as e:
        # Pull failed - check cache again
        try:
            client.images.get(image_tag)
            # Cache exists, allow deployment with warning
            print("[WARN][IMAGE_CACHE] 拉取失败，使用本地缓存继续部署")
            return True
        except ImageNotFound:
            raise Exception("[ERROR][IMAGE_PULL] 镜像拉取失败且无本地缓存")
```

---

## R2: Port Allocation Strategy

### 2.1 Port Block Allocation Model

**Design Decision**: Allocate consecutive port ranges (blocks) to each Frigate instance to simplify management and avoid fragmentation.

**Block Size**: 10 ports per instance (FR-027)
- Port 0: Frigate UI (5000)
- Port 1: RTSP restreamer (8554)
- Port 2: WebRTC (8555)
- Port 3: RTMP (1935)
- Ports 4-9: Reserved for future use

**Starting Port**: 5200 (configurable via environment variable)

### 2.2 Port Conflict Detection Before Container Creation

**Socket-Based Availability Check** (Most Reliable):
```python
import socket
import errno

def is_port_available(host, port):
    """Check if a port is available by attempting to bind"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

    try:
        sock.bind((host, port))
        sock.close()
        return True
    except OSError as e:
        if e.errno == errno.EADDRINUSE:
            return False  # Port in use
        elif e.errno == errno.EACCES:
            return False  # Permission denied
        raise

def check_port_block(start_port, block_size=10):
    """FR-028: Check if entire port block is available"""
    for offset in range(block_size):
        port = start_port + offset
        if not is_port_available('0.0.0.0', port):
            return False, port
    return True, None
```

**psutil-Based Check** (Faster for Queries):
```python
import psutil

def get_used_ports():
    """Get all currently used ports on the system"""
    used_ports = set()
    for conn in psutil.net_connections():
        if conn.laddr:
            used_ports.add(conn.laddr.port)
    return used_ports

def is_block_available(start_port, block_size, used_ports):
    """Check if port block overlaps with used ports"""
    block_ports = set(range(start_port, start_port + block_size))
    return block_ports.isdisjoint(used_ports)
```

**Integrated Port Allocator**:
```python
class PortAllocator:
    """FR-027, FR-028: Manage port block allocation"""

    def __init__(self, start_port=5200, block_size=10, max_port=65535):
        self.start_port = start_port
        self.block_size = block_size
        self.max_port = max_port
        self.allocated_blocks = {}  # {instance_name: start_port}

    def allocate_block(self, instance_name):
        """Allocate next available port block"""
        used_ports = get_used_ports()

        # Try from start_port onwards
        candidate = self.start_port
        while candidate + self.block_size <= self.max_port:
            # Check against system ports
            if not is_block_available(candidate, self.block_size, used_ports):
                candidate += self.block_size
                continue

            # Check against our allocations
            if any(
                abs(existing - candidate) < self.block_size
                for existing in self.allocated_blocks.values()
            ):
                candidate += self.block_size
                continue

            # Found available block
            self.allocated_blocks[instance_name] = candidate
            return candidate

        raise Exception("[ERROR][PORT_EXHAUSTED] 无可用端口块")

    def release_block(self, instance_name):
        """FR-036: Release port block when instance deleted"""
        if instance_name in self.allocated_blocks:
            del self.allocated_blocks[instance_name]

    def get_block(self, instance_name):
        """Get allocated port block for instance"""
        return self.allocated_blocks.get(instance_name)
```

### 2.3 Port Release and Reuse Strategy

**On Container Deletion**:
```python
def delete_instance_with_port_cleanup(instance_name, port_allocator):
    """FR-036: Delete instance and release ports"""
    # Stop and remove container
    delete_instance(client, instance_name)

    # Release port block
    port_allocator.release_block(instance_name)

    # Ports are immediately available for reuse
```

**Port Reuse Policy**:
- Released ports are immediately available for new instances
- No grace period needed (Docker cleans up bindings on container removal)
- Port allocator maintains no "cooldown" state

**Persistence**:
```python
import json

def save_port_allocations(allocator, filepath='/data/port_allocations.json'):
    """Persist port allocations across restarts"""
    with open(filepath, 'w') as f:
        json.dump(allocator.allocated_blocks, f)

def load_port_allocations(filepath='/data/port_allocations.json'):
    """Restore port allocations on startup"""
    try:
        with open(filepath, 'r') as f:
            allocated_blocks = json.load(f)
        allocator = PortAllocator()
        allocator.allocated_blocks = allocated_blocks
        return allocator
    except FileNotFoundError:
        return PortAllocator()
```

### 2.4 Edge Case Handling

**Port Exhaustion**:
```python
def handle_port_exhaustion():
    """When no ports available in range"""
    # Suggest cleanup
    raise Exception(
        "[ERROR][PORT_EXHAUSTED] 端口范围已耗尽 (5200-65535)。"
        "建议：1) 删除未使用的实例 2) 调整 PORT_START 环境变量 3) 减小 BLOCK_SIZE"
    )
```

**Conflict Resolution**:
```python
def resolve_port_conflict(preferred_port, block_size=10):
    """FR-028: If preferred port conflicts, find next available"""
    candidate = preferred_port
    max_attempts = 100  # Prevent infinite loop

    for _ in range(max_attempts):
        if check_port_block(candidate, block_size)[0]:
            return candidate
        candidate += block_size  # Try next block

    raise Exception("[ERROR][PORT_CONFLICT] 无法解决端口冲突")
```

**Custom Port Ranges**:
```python
# Environment-based configuration
PORT_START = int(os.getenv('PORT_START', '5200'))
PORT_BLOCK_SIZE = int(os.getenv('PORT_BLOCK_SIZE', '10'))

allocator = PortAllocator(
    start_port=PORT_START,
    block_size=PORT_BLOCK_SIZE
)
```

---

## R3: ONVIF Device Discovery with python-onvif-zeep

### 3.1 Device Discovery on Local Network

**Installation**:
```bash
pip install onvif-zeep WSDiscovery
```

**WS-Discovery Network Scan**:
```python
from wsdiscovery.discovery import ThreadedWSDiscovery as WSDiscovery
from onvif import ONVIFCamera

def discover_onvif_devices(timeout=10):
    """
    FR-015: Discover ONVIF cameras on local network
    SC-007: Complete within 10 seconds
    """
    wsd = WSDiscovery()
    wsd.start()

    try:
        # Search for ONVIF Profile S/G/T devices
        services = wsd.searchServices(
            scopes=['onvif://www.onvif.org/Profile'],
            timeout=timeout
        )

        devices = []
        for service in services:
            # Extract IP from XAddr
            xaddr = service.getXAddrs()[0] if service.getXAddrs() else None
            if xaddr:
                # Parse IP from http://192.168.1.100:80/onvif/device_service
                import re
                match = re.search(r'http://([^:]+):(\d+)', xaddr)
                if match:
                    devices.append({
                        'ip': match.group(1),
                        'port': int(match.group(2)),
                        'xaddr': xaddr,
                        'scopes': service.getScopes()
                    })

        return devices
    finally:
        wsd.stop()
```

**Key Limitations**:
- WS-Discovery uses multicast (UDP port 3702)
- Typically doesn't traverse routers (single network segment only)
- Faster than netscan but limited by network topology
- Some cameras may not respond if WS-Discovery is disabled

### 3.2 Timeout and Error Handling for Slow/Unresponsive Cameras

**Camera Initialization with Timeout**:
```python
from onvif import ONVIFCamera
from zeep.transports import Transport
from requests import Session

def create_onvif_camera(ip, port, user, password, timeout=5):
    """
    Create ONVIF camera connection with timeout
    FR-023: RTSP connectivity test with 3-5s timeout
    """
    # Create session with timeout
    session = Session()
    session.timeout = timeout

    transport = Transport(session=session)

    try:
        camera = ONVIFCamera(
            ip, port, user, password,
            wsdl_dir='/etc/onvif/wsdl/',  # Or bundled WSDL path
            transport=transport
        )

        # Test connection with devicemgmt service
        device_mgmt = camera.create_devicemgmt_service()
        device_info = device_mgmt.GetDeviceInformation()

        return camera, device_info

    except Exception as e:
        error_msg = str(e).lower()

        # Classify error types (FR-024)
        if 'unauthorized' in error_msg or '401' in error_msg:
            raise Exception("[WARN][RTSP_TEST_FAIL] 鉴权失败：用户名或密码错误")
        elif 'timeout' in error_msg or 'timed out' in error_msg:
            raise Exception("[WARN][RTSP_TEST_FAIL] 连接超时：摄像头响应慢或网络问题")
        elif 'connection refused' in error_msg:
            raise Exception("[WARN][RTSP_TEST_FAIL] 连接被拒：IP/端口错误或 ONVIF 未启用")
        else:
            raise Exception(f"[WARN][RTSP_TEST_FAIL] ONVIF 访问失败: {e}")
```

**Graceful Degradation**:
```python
def get_camera_config_with_fallback(ip, port, user, password, brand_template=None):
    """
    Try ONVIF first, fallback to brand template
    FR-015, FR-016: Support both ONVIF and brand templates
    """
    try:
        # Attempt ONVIF discovery
        camera, device_info = create_onvif_camera(ip, port, user, password, timeout=5)
        profiles = get_stream_profiles(camera)
        return {
            'method': 'onvif',
            'device_info': device_info,
            'profiles': profiles
        }
    except Exception as e:
        # Log warning, don't fail
        print(f"[WARN] ONVIF 扫描失败: {e}")

        # Fall back to brand template
        if brand_template:
            return {
                'method': 'template',
                'brand': brand_template,
                'rtsp_template': get_brand_rtsp_template(brand_template)
            }
        else:
            raise Exception("ONVIF 失败且未提供品牌模板")
```

### 3.3 Extracting Stream Profiles from ONVIF Responses

**Getting Profiles and Stream URIs**:
```python
def get_stream_profiles(camera):
    """
    Extract all stream profiles with resolution, bitrate, framerate, encoding
    Supports both Media (v1) and Media2 (v2) services
    """
    profiles = []

    try:
        # Try Media2 service first (supports H.265)
        media2 = camera.create_media2_service()
        media_profiles = media2.GetProfiles()

        for profile in media_profiles:
            # Get stream URI
            stream_uri_req = media2.create_type('GetStreamUri')
            stream_uri_req.ProfileToken = profile.token
            stream_uri_req.Protocol = 'RTSP'

            try:
                uri_response = media2.GetStreamUri(stream_uri_req)
                rtsp_uri = uri_response.Uri
            except:
                rtsp_uri = None

            # Get video encoder configuration
            video_config = profile.Configurations.Video
            if video_config:
                profiles.append({
                    'token': profile.token,
                    'name': profile.Name,
                    'rtsp_uri': rtsp_uri,
                    'encoding': video_config.Encoding,
                    'resolution': {
                        'width': video_config.Resolution.Width,
                        'height': video_config.Resolution.Height
                    },
                    'framerate': video_config.RateControl.FrameRateLimit if hasattr(video_config, 'RateControl') else None,
                    'bitrate': video_config.RateControl.BitrateLimit if hasattr(video_config, 'RateControl') else None
                })

    except:
        # Fallback to Media (v1) service
        media = camera.create_media_service()
        media_profiles = media.GetProfiles()

        for profile in media_profiles:
            # Get stream URI
            try:
                stream_setup = {
                    'Stream': 'RTP-Unicast',
                    'Protocol': 'RTSP'
                }
                uri_response = media.GetStreamUri({
                    'StreamSetup': stream_setup,
                    'ProfileToken': profile.token
                })
                rtsp_uri = uri_response.Uri
            except:
                rtsp_uri = None

            # Get video encoder configuration
            if profile.VideoEncoderConfiguration:
                config = profile.VideoEncoderConfiguration
                profiles.append({
                    'token': profile.token,
                    'name': profile.Name,
                    'rtsp_uri': rtsp_uri,
                    'encoding': config.Encoding,
                    'resolution': {
                        'width': config.Resolution.Width,
                        'height': config.Resolution.Height
                    },
                    'framerate': config.RateControl.FrameRateLimit if hasattr(config, 'RateControl') else None,
                    'bitrate': config.RateControl.BitrateLimit if hasattr(config, 'RateControl') else None
                })

    return profiles
```

### 3.4 Handling Incomplete ONVIF Responses

**Safe Attribute Access**:
```python
def safe_extract_profile_data(profile):
    """
    FR-019a: Handle incomplete ONVIF profile data
    Extract available fields, mark missing fields as None
    """
    data = {
        'token': getattr(profile, 'token', None),
        'name': getattr(profile, 'Name', 'Unknown'),
        'encoding': None,
        'resolution': None,
        'framerate': None,
        'bitrate': None,
        'pixel_count': 0
    }

    # Try to extract video configuration
    video_config = None
    if hasattr(profile, 'Configurations') and profile.Configurations:
        video_config = getattr(profile.Configurations, 'Video', None)
    elif hasattr(profile, 'VideoEncoderConfiguration'):
        video_config = profile.VideoEncoderConfiguration

    if video_config:
        # Encoding
        data['encoding'] = getattr(video_config, 'Encoding', None)

        # Resolution
        if hasattr(video_config, 'Resolution') and video_config.Resolution:
            width = getattr(video_config.Resolution, 'Width', None)
            height = getattr(video_config.Resolution, 'Height', None)
            if width and height:
                data['resolution'] = {'width': width, 'height': height}
                data['pixel_count'] = width * height

        # Rate control
        if hasattr(video_config, 'RateControl') and video_config.RateControl:
            data['framerate'] = getattr(video_config.RateControl, 'FrameRateLimit', None)
            data['bitrate'] = getattr(video_config.RateControl, 'BitrateLimit', None)

    return data
```

**Main/Substream Pairing Algorithm**:
```python
def pair_main_substream(profiles):
    """
    FR-019: Pair main and substream based on resolution, bitrate, framerate
    FR-019a: Handle incomplete data with fallback to manual selection
    Priority: resolution > bitrate > framerate > encoding
    """
    if not profiles or len(profiles) < 2:
        return None, None, "需要至少 2 个流配置"

    # Extract profile data safely
    profile_data = [safe_extract_profile_data(p) for p in profiles]

    # Check if we have enough resolution data
    profiles_with_resolution = [p for p in profile_data if p['resolution']]

    if len(profiles_with_resolution) < 2:
        # Incomplete data - return profiles for manual selection
        return None, None, {
            'error': 'incomplete_data',
            'message': 'ONVIF 返回的流信息不完整（缺少分辨率），请手动选择主/子流',
            'available_profiles': profile_data
        }

    # Sort by pixel count (resolution)
    sorted_profiles = sorted(
        profiles_with_resolution,
        key=lambda x: x['pixel_count'],
        reverse=True
    )

    main_candidate = sorted_profiles[0]
    sub_candidate = sorted_profiles[-1]

    # Validate sub/main ratio (FR-019)
    if main_candidate['pixel_count'] > 0:
        ratio = sub_candidate['pixel_count'] / main_candidate['pixel_count']
        if ratio >= 0.6:
            # Sub stream too large, ambiguous pairing
            return None, None, {
                'error': 'ambiguous_pairing',
                'message': '子流分辨率过大（像素比 >= 0.6），无法自动配对',
                'available_profiles': profile_data
            }

    return main_candidate, sub_candidate, None
```

**Manual Selection UI Response** (for FR-019a):
```python
def format_profile_for_manual_selection(profile_data):
    """
    Format profile data for user selection when auto-pairing fails
    """
    return {
        'token': profile_data['token'],
        'name': profile_data['name'],
        'display': f"{profile_data['name']} - "
                   f"编码:{profile_data['encoding'] or '未知'} "
                   f"分辨率:{profile_data['resolution'] or '未知'} "
                   f"帧率:{profile_data['framerate'] or '未知'}fps "
                   f"码率:{profile_data['bitrate'] or '未知'}kbps"
    }
```

### 3.5 RTSP URL Construction from ONVIF Stream URIs

**URL Parsing and Reconstruction**:
```python
from urllib.parse import urlparse, urlunparse
import re

def construct_rtsp_url(onvif_uri, username, password):
    """
    FR-017: Construct authenticated RTSP URL from ONVIF stream URI
    Handle URL encoding of credentials
    """
    # Parse ONVIF URI
    parsed = urlparse(onvif_uri)

    # URL-encode credentials (FR-017)
    from urllib.parse import quote
    encoded_user = quote(username, safe='')
    encoded_pass = quote(password, safe='')

    # Reconstruct with credentials
    netloc = f"{encoded_user}:{encoded_pass}@{parsed.hostname}"
    if parsed.port:
        netloc += f":{parsed.port}"

    rtsp_url = urlunparse((
        'rtsp',  # Force RTSP scheme
        netloc,
        parsed.path,
        parsed.params,
        parsed.query,
        parsed.fragment
    ))

    return rtsp_url

def get_rtsp_urls_for_profile(camera, profile_token, username, password):
    """
    Get RTSP URLs for a specific profile
    Returns main and sub stream URLs if available
    """
    media = camera.create_media_service()

    try:
        stream_setup = {
            'Stream': 'RTP-Unicast',
            'Protocol': 'RTSP'
        }
        uri_response = media.GetStreamUri({
            'StreamSetup': stream_setup,
            'ProfileToken': profile_token
        })

        rtsp_url = construct_rtsp_url(uri_response.Uri, username, password)
        return rtsp_url

    except Exception as e:
        raise Exception(f"无法获取流 URI: {e}")
```

**Brand Template RTSP URLs** (FR-016, FR-017):
```python
BRAND_TEMPLATES = {
    'hikvision': {
        'main_stream': 'rtsp://{user}:{password}@{ip}:554/Streaming/Channels/101',
        'sub_stream': 'rtsp://{user}:{password}@{ip}:554/Streaming/Channels/102',
        'channels': [101, 102]  # For dual-lens
    },
    'dahua': {
        'main_stream': 'rtsp://{user}:{password}@{ip}:554/cam/realmonitor?channel=1&subtype=0',
        'sub_stream': 'rtsp://{user}:{password}@{ip}:554/cam/realmonitor?channel=1&subtype=1',
        'channels': [1, 2]
    },
    'reolink_duo': {
        'main_stream': 'rtsp://{user}:{password}@{ip}:554/h264Preview_01_main',
        'sub_stream': 'rtsp://{user}:{password}@{ip}:554/h264Preview_01_sub',
        'channels': ['01_main', '02_main']  # Dual lens
    }
}

def format_rtsp_from_template(brand, ip, username, password, channel=1):
    """
    FR-016, FR-017: Generate RTSP URL from brand template
    """
    from urllib.parse import quote

    template = BRAND_TEMPLATES.get(brand)
    if not template:
        raise ValueError(f"不支持的品牌: {brand}")

    # URL encode credentials
    encoded_user = quote(username, safe='')
    encoded_pass = quote(password, safe='')

    rtsp_url = template['main_stream'].format(
        user=encoded_user,
        password=encoded_pass,
        ip=ip
    )

    return rtsp_url
```

---

## Unknowns Requiring Further Investigation

### U1: Hailo 8L Device Plugin Detection

**Question**: How to detect Hailo 8L device plugin availability via Docker API?

**Current Understanding**:
- Hailo doesn't use Docker runtime like NVIDIA
- Likely requires device mapping (`/dev/hailo0`)
- No standard detection method found in Docker API

**Next Steps**:
- Check if device file exists: `os.path.exists('/dev/hailo0')`
- Test container creation with device mapping
- Consult Hailo documentation for Kubernetes device plugin patterns

### U2: ONVIF Media vs Media2 Service Selection

**Question**: When should we prefer Media2 over Media service?

**Current Understanding**:
- Media2 supports H.265/HEVC encoding
- Media2 has different API structure (requires `create_type()`)
- Not all cameras support Media2

**Next Steps**:
- Try Media2 first, fallback to Media on error
- Check ONVIF profile version in device capabilities
- Test with Hikvision, Dahua, Reolink cameras

### U3: Docker Socket Permission Handling in CI/CD

**Question**: How to safely test Docker socket operations in CI environments (GitHub Actions)?

**Current Understanding**:
- CI runners typically don't expose Docker socket to containers
- DinD (Docker-in-Docker) is complex and has nested permission issues
- Mock Docker SDK client for unit tests

**Next Steps**:
- Use `docker-py` mocking library for unit tests
- Integration tests only on self-hosted runners with socket access
- Document CI limitations in testing guide

### U4: Port Block Fragmentation After Multiple Create/Delete Cycles

**Question**: Will port allocator become fragmented after many create/delete operations?

**Current Understanding**:
- Current implementation always searches from `start_port` onwards
- No defragmentation mechanism
- Could skip over freed blocks if not restarted

**Next Steps**:
- Implement "first-fit" algorithm to reuse freed blocks
- Add periodic defragmentation (optional)
- Load allocations from persistent storage on startup

### U5: RTSP Connectivity Test Implementation

**Question**: How to test RTSP connectivity without fully reading the stream (FR-023)?

**Options**:
1. Use `ffprobe` to probe stream metadata (lightweight)
2. Use `cv2.VideoCapture` to open and immediately close
3. Use raw RTSP handshake with `socket` library

**Preferred Approach**: `ffprobe` with 3-5s timeout
```python
import subprocess

def test_rtsp_connectivity(rtsp_url, timeout=5):
    """FR-023: Test RTSP connectivity"""
    try:
        result = subprocess.run(
            ['ffprobe', '-v', 'error', '-rtsp_transport', 'tcp',
             '-timeout', str(timeout * 1000000), rtsp_url],
            capture_output=True,
            timeout=timeout
        )
        return result.returncode == 0
    except subprocess.TimeoutExpired:
        return False
```

**Next Steps**:
- Verify `ffprobe` availability in container
- Test with slow/unresponsive cameras
- Classify error types (auth, timeout, network)

### U6: Container Data Directory Cleanup on Deletion

**Question**: Should data directories be auto-deleted when instance is removed? (FR-036)

**Trade-offs**:
- **Auto-delete**: Clean, no disk bloat, but risky if user wants to recover
- **Manual delete**: Safe, but requires user intervention, disk usage grows

**Recommendation**:
- Default: Move to `/data/trash/<instance-name>-<timestamp>/`
- Provide "Permanently Delete" button in UI
- Auto-purge trash after 7 days (configurable)

**Next Steps**:
- Add trash directory management service
- UI toggle for immediate deletion
- Document data retention policy

### U7: Multi-Architecture Image Support

**Question**: How to handle ARM (Raspberry Pi, Hailo) vs x86 host architectures?

**Current Understanding**:
- Frigate supports both `linux/amd64` and `linux/arm64`
- Docker SDK can detect platform: `client.info()['Architecture']`
- Need to pull correct image variant

**Implementation**:
```python
def get_platform_image_tag(client, base_tag):
    """Select image variant based on host architecture"""
    arch = client.info()['Architecture']
    if 'arm' in arch or 'aarch64' in arch:
        return f"{base_tag}"  # Multi-arch manifest handles this
    return f"{base_tag}"
```

**Next Steps**:
- Test on ARM device (Raspberry Pi 4/5)
- Verify Hailo 8L compatibility
- Document architecture requirements

---

## Implementation Recommendations

### Priority 1: Core Docker Management
1. Implement Docker socket verification (`verify_docker_socket()`)
2. Implement hardware detection (`detect_nvidia_runtime()`)
3. Implement container lifecycle operations (create, start, stop, delete)
4. Implement health check monitoring (`wait_for_healthy()`)

### Priority 2: Port Allocation
1. Implement `PortAllocator` class with persistence
2. Implement socket-based port availability checks
3. Add port conflict resolution with auto-increment
4. Document port exhaustion handling

### Priority 3: ONVIF Discovery
1. Implement WS-Discovery network scan with timeout
2. Implement profile extraction with safe attribute access
3. Implement main/substream pairing algorithm
4. Add manual selection UI for incomplete data (FR-019a)

### Priority 4: Error Handling & UX
1. Implement comprehensive error classification
2. Add Chinese error messages with remediation steps
3. Implement RTSP connectivity test (`test_rtsp_connectivity()`)
4. Add progress feedback for image pulls

### Testing Strategy
1. **Unit Tests**: Mock Docker SDK for socket checks, port allocation, ONVIF parsing
2. **Integration Tests**: Use `docker-compose` fixtures for real container operations
3. **End-to-End Tests**: Deploy Frigate instance and verify health
4. **Edge Case Tests**: Port conflicts, ONVIF timeouts, hardware unavailable

---

**Research Completed**: 2025-10-18
**Next Phase**: Phase 1 - Data Model & API Contracts
# Phase 0 Research: Frigate Configuration Patterns

## R4: Frigate YAML Configuration Structure

### Core Configuration Sections

Frigate's `config.yml` follows a hierarchical structure with the following main sections:

#### 1. MQTT Integration
```yaml
mqtt:
  enabled: False
  host: core-mosquitto
  user: mqtt-user
  password: {FRIGATE_MQTT_PASSWORD}
```

#### 2. Detectors
```yaml
detectors:
  coral:
    type: edgetpu
    device: usb
```

**Supported Detector Types:**
- `cpu` - CPU-based detection (not recommended for production)
- `edgetpu` - Google Coral TPU (USB/PCIe/M.2)
- `hailo8l` - Hailo-8L AI acceleration
- `openvino` - Intel OpenVINO
- `onnx` - ONNX runtime
- `tensorrt` - NVIDIA TensorRT (Jetson platforms)

#### 3. Hardware Acceleration (FFmpeg)
```yaml
ffmpeg:
  hwaccel_args: preset-nvidia-h264
```

**Common hwaccel_args Presets:**
- `preset-rpi-64-h264` / `preset-rpi-64-h265` - Raspberry Pi 3/4
- `preset-vaapi` - Intel/AMD via VAAPI
- `preset-intel-qsv-h264` / `preset-intel-qsv-h265` - Intel QuickSync
- `preset-nvidia-h264` / `preset-nvidia-h265` - NVIDIA GPU
- `preset-jetson-h264` / `preset-jetson-h265` - NVIDIA Jetson
- `preset-rkmpp` - Rockchip platforms

**Important:** `hwaccel_args` is for video decoding only, separate from object detection hardware.

#### 4. Recording Configuration
```yaml
record:
  enabled: True
  retain:
    days: 7
    mode: motion
  alerts:
    retain:
      days: 30
  detections:
    retain:
      days: 30
```

#### 5. Snapshots Configuration
```yaml
snapshots:
  enabled: True
  retain:
    default: 30
```

#### 6. Camera Configuration Structure
```yaml
cameras:
  front_door:
    enabled: True
    ffmpeg:
      inputs:
        - path: rtsp://username:{FRIGATE_RTSP_PASSWORD}@192.168.1.10:554/Streaming/Channels/102
          roles:
            - detect
        - path: rtsp://username:{FRIGATE_RTSP_PASSWORD}@192.168.1.10:554/Streaming/Channels/101
          roles:
            - record
    detect:
      width: 1280
      height: 720
      fps: 5
```

**Available Input Roles:**
- `detect` - Stream used for object detection (typically lower resolution)
- `record` - Stream used for video recording (typically higher resolution)
- `audio` - Stream used for audio-based detection

**Best Practice:** Use dual-stream configuration with lower resolution sub-stream for detection and higher resolution main stream for recording to optimize CPU/GPU usage.

#### 7. go2rtc Integration (Restreaming)
```yaml
go2rtc:
  streams:
    front_door:
      - rtsp://username:password@192.168.1.10:554/Streaming/Channels/101
    front_door_sub:
      - rtsp://username:password@192.168.1.10:554/Streaming/Channels/102
  webrtc:
    candidates:
      - 192.168.1.100:8555
      - stun:8555
```

### Environment Variable Substitution

Frigate supports environment variable substitution using `{VARIABLE_NAME}` syntax for sensitive credentials:

```yaml
cameras:
  camera1:
    ffmpeg:
      inputs:
        - path: rtsp://{FRIGATE_RTSP_USER}:{FRIGATE_RTSP_PASSWORD}@192.168.1.10:554/stream
```

---

## R5: Frigate Docker Deployment Requirements

### Docker Compose Configuration

#### Image and Container Settings
```yaml
services:
  frigate:
    container_name: frigate
    image: ghcr.io/blakeblackshear/frigate:stable
    restart: unless-stopped
    privileged: true
    stop_grace_period: 30s
```

#### Required Environment Variables
```yaml
environment:
  - TZ=America/New_York
  - FRIGATE_RTSP_PASSWORD=your_camera_password
  - FRIGATE_RTSP_USER=admin
  - FRIGATE_MQTT_USER=mqtt_user
  - FRIGATE_MQTT_PASSWORD=mqtt_password
```

**Additional Environment Variables:**
- `LIBVA_DRIVER_NAME=radeonsi` - For AMD GPU hardware acceleration
- `LIBVA_DRIVER_NAME=i965` - For older Intel GPUs (pre-Gen 8)
- `LIBVA_DRIVER_NAME=iHD` - For newer Intel GPUs (default)
- `YOLO_MODELS` - Specify YOLO model versions
- `PLUS_API_KEY` - For Frigate+ integration
- `TRT_MODEL_PREP_DEVICE` - GPU selection for multi-GPU systems

#### Volume Mounts
```yaml
volumes:
  - /etc/localtime:/etc/localtime:ro
  - /path/to/config:/config
  - /path/to/storage:/media/frigate
  - type: tmpfs
    target: /tmp/cache
    tmpfs:
      size: 1000000000  # 1GB tmpfs for cache
```

**Volume Purposes:**
- `/config` - Configuration file (config.yml) and SQLite database
- `/media/frigate` - Recordings, snapshots, and exports
- `/tmp/cache` - Temporary cache (recommended as tmpfs to reduce SSD wear)

#### Port Mappings
```yaml
ports:
  - "5000:5000"   # Internal unauthenticated UI (internal access only)
  - "8971:8971"   # Authenticated UI and API (recommended for external access)
  - "8554:8554"   # RTSP restreaming
  - "8555:8555/tcp"  # WebRTC over TCP
  - "8555:8555/udp"  # WebRTC over UDP
  - "1935:1935"   # RTMP streams (legacy)
  - "1984:1984"   # go2rtc web interface
```

#### Device Passthrough for Hardware Acceleration
```yaml
devices:
  # Google Coral TPU
  - /dev/bus/usb:/dev/bus/usb              # USB Coral
  - /dev/apex_0:/dev/apex_0                # PCIe/M.2 Coral

  # Intel GPU (QuickSync/VAAPI)
  - /dev/dri/renderD128:/dev/dri/renderD128

  # NVIDIA GPU
  # (requires nvidia-docker runtime, configured via deploy section)
```

**For NVIDIA GPU:**
```yaml
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: 1
          capabilities: [gpu]
```

#### Shared Memory Configuration
```yaml
shm_size: "256mb"  # Default is 64mb
```

**Shared Memory Calculation:**
- Default 128MB supports ~2 cameras at 720p
- Formula: `(width × height × 1.5 × 20 + 270480) / 1048576 + 40` MB
- Example: 8 cameras at 1280×720 ≈ 253MB required

#### Network Configuration
```yaml
network_mode: host  # Recommended for auto-discovery and optimal performance
```

**Alternative (bridge mode):**
```yaml
networks:
  - frigate_net
```

#### Health Check (Recommended)
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:5000/api/version"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s
```

---

## R6: RTSP URL Templates for Common Camera Brands

### Hikvision Cameras

**RTSP URL Pattern:**
```
rtsp://USERNAME:PASSWORD@CAMERA_IP:554/Streaming/Channels/[CHANNEL]
```

**Common Channels:**
- Channel `101` - Main stream (high resolution)
- Channel `102` - Sub stream (lower resolution for detection)
- Channel `103` - Third stream (mid-resolution on higher-end models)

**Example Configuration:**
```yaml
cameras:
  hikvision_camera:
    ffmpeg:
      inputs:
        - path: rtsp://admin:{FRIGATE_RTSP_PASSWORD}@192.168.1.10:554/Streaming/Channels/102
          roles:
            - detect
        - path: rtsp://admin:{FRIGATE_RTSP_PASSWORD}@192.168.1.10:554/Streaming/Channels/101
          roles:
            - record
```

**Authentication Notes:**
- Newer models may require digest/basic RTSP authentication with MD5 digest algorithm
- Check camera settings for RTSP authentication type

### Dahua & Amcrest Cameras

**RTSP URL Pattern:**
```
rtsp://USERNAME:PASSWORD@CAMERA_IP:554/cam/realmonitor?channel=1&subtype=[SUBTYPE]
```

**Subtype Parameters:**
- `subtype=0` - Main stream (highest resolution)
- `subtype=1` - Sub stream (lower resolution)
- `subtype=2` - Mid-resolution stream (1280×720, higher-end models)
- `subtype=3` - Additional mid-resolution stream (1920×1080, higher-end models)

**Example Configuration:**
```yaml
cameras:
  dahua_camera:
    ffmpeg:
      inputs:
        - path: rtsp://admin:{FRIGATE_RTSP_PASSWORD}@192.168.1.20:554/cam/realmonitor?channel=1&subtype=1
          roles:
            - detect
        - path: rtsp://admin:{FRIGATE_RTSP_PASSWORD}@192.168.1.20:554/cam/realmonitor?channel=1&subtype=0
          roles:
            - record
```

### Reolink Cameras

**HTTP-FLV (Recommended for <5MP cameras):**
```
http://CAMERA_IP/flv?port=1935&app=bcs&stream=channel0_[STREAM].bcs&user=USERNAME&password=PASSWORD
```

**Stream Types:**
- `channel0_main.bcs` - Main stream
- `channel0_ext.bcs` - Sub stream (lower resolution)

**RTSP URL Pattern (For >5MP cameras or when HTTP-FLV unavailable):**
```
rtsp://USERNAME:PASSWORD@CAMERA_IP:554/h264Preview_01_[STREAM]
```

**Stream Types:**
- `main` - Main stream
- `sub` - Sub stream

**Example Configuration:**
```yaml
cameras:
  reolink_camera:
    ffmpeg:
      inputs:
        # HTTP-FLV for detection (more reliable for Reolink)
        - path: http://192.168.1.30/flv?port=1935&app=bcs&stream=channel0_ext.bcs&user=admin&password={FRIGATE_RTSP_PASSWORD}
          roles:
            - detect
        # RTSP for recording
        - path: rtsp://admin:{FRIGATE_RTSP_PASSWORD}@192.168.1.30:554/h264Preview_01_main
          roles:
            - record
```

**Reolink NVR Channel Access:**
- Cameras through NVR use `channel[0-15]` parameter in HTTP stream URLs

### Reolink Duo (Dual-Lens Cameras)

**Special Considerations:**
- **Resolution:** Ultra-wide aspect ratio (e.g., Duo 3V: 1536×432, Duo 3: 7680×2160 32:9)
- **Codec:** Main stream typically H.265/HEVC only
- **FFmpeg Version:** Main stream requires FFmpeg v5 (v7 may crash)
- **Protocol:** For >8MP dual-lens, RTSP is the only stable option (HTTP-FLV not supported)

**Example Configuration:**
```yaml
cameras:
  reolink_duo:
    ffmpeg:
      path: "5.0"  # Force FFmpeg v5 for stability
      inputs:
        - path: rtsp://admin:{FRIGATE_RTSP_PASSWORD}@192.168.1.40:554/h264Preview_01_sub
          roles:
            - detect
        - path: rtsp://admin:{FRIGATE_RTSP_PASSWORD}@192.168.1.40:554/h264Preview_01_main
          roles:
            - record
    detect:
      width: 1536
      height: 432
```

### URL Encoding for Special Characters in Passwords

**Common Special Characters and Their Encoded Values:**
- `@` → `%40`
- `!` → `%21`
- `#` → `%23`
- `%` → `%25`
- `&` → `%26`
- `*` → `%2A`
- `$` → `%24`
- `+` → `%2B`
- `/` → `%2F`
- `:` → `%3A`

**Important Notes:**
- When using passwords directly in camera `ffmpeg.inputs[].path`, Frigate automatically URL-encodes special characters
- When using passwords in `go2rtc.streams`, you **must manually URL-encode** special characters
- Environment variables used in paths are substituted before encoding, so store passwords unencoded in environment variables

**Example with Special Characters:**
```yaml
environment:
  # Store password unencoded in environment variable
  - FRIGATE_RTSP_PASSWORD=MyP@ss!123

cameras:
  camera1:
    ffmpeg:
      inputs:
        # Frigate auto-encodes when substituting {FRIGATE_RTSP_PASSWORD}
        - path: rtsp://admin:{FRIGATE_RTSP_PASSWORD}@192.168.1.10:554/stream
```

**Manual Encoding for go2rtc:**
```yaml
environment:
  # For go2rtc, manually encode: MyP@ss!123 → MyP%40ss%21123
  - GO2RTC_PASSWORD=MyP%40ss%21123

go2rtc:
  streams:
    camera1:
      - rtsp://admin:{GO2RTC_PASSWORD}@192.168.1.10:554/stream
```

### Common RTSP Ports
- **Standard RTSP:** Port `554` (TCP)
- **go2rtc RTSP:** Port `8554` (TCP)
- **Alternative RTSP:** Port `8555` (TCP/UDP for WebRTC)
- **RTMP (legacy):** Port `1935` (TCP)

---

## Implementation Recommendations

### 1. Configuration Rendering Strategy

**Template-Based Approach:**
- Use Jinja2 or similar templating to render `config.yml` from user inputs
- Store sensitive credentials as environment variables, never hardcode in config
- Validate camera RTSP URLs before including in configuration
- Support dual-stream patterns by default (detect + record roles)

**Recommended Config Structure:**
```python
config_template = {
    "mqtt": {"enabled": False},  # Optional, enable if MQTT broker provided
    "detectors": {},  # Populated based on hardware selection
    "ffmpeg": {"hwaccel_args": ""},  # Set based on GPU/hardware choice
    "cameras": {}  # Generated from camera definitions
}
```

### 2. Camera Configuration Generator

**Input Requirements:**
- Camera name/identifier
- Camera brand (Hikvision/Dahua/Reolink/Generic)
- IP address and RTSP port
- Authentication credentials
- Desired recording settings
- Hardware acceleration preference

**Auto-Detection Logic:**
```python
def generate_camera_config(camera_info):
    config = {
        "enabled": True,
        "ffmpeg": {"inputs": []},
        "detect": {
            "width": camera_info.get("detect_width", 1280),
            "height": camera_info.get("detect_height", 720),
            "fps": 5
        }
    }

    # Add detect stream (sub/lower resolution)
    detect_url = build_rtsp_url(
        brand=camera_info["brand"],
        ip=camera_info["ip"],
        username="{FRIGATE_RTSP_USER}",
        password="{FRIGATE_RTSP_PASSWORD}",
        stream_type="sub"
    )
    config["ffmpeg"]["inputs"].append({
        "path": detect_url,
        "roles": ["detect"]
    })

    # Add record stream (main/higher resolution)
    record_url = build_rtsp_url(
        brand=camera_info["brand"],
        ip=camera_info["ip"],
        username="{FRIGATE_RTSP_USER}",
        password="{FRIGATE_RTSP_PASSWORD}",
        stream_type="main"
    )
    config["ffmpeg"]["inputs"].append({
        "path": record_url,
        "roles": ["record"]
    })

    return config
```

### 3. Docker Container Creation Strategy

**Environment Variable Management:**
```python
required_env_vars = {
    "TZ": user_timezone,
    "FRIGATE_RTSP_USER": camera_username,
    "FRIGATE_RTSP_PASSWORD": camera_password,
}

optional_env_vars = {
    "FRIGATE_MQTT_USER": mqtt_user,
    "FRIGATE_MQTT_PASSWORD": mqtt_password,
    "LIBVA_DRIVER_NAME": gpu_driver,  # Based on GPU type
}
```

**Volume Mount Strategy:**
```python
volumes = {
    "/etc/localtime": {"bind": "/etc/localtime", "mode": "ro"},
    config_dir: {"bind": "/config", "mode": "rw"},
    media_dir: {"bind": "/media/frigate", "mode": "rw"},
}

# Add tmpfs for cache
tmpfs = {"/tmp/cache": f"size={calculate_cache_size(num_cameras, resolution)}"}
```

**Device Passthrough Logic:**
```python
def get_device_mappings(hardware_config):
    devices = []

    if hardware_config["detector"] == "coral_usb":
        devices.append("/dev/bus/usb:/dev/bus/usb")
    elif hardware_config["detector"] == "coral_pcie":
        devices.append("/dev/apex_0:/dev/apex_0")

    if hardware_config["hwaccel"] in ["vaapi", "qsv"]:
        devices.append("/dev/dri/renderD128:/dev/dri/renderD128")

    return devices
```

**Port Mapping Strategy:**
```python
port_mappings = {
    "5000/tcp": 5000,      # Internal UI
    "8971/tcp": 8971,      # Authenticated UI (expose externally)
    "8554/tcp": 8554,      # RTSP restream
    "8555/tcp": 8555,      # WebRTC TCP
    "8555/udp": 8555,      # WebRTC UDP
}
```

### 4. Hardware Acceleration Selection

**Detection Matrix:**
```python
hwaccel_presets = {
    "nvidia": "preset-nvidia-h264",
    "intel_qsv": "preset-intel-qsv-h264",
    "intel_vaapi": "preset-vaapi",
    "amd_vaapi": "preset-vaapi",
    "rpi": "preset-rpi-64-h264",
    "rockchip": "preset-rkmpp",
    "none": ""
}

detector_configs = {
    "cpu": {"type": "cpu", "num_threads": 3},
    "coral_usb": {"type": "edgetpu", "device": "usb"},
    "coral_pcie": {"type": "edgetpu", "device": "pci"},
    "hailo8l": {"type": "hailo8l", "device": "PCIe"},
}
```

### 5. Validation Checklist

**Pre-Deployment Validation:**
- [ ] RTSP URLs are properly formatted with URL-encoded passwords if needed
- [ ] Environment variables for credentials are set and referenced correctly
- [ ] Hardware acceleration device mappings match available hardware
- [ ] Shared memory size is sufficient for camera count and resolution
- [ ] Port mappings don't conflict with existing services
- [ ] Volume mount paths exist and have proper permissions
- [ ] Detector configuration matches available hardware (Coral/Hailo/GPU)
- [ ] Camera resolution settings match actual camera capabilities
- [ ] Timezone is correctly set for accurate timestamps

**Post-Deployment Validation:**
- [ ] Frigate container starts successfully
- [ ] Web UI accessible on configured port
- [ ] Camera streams connect and display properly
- [ ] Hardware acceleration is active (check Frigate logs)
- [ ] Object detection is functioning
- [ ] Recordings are being saved to correct path
- [ ] Snapshots are being captured

### 6. Error Handling and Troubleshooting

**Common Issues and Solutions:**

| Issue | Likely Cause | Solution |
|-------|-------------|----------|
| Green screen on playback | Incorrect hwaccel_args or missing device | Verify GPU drivers, check device passthrough |
| "Bus error" crash | Insufficient shared memory | Increase shm_size based on camera count/resolution |
| RTSP authentication fails | Special characters in password | URL-encode special characters in password |
| High CPU usage with GPU | hwaccel not active | Check Frigate logs, verify preset matches hardware |
| WebRTC not connecting | Port 8555 not accessible | Check firewall, set WebRTC candidates in go2rtc config |
| Recording not working | Insufficient storage or missing role | Verify /media/frigate volume, ensure "record" role assigned |

### 7. Recommended Default Configuration

**Minimal Starting Configuration:**
```yaml
mqtt:
  enabled: False

detectors:
  cpu:
    type: cpu
    num_threads: 3

record:
  enabled: True
  retain:
    days: 7
    mode: motion

snapshots:
  enabled: True
  retain:
    default: 10

cameras:
  # Generated per camera
```

**Production-Ready Configuration:**
```yaml
mqtt:
  enabled: True
  host: {MQTT_HOST}
  user: {FRIGATE_MQTT_USER}
  password: {FRIGATE_MQTT_PASSWORD}

detectors:
  coral:
    type: edgetpu
    device: usb

ffmpeg:
  hwaccel_args: preset-vaapi

record:
  enabled: True
  retain:
    days: 14
    mode: all
  events:
    retain:
      default: 30
      mode: motion

snapshots:
  enabled: True
  retain:
    default: 30
  quality: 90

go2rtc:
  streams:
    # Generated per camera with restream capability
  webrtc:
    candidates:
      - {LOCAL_IP}:8555
      - stun:8555
```

---

## Summary

This research provides comprehensive patterns for:

1. **Configuration Structure:** All core YAML sections, hardware acceleration options, and dual-stream patterns
2. **Docker Deployment:** Complete environment variables, volume mounts, port mappings, and device passthrough requirements
3. **RTSP Patterns:** Specific URL templates for Hikvision, Dahua, and Reolink (including dual-lens Duo models) with URL encoding guidelines

**Key Takeaways for Implementation:**
- Always use environment variables for credentials with `{VARIABLE_NAME}` substitution
- Implement dual-stream configuration (sub for detect, main for record) for optimal performance
- Calculate shared memory based on camera count and resolution: `(width × height × 1.5 × 20 + 270480) / 1048576 + 40` MB
- URL-encode special characters in passwords, especially when used in go2rtc streams
- Match hwaccel_args presets to available hardware (NVIDIA/Intel/AMD/Coral)
- For Reolink cameras, prefer HTTP-FLV for <5MP, RTSP for >5MP
- Expose port 8971 for authenticated external access, keep 5000 internal only
- Use tmpfs mount for `/tmp/cache` to reduce storage wear
