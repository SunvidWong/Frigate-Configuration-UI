export interface DDNSConfig {
  provider: 'cloudflare' | 'aliyun' | 'dnspod' | 'noip' | 'custom';
  domain: string;
  subdomain: string;
  apiKey?: string;
  secret?: string;
  enabled: boolean;
  lastUpdate?: Date;
}

export interface SSLCertificate {
  id: string;
  domain: string;
  issuer: string;
  validFrom: Date;
  validUntil: Date;
  status: 'valid' | 'expired' | 'invalid' | 'pending';
  autoRenew: boolean;
  certificatePath?: string;
  keyPath?: string;
}

export interface PortForwarding {
  internalPort: number;
  externalPort: number;
  protocol: 'tcp' | 'udp';
  enabled: boolean;
  description: string;
}

export interface RemoteAccessConfig {
  ddns: DDNSConfig;
  ssl: {
    enabled: boolean;
    certificate?: SSLCertificate;
    forceHttps: boolean;
  };
  portForwarding: PortForwarding[];
  accessControl: {
    enabled: boolean;
    allowedIPs: string[];
    authentication: boolean;
    username?: string;
    password?: string;
  };
}

export interface RemoteService {
  getRemoteConfig(): Promise<RemoteAccessConfig>;
  updateRemoteConfig(config: Partial<RemoteAccessConfig>): Promise<RemoteAccessConfig>;

  // DDNS管理
  testDDNSConnection(config: DDNSConfig): Promise<boolean>;
  updateDDNSRecord(config: DDNSConfig): Promise<void>;

  // SSL证书管理
  generateSelfSignedCert(domain: string): Promise<SSLCertificate>;
  installLetsEncrypt(domain: string, email: string): Promise<SSLCertificate>;
  renewCertificate(certId: string): Promise<SSLCertificate>;

  // 端口转发
  configurePortForwarding(rules: PortForwarding[]): Promise<void>;

  // 访问控制
  testAuthentication(username: string, password: string): Promise<boolean>;
}