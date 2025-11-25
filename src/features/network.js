/**
 * Network Tools Features
 * 網路工具功能（IP查詢、DNS查詢）
 */

import { sendMessageToTelegramWithContext } from '../telegram/telegram.js';

/**
 * IP 地址查詢指令
 * @param {Object} message - Telegram 訊息對象
 * @param {string} command - 指令名稱
 * @param {string} subcommand - IP 地址
 * @param {Object} context - 上下文對象
 */
export async function commandIpLookup(message, command, subcommand, context) {
  const ipAddress = subcommand.trim();

  if (!ipAddress) {
    return sendMessageToTelegramWithContext(context)('請提供IP地址。用法：/ip <IP地址>');
  }

  const apiKey = '4a2ddcbdcb09b4';
  const url = `https://ipinfo.io/${ipAddress}?token=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      return sendMessageToTelegramWithContext(context)(`錯誤: ${data.error.message}`);
    } else {
      const formattedIpInfo = formatIpInfo(data);
      return sendMessageToTelegramWithContext(context)(formattedIpInfo);
    }
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`ERROR: ${e.message}`);
  }
}

/**
 * 格式化 IP 資訊
 * @param {Object} data - IP 資料
 * @returns {string} 格式化的 IP 資訊
 */
function formatIpInfo(data) {
  return `
  IP地址: ${data.ip}
  主機名: ${data.hostname || 'N/A'}
  城市: ${data.city || 'N/A'}
  地區: ${data.region || 'N/A'}
  國家: ${data.country || 'N/A'}
  位置: ${data.loc || 'N/A'}
  組織: ${data.org || 'N/A'}
  時區: ${data.timezone || 'N/A'}
  `;
}

/**
 * DNS 查詢指令（使用 Cloudflare DNS）
 * @param {Object} message - Telegram 訊息對象
 * @param {string} command - 指令名稱
 * @param {string} subcommand - 域名
 * @param {Object} context - 上下文對象
 */
export async function commandDnsLookup(message, command, subcommand, context) {
  const domainName = subcommand.trim();

  if (!domainName) {
    return sendMessageToTelegramWithContext(context)('請提供域名。用法：/dns <域名>');
  }

  const url = `https://1.1.1.1/dns-query?name=${domainName}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/dns-json'
      }
    });

    const data = await response.json();

    if (data.Status !== 0) {
      return sendMessageToTelegramWithContext(context)(`錯誤: DNS 查詢失敗，狀態碼 ${data.Status}`);
    } else {
      const formattedDnsInfo = formatDnsInfo(data);
      return sendMessageToTelegramWithContext(context)(formattedDnsInfo);
    }
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`ERROR: ${e.message}`);
  }
}

/**
 * 格式化 DNS 資訊
 * @param {Object} data - DNS 資料
 * @returns {string} 格式化的 DNS 資訊
 */
function formatDnsInfo(data) {
  const answers = data.Answer.map(answer => `${answer.name} -> ${answer.data}`).join('\n');
  return `
  查詢域名: ${data.Question[0].name}
  回應:
  ${answers}
  `;
}

/**
 * DNS 查詢指令2（使用 Netlify DNS API）
 * @param {Object} message - Telegram 訊息對象
 * @param {string} command - 指令名稱
 * @param {string} subcommand - 域名
 * @param {Object} context - 上下文對象
 */
export async function commandDnsLookup2(message, command, subcommand, context) {
  const domainName = subcommand.trim();

  if (!domainName) {
    return sendMessageToTelegramWithContext(context)('請提供域名。用法：/dns2 <域名>');
  }

  const apiKey = 'V_VX8n56j8XvMKGZJxXJU3tHZqjRl9QiPWUIvnPI';
  const url = `https://api.netlify.com/api/v1/dns_zones?access_token=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    const zone = data.find(z => z.name === domainName);
    if (!zone) {
      return sendMessageToTelegramWithContext(context)(`未找到域名 ${domainName} 的 DNS 記錄。`);
    }

    const recordsUrl = `https://api.netlify.com/api/v1/dns_zones/${zone.id}/dns_records?access_token=${apiKey}`;
    const recordsResponse = await fetch(recordsUrl);
    const records = await recordsResponse.json();

    const formattedDnsRecords = formatDnsRecords(records);
    return sendMessageToTelegramWithContext(context)(formattedDnsRecords);
  } catch (e) {
    return sendMessageToTelegramWithContext(context)(`ERROR: ${e.message}`);
  }
}

/**
 * 格式化 DNS 記錄
 * @param {Array} records - DNS 記錄陣列
 * @returns {string} 格式化的 DNS 記錄
 */
function formatDnsRecords(records) {
  const formattedRecords = records.map(record => {
    return `類型: ${record.type}, 主機: ${record.hostname}, 值: ${record.value}, TTL: ${record.ttl}`;
  }).join('\n');

  return `
  DNS 記錄:
  ${formattedRecords}
  `;
}
