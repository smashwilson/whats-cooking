import {execFile} from "child_process";

import {LogEntry} from "./log-entry";

function open(...args: string[]) {
  return new Promise((resolve, reject) => {
    execFile("open", args, {encoding: "utf8"}, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

export class PullRequestEntry extends LogEntry {
  private apiData: {title: string, url: string} | null;

  constructor(oid: string, private num: number, private headRef: string, refs: string[]) {
    super(oid, refs);

    this.apiData = null;
  }

  public toString() {
    return `- [ ] #${this.num.toString()}: ${this.apiData ? this.apiData.title : this.headRef}`;
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
