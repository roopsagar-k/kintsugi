interface Attachment {
    name: string;
    path?: string;
    body?: Buffer;
}
interface TestCase {
    id: string;
    title: string;
    location: {
        file: string;
        line: number;
    };
}
interface TestResult {
    retry: number;
    status: "passed" | "failed" | "timedOut" | "skipped" | "interrupted";
    duration: number;
    error?: {
        message?: string;
        stack?: string;
    };
    attachments: Attachment[];
}
interface FullResult {
    status: string;
    duration: number;
}
export default class KintsugiReporter {
    private readonly ndjsonPath;
    private readonly counts;
    constructor();
    onTestEnd(test: TestCase, result: TestResult): void;
    onEnd(result: FullResult): void;
    private writeLine;
}
export {};
//# sourceMappingURL=index.d.ts.map