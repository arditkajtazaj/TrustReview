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
const axios_cookiejar_support_1 = require("axios-cookiejar-support");
const tough_cookie_1 = require("tough-cookie");
// import * as vscode from "vscode";
const jar = new tough_cookie_1.CookieJar();
const client = (0, axios_cookiejar_support_1.wrapper)(axios_1.default.create({
    jar,
    maxRedirects: 0,
    validateStatus: () => true,
}));
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
            const response = yield client.get(url);
            if (response.data.indexOf("You may now proceed back to Cursor") != -1) {
                console.log("授权成功");
                return true;
            }
            console.log(response.data);
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
                    console.log(data);
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
            let response = yield client.get("https://www.cursor.so/api/auth/login");
            console.log(response.headers['location']);
            response = yield client.get(response.headers['location']);
            console.log(this.url + response.headers['location']);
            response = yield client.get(this.url + response.headers['location']);
            console.log(response);
            // 获取state
            this.state = response === null || response === void 0 ? void 0 : response.data.match(/state=(.*?)"/)[1];
            return this.state;
        });
    }
    /**
     * auth0登录
     */
    sign_in() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('---------登录----------');
            const signin_url = this.url + "/u/login?state=" + this.state;
            const payload = {
                state: this.state,
                username: this.email,
                password: this.password,
                action: "default",
            };
            const response = yield client.post(signin_url, payload);
        });
    }
    getUsage() {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield client.get("https://www.cursor.so/api/usage?user=auth0");
            console.log(response.data);
            return response.data;
        });
    }
}
exports.CursorAuth = CursorAuth;
// const cursor_auth = new CursorAuth();
// cursor_auth.loginCursor("1008611@163.com", "1008611@163.com");
//# sourceMappingURL=auth%20copy.js.map