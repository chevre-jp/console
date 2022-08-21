/**
 * システム共通メッセージ定義
 */
export namespace Common {
    const field: string = '$fieldName$';
    const maxLen: string = '$maxLength$';

    // メッセージ
    export const required = '$fieldName$を入力してください';
    const maxLength = '$fieldName$は$maxLength$文字以内で入力してください';

    export function getMaxLength(fieldName: string, max: number): string {
        return maxLength.replace(field, fieldName)
            .replace(maxLen, String(max));
    }
}
