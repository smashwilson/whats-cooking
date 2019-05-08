export abstract class LogEntry {
  constructor(protected oid: string, protected refs: string[]) {
    //
  }

  public abstract toString(): string;

  public addToQuery(_: string): string {
    return "";
  }

  public acceptResponse(_: any): void {
    //
  }

  public open(): void {
    //
  }
}
