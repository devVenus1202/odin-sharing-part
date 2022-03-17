export function setImmediatePromise() {
    return new Promise<void>((resolve) => {
        setImmediate(() => resolve());
    });
}
