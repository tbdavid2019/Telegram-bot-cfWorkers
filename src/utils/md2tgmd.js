/**
 * Markdown 轉 Telegram Markdown 格式
 */

const escapeChars = /([\_\*\[\]\(\)\\\~\`\>\#\+\-\=\|\{\}\.\!])/g;

export function escape(text) {
  const lines = text.split("\n");
  const stack = [];
  const result = [];
  let linetrim = "";
  
  for (const [i, line] of lines.entries()) {
    linetrim = line.trim();
    let startIndex;
    
    if (/^```.+/.test(linetrim)) {
      stack.push(i);
    } else if (linetrim === "```") {
      if (stack.length) {
        startIndex = stack.pop();
        if (!stack.length) {
          const content = lines.slice(startIndex, i + 1).join("\n");
          result.push(handleEscape(content, "code"));
          continue;
        }
      } else {
        stack.push(i);
      }
    }
    
    if (!stack.length) {
      result.push(handleEscape(line));
    }
  }
  
  if (stack.length) {
    const last = lines.slice(stack[0]).join("\n") + "\n```";
    result.push(handleEscape(last, "code"));
  }
  
  return result.join("\n");
}

function handleEscape(text, type = "text") {
  if (!text.trim()) {
    return text;
  }
  
  if (type === "text") {
    text = text.replace(escapeChars, "\\$1")
      .replace(/\\\*\\\*(.*?[^\\])\\\*\\\*/g, "*$1*")
      .replace(/\\_\\_(.*?[^\\])\\_\\_/g, "__$1__")
      .replace(/\\_(.*?[^\\])\\_/g, "_$1_")
      .replace(/\\~(.*?[^\\])\\~/g, "~$1~")
      .replace(/\\\|\\\|(.*?[^\\])\\\|\\\|/g, "||$1||")
      .replace(/\\\[([^\]]+?)\\\]\\\((.+?)\\\)/g, "[$1]($2)")
      .replace(/\\\`(.*?[^\\])\\\`/g, "`$1`")
      .replace(/\\\\\\([\_\*\[\]\(\)\\\~\`\>\#\+\-\=\|\{\}\.\!])/g, "\\$1")
      .replace(/^(\s*)\\(>.+\s*)$/gm, "$1$2")
      .replace(/^(\s*)\\-\s*(.+)$/gm, "$1• $2")
      .replace(/^((\\#){1,3}\s)(.+)/gm, "$1*$3*");
  } else {
    const codeBlank = text.length - text.trimStart().length;
    if (codeBlank > 0) {
      const blankReg = new RegExp(`^\\s{${codeBlank}}`, "gm");
      text = text.replace(blankReg, "");
    }
    text = text.trimEnd()
      .replace(/([\\\`])/g, "\\$1")
      .replace(/^\\`\\`\\`([\s\S]+)\\`\\`\\`$/g, "```$1```");
  }
  
  return text;
}
