/**
 * 簡單的快取管理
 */

export class Cache {
  constructor() {
    this.maxItems = 10;
    this.maxAge = 1000 * 60 * 60; // 1小時
    this.cache = {};
  }

  /**
   * 設定快取
   * @param {string} key 
   * @param {any} value 
   */
  set(key, value) {
    this.trim();
    this.cache[key] = {
      value,
      time: Date.now()
    };
  }

  /**
   * 取得快取
   * @param {string} key 
   * @returns {any}
   */
  get(key) {
    this.trim();
    return this.cache[key]?.value;
  }

  /**
   * 清理過期的快取
   * @private
   */
  trim() {
    let keys = Object.keys(this.cache);
    
    // 清理過期項目
    for (const key of keys) {
      if (Date.now() - this.cache[key].time > this.maxAge) {
        delete this.cache[key];
      }
    }
    
    // 限制最大數量
    keys = Object.keys(this.cache);
    if (keys.length > this.maxItems) {
      keys.sort((a, b) => this.cache[a].time - this.cache[b].time);
      for (let i = 0; i < keys.length - this.maxItems; i++) {
        delete this.cache[keys[i]];
      }
    }
  }
}
