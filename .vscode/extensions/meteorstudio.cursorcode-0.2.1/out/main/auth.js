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
exports.CursorAuth = void 0;
const crypto = require("crypto");
const uuid_1 = require("uuid");
const axios_1 = require("axios");
const nodeUrl = require("url");
const vscode = require("vscode");
// axios.defaults.withCredentials = true;
let _cookiesStorage = {};
// 封装重定向处理
function redirectRequest(url, payload) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // 判断是否有cookie
            if (_cookiesStorage[nodeUrl.parse(url).hostname]) {
                axios_1.default.defaults.headers.cookie = _cookiesStorage[nodeUrl.parse(url).hostname];
            }
            // 判断是否post请求
            if (payload) {
                const { data } = yield axios_1.default.post(url, payload, {
                    maxRedirects: 0, // 禁用重定向
                });
                return data;
            }
            const { data } = yield axios_1.default.get(url, {
                maxRedirects: 0, // 禁用重定向
            });
            return data;
        }
        catch (e) {
            const parsedUrl = nodeUrl.parse(url);
            const { response: { status, headers }, } = e;
            if (status === 302 || status === 308) {
                // 处理重定向请求
                // console.log(axios.defaults.headers.cookie)
                let oldCookies = [];
                if (headers["set-cookie"]) {
                    _cookiesStorage[parsedUrl.hostname] = headers["set-cookie"];
                }
                // axios.defaults.headers.cookie = [...oldCookies,...headers['set-cookie']]; // key要具体配置，一般是set-cookie
                let redirectUrl = headers["location"];
                if (redirectUrl.indexOf("https") == -1) {
                    redirectUrl = parsedUrl.protocol + "//" + parsedUrl.hostname + redirectUrl;
                }
                return yield redirectRequest(redirectUrl, payload);
            }
            throw e;
        }
    });
}
const m = "https://cursor.so", v = "https://api.cursor.sh", w = "KbZUR41cY7W6zRSdpSUJ7I7mLYBKOCmB", s = "cursor.us.auth0.com", a = `${m}/api`, i = `${m}/loginDeepControl`, g = `${m}/pricing?fromControl=true`, c = `${m}/settings`, d = `${v}/auth/poll`;
function base64URLEncode(str) {
    return str.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function sha256(buffer) {
    return crypto.createHash("sha256").update(buffer).digest();
}
class CursorAuth {
    constructor() {
        this.url = "https://cursor.us.auth0.com";
        this.state = "";
        this.LOGINCOOKIES = "";
        this.email = "";
        this.password = "";
    }
    login() {
        return __awaiter(this, void 0, void 0, function* () {
            // 登录账号
            yield this.get_state();
            yield this.sign_in();
        });
    }
    authentication(challenge, uuid) {
        return __awaiter(this, void 0, void 0, function* () {
            // 授权客户端
            let url = `https://www.cursor.so/api/auth/loginDeepControl?challenge=${challenge}&uuid=${uuid}&newbackend=true`;
            const response = yield redirectRequest(url, null);
            if (response.indexOf("You may now proceed back to Cursor") != -1) {
                console.log("授权成功");
                return true;
            }
            console.log(response);
        });
    }
    /**
     * 登录一条龙操作
     * @param email 邮箱
     * @param password 密码
     * @returns 授权数据
     */
    loginCursor(email, password) {
        return __awaiter(this, void 0, void 0, function* () {
            this.email = email;
            this.password = password;
            let uuid = (0, uuid_1.v4)();
            let verifier = base64URLEncode(crypto.randomBytes(32));
            let challenge = base64URLEncode(sha256(Buffer.from(verifier)));
            // 登录
            yield this.login();
            // 授权认证
            yield this.authentication(challenge, uuid);
            return yield new Promise((resolve) => {
                const timer = setInterval(() => __awaiter(this, void 0, void 0, function* () {
                    const t = yield axios_1.default.get(`${d}?uuid=${uuid}&verifier=${verifier}`);
                    const data = t.data;
                    // console.log(data);
                    console.log("success");
                    if (data) {
                        clearInterval(timer);
                        resolve(data);
                    }
                }), 2 * 1e3);
            });
        });
    }
    loginCursor2() {
        return __awaiter(this, void 0, void 0, function* () {
            let uuid = (0, uuid_1.v4)();
            let verifier = base64URLEncode(crypto.randomBytes(32));
            let challenge = base64URLEncode(sha256(Buffer.from(verifier)));
            // 登录
            let url = `${i}?challenge=${challenge}&uuid=${uuid}&newbackend=true`;
            vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(url));
            return yield new Promise((resolve) => {
                const timer = setInterval(() => __awaiter(this, void 0, void 0, function* () {
                    const t = yield axios_1.default.get(`${d}?uuid=${uuid}&verifier=${verifier}`);
                    const data = t.data;
                    // console.log(data);
                    console.log("success");
                    if (data) {
                        clearInterval(timer);
                        resolve(data);
                    }
                }), 2 * 1e3);
            });
        });
    }
    /**
     * 获取auth0的state
     * @returns auth0状态码
     */
    get_state() {
        return __awaiter(this, void 0, void 0, function* () {
            let response = yield redirectRequest("https://www.cursor.so/api/auth/login", null);
            // 获取state
            this.state = response.match(/state=(.*?)"/)[1];
            return this.state;
        });
    }
    /**
     * auth0登录
     */
    sign_in() {
        return __awaiter(this, void 0, void 0, function* () {
            // console.log("---------登录----------");
            const signin_url = this.url + "/u/login?state=" + this.state;
            const payload = {
                state: this.state,
                username: this.email,
                password: this.password,
                action: "default",
            };
            try {
                const response = yield redirectRequest(signin_url, payload);
            }
            catch (e) {
                console.log(e);
            }
        });
    }
    getUsage() {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield redirectRequest("https://www.cursor.so/api/usage?user=auth0", null);
            console.log(response);
            return response;
        });
    }
}
exports.CursorAuth = CursorAuth;
// const cursor_auth = new CursorAuth();
// cursor_auth.loginCursor("1008611@163.com", "1008611@163.com");
//# sourceMappingURL=auth.js.map