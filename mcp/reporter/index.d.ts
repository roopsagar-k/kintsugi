interface PwAttachment {
    name: string;
    path?: string;
    body?: Buffer;
    contentType: string;
}
interface PwTestCase {
    id: string;
    title: string;
    location: {
        file: string;
        line: number;
    };
}
interface PwTestResult {
    status: string;
    retry: number;
    duration: number;
    error?: {
        message?: string;
        stack?: string;
    };
    attachments: PwAttachment[];
}
interface PwFullResult {
    status: string;
    duration: number;
}
export default class KintsugiReporter {
    private ndjsonPath;
    private counts;
    constructor();
    onTestEnd(test: PwTestCase, result: PwTestResult): void;
    onEnd(result: PwFullResult): void;
    private writeLine;
}
export {};
//# sourceMappingURL=index.d.ts.map