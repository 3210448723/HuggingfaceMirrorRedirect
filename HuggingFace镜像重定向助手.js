// ==UserScript==
// @name         HuggingFace 镜像重定向助手
// @namespace    https://github.com/3210448723
// @version      1.0
// @description  中国大陆地区HuggingFace镜像加速解决方案：加速访问 `HuggingFace.co` 资源，自动重定向至国内镜像，支持自定义镜像源、白名单、内容替换等，助你畅享AI模型下载。
// @author       YJM
// @match        *://huggingface.co/*
// @match        *://hf-mirror.com/*
// @match        *://*/*
// @require      https://cdn.bootcdn.net/ajax/libs/jquery/1.12.4/jquery.min.js
// @require      https://cdn.bootcdn.net/ajax/libs/toastr.js/2.1.4/toastr.min.js
// @resource     CSS https://cdn.bootcdn.net/ajax/libs/toastr.js/2.1.4/toastr.min.css
// @grant        unsafeWindow
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @license MIT
// ==/UserScript==

(function () {
    'use strict';

    // toastr
    GM_addStyle(GM_getResourceText("CSS")); // 添加toastr的样式

    toastr.options = {
        "closeButton": true,// 是否显示关闭按钮
        "progressBar": true,// 是否显示进度条
        "positionClass": "toast-top-right",// 弹出窗的位置
        "showDuration": "1000",// 显示的动画时间
        "hideDuration": "1000",// 消失的动画时间
        "timeOut": "5000",// 弹窗展现时间
        "showEasing": "swing",//显示时的动画缓冲方式
        "hideEasing": "linear",//消失时的动画缓冲方式
        "showMethod": "fadeIn",//显示时的动画方式
        "hideMethod": "fadeOut", //消失时的动画方式
        "allowHtml": true,// 允许弹窗内容包含 HTML 语言
    };
    // toastr

    let panel = null; // 面板对象

    // 出厂设置
    const DEFAULT_CONFIG = {
        mirror: 'hf-mirror.com', // 镜像站（不要带协议）
        regex_rule: /(?<!\.)\bhuggingface\.co\b/i.source, // 匹配规则（正则表达式）（字符串）
        enableAutoRedirect: true, // 是否启用重定向
        enableReplace: true, // 是否启用替换
        enableHealthCheck: true, // 是否启用自动健康检查

        excludedSubdomains: ['lfs.huggingface.co', 'cdn-thumbnails.huggingface.co', 'datasets-server.huggingface.co', 'cdn-avatars.huggingface.co'], // 排除的子域名
    };
    let CONFIG = {};

    // 保存配置到 localStorage
    const saveConfig = () => {
        const regex_rule_t = CONFIG.regex_rule; // 保存正则表达式
        // 如果是正则表达式
        if (CONFIG.regex_rule instanceof RegExp) {
            CONFIG.regex_rule = CONFIG.regex_rule.source;
        } // 将正则表达式转换为字符串，忽略正则表达式的修饰符CONFIG.regex_rule.flags
        GM_setValue('hfMirrorConfig', JSON.stringify(CONFIG));
        CONFIG.regex_rule = regex_rule_t; // 还原正则表达式
    };

    // 加载配置
    const loadConfig = () => {
        const savedConfig = GM_getValue('hfMirrorConfig');
        // 替换现有配置
        if (savedConfig) {
            const savedConfigObj = JSON.parse(savedConfig);
            for (const key in savedConfigObj) {
                CONFIG[key] = savedConfigObj[key];
            }
        } else {
            // 自定义配置
            CONFIG = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
        }
        CONFIG.regex_rule = new RegExp(CONFIG.regex_rule, 'i'); // 将字符串转换为正则表达式
    };

    // 日志功能
    const log = (message) => {
        // 显示通知
        toastr.info(message, "HuggingFace 镜像助手");
    };

    // 镜像站健康检查（第一次加载时检查；面板中提供手动检查按钮）
    // 用GM_xmlhttpRequest解决跨域问题
    const checkMirrorHealth = async (ret_stat = false) => {
        let online = false;
        await new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "HEAD",
                url: 'https://'.concat(CONFIG.mirror),
                timeout: 5000,
                onload: function (response) {
                    if (response.status === 200) {
                        online = true;
                    }
                    resolve();
                },
                onerror: function (response) {
                    resolve(); // 不管请求成功还是失败，都会执行resolve()，以便继续执行下面的代码
                }
            });
        });
        if (ret_stat) {
            return online;
        }
        if (online) {
            console.info(`镜像网站${CONFIG.mirror}在线`)
        } else {
            console.error(`镜像网站${CONFIG.mirror}不在线`)
        }
    }

    // 替换 URL
    const replaceURL = (url) => {
        return url.replace(CONFIG.regex_rule, CONFIG.mirror);
    };

    // 切换面板可见性
    const togglePanelVisibility = () => {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }

    // 创建插件控制面板
    const createInputPanel = () => {
        panel = document.createElement('div');
        panel.id = 'hf-mirror-panel'; // 设置面板的 id 属性

        // 设置面板的样式：白色背景，黑色边框，10px 内边距，合适位置置顶并水平居中，阴影
        // 设置按钮的样式：浅灰色背景，灰色边框，5px 圆角，5px 内边距，手型光标
        const panel_style = `
        #hf-mirror-panel {
            all: initial; /* 重置所有样式 */
            background: #189fd8;
            border: 1px solid black;
            padding: 5px;
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 600px;
            z-index: 9999;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
        }
        .hf-btn {
            all: initial; /* 重置所有样式 */
            background: #f0f0f0;
            border: 1px solid #ccc;
            border-radius: 5px;
            padding: 5px 10px;
            cursor: pointer;
        }
        `;
        GM_addStyle(panel_style); // 添加面板样式
        panel.style.display = 'none'; // 默认隐藏面板

        // 添加面板内容
        // 面板框架
        let structure = `
                <h4 align="center">HuggingFace 镜像代理</h4>
                <div style="padding: 0 5px 5px;">
                    <!--显示栏目-->
                    <div>
                        <button class="hf-btn" id="hf-func">功能</button>
                        <button class="hf-btn" id="hf-config">设置</button>
                        <button class="hf-btn" id="hf-toggleUserPanelBtn">隐藏面板</button>
                    </div>
                    <div id="hf-content"></div>
                </div>
            `;
        // 面板功能栏（默认）：替换的url输入框
        let func_page = `
                <div>
                    <button class="hf-btn" id="hf-checkMirrorBtn">手动检查镜像源</button>
                </div>
                <div>
                    <span>将HF URL替换为镜像站：</span><input type="text" id="hf-urlInput" style="width: 200px" placeholder="请输入网页链接">
                    <button class="hf-btn" id="hf-replaceBtn" style="margin-left: 10px">替换</button>
                </div>
        `;

        // 面板设置栏
        let config_page = `
                <div>
                    <button class="hf-btn" id="hf-toggleAutoRedirectBtn">切换自动重定向</button>
                    <button class="hf-btn" id="hf-toggleContentReplacementBtn">切换内容替换</button>
                    <button class="hf-btn" id="hf-toggleHealthCheckBtn">切换健康检查</button>
                    <button class="hf-btn" id="hf-resetConfig">恢复默认设置</button>
                </div>
                <div>
                    <span>请输入新的镜像站（不要带协议）：</span><input id="hf-mirror" type="text" style="width: 200px" placeholder="请输入镜像站" value="${CONFIG.mirror}">
                    <button class="hf-btn" id="hf-setMirror" style="margin-left: 10px">确定</button>
                </div>
                <div>
                    <span>请输入新的正则表达式规则：</span><input id="hf-regex" type="text" style="width: 200px" placeholder="请输入正则表达式规则" value="${CONFIG.regex_rule.source}"><span>i（自动添加）</span>
                    <button class="hf-btn" id="hf-setRegex" style="margin-left: 10px">确定</button>
                </div>
                <div>
                    <span>要排除的域名列表（每行一个）：</span><button class="hf-btn" id="hf-setExcludedSubdomains" style="margin-left: 10px">确定</button>
                    <textarea id="hf-excludedSubdomains" rows="${CONFIG.excludedSubdomains.length}" cols="50" placeholder="请输入排除的域名列表">${CONFIG.excludedSubdomains.join('\n')}</textarea>
                </div>
        `;

        // 添加面板内容
        panel.innerHTML = structure;

        // 定义函数
        // 功能栏
        function checkMirrorBtn() {
            let online = checkMirrorHealth(true);
            if (online) {
                log(`镜像网站${CONFIG.mirror}在线`);
            } else {
                log(`镜像网站${CONFIG.mirror}不在线`);
            }
        }

        function replaceBtn() {
            // 获取输入框对象
            const input = document.getElementById('hf-urlInput');
            // 获取输入框的值
            const url = input.value;
            // 替换 URL
            const replacedUrl = replaceURL(url);
            // 将替换后的 URL 显示在输入框中
            input.value = replacedUrl;
            // 复制替换后的 URL 到剪贴板
            GM_setClipboard(replacedUrl);
            log('修改成代理 URL 的huggingface链接已复制到剪贴板！');
        }

        // 设置栏
        function toggleAutoRedirectBtn() {
            CONFIG.enableAutoRedirect = !CONFIG.enableAutoRedirect;
            saveConfig();
            log(`自动重定向已${CONFIG.enableAutoRedirect ? '启用' : '禁用'}`);
        }

        function toggleContentReplacementBtn() {
            CONFIG.enableReplace = !CONFIG.enableReplace;
            saveConfig();
            log(`已${CONFIG.enableReplace ? '启用' : '禁用'}内容替换`);
        }

        function toggleHealthCheckBtn() {
            CONFIG.enableHealthCheck = !CONFIG.enableHealthCheck;
            saveConfig();
            log(`已${CONFIG.enableHealthCheck ? '启用' : '禁用'}健康检查`);
        }

        function resetConfig() {
            CONFIG = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
            // 此时 CONFIG.regex_rule 是字符串，需要转换为正则表达式
            saveConfig();
            log('配置已重置');
        }

        function setMirror() {
            const input = document.getElementById('hf-mirror');
            CONFIG.mirror = input.value;
            saveConfig();
            log('镜像站已更新');
        }

        function setRegex() {
            const input = document.getElementById('hf-regex');
            CONFIG.regex_rule = new RegExp(input.value, 'gi');
            saveConfig();
            log('正则表达式规则已更新');
        }

        function setExcludedSubdomains() {
            const input = document.getElementById('hf-excludedSubdomains');
            CONFIG.excludedSubdomains = input.value.split('\n').filter(Boolean); // 过滤空字符串
            saveConfig();
            log('排除的域名列表已更新');
        }

        document.body.appendChild(panel);
        // 点击页面其他地方关闭面板
        document.addEventListener('click', (event) => {
            if (!panel.contains(event.target) && event.target.id !== 'hf-toggleUserPanelBtn') {
                panel.style.display = 'none';
            }
        });

        // 添加事件监听
        // 面板框架
        document.getElementById('hf-toggleUserPanelBtn').addEventListener('click', togglePanelVisibility);
        document.getElementById('hf-func').addEventListener('click', showFunc);
        document.getElementById('hf-config').addEventListener('click', showConfig);

        function showFunc() {
            document.getElementById('hf-content').innerHTML = func_page;
            document.getElementById('hf-checkMirrorBtn').addEventListener('click', checkMirrorBtn);
            document.getElementById('hf-replaceBtn').addEventListener('click', replaceBtn);
        }

        showFunc(); // 默认显示功能栏
        function showConfig() {
            document.getElementById('hf-content').innerHTML = config_page;
            document.getElementById('hf-toggleAutoRedirectBtn').addEventListener('click', toggleAutoRedirectBtn);
            document.getElementById('hf-toggleContentReplacementBtn').addEventListener('click', toggleContentReplacementBtn);
            document.getElementById('hf-toggleHealthCheckBtn').addEventListener('click', toggleHealthCheckBtn);
            document.getElementById('hf-resetConfig').addEventListener('click', resetConfig);
            document.getElementById('hf-setMirror').addEventListener('click', setMirror);
            document.getElementById('hf-setRegex').addEventListener('click', setRegex);
            document.getElementById('hf-setExcludedSubdomains').addEventListener('click', setExcludedSubdomains);

        }
    };

    // 页面重定向
    const redirect = () => {
        if (window.location.hostname === 'huggingface.co') {
            log('重定向huggingface.co到镜像网站：' + CONFIG.mirror)
            window.location.hostname = CONFIG.mirror;
        }
    };

    // 页面内容替换（要求不要替换页面中显示的`huggingface.co`，只替换超链接）// 遍历节点进行替换（文本节点和元素属性）
    function walk(node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
            if (["SCRIPT", "STYLE", "TEXTAREA", "INPUT"].includes(node.tagName)) return;
            // todo 其他属性也要替换？
            for (let attr of ["href", "src", "data-src", "action"]) {
                if (node.hasAttribute(attr)) {
                    let oldValue = node.getAttribute(attr);
                    let newValue = replaceURL(oldValue);
                    if (oldValue !== newValue) node.setAttribute(attr, newValue);
                }
            }
        }
    }

    // 替换初始页面中的超链接和资源路径
    function fastReplace() {
        // todo 其他属性也要替换？
        document.querySelectorAll("[href], [src], [data-src], [action]").forEach(node => {
            walk(node);
        });
    }

    // 初始化
    loadConfig();
    // 排除白名单
    if (CONFIG.excludedSubdomains.includes(window.location.hostname)) return;
    createInputPanel();

    // 注册一个菜单项
    GM_registerMenuCommand("打开设置", togglePanelVisibility, "s"); // "s" 表示快捷键

    if (CONFIG.enableAutoRedirect) redirect();
    if (CONFIG.enableReplace) {
        // 初次替换整个页面内容
        fastReplace();
        // 观察 DOM 动态变化，自动替换新加入的节点
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) walk(node);
                });
            });
        });
        observer.observe(document, {childList: true, subtree: true});
    }
    if (CONFIG.enableHealthCheck) checkMirrorHealth();
})();

