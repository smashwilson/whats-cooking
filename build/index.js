#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cli_1 = __importDefault(require("cli"));
const child_process_1 = require("child_process");
const chalk_1 = __importDefault(require("chalk"));
const graphql_1 = require("./graphql");
cli_1.default.enable('version', 'status');
const options = cli_1.default.parse({
    path: ['p', 'path to git repository on disk (default: .)', 'string', '.'],
    from: ['f', 'git revision to start from', 'string', null],
    to: ['t', 'git revision to stop at', 'string', null],
    open: ['o', 'open a browser tab on each detected PR', 'bool', false],
});
if (!options.path || !options.from || !options.to) {
    cli_1.default.fatal('--from and --to arguments are required.');
}
function git(...args) {
    return new Promise((resolve, reject) => {
        const child = child_process_1.spawn('git', args, {
            stdio: ['ignore', 'pipe', process.stderr],
        });
        child.stdout.setEncoding('utf8');
        let finished = false;
        function finish(error) {
            if (!finished) {
                finished = true;
                if (error) {
                    reject(error);
                }
                else {
                    resolve(output.join(''));
                }
                ;
            }
        }
        let output = [];
        child.stdout.on('data', (chunk) => output.push(chunk));
        child.on('error', finish);
        child.on('exit', (code, signal) => {
            if (code === 0) {
                finish();
            }
            else if (code !== null) {
                reject(new Error(`Exit with status ${code}`));
            }
            else {
                reject(new Error(`Killed by signal ${signal}`));
            }
        });
    });
}
function open(...args) {
    return new Promise((resolve, reject) => {
        child_process_1.execFile('open', args, { encoding: 'utf8' }, error => {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
}
class LogEntry {
    constructor(oid, refs) {
        this.oid = oid;
        this.refs = refs;
    }
    refSuffix() {
        if (this.refs.length > 0) {
            return ` (${this.refs.map(ref => chalk_1.default.yellow(ref)).join(', ')})`;
        }
        else {
            return '';
        }
    }
    addToQuery(_varName) {
        return '';
    }
    acceptResponse(_result) {
    }
    open() {
    }
}
class PullRequestEntry extends LogEntry {
    constructor(oid, num, headRef, refs) {
        super(oid, refs);
        this.num = num;
        this.headRef = headRef;
        this.apiData = null;
    }
    toString() {
        let s = `#${chalk_1.default.bold.green(this.num.toString())}`;
        if (this.apiData !== null) {
            s += `: ${chalk_1.default.bold(this.apiData.title)}`;
        }
        else {
            s += ` (${chalk_1.default.gray(this.headRef)})`;
        }
        s += this.refSuffix();
        return s;
    }
    addToQuery(varName) {
        return ` ${varName}: pullRequest(number: ${this.num.toString()}) { title url }`;
    }
    acceptResponse(result) {
        this.apiData = {
            title: result.title,
            url: result.url,
        };
    }
    open() {
        if (this.apiData === null) {
            return Promise.resolve();
        }
        return open(this.apiData.url);
    }
}
class DirectCommitEntry extends LogEntry {
    constructor(oid, summary, refs) {
        super(oid, refs);
        this.summary = summary;
    }
    toString() {
        let s = `${chalk_1.default.bold(this.summary)} @ ${chalk_1.default.gray(this.oid)}`;
        s += this.refSuffix();
        return s;
    }
}
function query(owner, name, logEntries) {
    return __awaiter(this, void 0, void 0, function* () {
        let q = 'query($owner: String!, $name: String!) {';
        q += '  repository(owner: $owner, name: $name) {';
        const indexByName = new Map();
        let atLeastOne = false;
        for (let i = 0; i < logEntries.length; i++) {
            const entry = logEntries[i];
            const nodeName = `pr${i}`;
            q += entry.addToQuery(nodeName);
            indexByName.set(nodeName, i);
            atLeastOne = true;
        }
        q += '  }';
        q += '}';
        if (!atLeastOne) {
            return;
        }
        const response = yield graphql_1.graphql(q, { owner, name });
        for (const responseName in response.data.repository) {
            const prResponse = response.data.repository[responseName];
            const index = indexByName.get(responseName);
            if (index === undefined) {
                throw new Error(`Unexpected response name: ${responseName}`);
            }
            const entry = logEntries[index];
            entry.acceptResponse(prResponse);
        }
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        process.chdir(options.path);
        const remotes = yield git('remote', '-v').then(stdout => stdout.split(/\n/).filter(line => line.length > 0));
        const repos = remotes.map(remote => {
            const [remoteName, url] = remote.split(/\s+/);
            const m = /(?:https:\/\/|git@)github\.com(?::|\/)([^\/]+)\/([^.]+)\.git/.exec(url);
            if (m) {
                return { remoteName, owner: m[1], name: m[2] };
            }
            else {
                return null;
            }
        });
        const upstream = repos.find(each => (each === null ? false : each.remoteName === 'upstream'));
        const origin = repos.find(each => (each === null ? false : each.remoteName === 'origin'));
        const dotcom = repos.filter(Boolean);
        let maybeNwo = null;
        if (upstream) {
            maybeNwo = { owner: upstream.owner, name: upstream.name };
        }
        else if (origin) {
            maybeNwo = { owner: origin.owner, name: origin.name };
        }
        else if (dotcom.length === 1) {
            const casted = dotcom[0];
            maybeNwo = { owner: casted.owner, name: casted.name };
        }
        if (maybeNwo === null) {
            cli_1.default.fatal(`Unable to determine GitHub repository from remotes.\n${remotes.join('\n')}`);
        }
        const nwo = maybeNwo;
        cli_1.default.debug(`Inferred GitHub repository: ${nwo.owner}/${nwo.name}`);
        const logLines = yield git('log', '--first-parent', options.to, `^${options.from}`, '--format=format:%h%x00%s%x00%D').then(stdout => stdout.split(/\n/).filter(line => line.length > 0));
        cli_1.default.debug(`Read ${logLines.length} log lines.`);
        const entries = [];
        for (const line of logLines) {
            const [oid, summary, describe] = line.split('\x00');
            const refs = describe.split(/\s*,\s*/).filter(each => each.length > 0);
            const m = /^Merge pull request #(\d+) from (.*)/.exec(summary);
            if (m) {
                entries.push(new PullRequestEntry(oid, parseInt(m[1], 10), m[2], refs));
            }
            else {
                entries.push(new DirectCommitEntry(oid, summary, refs));
            }
        }
        yield query(nwo.owner, nwo.name, entries);
        for (const entry of entries) {
            console.log(entry.toString());
        }
        if (options.open) {
            yield Promise.all(entries.map(entry => entry.open()));
        }
    });
}
main().then(() => process.exit(0), err => {
    cli_1.default.fatal(err.stack);
    process.exit(1);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQSw4Q0FBc0I7QUFDdEIsaURBQThDO0FBQzlDLGtEQUEwQjtBQUUxQix1Q0FBa0M7QUFFbEMsYUFBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUE7QUFFL0IsTUFBTSxPQUFPLEdBQUcsYUFBRyxDQUFDLEtBQUssQ0FBQztJQUN4QixJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsNkNBQTZDLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQztJQUN6RSxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsNEJBQTRCLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQztJQUN6RCxFQUFFLEVBQUUsQ0FBQyxHQUFHLEVBQUUseUJBQXlCLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQztJQUNwRCxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUUsd0NBQXdDLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQztDQUNyRSxDQUFDLENBQUE7QUFFRixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFO0lBQ2pELGFBQUcsQ0FBQyxLQUFLLENBQUMseUNBQXlDLENBQUMsQ0FBQTtDQUNyRDtBQUVELGFBQWEsR0FBRyxJQUFjO0lBQzVCLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDckMsTUFBTSxLQUFLLEdBQUcscUJBQUssQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFO1lBQy9CLEtBQUssRUFBRSxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQztTQUMxQyxDQUFDLENBQUE7UUFDRixLQUFLLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxN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