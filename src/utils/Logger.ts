/**
 * 日志工具类
 *
 * 提供不同级别的日志输出，支持生产环境过滤。
 *
 * @module utils/Logger
 */

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

/**
 * 日志工具类
 */
export class Logger {
  /** 当前日志级别 */
  private static level: LogLevel = this.getLogLevel()

  /**
   * 获取日志级别
   *
   * @private
   */
  private static getLogLevel(): LogLevel {
    if (import.meta.env.PROD) {
      return LogLevel.INFO
    }
    return LogLevel.DEBUG
  }

  /**
   * 设置日志级别
   *
   * @param level - 日志级别
   */
  static setLevel(level: LogLevel): void {
    this.level = level
  }

  /**
   * 输出调试日志
   *
   * @param args - 日志参数
   */
  static debug(...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.log('[DEBUG]', ...args)
    }
  }

  /**
   * 输出信息日志
   *
   * @param args - 日志参数
   */
  static info(...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log('[INFO]', ...args)
    }
  }

  /**
   * 输出警告日志
   *
   * @param args - 日志参数
   */
  static warn(...args: any[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn('[WARN]', ...args)
    }
  }

  /**
   * 输出错误日志
   *
   * @param args - 日志参数
   */
  static error(...args: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error('[ERROR]', ...args)
    }
  }
}