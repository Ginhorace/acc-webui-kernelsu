// KernelSU API 类型声明
declare const ksu: {
  exec: (command: string, callback: string) => void;
};

// 全局 Window 扩展
interface ACCConfig {
  accPath?: string;
}

declare global {
  interface Window {
    ACC: ACCConfig;
    [key: string]: unknown;
  }
}

export {};
