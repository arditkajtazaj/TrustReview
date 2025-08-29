"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeftPanelWebview = void 0;
const vscode_1 = require("vscode");
const getUri_1 = require("../utilities/getUri");
const getNonce_1 = require("../utilities/getNonce");
const chat_1 = require("../main/chat");
const auth_1 = require("../main/auth");
class LeftPanelWebview {
    constructor(extensionPath, data, _view = null) {
        this.extensionPath = extensionPath;
        this.data = data;
        this._view = _view;
        this.onDidChangeTreeData = new vscode_1.EventEmitter();
    }
    refresh(context) {
        var _a;
        this.onDidChangeTreeData.fire(null);
        this._view.webview.html = this._getWebviewContent((_a = this._view) === null || _a === void 0 ? void 0 : _a.webview, this.extensionPath);
    }
    //called when a view first becomes visible
    resolveWebviewView(webviewView) {
        // 获取配置项
        const config = vscode_1.workspace.getConfiguration("cursorcode");
        // 获取配置项中的文本
        const cursorToken = config.get("accessToken");
        const prompt = config.get("prompt");
        // 显示文本
        console.log(cursorToken);
        this._chatService = new chat_1.CursorChat(webviewView, cursorToken);
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionPath],
        };
        webviewView.webview.html = this._getWebviewContent(webviewView.webview, this.extensionPath);
        this._view = webviewView;
        this.activateMessageListener();
        if (prompt) {
            this._chatService.setPrompt(prompt);
        }
        else {
            this._chatService.setPrompt("用中文回答并且使用猫娘语气进行回答");
        }
    }
    activateMessageListener() {
        this._view.webview.onDidReceiveMessage((data) => {
            switch (data.action) {
                case "hello":
                    vscode_1.window.showWarningMessage(data.message);
                    break;
                case "conversation": {
                    this._chatService.msgType = "freeform";
                    this._chatService.message = data.message;
                    this._chatService.conversation();
                    break;
                }
                case "setPrompt": {
                    this._chatService.setPromptLocal(data.message);
                    break;
                }
                case "loginCursor": {
                    console.log(data.message);
                    if (data.message) {
                        this.loginCursor(data.message);
                    }
                    else {
                        this.loginCursor2();
                    }
                    break;
                }
                case "resetChat": {
                    this._chatService.draftMessages = [];
                    break;
                }
                default:
                    break;
            }
        });
    }
    loginCursor({ email, password }) {
        return __awaiter(this, void 0, void 0, function* () {
            const cursorAuth = new auth_1.CursorAuth();
            const data = yield cursorAuth.loginCursor(email, password);
            console.log(data);
            if (data) {
                this._chatService.accessToken = data.accessToken;
                // 获取配置项
                const config = vscode_1.workspace.getConfiguration('cursorcode');
                // 将文本保存到配置项里面
                config.update('accessToken', data.accessToken, vscode_1.ConfigurationTarget.Global);
                vscode_1.window.showInformationMessage("登录Cursor成功");
            }
        });
    }
    loginCursor2() {
        return __awaiter(this, void 0, void 0, function* () {
            const cursorAuth = new auth_1.CursorAuth();
            const data = yield cursorAuth.loginCursor2();
            console.log(data);
            if (data) {
                this._chatService.accessToken = data.accessToken;
                // 获取配置项
                const config = vscode_1.workspace.getConfiguration('cursorcode');
                // 将文本保存到配置项里面
                config.update('accessToken', data.accessToken, vscode_1.ConfigurationTarget.Global);
                vscode_1.window.showInformationMessage("登录Cursor成功");
            }
        });
    }
    _getWebviewContent(webview, extensionUri) {
        // The CSS file from the React build output
        const stylesUri = (0, getUri_1.getUri)(webview, extensionUri, [
            "webview-ui",
            "build",
            "static",
            "css",
            "main.css",
        ]);
        // The JS file from the React build output
        const scriptUri = (0, getUri_1.getUri)(webview, extensionUri, [
            "webview-ui",
            "build",
            "static",
            "js",
            "main.js",
        ]);
        // icon
        const codiconsUri = (0, getUri_1.getUri)(webview, extensionUri, ['node_modules', '@vscode/codicons', 'dist', 'codicon.css']);
        const nonce = (0, getNonce_1.getNonce)();
        //<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
        // Tip: Install the es6-string-html VS Code extension to enable code highlighting below
        return /*html*/ `
		  <!DOCTYPE html>
		  <html lang="en">
			<head>
			  <meta charset="utf-8">
			  <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
			  <meta name="theme-color" content="#000000">
			  
			  <link rel="stylesheet" type="text/css" href="${stylesUri}">
        <link rel="stylesheet" type="text/css" href="${codiconsUri}">
			  <title>Hello World</title>
			</head>
			<body>
			  <noscript>You need to enable JavaScript to run this app.</noscript>
			  <div id="root"></div>
			  <script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
		  </html>
		`;
    }
}
exports.LeftPanelWebview = LeftPanelWebview;
//# sourceMappingURL=left-webview-provider.js.map