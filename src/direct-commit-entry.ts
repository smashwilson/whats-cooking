import {LogEntry} from "./log-entry";

export class DirectCommitEntry extends LogEntry {
  constructor(oid: string, private summary: string, refs: string[]) {
    super(oid, refs);
  }

  public toString() {
    return `- [ ] ${this.oid}: ${this.summary}`;
  }
}
