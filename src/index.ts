#!/usr/bin/env node
import chalk from "chalk";
import {execFile, spawn} from "child_process";
import cli from "cli";

import {graphql} from "./graphql";

cli.enable("version", "status");

const options = cli.parse({
  path: ["p", "path to git repository on disk (default: .)", "string", "."],
  from: ["f", "git revision to start from", "string", null],
  to: ["t", "git revision to stop at", "string", null],
  open: ["o", "open a browser tab on each detected PR", "bool", false],
});

if (!options.path || !options.from || !options.to) {
  cli.fatal("--from and --to arguments are required.");
}

function git(...args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("git", args, {
      stdio: ["ignore", "pipe", process.stderr],
    });
    child.stdout.setEncoding("utf8");

    let finished = false;
    function finish(error?: Error) {
      if (!finished) {
        finished = true;
        if (error) {
          reject(error);
        } else {
          resolve(output.join(""));
        }
      }
    }

    const output: string[] = [];
    child.stdout.on("data", (chunk: string) => output.push(chunk));

    child.on("error", finish);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        finish();
      } else if (code !== null) {
        reject(new Error(`Exit with status ${code}`));
      } else {
        reject(new Error(`Killed by signal ${signal}`));
      }
    });
  });
}

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

abstract class LogEntry {
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

class PullRequestEntry extends LogEntry {
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

class DirectCommitEntry extends LogEntry {
  constructor(oid: string, private summary: string, refs: string[]) {
    super(oid, refs);
  }

  public toString() {
    let s = `${chalk.gray(this.oid)} : ${chalk.bold(this.summary)}`;
    s += this.refSuffix();
    return s;
  }
}

async function query(owner: string, name: string, logEntries: LogEntry[]): Promise<void> {
  let q = "query($owner: String!, $name: String!) {";
  q += "  repository(owner: $owner, name: $name) {";

  const indexByName: Map<string, number> = new Map();
  let atLeastOne = false;
  for (let i = 0; i < logEntries.length; i++) {
    const entry = logEntries[i];
    const nodeName = `pr${i}`;
    q += entry.addToQuery(nodeName);
    indexByName.set(nodeName, i);
    atLeastOne = true;
  }

  q += "  }";
  q += "}";

  if (!atLeastOne) {
    return;
  }

  const response = await graphql(q, {owner, name});

  for (const responseName in response.data.repository) {
    const prResponse: any = response.data.repository[responseName];
    const index = indexByName.get(responseName);
    if (index === undefined) {
      throw new Error(`Unexpected response name: ${responseName}`);
    }
    const entry = logEntries[index];
    entry.acceptResponse(prResponse);
  }
}

async function main() {
  process.chdir(options.path);

  const remotes = await git("remote", "-v").then((stdout) => stdout.split(/\n/).filter((line) => line.length > 0));
  const repos = remotes.map((remote) => {
    const [remoteName, url] = remote.split(/\s+/);
    const m = /(?:https:\/\/|git@)github\.com(?::|\/)([^\/]+)\/([^.]+)\.git/.exec(url);
    if (m) {
      return {remoteName, owner: m[1], name: m[2]};
    } else {
      return null;
    }
  });
  const upstream = repos.find((each) => (each === null ? false : each.remoteName === "upstream"));
  const origin = repos.find((each) => (each === null ? false : each.remoteName === "origin"));
  const dotcom = repos.filter(Boolean);
  let maybeNwo: {owner: string, name: string} | null = null;
  if (upstream) {
    maybeNwo = {owner: upstream.owner, name: upstream.name};
  } else if (origin) {
    maybeNwo = {owner: origin.owner, name: origin.name};
  } else if (dotcom.length === 1) {
    const casted = dotcom[0] as {owner: string, name: string};
    maybeNwo = {owner: casted.owner, name: casted.name};
  }
  if (maybeNwo === null) {
    cli.fatal(`Unable to determine GitHub repository from remotes.\n${remotes.join("\n")}`);
  }
  const nwo = maybeNwo as {owner: string, name: string};

  cli.debug(`Inferred GitHub repository: ${nwo.owner}/${nwo.name}`);

  const logLines = await git(
    "log", "--first-parent", options.to, `^${options.from}`,
    "--format=format:%h%x00%s%x00%D",
  ).then((stdout) => stdout.split(/\n/).filter((line) => line.length > 0));
  cli.debug(`Read ${logLines.length} log lines.`);

  const entries: LogEntry[] = [];
  for (const line of logLines) {
    const [oid, summary, describe] = line.split("\x00");
    const refs = describe.split(/\s*,\s*/).filter((each) => each.length > 0);

    const m = /^Merge pull request #(\d+) from (.*)/.exec(summary);
    if (m) {
      entries.push(new PullRequestEntry(oid, parseInt(m[1], 10), m[2], refs));
    } else {
      entries.push(new DirectCommitEntry(oid, summary, refs));
    }
  }

  await query(nwo.owner, nwo.name, entries);

  for (const entry of entries) {
    console.log(entry.toString());
  }

  if (options.open) {
    await Promise.all(
      entries.map((entry) => entry.open()),
    );
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    cli.fatal(err.stack);
    process.exit(1);
  },
);