// todo hf-mirror.com中点击Copy download link按钮依然是huggingface.co的链接
/**
 * 提示词：
 * 使用中文回答
 * 由于`huggingface.co`在中国大陆境内的网络问题，我想写一个暴力猴脚本，利用`huggingface.co`的国内镜像代理`hf-mirror.com`
 *
 * 具体功能要求如下：
 * 0. 匹配域名使用正则表达式；代码尽量简洁规范，清晰易懂，稍微复杂的地方需要有详尽注释
 * 1. 将用户浏览器打开的`huggingface.co`相关页面重定向到对应的`hf-mirror.com`
 * 2. 在`hf-mirror.com`的页面中，如果出现了`huggingface.co`（不包括`lfs.huggingface.co`等子域名【这只是举个例子，会有很多种子域名】），将其替换成`hf-mirror.com`
 * 3. 提供一个可视化输入框（不是总是显示，点击一个常驻按钮再展开），实现2. 类似功能，用户粘贴url，面板展示替换后的url并自动粘贴到剪切板中；镜像站健康检查工具栏；面板中另一个栏里提供若干设置
 * 4. 在任何页面中，如果有`huggingface.co`（不包括`lfs.huggingface.co`等子域名）但不直接显示在页面中的（视为超链接，注意不要把页面中显示出来的`huggingface.co`替换了），将超链接替换成`hf-mirror.com`（帮我分析这个功能是否必要？）
 * 5. 支持配置镜像源、域名白名单、对所有功能支持开关配置等（支持持久化配置和导入导出）
 * 6. 为需要的操作提供悬浮在页面上的超时通知，通知内容包括通知类型和操作结果
 * 7. 对页面新增加的节点，也要进行替换
 *
 * 请你帮我：
 * 1. 补充其它有用的功能
 * 2. 完善我提出的功能点，并给出完整代码
 */