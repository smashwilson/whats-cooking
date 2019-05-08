export abstract class LogEntry {
  constructor(protected oid: string, protected refs: string[]) {
    //
  }

  public refSuffix(): string {
    if (this.refs.length > 0) {
      return ` (${this.refs.map((ref) => chalk.yellow(ref)).join(", ")})`;
    } else {
      return "";
    }
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
