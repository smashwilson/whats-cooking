import util from 'util';

import request from 'request-promise-native';
import cli from 'cli';

export async function graphql (query: string, variables: {} = {}) {
  const singleLineQuery = query.replace(/\n\s*/g, ' ').trim()
  cli.debug(`Executing graphQL query:\n${util.inspect({query: singleLineQuery, variables}, {colors: true, depth: null})}`)
  const response = await request({
    method: 'POST',
    uri: 'https://api.github.com/graphql',
    headers: {
      Authorization: `bearer ${process.env.GITHUB_TOKEN}`,
      'User-Agent': 'smashwilson/wheres-my-code',
    },
    body: {query: singleLineQuery, variables},
    json: true
  })
  cli.debug(`Response:\n${util.inspect(response, {colors: true, depth: null})}`)

  return response
}
