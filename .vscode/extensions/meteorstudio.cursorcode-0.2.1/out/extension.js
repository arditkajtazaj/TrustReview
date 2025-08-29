"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const vscode_1 = require("vscode");
const HelloWorldPanel_1 = require("./panels/HelloWorldPanel");
const left_webview_provider_1 = require("./providers/left-webview-provider");
function activate(context) {
    // Create the show hello world command
    const showHelloWorldCommand = vscode_1.commands.registerCommand("hello-world.showHelloWorld", () => {
        HelloWorldPanel_1.HelloWorldPanel.render(context.extensionUri);
    });
    // Register view
    const leftPanelWebViewProvider = new left_webview_provider_1.LeftPanelWebview(context === null || context === void 0 ? void 0 : context.extensionUri, {});
    let view = vscode_1.window.registerWebviewViewProvider("left-panel-webview", leftPanelWebViewProvider, {
        webviewOptions: { retainContextWhenHidden: true },
    });
    // Add command to the extension context
    context.subscriptions.push(showHelloWorldCommand, view);
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map