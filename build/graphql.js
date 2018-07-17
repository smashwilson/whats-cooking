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
const util_1 = __importDefault(require("util"));
const request_promise_native_1 = __importDefault(require("request-promise-native"));
const cli_1 = __importDefault(require("cli"));
function graphql(query, variables = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        const singleLineQuery = query.replace(/\n\s*/g, ' ').trim();
        cli_1.default.debug(`Executing graphQL query:\n${util_1.default.inspect({ query: singleLineQuery, variables }, { colors: true, depth: null })}`);
        const response = yield request_promise_native_1.default({
            method: 'POST',
            uri: 'https://api.github.com/graphql',
            headers: {
                Authorization: `bearer ${process.env.GITHUB_TOKEN}`,
                'User-Agent': 'smashwilson/wheres-my-code',
            },
            body: { query: singleLineQuery, variables },
            json: true
        });
        cli_1.default.debug(`Response:\n${util_1.default.inspect(response, { colors: true, depth: null })}`);
        return response;
    });
}
exports.graphql = graphql;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JhcGhxbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9ncmFwaHFsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7QUFBQSxnREFBd0I7QUFFeEIsb0ZBQTZDO0FBQzdDLDhDQUFzQjtBQUV0QixpQkFBK0IsS0FBYSxFQUFFLFlBQWdCLEVBQUU7O1FBQzlELE1BQU0sZUFBZSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFBO1FBQzNELGFBQUcsQ0FBQyxLQUFLLENBQUMsNkJBQTZCLGNBQUksQ0FBQyxPQUFPLENBQUMsRUFBQyxLQUFLLEVBQUUsZUFBZSxFQUFFLFNBQVMsRUFBQyxFQUFFLEVBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFDLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDeEgsTUFBTSxRQUFRLEdBQUcsTUFBTSxnQ0FBTyxDQUFDO1lBQzdCLE1BQU0sRUFBRSxNQUFNO1lBQ2QsR0FBRyxFQUFFLGdDQUFnQztZQUNyQyxPQUFPLEVBQUU7Z0JBQ1AsYUFBYSxFQUFFLFVBQVUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUU7Z0JBQ25ELFlBQVksRUFBRSw0QkFBNEI7YUFDM0M7WUFDRCxJQUFJLEVBQUUsRUFBQyxLQUFLLEVBQUUsZUFBZSxFQUFFLFNBQVMsRUFBQztZQUN6QyxJQUFJLEVBQUUsSUFBSTtTQUNYLENBQUMsQ0FBQTtRQUNGLGFBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxjQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBRTlFLE9BQU8sUUFBUSxDQUFBO0lBQ2pCLENBQUM7Q0FBQTtBQWhCRCwwQkFnQkMifQ==