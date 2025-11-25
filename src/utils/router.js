/**
 * Simple Router for Cloudflare Workers
 * 路由器工具
 */

export class Router {
  constructor({ base = '', routes = [], ...other } = {}) {
    this.routes = routes;
    this.base = base;
    Object.assign(this, other);
  }

  /**
   * 解析 URL 查詢參數
   * @private
   * @param {URLSearchParams} searchParams
   * @returns {object}
   */
  parseQueryParams(searchParams) {
    const query = Object.create(null);
    for (const [k, v] of searchParams) {
      query[k] = k in query ? [].concat(query[k], v) : v;
    }
    return query;
  }

  /**
   * 標準化路徑
   * @private
   * @param {string} path
   * @returns {string}
   */
  normalizePath(path) {
    return path.replace(/\/+(\/|$)/g, '$1');
  }

  /**
   * 建立路由正則表達式
   * @private
   * @param {string} path
   * @returns {RegExp}
   */
  createRouteRegex(path) {
    return RegExp(
      `^${path
        .replace(/(\/?\.?):(\w+)\+/g, '($1(?<$2>*))')
        .replace(/(\/?\.?):(\w+)/g, '($1(?<$2>[^$1/]+?))')
        .replace(/\./g, '\\.')
        .replace(/(\/?)\*/g, '($1.*)?')}/*$`
    );
  }

  /**
   * 處理請求
   * @param {Request} request
   * @param  {...any} args
   * @returns {Promise<Response|null>}
   */
  async fetch(request, ...args) {
    const url = new URL(request.url);
    const reqMethod = request.method.toUpperCase();
    request.query = this.parseQueryParams(url.searchParams);
    for (const [method, regex, handlers, path] of this.routes) {
      let match = null;
      if ((method === reqMethod || method === 'ALL') && (match = url.pathname.match(regex))) {
        request.params = match?.groups || {};
        request.route = path;
        for (const handler of handlers) {
          const response = await handler(request.proxy ?? request, ...args);
          if (response != null) return response;
        }
      }
    }
    return null;
  }

  /**
   * 註冊路由
   * @param {string} method
   * @param {string} path
   * @param  {...any} handlers
   * @returns {Router}
   */
  route(method, path, ...handlers) {
    const route = this.normalizePath(this.base + path);
    const regex = this.createRouteRegex(route);
    this.routes.push([method.toUpperCase(), regex, handlers, route]);
    return this;
  }

  /**
   * GET 路由
   * @param {string} path
   * @param  {...any} handlers
   * @returns {Router}
   */
  get(path, ...handlers) {
    return this.route('GET', path, ...handlers);
  }

  /**
   * POST 路由
   * @param {string} path
   * @param  {...any} handlers
   * @returns {Router}
   */
  post(path, ...handlers) {
    return this.route('POST', path, ...handlers);
  }

  /**
   * PUT 路由
   * @param {string} path
   * @param  {...any} handlers
   * @returns {Router}
   */
  put(path, ...handlers) {
    return this.route('PUT', path, ...handlers);
  }

  /**
   * DELETE 路由
   * @param {string} path
   * @param  {...any} handlers
   * @returns {Router}
   */
  delete(path, ...handlers) {
    return this.route('DELETE', path, ...handlers);
  }

  /**
   * PATCH 路由
   * @param {string} path
   * @param  {...any} handlers
   * @returns {Router}
   */
  patch(path, ...handlers) {
    return this.route('PATCH', path, ...handlers);
  }

  /**
   * HEAD 路由
   * @param {string} path
   * @param  {...any} handlers
   * @returns {Router}
   */
  head(path, ...handlers) {
    return this.route('HEAD', path, ...handlers);
  }

  /**
   * OPTIONS 路由
   * @param {string} path
   * @param  {...any} handlers
   * @returns {Router}
   */
  options(path, ...handlers) {
    return this.route('OPTIONS', path, ...handlers);
  }

  /**
   * 所有方法路由
   * @param {string} path
   * @param  {...any} handlers
   * @returns {Router}
   */
  all(path, ...handlers) {
    return this.route('ALL', path, ...handlers);
  }
}
