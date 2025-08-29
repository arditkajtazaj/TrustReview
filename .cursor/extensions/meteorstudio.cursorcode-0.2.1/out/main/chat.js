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
exports.CursorChat = void 0;
const vscode = require("vscode");
const path = require("path");
const axios = require("axios").default;
class CursorChat {
    constructor(_view, accessToken) {
        this._view = _view;
        this.accessToken = accessToken;
        this.url = "https://internal.cursor.sh";
        this.message = "";
        this.msgType = "freeform";
        this.pasteOnClick = true;
        this.keepConversation = true;
        this.draftMessages = [];
        this.prompt = "";
    }
    setPrompt(prompt) {
        var _a;
        this.prompt = prompt;
        (_a = this._view) === null || _a === void 0 ? void 0 : _a.webview.postMessage({
            type: "setPrompt",
            value: prompt,
        });
    }
    setPromptLocal(prompt) {
        this.prompt = prompt;
        // 获取配置项
        const config = vscode.workspace.getConfiguration('cursorcode');
        // 将文本保存到配置项里面
        config.update('prompt', prompt, vscode.ConfigurationTarget.Global);
    }
    /**
     * 获取请求体数据
     * @returns 请求体数据
     */
    getPayload() {
        var _a;
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage("CursorCode：对话前请先打开一个代码文件!");
            return false;
        }
        const selection = editor.selection;
        // Split the `precedingCode` into chunks of 20 line blocks called `precedingCodeBlocks`
        const blockSize = 20;
        let precedingCodeBlocks = [];
        // 获取选中代码的上文代码
        const precedingCode = editor.document.getText(new vscode.Range(new vscode.Position(0, 0), selection.start));
        if (precedingCode) {
            let precedingCodeLines = precedingCode.split("\n");
            for (let i = 0; i < precedingCodeLines.length; i += blockSize) {
                let block = precedingCodeLines.slice(i, i + blockSize);
                precedingCodeBlocks.push(block.join("\n"));
            }
        }
        // Split the `procedingCodeBlocks` into chunks of 20 line blocks called `procedingCodeBlocks`
        let procedingCodeBlocks = [];
        const endLine = editor.document.lineCount - 1;
        const endLineLen = editor.document.lineAt(new vscode.Position(endLine, 0)).text.length;
        // 获取选中代码的下文代码
        const procedingCode = editor === null || editor === void 0 ? void 0 : editor.document.getText(new vscode.Range(selection.end, new vscode.Position(endLine, endLineLen)));
        if (procedingCode) {
            let procedingCodeLines = procedingCode.split("\n");
            for (let i = 0; i < procedingCodeLines.length; i += blockSize) {
                let block = procedingCodeLines.slice(i, i + blockSize);
                procedingCodeBlocks.push(block.join("\n"));
            }
        }
        const filePath = editor.document.fileName;
        const rootPath = path.dirname(filePath);
        const userRequest = {
            // Core request
            message: this.message,
            // Context of the current file
            currentRootPath: rootPath,
            currentFileName: filePath,
            currentFileContents: editor.document.getText(),
            // Context surrounding the cursor position
            precedingCode: precedingCodeBlocks,
            currentSelection: editor.document.getText(selection) == ""
                ? null
                : (_a = editor.document.getText(selection)) !== null && _a !== void 0 ? _a : null,
            suffixCode: procedingCodeBlocks,
            // Get Copilot values
            copilotCodeBlocks: [],
            // Get user defined values
            customCodeBlocks: [],
            codeBlockIdentifiers: [],
            msgType: this.msgType,
            // prompt
            system: this.prompt,
        };
        const userMessages = [
            ...this.draftMessages.filter((um) => um.sender == "user").slice(0, -1),
        ];
        const botMessages = [...this.draftMessages.filter((bm) => bm.sender == "bot")];
        const data = {
            userRequest,
            userMessages: this.msgType === "freeform" ? userMessages : [],
            botMessages: this.msgType === "freeform" ? botMessages : [],
            rootPath: rootPath,
            noStorageMode: false,
        };
        // console.log(data);
        return data;
    }
    conversation() {
        var _a, _b, _c, _d, _e, _f;
        return __awaiter(this, void 0, void 0, function* () {
            const payload = this.getPayload();
            if (!payload) {
                return;
            }
            // focus gpt activity from activity bar
            if (!this._view) {
                yield vscode.commands.executeCommand("cursorcode.chatView.focus");
            }
            else {
                (_b = (_a = this._view) === null || _a === void 0 ? void 0 : _a.show) === null || _b === void 0 ? void 0 : _b.call(_a, true);
            }
            (_c = this._view) === null || _c === void 0 ? void 0 : _c.webview.postMessage({
                type: "addQuestion",
                value: this.message,
                msgType: this.msgType,
                fileName: (_d = vscode.window.activeTextEditor) === null || _d === void 0 ? void 0 : _d.document.fileName,
            });
            // console.log(this.accessToken)
            var reqData = {
                method: "POST",
                url: this.url + "/conversation",
                headers: {
                    "content-type": "application/json",
                    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/0.2.8 Chrome/102.0.5005.167 Electron/19.1.9 Safari/537.36",
                    "authorization": "Bearer " + this.accessToken,
                },
                data: payload,
                responseType: "stream",
            };
            let response;
            try {
                response = yield axios.request(reqData);
                console.log(response);
            }
            catch (e) {
                console.log(e);
                if (e.response.status == 401) {
                    (_e = this._view) === null || _e === void 0 ? void 0 : _e.webview.postMessage({
                        type: "showInput",
                        value: "请先登录后使用",
                    });
                    return;
                }
                // this._view?.webview.postMessage({
                //   type: "showInput",
                //   value: "使用超出上限，请重试，如果还是不行，请稍等几分钟重试...",
                // });
                (_f = this._view) === null || _f === void 0 ? void 0 : _f.webview.postMessage({
                    type: "showInput",
                    value: "出错啦，" + e.response.statusText,
                });
                return;
            }
            const stream = response.data;
            this.streamSource(stream);
        });
    }
    /**
     * 解析stream
     * @param stream 数据流
     */
    streamSource(stream) {
        //解析stream
        let content = "";
        let newContent = "";
        let isInterrupt = false;
        stream.on("data", (data) => {
            var _a, _b, _c;
            data = data.toString();
            // console.log(data);
            const lines = data.split("\n");
            // 在编辑器光标处插入代码
            for (let line of lines) {
                if (line.startsWith("data: ")) {
                    let jsonString = line.slice(6);
                    // console.log(jsonString);
                    if (jsonString == "[DONE]") {
                        jsonString = jsonString.split("<|")[0];
                        // 对话式才计如上下文
                        if (this.msgType == "freeform") {
                            this.manufacturedConversation(this.message, content);
                        }
                        (_a = this._view) === null || _a === void 0 ? void 0 : _a.webview.postMessage({
                            type: "isDone"
                        });
                        return console.log("done");
                    }
                    if (jsonString.indexOf("<|END_interrupt|>") != -1) {
                        jsonString = jsonString.replace("<|END_interrupt|>", "");
                        isInterrupt = true;
                    }
                    try {
                        if (jsonString != '"') {
                            content += JSON.parse(jsonString);
                        }
                        else {
                            continue;
                        }
                    }
                    catch (e) {
                        console.log("出错了", jsonString);
                        (_b = this._view) === null || _b === void 0 ? void 0 : _b.webview.postMessage({
                            type: "showInput",
                            value: "出错啦，请重试...",
                        });
                        return;
                    }
                    const replacePathWithFilename = (text) => {
                        return text.replace(/```\w:.*?\.(\w+)/g, "```$1\n");
                    };
                    const replaceRN = (text) => {
                        return text.replace("\r\n", "\n");
                    };
                    newContent = replacePathWithFilename(replaceRN(content));
                    (_c = this._view) === null || _c === void 0 ? void 0 : _c.webview.postMessage({
                        type: "addAnswer",
                        value: newContent,
                    });
                }
            }
        });
        stream.on("end", () => {
            // if (content.length < 5) {
            //   this._view?.webview.postMessage({
            //     type: "showInput",
            //     value: "出错啦，请重试...",
            //   });
            //   console.error("异常断开");
            //   return;
            // }
            if (isInterrupt) {
                // console.log(newContent)
                // this.continue(newContent);
                return;
            }
        });
        stream.on("error", (err) => {
            var _a;
            (_a = this._view) === null || _a === void 0 ? void 0 : _a.webview.postMessage({
                type: "showInput",
                value: "出错啦，请重试...",
            });
            console.error("异常断开");
            return;
        });
    }
    /**
     * 记录上下文消息
     * @param question 问题
     * @param answer 回答
     */
    manufacturedConversation(question, answer) {
        const newUserMessage = {
            sender: "user",
            sentAt: this.draftMessages.length,
            message: question,
        };
        this.draftMessages.push(newUserMessage);
        const newBotMessage = {
            sender: "bot",
            sentAt: this.draftMessages.length,
            message: answer,
        };
        this.draftMessages.push(newBotMessage);
    }
}
exports.CursorChat = CursorChat;
//# sourceMappingURL=chat.js.map