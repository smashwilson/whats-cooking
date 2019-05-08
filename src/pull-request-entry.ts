import {LogEntry} from "./log-entry";

export class PullRequestEntry extends LogEntry {
  private apiData: {title: string, url: string} | null;

  constructor(oid: string, private num: number, private headRef: string, refs: string[]) {
    super(oid, refs);

    this.apiData = null;
  }

  public toString() {
    let s = `${chalk.gray(this.oid)} : #${chalk.bold.green(this.num.toString())}`;
    if (this.apiData !== null) {
      s += `: ${chalk.bold(this.apiData.title)}`;
    } else {
      s += ` (${chalk.gray(this.headRef)})`;
    }
    s += this.refSuffix();
    return s;
  }

  public addToQuery(varName: string): string {
    return ` ${varName}: pullRequest(number: ${this.num.toString()}) { title url }`;
  }

  public acceptResponse(result: any): void {
    this.apiData = {
      title: result.title,
      url: result.url,
    };
  }

  public open() {
    if (this.apiData === null) {
      return Promise.resolve();
    }

    return open(this.apiData.url);
  }
}
