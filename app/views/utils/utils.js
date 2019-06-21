import {
  message,
} from 'antd';

import marked from './marked/marked';


const renderer = new marked.Renderer();
renderer.listitem = function (text) {
  if (/^\s*<input class="task-list-item-checkbox"/.test(text)) {
    return `<li class="task-list-li">${text}</li>`;
  }
  return `<li>${text}</li>`;
};

renderer.checkbox = function (checked) {
  return `<input class="task-list-item-checkbox" ${checked ? 'checked ' : ''}disabled type="checkbox" /> `;
};
renderer.code = function (code, language) {
  if (language === 'mermaid') {
    return `<div class="mermaid">${code}</div>`;
  }
  return `<pre><code class="language-${language}">${code}</code></pre>`;
};
marked.setOptions({
  renderer,
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  smartLists: true,
  smartypants: false,
  highlight: (code) => {
    const value = require('./highlight.min.js').highlightAuto(code).value;
    return value;
  },
});

function formatNumber(number) {
  if (number < 10) {
    return `0${number}`;
  }
  return `${number}`;
}


export function formatDate(date, type = 'normal') {
  const newDate = new Date(date);
  const year = newDate.getFullYear();
  const month = formatNumber(newDate.getMonth() + 1);
  const day = formatNumber(newDate.getDate());
  const hour = formatNumber(newDate.getHours());
  const minutes = formatNumber(newDate.getMinutes());
  const seconds = formatNumber(newDate.getSeconds());
  if (type === 'normal') {
    return `${year}-${month}-${day}  ${hour}:${minutes}:${seconds}`;
  }
  return `${year}${month}${day}${hour}${minutes}${seconds}`;
}

/**
 * @param 将组件state存放至localStroge中
 * @param {String} componentName - 组件displayName
 * @param {Object} state - 组件state
 */
export function pushStateToStorage(componentName, state) {
  // const data = JSON.stringify(state);
  window.localStorage.setItem(componentName, JSON.stringify(state));
}

/**
 * @description 从localStorage中读取组件state与初始state合并
 * @param {String} componentName - 组件displayName
 * @param {Object} initState - 组件初始state
 */
export function mergeStateFromStorage(componentName, initState) {
  const str = window.localStorage.getItem(componentName);
  let obj;
  if (str) {
    obj = JSON.parse(str);
  } else {
    obj = {};
  }
  return Object.assign({}, initState, obj);
}

function formatVersion(string) {
  const version = string.replace(/\.|v|-beta/ig, '');
  return parseInt(version, 10);
}

/**
 * @desc 比较本地版本号与线上最新版本号
 * @param {String} localVersion 本地版本
 * @param {String} latestVersion 线上版本
 *
 * @return {Boolean} flag 是否需要更新
 */
export function compareVersion(localVersion, latestVersion) {
  if (localVersion === latestVersion) { // 不需要更新
    return false;
  }
  let localBeta = false;
  let latestBeta = false;
  if (/-beta/ig.test(localVersion)) {
    localBeta = true;
  }
  if (/-beta/ig.test(latestVersion)) {
    latestBeta = true;
  }
  const localFormatVersion = formatVersion(localVersion);
  const latestFormatVersion = formatVersion(latestVersion);
  if (localFormatVersion === latestFormatVersion && localBeta && !latestBeta) { // 本地是测试版本
    return true;
  }
  if (localFormatVersion === latestFormatVersion && !localBeta && latestBeta) { // 线上是测试版本
    return false;
  }
  if (localFormatVersion >= latestFormatVersion) {
    return false;
  }
  if (localFormatVersion < latestFormatVersion) {
    return true;
  }
  return false;
}

/**
 * @desc markdown to html
 *
 * @export
 * @param {String} string markdown内容
 * @returns html
 */
export function markedToHtml(string) {
  return marked(string);
}

/**
 * @desc 函数节流 返回函数连续调用时，fun 执行频率限定为 次/wait
 *
 * @param {Function} func 需要执行的函数
 * @param {Number} wait 执行间隔，单位是毫秒（ms），默认100
 *
 * @return {Function} 返回一个“节流”函数
 */
export function throttle(func, wait = 100) {
  let timer = null;

  return function (...args) { // 闭包
    const context = this;
    const currentArgs = args;

    if (!timer) {
      timer = setTimeout(() => {
        clearTimeout(timer);
        timer = null;
        func.apply(context, currentArgs);
      }, wait);
    }
  };
}

/**
 * @desc 函数防抖
 * @param {Function} fn 需要执行的函数
 * @param {Number} delay 执行间隔，单位是毫秒（ms），默认100
 *
 * @return {Function}
 */
export function debounce(fn, delay = 100) {
  let timer;
  return function (...args) {
    const context = this;
    const currentArgs = args;
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(context, currentArgs);
    }, delay);
  };
}

/**
 * @desc 获取组件displayName
 * @param {React.Component} WrappedComponent React组件
 */
export function getDisplayName(WrappedComponent) {
  return WrappedComponent.displayName ||
        WrappedComponent.name ||
        'Component';
}

/**
 * @description 获取预览插入js路径
 */
export function getWebviewPreJSPath() {
  if (process.env.NODE_ENV === 'development') {
    return '../webview/webview-pre.js';
  }
  return './webview/webview-pre.js';
}
/**
 * @description 获取mermaid插入js路径
 */
export function getMermaidJSPath() {
  if (process.env.NODE_ENV === 'development') {
    return '../webview/mermaid/mermaid.js';
  }
  return '../webview/mermaid/mermaid.js';
}
/**
 * @description blob to base64
 */
export function blobToBase64(blob) {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = () => {
      const dataUrl = reader.result;
      resolve(dataUrl);
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * 检查文件名称合法性
 *
 * @export
 * @param {string} name
 */
export function checkFileName(name) {
  return /[，,“”‘’：/]+/ig.test(name);
}

/**
 * 检查字符串长度（100），以及是否有特殊字符
 * @export
 * @param {String} str 字符串
 * @param {Boolean} showMessage 是否现实提示
 */
export function checkSpecial(str, showMessage = true) {
  if (/[，：:/]/g.test(str)) {
    if (showMessage) {
      message.error('Name does not allow special characters');
    }
    return false;
  }
  if (str.length > 100) {
    if (showMessage) {
      message.error('Name is within 100 characters');
    }
    return false;
  }
  return true;
}

/**
 * 根据Markdown内容生成TOC
 *
 * @param {String} str
 */
export function markedTOC(str) {
  const tokens = marked.lexer(str);
  const headers = tokens.filter(token => token.type === 'heading');
  return headers;
}

/**
 * inject value to Object
 * @param {any} target inject target
 * @param {Array} arr props name array
 * @param {any} value value
 */
export function objectInject(target, arr, value) {
  const res = target;
  if (arr.length === 1) {
    res[arr[0]] = value;
  } else {
    if (!res[arr[0]] || typeof res[arr[0]] !== 'object') {
      res[arr[0]] = {};
    }
    const name = arr.shift();
    res[name] = objectInject(res[name], arr, value);
  }
  return res;
}
