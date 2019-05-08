import {LogEntry} from "./log-entry";

export class DirectCommitEntry extends LogEntry {
  constructor(oid: string, private summary: string, refs: string[]) {
    super(oid, refs);
  }

  public toString() {
    let s = `${chalk.gray(this.oid)} : ${chalk.bold(this.summary)}`;
    s += this.refSuffix();
    return s;
  }
}
