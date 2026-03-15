/**
 * 日志级别枚举
 */
export enum LogLevel {
  /** 调试信息 */
  DEBUG = 0,
  /** 一般信息 */
  INFO = 1,
  /** 警告信息 */
  WARN = 2,
  /** 错误信息 */
  ERROR = 3,
  /** 完全静默 */
  NONE = 4
}

/**
 * 日志管理器
 *
 * 根据环境自动调整日志级别，提供统一的日志接口。
 */
export class Logger {
  private static currentLevel: LogLevel

  /**
   * 初始化日志管理器
   *
   * 开发环境：显示所有日志（DEBUG 及以上）
   * 生产环境：只显示错误（ERROR 及以上）
   */
  static initialize(): void {
    if (process.env.NODE_ENV === 'production') {
      this.currentLevel = LogLevel.ERROR
    } else {
      this.currentLevel = LogLevel.DEBUG
    }
  }

  /**
   * 设置日志级别
   *
   * @param level - 日志级别
   */
  static setLevel(level: LogLevel): void {
    this.currentLevel = level
  }

  /**
   * 获取当前日志级别
   *
   * @returns 当前日志级别
   */
  static getLevel(): LogLevel {
    return this.currentLevel
  }

  /**
   * 输出调试信息
   *
   * @param args - 要输出的参数
   */
  static debug(...args: any[]): void {
    if (this.currentLevel <= LogLevel.DEBUG) {
      console.log('[DEBUG]', ...args)
    }
  }

  /**
   * 输出一般信息
   *
   * @param args - 要输出的参数
   */
  static info(...args: any[]): void {
    if (this.currentLevel <= LogLevel.INFO) {
      console.log('[INFO]', ...args)
    }
  }

  /**
   * 输出警告信息
   *
   * @param args - 要输出的参数
   */
  static warn(...args: any[]): void {
    if (this.currentLevel <= LogLevel.WARN) {
      console.warn('[WARN]', ...args)
    }
  }

  /**
   * 输出错误信息
   *
   * @param args - 要输出的参数
   */
  static error(...args: any[]): void {
    if (this.currentLevel <= LogLevel.ERROR) {
      console.error('[ERROR]', ...args)
    }
  }

  /**
   * 创建带前缀的日志器
   *
   * @param prefix - 日志前缀
   * @returns 带前缀的日志器对象
   */
  static withPrefix(prefix: string): {
    debug: (...args: any[]) => void
    info: (...args: any[]) => void
    warn: (...args: any[]) => void
    error: (...args: any[]) => void
  } {
    return {
      debug: (...args: any[]) => this.debug(`[${prefix}]`, ...args),
      info: (...args: any[]) => this.info(`[${prefix}]`, ...args),
      warn: (...args: any[]) => this.warn(`[${prefix}]`, ...args),
      error: (...args: any[]) => this.error(`[${prefix}]`, ...args)
    }
  }
}

// 自动初始化日志管理器
Logger.initialize()