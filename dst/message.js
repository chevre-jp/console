"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Common = void 0;
/**
 * システム共通メッセージ定義
 */
var Common;
(function (Common) {
    const field = '$fieldName$';
    const maxLen = '$maxLength$';
    // メッセージ
    Common.required = '$fieldName$を入力してください';
    const maxLength = '$fieldName$は$maxLength$文字以内で入力してください';
    function getMaxLength(fieldName, max) {
        return maxLength.replace(field, fieldName)
            .replace(maxLen, String(max));
    }
    Common.getMaxLength = getMaxLength;
})(Common = exports.Common || (exports.Common = {}));
